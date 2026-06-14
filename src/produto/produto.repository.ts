import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Produto, ProdutoImagem } from '@prisma/client';
import { BaseRepository } from '../common/utils/baseRepository';

@Injectable()
export class ProdutoRepository extends BaseRepository<Produto> {
  private readonly logger = new Logger(ProdutoRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.produto;
  }

  async createWithImages(data: any, imagens?: any[]): Promise<Produto & { imagens: ProdutoImagem[] }> {
    return this.model.create({
      data: {
        ...data,
        imagens: imagens && imagens.length > 0 ? {
          create: imagens
        } : undefined
      },
      include: {
        imagens: true
      }
    });
  }

  async findByIdWithImages(id: string): Promise<(Produto & { imagens: ProdutoImagem[] }) | null> {
    return this.model.findUnique({
      where: { id },
      include: {
        imagens: {
          orderBy: {
            ordem: 'asc'
          }
        }
      }
    });
  }

  async findBySlug(slug: string): Promise<(Produto & { imagens: ProdutoImagem[] }) | null> {
    return this.model.findFirst({
      where: { slug },
      include: {
        imagens: {
          orderBy: {
            ordem: 'asc'
          }
        }
      }
    });
  }

  async findByCategoria(categoria: string): Promise<Produto[]> {
    return this.model.findMany({
      where: { categoria },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      }
    });
  }

  async findByTag(tag: string): Promise<Produto[]> {
    return this.model.findMany({
      where: { tag },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      }
    });
  }

  async findEmEstoque(): Promise<Produto[]> {
    return this.model.findMany({
      where: { estoque: { gt: 0 } },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      }
    });
  }

  async findComEstoqueBaixo(limite: number = 5): Promise<Produto[]> {
    return this.model.findMany({
      where: { estoque: { lte: limite } },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      }
    });
  }

  async findNovos(dias: number = 30): Promise<Produto[]> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    return this.model.findMany({
      where: {
        createdAt: { gte: dataLimite },
      },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      }
    });
  }

  async findPopulares(limit: number = 10): Promise<Produto[]> {
    return this.model.findMany({
      take: limit,
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        },
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
          { categoria: categoria },
        ],
      },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
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
    for (const produto of produtos) {
      const cores = produto.cores as string[];
      if (cores && Array.isArray(cores)) {
        for (const cor of cores) {
          coresSet.add(cor);
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
    for (const produto of produtos) {
      const tamanhos = produto.tamanhos as string[];
      if (tamanhos && Array.isArray(tamanhos)) {
        for (const tamanho of tamanhos) {
          tamanhosSet.add(tamanho);
        }
      }
    }
    return Array.from(tamanhosSet).sort();
  }

  async addImagem(produtoId: string, imagemData: any): Promise<ProdutoImagem> {
    return this.prisma.produtoImagem.create({
      data: {
        ...imagemData,
        produtoId
      }
    });
  }

  async removeImagem(imagemId: string): Promise<void> {
    await this.prisma.produtoImagem.delete({
      where: { id: imagemId }
    });
  }

  async updateImagemPrincipal(produtoId: string, imagemId: string): Promise<void> {
    // Primeiro, remove isPrincipal de todas as imagens do produto
    await this.prisma.produtoImagem.updateMany({
      where: { produtoId },
      data: { isPrincipal: false }
    });
    
    // Depois, marca a nova imagem como principal
    await this.prisma.produtoImagem.update({
      where: { id: imagemId },
      data: { isPrincipal: true }
    });
  }

  async reorderImagens(produtoId: string, imagensOrdenadas: { id: string; ordem: number }[]): Promise<void> {
    const updates = imagensOrdenadas.map(img => 
      this.prisma.produtoImagem.update({
        where: { id: img.id },
        data: { ordem: img.ordem }
      })
    );
    
    await this.prisma.$transaction(updates);
  }
}