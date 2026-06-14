// src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';

import { UserModule } from '../users/users.module';
import { ProdutoModule } from '../produto/produto.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { PedidosModule } from '../pedidos/pedidos.module';
import { AvaliacoesModule } from '../avaliacoes/avaliacoes.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PagamentoModule } from '../pagamento/pagamento.module';
import { QueueModule } from '../queue/queue.module';
import { HealthModule } from '../health/health.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UploadModule } from '../upload/upload.module';

import redisConfig from '../config/redis.config';
import appConfig from '../config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.prod', '.env.dev'],
      load: [redisConfig, appConfig],
      cache: true,
      expandVariables: true,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // CONFIGURAÇÃO CORRIGIDA DO BULL COM LAZY CONNECT
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        return {
          redis: {
            host: configService.get<string>('redis.host', 'localhost'),
            port: configService.get<number>('redis.port', 6379),
            password: configService.get<string>('redis.password'),
            db: configService.get<number>('redis.db', 0),
            keyPrefix: configService.get<string>('redis.prefix', 'laboure:'),
            
            // 🔧 FIX CRÍTICO: Impede conexões no boot
            lazyConnect: true,              // Não conecta na inicialização
            enableOfflineQueue: false,      // Não acumula comandos sem conexão
            
            // Estratégia de retry otimizada por ambiente
            retryStrategy: (times: number) => {
              // Em desenvolvimento: desiste rápido se Redis não estiver rodando
              if (isDevelopment && times > 3) {
                console.log(`⚠️ Redis não disponível em desenvolvimento - desistindo após ${times} tentativas`);
                return null; // Para de tentar
              }
              
              // Em produção: mais resiliente
              if (!isDevelopment && times > 10) {
                console.error(`❌ Redis: máximo de tentativas atingido (${times})`);
                return null;
              }
              
              // Delay progressivo: mais agressivo em dev, mais conservador em prod
              const baseDelay = isDevelopment ? 100 : 200;
              const delay = Math.min(times * baseDelay, isDevelopment ? 1000 : 5000);
              
              if (isDevelopment) {
                console.log(`🔄 Redis: tentativa ${times} de reconexão em ${delay}ms`);
              }
              
              return delay;
            },
          },
          
          // Configurações padrão dos jobs
          defaultJobOptions: {
            attempts: isDevelopment ? 1 : 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: 100,
            removeOnFail: 200,
            timeout: 30000,
            stackTraceLimit: 10,
          },
          
          // Configurações do processador
          settings: {
            lockDuration: 30000,
            stalledInterval: 30000,
            maxStalledCount: 3,
            guardInterval: 5000,
            retryProcessDelay: 5000,
          },
        };
      },
      inject: [ConfigService],
    }),

    // REGISTRO DAS 6 FILAS
    BullModule.registerQueue(
      {
        name: 'payment',
        defaultJobOptions: {
          priority: 1,
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          timeout: 30000,
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      },
      {
        name: 'notification',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'fixed', delay: 2000 },
          timeout: 10000,
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      },
      {
        name: 'email',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
          timeout: 15000,
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'fraud-check',
        defaultJobOptions: {
          priority: 2,
          attempts: 2,
          backoff: { type: 'fixed', delay: 3000 },
          timeout: 15000,
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      },
      {
        name: 'order-processing',
        defaultJobOptions: {
          priority: 1,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          timeout: 20000,
        },
      },
      {
        name: 'inventory',
        defaultJobOptions: {
          priority: 2,
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          timeout: 10000,
        },
      },
    ),

    // MÓDULOS DA APLICAÇÃO
    PrismaModule,
    HealthModule,
    QueueModule,
    AuthModule,
    UserModule,
    ProdutoModule,
    CartModule,
    PedidosModule,
    AvaliacoesModule,
    NotificacoesModule,
    PagamentoModule,
    SupabaseModule,
    UploadModule,
  ],
})
export class AppModule {}