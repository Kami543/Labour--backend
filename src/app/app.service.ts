import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private readonly prisma = new PrismaClient();

  async getStatus() {
    let dbStatus = 'conectado';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'desconectado';
    }

    return {
      status: 'online',
      ambiente: process.env.NODE_ENV || 'desenvolvimento',
      banco: dbStatus,
      timestamp: new Date().toISOString(),
      versao: '1.0.0',
    };
  }
}