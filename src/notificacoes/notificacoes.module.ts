// src/modules/notificacoes/notificacoes.module.ts
import { Module } from '@nestjs/common';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';
import { NotificacaoRepository } from './notificacao.repository';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [NotificacoesController],
  providers: [
    NotificacoesService,
    NotificacaoRepository,
    PrismaService,
  ],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}