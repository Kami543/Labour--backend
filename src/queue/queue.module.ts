// src/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';

// Processadores
import { PaymentQueueProcessor } from './processors/payment.processor';
import { NotificationQueueProcessor } from './processors/notification.processor';
import { EmailQueueProcessor } from './processors/email.processor';
import { FraudCheckProcessor } from './processors/fraud-check.processor';
import { OrderProcessingProcessor } from './processors/order-processing.processor';
import { InventoryProcessor } from './processors/inventory.processor';

// Módulos necessários
import { PrismaModule } from '../prisma/prisma.module';
import { PagamentoModule } from '../pagamento/pagamento.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'payment',
        processors: [],
      },
      {
        name: 'notification',
        processors: [],
      },
      {
        name: 'email',
        processors: [],
      },
      {
        name: 'fraud-check',
        processors: [],
      },
      {
        name: 'order-processing',
        processors: [],
      },
      {
        name: 'inventory',
        processors: [],
      },
    ),
    PrismaModule,
    PagamentoModule,
    NotificacoesModule,
    MailModule,
    ConfigModule,
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    PaymentQueueProcessor,
    NotificationQueueProcessor,
    EmailQueueProcessor,
    FraudCheckProcessor,
    OrderProcessingProcessor,
    InventoryProcessor,
  ],
  exports: [
    QueueService,
    BullModule, // Exportar BullModule para outros módulos usarem as filas
  ],
})
export class QueueModule {}