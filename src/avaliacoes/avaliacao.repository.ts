// src/modules/avaliacoes/avaliacao.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Avaliacao } from '@prisma/client';
import { BaseRepository } from '../common/utils/baseRepository';

@Injectable()
export class AvaliacaoRepository extends BaseRepository<Avaliacao> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.avaliacao;
  }

  async deleteById(id: string) {
    return this.model.delete({
      where: { id }
    });
  }

  async findByProduto(produtoId: string, page?: number, limit?: number) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    return this.model.findMany({
      where: { produtoId },
      skip,
      take,
      include: {
        user: {
          select: { 
            id: true,
            nome: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByUser(userId: string) {
    return this.model.findMany({
      where: { userId },
      include: {
        produto: {
          select: { 
            id: true, 
            nome: true,
            slug: true,
            preco: true,
            imagens: {
              where: { isPrincipal: true },
              take: 1,
              select: { url: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByIdAndUser(id: string, userId: string) {
    return this.model.findFirst({
      where: { id, userId },
      include: {
        produto: {
          select: { 
            id: true, 
            nome: true,
            imagens: {
              where: { isPrincipal: true },
              take: 1,
              select: { url: true }
            }
          }
        },
        user: {
          select: { 
            id: true,
            nome: true,
            email: true
          }
        }
      }
    });
  }

  async findUniqueByUserAndProduto(userId: string, produtoId: string) {
    return this.model.findUnique({
      where: {
        userId_produtoId: { userId, produtoId }
      },
      include: {
        produto: {
          select: { 
            id: true, 
            nome: true,
            imagens: {
              where: { isPrincipal: true },
              take: 1,
              select: { url: true }
            }
          }
        }
      }
    });
  }

  async createAvaliacao(data: {
    userId: string;
    produtoId: string;
    nota: number;
    titulo?: string;
    comentario?: string;
  }) {
    return this.model.create({
      data,
      include: {
        user: { 
          select: { 
            id: true,
            nome: true,
            email: true
          } 
        },
        produto: {
          select: { 
            id: true, 
            nome: true,
            imagens: {
              where: { isPrincipal: true },
              take: 1,
              select: { url: true }
            }
          }
        }
      }
    });
  }

  async updateAvaliacao(id: string, data: {
    nota?: number;
    titulo?: string;
    comentario?: string;
  }) {
    return this.model.update({
      where: { id },
      data,
      include: {
        user: { 
          select: { 
            id: true,
            nome: true,
            email: true
          } 
        },
        produto: {
          select: { 
            id: true, 
            nome: true,
            imagens: {
              where: { isPrincipal: true },
              take: 1,
              select: { url: true }
            }
          }
        }
      }
    });
  }

  async getMediaNota(produtoId: string): Promise<number> {
    const result = await this.model.aggregate({
      where: { produtoId },
      _avg: { nota: true }
    });
    return result._avg.nota || 0;
  }

  async countByProduto(produtoId: string): Promise<number> {
    return this.model.count({ where: { produtoId } });
  }

  async getDistribuicaoNotas(produtoId: string) {
    const result = await this.model.groupBy({
      by: ['nota'],
      where: { produtoId },
      _count: { nota: true }
    });
    
    const distribuicao: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      distribuicao[i] = 0;
    }
    
    for (const item of result) {
      distribuicao[item.nota] = item._count.nota;
    }
    
    return distribuicao;
  }

  async getEstatisticasProduto(produtoId: string) {
    const [media, total, distribuicao] = await Promise.all([
      this.getMediaNota(produtoId),
      this.countByProduto(produtoId),
      this.getDistribuicaoNotas(produtoId)
    ]);

    return {
      media: Math.round(media * 10) / 10,
      total,
      distribuicao,
      percentuais: Object.entries(distribuicao).reduce((acc, [nota, count]) => {
        acc[nota] = total > 0 ? Math.round((count / total) * 100) : 0;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  async findRecentByProduto(produtoId: string, limit: number = 5) {
    return this.model.findMany({
      where: { produtoId },
      take: limit,
      include: {
        user: {
          select: { 
            id: true,
            nome: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findAvaliacoesByNota(produtoId: string, nota: number) {
    return this.model.findMany({
      where: { 
        produtoId,
        nota 
      },
      include: {
        user: {
          select: { 
            id: true,
            nome: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async verificarCompraRealizada(userId: string, produtoId: string): Promise<boolean> {
    const pedido = await this.prisma.pedido.findFirst({
      where: {
        userId,
        status: 'entregue',
        itens: {
          some: {
            produtoId
          }
        }
      }
    });
    return !!pedido;
  }
}