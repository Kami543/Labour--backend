// src/queue/queue.module.ts - VERSÃO RECOMENDADA (com tipagem correta)
import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';

@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    const hasRedis = process.env.REDIS_URL || process.env.REDIS_HOST;

    if (!hasRedis) {
      console.log('⚠️ Redis não configurado, módulo de filas desativado');
      return {
        module: QueueModule,
        providers: [],
        exports: [],
      };
    }

    console.log('📦 Configurando módulo de filas com Redis:', process.env.REDIS_HOST);

    return {
      module: QueueModule,
      imports: [
        PrismaModule,
        ConfigModule,
        // 1. PRIMEIRO: configura a conexão Redis
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            // Constroi o objeto de configuração dinamicamente
            const redisConfig: any = {
              host: configService.get('REDIS_HOST'),
              port: Number(configService.get('REDIS_PORT')) || 6379,
              password: configService.get('REDIS_PASSWORD'),
              connectTimeout: 5000,
              maxRetriesPerRequest: 3,
              enableOfflineQueue: false,
              retryStrategy: (times: number) => {
                return Math.min(times * 50, 2000);
              },
            };

            // Adiciona TLS se estiver usando Upstash ou se REDIS_TLS=true
            const redisUrl = configService.get('REDIS_URL');
            const redisTls = configService.get('REDIS_TLS');
            
            if (redisTls === 'true' || redisUrl?.includes('upstash')) {
              redisConfig.tls = {};
            }

            return {
              redis: redisConfig,
              defaultJobOptions: {
                attempts: 3,
                backoff: {
                  type: 'exponential' as const,
                  delay: 1000,
                },
                removeOnComplete: true,
                removeOnFail: false,
              },
            };
          },
          inject: [ConfigService],
        }),
        // 2. DEPOIS: registra as filas
        BullModule.registerQueue(
          { name: 'payment' },
          { name: 'notification' },
          { name: 'email' },
          { name: 'fraud-check' },
          { name: 'order-processing' },
          { name: 'inventory' },
        ),
      ],
      controllers: [],
      providers: [],
      exports: [BullModule],
    };
  }
}