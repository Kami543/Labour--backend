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

    // 🔧 CONFIGURAÇÃO CORRIGIDA DO BULL COM TLS E HANDLER DE ERROS
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isProduction = process.env.NODE_ENV === 'production';
        
        // Log de configuração (apenas para debug)
        if (process.env.DEBUG_REDIS === 'true') {
          console.log('[BullModule] Configurando Redis:', {
            host: configService.get<string>('redis.host', 'localhost'),
            port: configService.get<number>('redis.port', 6379),
            env: process.env.NODE_ENV,
            hasPassword: !!configService.get<string>('redis.password'),
            useTLS: isProduction,
          });
        }
        
        return {
          redis: {
            host: configService.get<string>('redis.host', 'localhost'),
            port: configService.get<number>('redis.port', 6379),
            password: configService.get<string>('redis.password'),
            db: configService.get<number>('redis.db', 0),
            keyPrefix: configService.get<string>('redis.prefix', 'laboure:'),
            
            // 🔧 TLS para produção (Upstash, Redis Cloud, etc.)
            tls: isProduction ? {
              servername: configService.get<string>('redis.host'),
              rejectUnauthorized: false, // Apenas se necessário com certificados auto-assinados
            } : undefined,
            
            // 🔧 CRÍTICO: Impede conexões no boot e evita ECONNRESET
            lazyConnect: true,              // Não conecta na inicialização
            enableOfflineQueue: false,      // Não acumula comandos sem conexão
            maxRetriesPerRequest: null,     // Previne tentativas infinitas que causam crash
            
            // 🔧 Estratégia de retry otimizada para evitar ECONNRESET
            retryStrategy: (times: number) => {
              // Limite de tentativas baseado no ambiente
              const maxRetries = isDevelopment ? 3 : 5;
              
              if (times > maxRetries) {
                console.error(`❌ Redis: desistindo de reconectar após ${times} tentativas`);
                return null; // Para de tentar - emite erro controlado ao invés de crash
              }
              
              // Delay progressivo: mais agressivo em dev, mais conservador em prod
              const baseDelay = isDevelopment ? 200 : 500;
              const maxDelay = isDevelopment ? 2000 : 10000;
              let delay = times * baseDelay;
              
              // Aplica jitter para evitar thundering herd
              delay = delay + Math.random() * 100;
              delay = Math.min(delay, maxDelay);
              
              if (isDevelopment) {
                console.log(`🔄 Redis: tentativa ${times}/${maxRetries} de reconexão em ${Math.round(delay)}ms`);
              } else if (times > 2) {
                console.warn(`⚠️ Redis: tentativa ${times}/${maxRetries} de reconexão em ${Math.round(delay)}ms`);
              }
              
              return delay;
            },
            
            // 🔧 Timeouts para evitar conexões pendentes
            connectTimeout: isDevelopment ? 5000 : 10000,
            commandTimeout: isDevelopment ? 3000 : 5000,
            keepAlive: 30000,
            
            // 🔧 Reconexão automática para erros específicos
            reconnectOnError: (err: Error) => {
              const targetErrors = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'READONLY'];
              const shouldReconnect = targetErrors.some(code => err.message.includes(code));
              
              if (shouldReconnect) {
                console.warn(`🔄 Redis: ${err.message} - tentando reconectar automaticamente`);
                return true; // Tenta reconectar
              }
              
              // Erros críticos não tentam reconexão
              console.error(`❌ Redis: erro crítico - ${err.message}`);
              return false;
            },
            
            // 🔧 Configurações adicionais para estabilidade
            autoResubscribe: true,
            autoResendUnfulfilledCommands: false,
            showFriendlyErrorStack: isDevelopment,
          },
          
          // Configurações padrão dos jobs
          defaultJobOptions: {
            attempts: isDevelopment ? 1 : 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: isDevelopment ? 50 : 100,
            removeOnFail: isDevelopment ? 50 : 200,
            timeout: isDevelopment ? 15000 : 30000,
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

    // 📋 REGISTRO DAS 6 FILAS COM CONFIGURAÇÕES OTIMIZADAS
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
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      },
      {
        name: 'inventory',
        defaultJobOptions: {
          priority: 2,
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          timeout: 10000,
          removeOnComplete: 50,
          removeOnFail: 100,
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