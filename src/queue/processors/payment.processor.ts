// src/queue/processors/payment.processor.ts
import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentJobData } from '../queue.service';

@Processor('payment')
export class PaymentQueueProcessor {
  private readonly logger = new Logger(PaymentQueueProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('process-payment')
  async handlePayment(job: Job<PaymentJobData>) {
    this.logger.log(`Processing payment for transaction ${job.data.transactionId}`);
    
    const { transactionId, pedidoId, userId, valor, gateway, paymentDetails } = job.data;
    
    await job.progress(10);
    
    try {
      let paymentResult: any;
      
      switch (gateway) {
        case 'MERCADO_PAGO':
          paymentResult = await this.processMercadoPago(paymentDetails);
          break;
        case 'STRIPE':
          paymentResult = await this.processStripe(paymentDetails);
          break;
        case 'PIX_DIRETO':
          paymentResult = await this.processPix(paymentDetails);
          break;
        default:
          throw new Error(`Gateway ${gateway} not supported`);
      }
      
      await job.progress(50);
      
      await this.prisma.transacao.update({
        where: { id: transactionId },
        data: {
          status: paymentResult.status === 'success' ? 'PAGO' : 'FALHOU',
          transactionId: paymentResult.gatewayTransactionId,
          paymentData: paymentResult,
          paidAt: paymentResult.status === 'success' ? new Date() : null,
        },
      });
      
      await job.progress(80);
      
      if (paymentResult.status === 'success') {
        await this.prisma.pedido.update({
          where: { id: pedidoId },
          data: {
            status: 'pagamento_confirmado',
            dataPagamento: new Date(),
          },
        });
        
        const pedido = await this.prisma.pedido.findUnique({
          where: { id: pedidoId },
          include: { itens: true },
        });

        if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`);

        for (const item of pedido.itens) {
          await this.prisma.produto.update({
            where: { id: item.produtoId },
            data: {
              estoque: {
                decrement: item.quantidade,
              },
            },
          });
        }
      }
      
      await job.progress(100);
      
      return {
        success: true,
        transactionId,
        status: paymentResult.status,
        gatewayTransactionId: paymentResult.gatewayTransactionId,
      };
      
    } catch (error) {
      this.logger.error(`Payment processing failed: ${error.message}`);
      
      await this.prisma.transacao.update({
        where: { id: transactionId },
        data: {
          status: 'FALHOU',
          metadata: {
            error: String(error.message),
            failedAt: new Date().toISOString(),
          },
        },
      });
      
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Payment job ${job.id} completed with result: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Payment job ${job.id} failed: ${error.message}`);
  }

  private async processMercadoPago(details: any) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      status: 'success',
      gatewayTransactionId: `MP_${Date.now()}`,
    };
  }

  private async processStripe(details: any) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      status: 'success',
      gatewayTransactionId: `STR_${Date.now()}`,
    };
  }

  private async processPix(details: any) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      status: 'pending',
      gatewayTransactionId: `PIX_${Date.now()}`,
      qrCode: 'base64_encoded_qr_code',
      qrCodeText: '00020126360014BR.GOV.BCB.PIX...',
    };
  }
}