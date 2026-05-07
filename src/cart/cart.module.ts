import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';   // 👈 importe o controller
import { CartRepository } from './cart.repository';
import { ProdutoRepository } from '../produto/produto.repository';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CartController],    // 👈 ADICIONE ESTA LINHA
  providers: [
    CartService,
    CartRepository,
    ProdutoRepository,
    PrismaService,
  ],
  exports: [CartService],
})
export class CartModule {}