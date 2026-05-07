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
          select: { nome: true }
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
          select: { id: true, nome: true, imagem: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByIdAndUser(id: string, userId: string) {
    return this.model.findFirst({
      where: { id, userId }
    });
  }

  async findUniqueByUserAndProduto(userId: string, produtoId: string) {
    return this.model.findUnique({
      where: {
        userId_produtoId: { userId, produtoId }
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
        user: { select: { nome: true } }
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
      data
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
    return result.reduce((acc, curr) => {
      acc[curr.nota] = curr._count.nota;
      return acc;
    }, {} as Record<number, number>);
  }
}