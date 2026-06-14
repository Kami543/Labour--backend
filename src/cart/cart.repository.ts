import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartItem } from '@prisma/client';
import { BaseRepository } from '../common/utils/baseRepository';

@Injectable()
export class CartRepository extends BaseRepository<CartItem> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.cartItem;
  }

  // Buscar carrinho completo do usuário (COM IMAGENS)
  async findCartByUser(userId: string) {
    return this.model.findMany({
      where: { userId },
      include: {
        produto: {
          include: {
            imagens: {
              orderBy: { ordem: 'asc' }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Buscar item específico no carrinho (COM IMAGENS)
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
      include: { 
        produto: {
          include: {
            imagens: {
              orderBy: { ordem: 'asc' }
            }
          }
        }
      },
    });
  }

  // Buscar por ID e usuário (para segurança) (COM IMAGENS)
  async findByIdAndUser(id: string, userId: string) {
    return this.model.findFirst({
      where: { id, userId },
      include: { 
        produto: {
          include: {
            imagens: {
              orderBy: { ordem: 'asc' }
            }
          }
        }
      },
    });
  }

  // Adicionar item ao carrinho (COM IMAGENS)
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
      include: { 
        produto: {
          include: {
            imagens: {
              orderBy: { ordem: 'asc' }
            }
          }
        }
      },
    });
  }

  // Atualizar quantidade (COM IMAGENS)
  async updateQuantidade(id: string, quantidade: number) {
    return this.model.update({
      where: { id },
      data: { quantidade },
      include: { 
        produto: {
          include: {
            imagens: {
              orderBy: { ordem: 'asc' }
            }
          }
        }
      },
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

  // Método para verificar se produto está no carrinho
  async isProductInCart(userId: string, produtoId: string): Promise<boolean> {
    const count = await this.model.count({
      where: {
        userId,
        produtoId,
      },
    });
    return count > 0;
  }

  // Obter quantidade total de itens no carrinho
  async getTotalItemsCount(userId: string): Promise<number> {
    const items = await this.model.findMany({
      where: { userId },
      select: { quantidade: true },
    });
    return items.reduce((total, item) => total + item.quantidade, 0);
  }

  // Obter subtotal do carrinho
  async getCartSubtotal(userId: string): Promise<number> {
    const items = await this.model.findMany({
      where: { userId },
      include: {
        produto: {
          select: { preco: true }
        }
      },
    });
    
    return items.reduce((total, item) => {
      return total + (Number(item.produto.preco) * item.quantidade);
    }, 0);
  }

  // Remover múltiplos itens de uma vez
  async removeItems(itemIds: string[]): Promise<void> {
    await this.model.deleteMany({
      where: {
        id: { in: itemIds },
      },
    });
  }

  // Buscar carrinho com informações resumidas (sem detalhes pesados)
  async findCartSummary(userId: string) {
    return this.model.findMany({
      where: { userId },
      select: {
        id: true,
        quantidade: true,
        produtoId: true,
        produto: {
          select: {
            nome: true,
            preco: true,
            // imagem: true, ← REMOVA ESTA LINHA
            slug: true,
            estoque: true,
          }
        }
      },
    });}}