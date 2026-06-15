import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static instance: PrismaService;
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    if (PrismaService.instance) {
      return PrismaService.instance;
    }

    super({
      log: process.env.NODE_ENV === 'development'
        ? ['warn', 'error']   // ← removido 'query' e 'info' — cada query logada aloca string
        : ['error'],
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });

    PrismaService.instance = this;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase cannot be called in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => key[0] !== '_' && key[0] !== '$' && typeof (this as any)[key] === 'object',
    );

    return Promise.all(models.map((modelKey) => (this as any)[modelKey].deleteMany()));
  }
}