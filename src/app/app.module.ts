import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';

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

// Middleware para autenticação do Bull Board
class BullBoardAuthMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // Configuração básica de autenticação
    const auth = req.headers.authorization;
    const validUser = process.env.BULL_BOARD_USER || 'admin';
    const validPass = process.env.BULL_BOARD_PASS || 'laboure2026';
    
    if (!auth) {
      res.setHeader('WWW-Authenticate', 'Basic');
      return res.status(401).send('Authentication required');
    }
    
    const base64 = auth.split(' ')[1];
    const [user, pass] = Buffer.from(base64, 'base64').toString().split(':');
    
    if (user === validUser && pass === validPass) {
      return next();
    }
    
    res.setHeader('WWW-Authenticate', 'Basic');
    res.status(401).send('Invalid credentials');
  }
}

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

    // 🔧 CONFIGURAÇÃO DO REDIS COM Bull
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isProduction = process.env.NODE_ENV === 'production';
        
        return {
          redis: {
            host: configService.get<string>('redis.host', 'localhost'),
            port: configService.get<number>('redis.port', 6379),
            password: configService.get<string>('redis.password'),
            db: configService.get<number>('redis.db', 0),
            keyPrefix: configService.get<string>('redis.prefix', 'laboure:'),
            
            tls: isProduction ? {} : undefined,
            enableOfflineQueue: true,
            
            retryStrategy: (times: number) => {
              const maxRetries = isDevelopment ? 3 : 5;
              
              if (times > maxRetries) {
                console.error(`❌ Redis: desistindo de reconectar após ${times} tentativas`);
                return null;
              }
              
              const delay = Math.min(times * 200, 5000);
              
              if (isDevelopment && times > 1) {
                console.log(`🔄 Redis: tentativa ${times} de reconexão em ${delay}ms`);
              }
              
              return delay;
            },
            
            connectTimeout: 10000,
            commandTimeout: 5000,
            keepAlive: 30000,
            
            reconnectOnError: (err: Error) => {
              const targetErrors = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'];
              const shouldReconnect = targetErrors.some(code => err.message.includes(code));
              
              if (shouldReconnect) {
                console.warn(`🔄 Redis: ${err.message} - tentando reconectar`);
                return true;
              }
              
              return false;
            },
          },
          
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

    // 📋 REGISTRO DAS 6 FILAS
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

    // 📊 BULL BOARD - Monitoramento de Filas
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    
    // Registrar cada fila no Bull Board
    BullBoardModule.forFeature({
      name: 'payment',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'notification',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'email',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'fraud-check',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'order-processing',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'inventory',
      adapter: ExpressAdapter,
    }),

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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Proteger o Bull Board com autenticação básica
    consumer
      .apply(BullBoardAuthMiddleware)
      .forRoutes('/admin/queues');
  }
}