import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static instance: PrismaService;
  
  constructor() {
    if (PrismaService.instance) {
      return PrismaService.instance;
    }
    
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        }
      }
    });
    
    PrismaService.instance = this;
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Prisma connected to database');
    console.log(`📊 Pool config: limit=20, timeout=30s`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Prisma disconnected from database');
  }

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