// src/queue/processors/notification.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationJobData } from '../queue.service';

@Processor('notification')
export class NotificationQueueProcessor {
  private readonly logger = new Logger(NotificationQueueProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('send-notification')
  async handleNotification(job: Job<NotificationJobData>) {
    this.logger.log(`Sending notification to user ${job.data.userId}`);
    
    const { userId, tipo, titulo, mensagem, metadata } = job.data;
    
    try {
      // Salvar notificação no banco de dados
      const notification = await this.prisma.notificacao.create({
        data: {
          tipo: tipo as any,
          titulo,
          mensagem,
          userId,
        },
      });
      
      // Se for push notification, enviar via WebSocket
      if (metadata?.sendPush) {
        // Implementar envio de push notification
        await this.sendPushNotification(userId, titulo, mensagem);
      }
      
      return {
        success: true,
        notificationId: notification.id,
      };
      
    } catch (error) {
      this.logger.error(`Notification failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async sendPushNotification(userId: string, title: string, message: string) {
    // Implementar push notification (Firebase, WebSocket, etc.)
    this.logger.log(`Push notification sent to user ${userId}`);
  }
}