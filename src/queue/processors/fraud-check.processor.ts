// src/queue/processors/fraud-check.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FraudCheckJobData } from '../queue.service';

@Processor('fraud-check')
export class FraudCheckProcessor {
  private readonly logger = new Logger(FraudCheckProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('check-fraud')
  async handleFraudCheck(job: Job<FraudCheckJobData>) {
    this.logger.log(`Checking fraud for transaction ${job.data.transactionId}`);
    
    const { transactionId, userId, deviceFingerprint, ipAddress, valor } = job.data;
    
    try {
      // Realizar análise de fraude
      const fraudScore = await this.calculateFraudScore(
        userId,
        deviceFingerprint,
        ipAddress,
        valor
      );
      
      const riskLevel = this.determineRiskLevel(fraudScore);
      
      // CORREÇÃO 1: rules agora é tipado como string[]
      const rulesApplied: string[] = this.getAppliedRules(fraudScore);
      
      // CORREÇÃO 2: timestamp convertido para ISO string (Prisma JSON não aceita Date)
      await this.prisma.transacao.update({
        where: { id: transactionId },
        data: {
          fraudScore,
          riskLevel,
          fraudAnalysis: {
            userId,
            deviceFingerprint,
            ipAddress,
            valor,
            timestamp: new Date().toISOString(), // <-- Convertido para string
            rulesApplied: rulesApplied,
          },
        },
      });
      
      // Se score de fraude for alto, cancelar transação
      if (riskLevel === 'ALTO' || riskLevel === 'CRITICO') {
        await this.prisma.transacao.update({
          where: { id: transactionId },
          data: {
            status: 'CANCELADO',
            cancelledAt: new Date(),
          },
        });
        
        // Notificar admin sobre possível fraude
        await this.notifyAdminFraud(transactionId, fraudScore, riskLevel);
      }
      
      return {
        success: true,
        fraudScore,
        riskLevel,
      };
      
    } catch (error) {
      this.logger.error(`Fraud check failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async calculateFraudScore(
    userId: string, 
    deviceFingerprint: string, 
    ipAddress: string, 
    valor: number
  ): Promise<number> {
    let score = 0;
    
    // Verificar tentativas anteriores do usuário
    const userTransactions = await this.prisma.transacao.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
        },
      },
    });
    
    // Muitas tentativas falhas
    const failedAttempts = userTransactions.filter(t => t.status === 'FALHOU').length;
    if (failedAttempts > 3) score += 0.3;
    if (failedAttempts > 5) score += 0.2;
    
    // Valor alto
    if (valor > 1000) score += 0.2;
    if (valor > 5000) score += 0.3;
    
    // Verificar fingerprint do dispositivo
    const deviceExists = await this.prisma.deviceFingerprint.findUnique({
      where: { fingerprint: deviceFingerprint },
    });
    
    if (!deviceExists) score += 0.1;
    if (deviceExists && !deviceExists.isTrusted) score += 0.2;
    
    // Novo usuário sem histórico
    const userAge = await this.getUserAge(userId);
    if (userAge < 24) score += 0.1; // Menos de 24 horas
    if (userAge < 1) score += 0.2; // Menos de 1 hora
    
    return Math.min(score, 1.0);
  }

  private determineRiskLevel(score: number): string {
    if (score < 0.3) return 'BAIXO';
    if (score < 0.6) return 'MEDIO';
    if (score < 0.8) return 'ALTO';
    return 'CRITICO';
  }

  // CORREÇÃO: rules agora é explicitamente tipado como string[]
  private getAppliedRules(score: number): string[] {
    const rules: string[] = []; // <-- Tipado explicitamente
    if (score > 0.3) rules.push('failed_attempts');
    if (score > 0.4) rules.push('high_value');
    if (score > 0.5) rules.push('untrusted_device');
    if (score > 0.6) rules.push('new_user');
    return rules;
  }

  private async getUserAge(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    
    if (!user) return 0;
    const hoursSinceCreation = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation;
  }

  private async notifyAdminFraud(transactionId: string, score: number, riskLevel: string) {
    // Implementar notificação para admin
    this.logger.warn(`Fraud detected! Transaction: ${transactionId}, Score: ${score}, Risk: ${riskLevel}`);
  }
}