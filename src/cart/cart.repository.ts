import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartItem } from '@prisma/client';
import { BaseRepository } from '../../common/utils/baseRepository';

@Injectable()
export class CartRepository extends BaseRepository<CartItem> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.cartItem;
  }

  // Buscar carrinho completo do usuário
  async findCartByUser(userId: string) {
    return this.model.findMany({
      where: { userId },
      include: {
        produto: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Buscar item específico no carrinho
  async findCartItem(
    userId: string,
    produtoId: string,
    tamanho?: string,
    cor?: string,
  ) {
    return this.model.findFirst({
      where: {
        userId,
        produtoId,
        tamanho: tamanho || null,
        cor: cor || null,
      },
      include: { produto: true },
    });
  }

  // Buscar por ID e usuário (para segurança)
  async findByIdAndUser(id: string, userId: string) {
    return this.model.findFirst({
      where: { id, userId },
      include: { produto: true },
    });
  }

  // Adicionar item ao carrinho
  async addItem(data: {
    userId: string;
    produtoId: string;
    quantidade: number;
    tamanho?: string;
    cor?: string;
  }) {
    return this.model.create({
      data: {
        userId: data.userId,
        produtoId: data.produtoId,
        quantidade: data.quantidade,
        tamanho: data.tamanho,
        cor: data.cor,
      },
      include: { produto: true },
    });
  }

  // Atualizar quantidade
  async updateQuantidade(id: string, quantidade: number) {
    return this.model.update({
      where: { id },
      data: { quantidade },
      include: { produto: true },
    });
  }

  // Remover item do carrinho
  async removeItem(id: string) {
    return this.model.delete({
      where: { id },
    });
  }

  // Limpar carrinho completo
  async clearCart(userId: string) {
    return this.model.deleteMany({
      where: { userId },
    });
  }
}