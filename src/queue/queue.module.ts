// src/queue/queue.module.ts - VERSÃO LAZY
import { Module, DynamicModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

@Module({})
export class QueueModule implements OnModuleInit {
  private static instance: DynamicModule;

  async onModuleInit() {
    // Só carrega se REDIS_URL existir
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      console.log('📦 Carregando módulo de filas (Bull)');
      await import('@nestjs/bull');
      await import('bull');
    } else {
      console.log('⚠️ Redis não configurado, módulo de filas desativado');
    }
  }

  static forRoot(): DynamicModule {
    if (this.instance) {
      return this.instance;
    }

    // Verifica se Redis está configurado
    const hasRedis = process.env.REDIS_URL || process.env.REDIS_HOST;
    
    if (!hasRedis) {
      // Módulo vazio (sem filas)
      return {
        module: QueueModule,
        providers: [],
        exports: [],
      };
    }

    // Importação dinâmica dos módulos Bull
    const bullImports = [];
    const bullProviders = [];

    try {
      // Tenta importar Bull (falha silenciosamente se não disponível)
      const { BullModule } = require('@nestjs/bull');
      
      bullImports.push(
        BullModule.registerQueue(
          { name: 'payment' },
          { name: 'notification' },
          { name: 'email' },
          { name: 'fraud-check' },
          { name: 'order-processing' },
          { name: 'inventory' },
        )
      );
    } catch (error) {
      console.log('Bull não disponível, executando sem filas');
    }

    this.instance = {
      module: QueueModule,
      imports: [
        PrismaModule,
        ConfigModule,
        ...bullImports,
      ],
      controllers: [],
      providers: bullProviders,
      exports: [],
    };

    return this.instance;
  }
}