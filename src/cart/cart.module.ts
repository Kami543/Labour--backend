import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartRepository } from './cart.repository';
import { ProdutoRepository } from '../produtos/produto.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [
    CartService,
    CartRepository,
    ProdutoRepository,
    PrismaService,
  ],
  exports: [CartService],
})
export class CartModule {}