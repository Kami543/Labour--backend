// src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

const isProduction = process.env.NODE_ENV === 'production';

// Upstash fornece REDIS_URL no formato rediss://... — usar URL direta é mais estável
// do que host/port + TLS manual, e não trava o bootstrap.
const redisUrl = process.env.REDIS_URL; // rediss://:<password>@host:port
const hasRedis = !!redisUrl || (!!process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost');

const bullModules = hasRedis
  ? [
      BullModule.forRoot({
        url: redisUrl,                    // Upstash: usa URL direta (já inclui TLS)
        ...(!redisUrl && {               // Fallback host/port para Redis local/outro
          redis: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            tls: isProduction ? {} : undefined,
            enableOfflineQueue: false,   // ← não acumula comandos se Redis cair
            lazyConnect: true,           // ← conecta na primeira chamada, não no boot
            connectTimeout: 8000,
            maxRetriesPerRequest: 1,
            retryStrategy: (times: number) => {
              if (times > 2) return null; // desiste rápido — não trava o processo
              return times * 500;
            },
          },
        }),
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 50,
          removeOnFail: 50,
          timeout: 15000,
        },
      }),
      BullModule.registerQueue(
        { name: 'payment' },
        { name: 'notification' },
        { name: 'email' },
      ),
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.prod', '.env.dev'],
      load: [redisConfig, appConfig],
      cache: true,
      expandVariables: true,
    }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    ...bullModules,

    // ── Módulos essenciais ──
    PrismaModule,
    AuthModule,
    UserModule,
    ProdutoModule,
    CartModule,
    PedidosModule,
    NotificacoesModule,
    SupabaseModule,
    UploadModule,
    AvaliacoesModule,

    // ── PagamentoModule só sobe se Redis estiver disponível
    //    (depende de filas Bull internamente)
    ...(hasRedis ? [PagamentoModule, QueueModule] : []),

    // ── Só em dev ──
    ...(!isProduction ? [HealthModule] : []),
  ],
})
export class AppModule {
  constructor() {
    const env = process.env.NODE_ENV || 'development';
    console.log(`📦 AppModule inicializado — ${env}`);
    if (!hasRedis) console.log('⚠️  Redis não detectado — filas e pagamento desabilitados');
    if (isProduction) console.log('🚀 Modo produção');
  }
}