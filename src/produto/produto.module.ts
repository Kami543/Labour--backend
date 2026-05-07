
import { Module } from '@nestjs/common';
import { ProdutoController } from './produto.controller';
import { ProdutoService } from './produto.service';
import { ProdutoRepository } from './produto.repository';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ProdutoController],
  providers: [ProdutoService, ProdutoRepository, PrismaService],
  exports: [ProdutoService, ProdutoRepository],
})
export class ProdutoModule {}