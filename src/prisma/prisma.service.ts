import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static instance: PrismaService; // Singleton pattern
  
  constructor() {
    // Reutilizar instância existente se já existir
    if (PrismaService.instance) {
      return PrismaService.instance;
    }
    
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      
      // 🔥 CONFIGURAÇÃO CRÍTICA - Aumentar pool de conexões
      datasources: {
        db: {
          url: process.env.DATABASE_URL + '?connection_limit=20&pool_timeout=30'
        }
      }
    });
    
    PrismaService.instance = this;
  }

  async onModuleInit() {
    if (!this.$connect) {
      console.log('⚠️ Prisma already connected');
      return;
    }
    
    await this.$connect();
    console.log('✅ Prisma connected to database');
    
    // Log da configuração atual
    console.log(`📊 Pool config: limit=20, timeout=30s`);
  }

  async onModuleDestroy() {
    if (this.$disconnect) {
      await this.$disconnect();
      console.log('🔌 Prisma disconnected from database');
    }
  }

  // Método utilitário para limpar o banco (útil para testes)
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase cannot be called in production');
    }
    
    const models = Reflect.ownKeys(this).filter(
      (key) => key[0] !== '_' && key[0] !== '$' && typeof this[key] === 'object',
    );
    
    return Promise.all(models.map((modelKey) => this[modelKey].deleteMany()));
  }
}