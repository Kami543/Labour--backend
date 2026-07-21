// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static instance: PrismaService;
  private readonly logger = new Logger(PrismaService.name);
  private connectionAttempts = 0;

  constructor() {
    if (PrismaService.instance) {
      return PrismaService.instance;
    }

    const url = process.env.DATABASE_URL;
    
    if (!url) {
      console.error('❌ DATABASE_URL não está definida no .env.dev');
      console.error('📋 Defina DATABASE_URL="postgresql://..." no .env.dev');
    }

    const maskedUrl = url?.replace(/:[^:@]+@/, ':****@');
    console.log('🔍 DATABASE_URL:', maskedUrl);

    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
      datasources: {
        db: { url },
      },
    });

    PrismaService.instance = this;
  }

  async onModuleInit() {
    const TIMEOUT = 30000; // 30 segundos
    const maxAttempts = 3;
    
    while (this.connectionAttempts < maxAttempts) {
      this.connectionAttempts++;
      this.logger.log(`🔄 Tentativa ${this.connectionAttempts}/${maxAttempts} de conexão...`);

      try {
        const connectWithTimeout = Promise.race([
          this.$connect(),
          new Promise((_, reject) =>
            setTimeout(() => {
              reject(new Error(`Timeout de ${TIMEOUT/1000}s`));
            }, TIMEOUT),
          ),
        ]);

        await connectWithTimeout;
        this.logger.log('✅ Prisma conectado com sucesso!');
        return;
      } catch (err: any) {
        this.logger.error(`❌ Falha na tentativa ${this.connectionAttempts}: ${err.message}`);
        
        if (this.connectionAttempts < maxAttempts) {
          this.logger.log(`⏳ Aguardando 3 segundos antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    this.logger.error('❌ Todas as tentativas de conexão falharam');
    this.logger.error('📋 Verifique:');
    this.logger.error(`  1. DATABASE_URL="${process.env.DATABASE_URL}" está correta?`);
    this.logger.error('  2. O banco de dados está online (Supabase/PostgreSQL)');
    this.logger.error('  3. O IP está liberado no firewall/Supabase');
    this.logger.error('  4. As credenciais estão corretas');
    
    if (process.env.NODE_ENV !== 'production') {
      throw new Error('Não foi possível conectar ao banco de dados');
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Desconectando do banco...');
    await this.$disconnect();
  }

  // Método para verificar a conexão antes de cada query (opcional)
  async ensureConnection() {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error('❌ Falha ao garantir conexão com o banco');
      throw error;
    }
  }
}