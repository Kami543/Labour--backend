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
      log: ['error'],
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });

    PrismaService.instance = this;
  }

  async onModuleInit() {
    // Timeout de 10s — se o banco não responder, o app sobe mesmo assim
    // e falha na primeira query com erro claro em vez de travar o boot
    const connectWithTimeout = Promise.race([
      this.$connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Prisma $connect timeout (10s)')), 10_000),
      ),
    ]);

    try {
      await connectWithTimeout;
      this.logger.log('Prisma connected');
    } catch (err: any) {
      // Em produção, logar e continuar — não derrubar o processo
      // O Prisma tenta reconectar automaticamente na próxima query
      this.logger.error(`Prisma connect failed: ${err.message}`);
      if (process.env.NODE_ENV !== 'production') throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}