
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Produto } from '@prisma/client';
import { BaseRepository } from '../common/utils/baseRepository';
import { CategoriaProduto } from './dto/produto.dto';

@Injectable()
export class ProdutoRepository extends BaseRepository<Produto> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.produto;
  }

  async findBySlug(slug: string): Promise<Produto | null> {
    return this.model.findFirst({
      where: { slug },
    });
  }

  async findByCategoria(categoria: string): Promise<Produto[]> {
    return this.model.findMany({
      where: { categoria: categoria as CategoriaProduto }, // Add type casting
    });
  }

  async findByTag(tag: string): Promise<Produto[]> {
    return this.model.findMany({
      where: { tag },
    });
  }

  async findEmEstoque(): Promise<Produto[]> {
    return this.model.findMany({
      where: { estoque: { gt: 0 } },
    });
  }

  async findComEstoqueBaixo(limite: number = 5): Promise<Produto[]> {
    return this.model.findMany({
      where: { estoque: { lte: limite } },
    });
  }

  async findNovos(dias: number = 30): Promise<Produto[]> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    return this.model.findMany({
      where: {
        createdAt: { gte: dataLimite },
      },
    });
  }

  async findPopulares(limit: number = 10): Promise<Produto[]> {
    return this.model.findMany({
      take: limit,
      include: {
        _count: { select: { avaliacoes: true } },
      },
      orderBy: {
        avaliacoes: { _count: 'desc' },
      },
    });
  }

  async findSimilares(produtoId: string, categoria: string, limit: number = 5): Promise<Produto[]> {
    return this.model.findMany({
      where: {
        AND: [
          { id: { not: produtoId } },
          { categoria: categoria as CategoriaProduto },
        ],
      },
      take: limit,
    });
  }
  

  async updateEstoque(produtoId: string, quantidade: number): Promise<Produto> {
    return this.model.update({
      where: { id: produtoId },
      data: { estoque: quantidade },
    });
  }

  async incrementEstoque(produtoId: string, quantidade: number): Promise<Produto> {
    const produto = await this.findById(produtoId);
    const novoEstoque = (produto?.estoque || 0) + quantidade;
    return this.updateEstoque(produtoId, novoEstoque);
  }

  async decrementEstoque(produtoId: string, quantidade: number): Promise<Produto> {
    const produto = await this.findById(produtoId);
    const novoEstoque = Math.max(0, (produto?.estoque || 0) - quantidade);
    return this.updateEstoque(produtoId, novoEstoque);
  }

  async getAvaliacaoMedia(produtoId: string): Promise<number> {
    const result = await this.prisma.avaliacao.aggregate({
      where: { produtoId },
      _avg: { nota: true },
    });
    return result._avg.nota || 0;
  }

  async countAvaliacoes(produtoId: string): Promise<number> {
    return this.prisma.avaliacao.count({
      where: { produtoId },
    });
  }

  async getCoresDisponiveis(): Promise<string[]> {
    const produtos = await this.model.findMany({
      select: { cores: true },
    });

    const coresSet = new Set<string>();
    for (let i = 0; i < produtos.length; i++) {
      const cores = produtos[i].cores as string[];
      if (cores && Array.isArray(cores)) {
        for (let j = 0; j < cores.length; j++) {
          coresSet.add(cores[j]);
        }
      }
    }
    return Array.from(coresSet).sort();
  }

  async getTamanhosDisponiveis(): Promise<string[]> {
    const produtos = await this.model.findMany({
      select: { tamanhos: true },
    });

    const tamanhosSet = new Set<string>();
    for (let i = 0; i < produtos.length; i++) {
      const tamanhos = produtos[i].tamanhos as string[];
      if (tamanhos && Array.isArray(tamanhos)) {
        for (let j = 0; j < tamanhos.length; j++) {
          tamanhosSet.add(tamanhos[j]);
        }
      }
    }
    return Array.from(tamanhosSet).sort();
  }
}