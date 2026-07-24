// src/produto/produto.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Produto, CategoriaProduto } from '@prisma/client';
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

  // ─── CRIAÇÃO COM IMAGEM (SINGLE STRING) ───
  async createWithImages(data: any, imagens?: any[]): Promise<Produto> {
    const createData = {
      ...data,
      preco_promocional: data.preco_promocional || data.precoPromocional || null,
      desconto: data.desconto || 0,
      promocao_ativa: data.promocao_ativa || data.promocaoAtiva || false,
    };

    // Se houver imagens, pega a primeira como imagem principal
    if (imagens && imagens.length > 0) {
      const imagemPrincipal = imagens.find(img => img.isPrincipal) || imagens[0];
      createData.imagem = imagemPrincipal.url;
    }

    return this.model.create({
      data: createData,
    });
  }

  async findByIdWithImages(id: string): Promise<Produto | null> {
    return this.model.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<Produto | null> {
    return this.model.findFirst({
      where: { slug },
    });
  }

  async findByCategoria(categoria: CategoriaProduto): Promise<Produto[]> {
    return this.model.findMany({
      where: { categoria },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findByTag(tag: string): Promise<Produto[]> {
    return this.model.findMany({
      where: { tag },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findEmEstoque(): Promise<Produto[]> {
    return this.model.findMany({
      where: { estoque: { gt: 0 } },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findComEstoqueBaixo(limite: number = 5): Promise<Produto[]> {
    return this.model.findMany({
      where: { estoque: { lte: limite } },
      orderBy: {
        estoque: 'asc'
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
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findPopulares(limit: number = 10): Promise<Produto[]> {
    return this.model.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findSimilares(produtoId: string, categoria: CategoriaProduto, limit: number = 5): Promise<Produto[]> {
    return this.model.findMany({
      where: {
        AND: [
          { id: { not: produtoId } },
          { categoria: categoria },
        ],
      },
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // ─── BUSCAR PRODUTOS EM PROMOÇÃO ───
  async findEmPromocao(): Promise<Produto[]> {
    return this.model.findMany({
      where: {
        promocao_ativa: true,
        desconto: { gt: 0 },
      },
      orderBy: {
        desconto: 'desc'
      }
    });
  }

  // ─── BUSCAR PRODUTOS COM MAIOR DESCONTO ───
  async findMaioresDescontos(limit: number = 10): Promise<Produto[]> {
    return this.model.findMany({
      where: {
        promocao_ativa: true,
        desconto: { gt: 0 },
      },
      orderBy: {
        desconto: 'desc'
      },
      take: limit
    });
  }

  async update(id: string, data: any): Promise<Produto> {
    const updateData: any = {};
    
    const camposPermitidos = [
      'nome', 'slug', 'descricao', 'preco', 'categoria', 
      'tag', 'estoque', 'cores', 'tamanhos', 'imagem',
      'preco_promocional', 'desconto', 'promocao_ativa'
    ];

    for (const campo of camposPermitidos) {
      if (data[campo] !== undefined) {
        updateData[campo] = data[campo];
      }
    }

    // Suporte para camelCase
    if (data.precoPromocional !== undefined && updateData.preco_promocional === undefined) {
      updateData.preco_promocional = data.precoPromocional;
    }
    if (data.promocaoAtiva !== undefined && updateData.promocao_ativa === undefined) {
      updateData.promocao_ativa = data.promocaoAtiva;
    }

    return this.model.update({
      where: { id },
      data: updateData,
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
      try {
        const cores = typeof produto.cores === 'string' 
          ? JSON.parse(produto.cores) 
          : produto.cores;
        
        if (cores && Array.isArray(cores)) {
          for (const cor of cores) {
            if (cor && typeof cor === 'string') {
              coresSet.add(cor.trim());
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.warn(`Erro ao parsear cores do produto: ${message}`);
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
      try {
        const tamanhos = typeof produto.tamanhos === 'string'
          ? JSON.parse(produto.tamanhos)
          : produto.tamanhos;
        
        if (tamanhos && Array.isArray(tamanhos)) {
          for (const tamanho of tamanhos) {
            if (tamanho && typeof tamanho === 'string') {
              tamanhosSet.add(tamanho.trim());
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.warn(`Erro ao parsear tamanhos do produto: ${message}`);
      }
    }
    return Array.from(tamanhosSet).sort();
  }

  // ─── MÉTODOS DE IMAGEM (AGORA SIMPLES) ───
  async updateImagem(produtoId: string, imagemUrl: string): Promise<Produto> {
    return this.model.update({
      where: { id: produtoId },
      data: { imagem: imagemUrl },
    });
  }

  // ─── MÉTODO PARA ATUALIZAR APENAS A PROMOÇÃO ───
  async updatePromocao(produtoId: string, dadosPromocao: {
    preco_promocional?: number;
    desconto?: number;
    promocao_ativa?: boolean;
  }): Promise<Produto> {
    const updateData: any = {};
    
    if (dadosPromocao.preco_promocional !== undefined) {
      updateData.preco_promocional = dadosPromocao.preco_promocional;
    }
    if (dadosPromocao.desconto !== undefined) {
      updateData.desconto = dadosPromocao.desconto;
    }
    if (dadosPromocao.promocao_ativa !== undefined) {
      updateData.promocao_ativa = dadosPromocao.promocao_ativa;
    }

    return this.model.update({
      where: { id: produtoId },
      data: updateData,
    });
  }

  // ─── MÉTODO PARA BUSCAR PRODUTOS COM FILTROS ───
  async findWithFilters(filters: {
    categoria?: CategoriaProduto;
    precoMin?: number;
    precoMax?: number;
    emPromocao?: boolean;
    tag?: string;
    busca?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Produto[]; total: number }> {
    const { 
      categoria, 
      precoMin, 
      precoMax, 
      emPromocao, 
      tag, 
      busca,
      page = 1,
      limit = 10 
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (categoria) {
      where.categoria = categoria;
    }

    if (precoMin !== undefined || precoMax !== undefined) {
      where.preco = {};
      if (precoMin !== undefined) where.preco.gte = precoMin;
      if (precoMax !== undefined) where.preco.lte = precoMax;
    }

    if (emPromocao) {
      where.promocao_ativa = true;
      where.desconto = { gt: 0 };
    }

    if (tag) {
      where.tag = {
        equals: tag,
        mode: 'insensitive'
      };
    }

    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { descricao: { contains: busca, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.model.count({ where })
    ]);

    return { data, total };
  }
}