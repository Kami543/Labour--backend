// src/modules/notificacoes/notificacoes.module.ts
import { Module } from '@nestjs/common';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';
import { NotificacaoRepository } from './notificacao.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // <-- Importa PrismaModule em vez de instanciar PrismaService
  controllers: [NotificacoesController],
  providers: [
    NotificacoesService,
    NotificacaoRepository,
    // PrismaService removido daqui - vem do PrismaModule
  ],
  exports: [NotificacoesService, NotificacaoRepository], // <-- Exporta também o repository se for usado em outros módulos
})
export class NotificacoesModule {}