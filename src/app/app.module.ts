// app.module.ts - VERSÃO CORRIGIDA
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';

// ─── Módulos ──────────────────────────────────────────────────
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
import { MailModule } from '../mail/mail.module';

import redisConfig from '../config/redis.config';
import appConfig from '../config/app.config';

const isProduction = process.env.NODE_ENV === 'production';

// Configuração robusta para Redis
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const hasRedis = !!(redisUrl || redisHost);

// Configuração do Bull
const getBullConfig = () => {
  if (redisUrl) {
    return {
      url: redisUrl,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 50,
        removeOnFail: 50,
        timeout: 15000,
      },
    };
  }

  if (redisHost) {
    const isUpstash = redisHost.includes('upstash');
    return {
      redis: {
        host: redisHost,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        tls: isUpstash ? { rejectUnauthorized: false } : undefined,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 8000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times: number) => {
          if (times > 2) return null;
          return times * 500;
        },
      },
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 50,
        removeOnFail: 50,
        timeout: 15000,
      },
    };
  }
  return null;
};

const bullConfig = getBullConfig();

// ⭐ CORREÇÃO: Só configura o Bull UMA VEZ
// Se tem Redis, configura o BullModule e registra as filas
// Se não tem Redis, não faz nada (e não importa o QueueModule)
const bullModules = bullConfig
  ? [
      BullModule.forRoot(bullConfig),
      BullModule.registerQueue(
        { name: 'payment' },
        { name: 'notification' },
        { name: 'email' },
        { name: 'fraud-check' },
        { name: 'order-processing' },
        { name: 'inventory' },
      ),
    ]
  : [];

// Função de debug para cada módulo
const debugModule = (name: string, module: any) => {
  console.log(`⏳ Carregando módulo: ${name}...`);
  return module;
};

@Module({
  imports: [
    // ─── Configuração ──────────────────────────────────────────
    debugModule('ConfigModule', ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.prod', '.env.dev'],
      load: [redisConfig, appConfig],
      cache: true,
      expandVariables: true,
    })),

    // ─── Rate Limiting ─────────────────────────────────────────
    debugModule('ThrottlerModule', ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])),

    // ─── Redis/Bull ──────────────────────────────────────────
    // ⭐ CORREÇÃO: BullModule configurado AQUI, não no QueueModule
    ...bullModules,

    // ─── TODOS OS MÓDULOS ──────────────────────────────────
    debugModule('PrismaModule', PrismaModule),
    debugModule('AuthModule', AuthModule),
    debugModule('UserModule', UserModule),
    debugModule('ProdutoModule', ProdutoModule),
    debugModule('CartModule', CartModule),
    debugModule('PedidosModule', PedidosModule),
    debugModule('AvaliacoesModule', AvaliacoesModule),
    debugModule('NotificacoesModule', NotificacoesModule),
    debugModule('SupabaseModule', SupabaseModule),
    debugModule('UploadModule', UploadModule),
    debugModule('MailModule', MailModule),

    // ─── Módulos que dependem de Redis ──────────────────────
    // ⭐ CORREÇÃO: QueueModule NÃO é importado aqui se já configuramos Bull acima
    // Só importa o QueueModule se NÃO tiver configurado o Bull diretamente
    ...(hasRedis && bullModules.length === 0 ? [
      debugModule('QueueModule', QueueModule.forRoot()),
    ] : []),

    // ─── PagamentoModule (depende de Redis mas usa QueueModule) ──
    ...(hasRedis ? [
      debugModule('PagamentoModule', PagamentoModule),
    ] : []),

    // ─── Apenas em desenvolvimento ──────────────────────────
    ...(!isProduction ? [
      debugModule('HealthModule', HealthModule),
    ] : []),
  ],
})
export class AppModule {
  constructor() {
    console.log('✅ AppModule.constructor() executado');
    console.log(`📦 Redis configurado: ${hasRedis ? '✅' : '❌'}`);
    console.log(`📦 Bull configurado: ${bullModules.length > 0 ? '✅' : '❌'}`);
  }
}