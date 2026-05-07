// src/modules/avaliacoes/avaliacoes.module.ts
import { Module } from '@nestjs/common';
import { AvaliacoesController } from './avaliacoes.controller';
import { AvaliacoesService } from './avaliacoes.service';
import { AvaliacaoRepository } from './avaliacao.repository';
import { ProdutoRepository } from '../produto/produto.repository';
import { PedidoRepository } from '../pedidos/pedido.repository';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AvaliacoesController],
  providers: [
    AvaliacoesService,
    AvaliacaoRepository,
    ProdutoRepository,
    PedidoRepository,
    PrismaService,
  ],
  exports: [AvaliacoesService],
})
export class AvaliacoesModule {}