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
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.prod', '.env.dev'],
      load: [redisConfig, appConfig],
      cache: true,
      expandVariables: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // ⚠️ CONFIGURAÇÃO DO REDIS CONDICIONAL (apenas se necessário)
    // Em produção, podemos desabilitar o Redis se não for essencial
    ...(process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost' 
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
              const isProduction = process.env.NODE_ENV === 'production';
              
              return {
                redis: {
                  host: configService.get<string>('redis.host', 'localhost'),
                  port: configService.get<number>('redis.port', 6379),
                  password: configService.get<string>('redis.password'),
                  db: configService.get<number>('redis.db', 0),
                  keyPrefix: configService.get<string>('redis.prefix', 'laboure:'),
                  tls: isProduction ? { rejectUnauthorized: false } : undefined,
                  connectTimeout: 15000,
                  commandTimeout: 10000,
                  retryStrategy: (times: number) => {
                    if (times > 3) {
                      console.warn(`⚠️ Redis: desistindo após ${times} tentativas`);
                      return null;
                    }
                    return Math.min(times * 1000, 5000);
                  },
                },
                defaultJobOptions: {
                  attempts: isProduction ? 2 : 1,
                  backoff: { type: 'exponential', delay: 1000 },
                  removeOnComplete: 50,
                  removeOnFail: 50,
                  timeout: 15000,
                },
              };
            },
            inject: [ConfigService],
          }),
          
          // Registrar filas apenas se Redis estiver disponível
          BullModule.registerQueue(
            { name: 'payment' },
            { name: 'notification' },
            { name: 'email' },
          ),
        ]
      : []),
    
    // Módulos essenciais (sempre carregam)
    PrismaModule,
    AuthModule,
    UserModule,
    ProdutoModule,
    CartModule,
    PedidosModule,
    NotificacoesModule,
    PagamentoModule,
    SupabaseModule,
    UploadModule,
    
    // Módulos opcionais (podem ser carregados condicionalmente)
    ...(process.env.NODE_ENV !== 'production' ? [
      HealthModule,
      QueueModule,
      AvaliacoesModule,
    ] : []),
  ],
})
export class AppModule {
  constructor() {
    console.log(`📦 AppModule inicializado - Ambiente: ${process.env.NODE_ENV || 'development'}`);
    
    if (!process.env.REDIS_HOST) {
      console.log('⚠️ Redis não configurado - funcionalidades de fila desabilitadas');
    }
    
    if (process.env.NODE_ENV === 'production') {
      console.log('🚀 Modo produção: módulos não essenciais foram otimizados');
    }
  }
}