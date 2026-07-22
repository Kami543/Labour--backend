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
    // ─── GARANTE QUE OS CAMPOS DE PROMOÇÃO ESTÃO PRESENTES ───
    const createData = {
      ...data,
      // Garante valores padrão para campos de promoção
      precoPromocional: data.precoPromocional || null,
      desconto: data.desconto || 0,
      promocaoAtiva: data.promocaoAtiva || false,
    };

    return this.model.create({
      data: {
        ...createData,
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
      where: { id, deletedAt: null },
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
      where: { slug, deletedAt: null },
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
      where: { 
        categoria,
        deletedAt: null 
      },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findByTag(tag: string): Promise<Produto[]> {
    return this.model.findMany({
      where: { 
        tag,
        deletedAt: null 
      },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findEmEstoque(): Promise<Produto[]> {
    return this.model.findMany({
      where: { 
        estoque: { gt: 0 },
        deletedAt: null 
      },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findComEstoqueBaixo(limite: number = 5): Promise<Produto[]> {
    return this.model.findMany({
      where: { 
        estoque: { lte: limite },
        deletedAt: null 
      },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      },
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
        deletedAt: null,
      },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findPopulares(limit: number = 10): Promise<Produto[]> {
    return this.model.findMany({
      where: {
        deletedAt: null
      },
      take: limit,
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        },
        _count: { 
          select: { 
            avaliacoes: true,
            pedidos: true
          } 
        },
      },
      orderBy: [
        {
          avaliacoes: { _count: 'desc' },
        },
        {
          pedidos: { _count: 'desc' },
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findSimilares(produtoId: string, categoria: string, limit: number = 5): Promise<Produto[]> {
    return this.model.findMany({
      where: {
        AND: [
          { id: { not: produtoId } },
          { categoria: categoria },
          { deletedAt: null },
        ],
      },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      },
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // ─── NOVO: BUSCAR PRODUTOS EM PROMOÇÃO ───
  async findEmPromocao(): Promise<Produto[]> {
    return this.model.findMany({
      where: {
        promocaoAtiva: true,
        desconto: { gt: 0 },
        deletedAt: null,
      },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      },
      orderBy: {
        desconto: 'desc'
      }
    });
  }

  // ─── NOVO: BUSCAR PRODUTOS COM MAIOR DESCONTO ───
  async findMaioresDescontos(limit: number = 10): Promise<Produto[]> {
    return this.model.findMany({
      where: {
        promocaoAtiva: true,
        desconto: { gt: 0 },
        deletedAt: null,
      },
      include: {
        imagens: {
          where: { isPrincipal: true },
          take: 1
        }
      },
      orderBy: {
        desconto: 'desc'
      },
      take: limit
    });
  }

  async update(id: string, data: any): Promise<Produto> {
    // ─── PREPARA OS DADOS PARA UPDATE ───
    const updateData: any = {};
    
    // Mapeia todos os campos que podem ser atualizados
    const camposPermitidos = [
      'nome', 'slug', 'descricao', 'preco', 'categoria', 
      'tag', 'estoque', 'cores', 'tamanhos',
      // ─── CAMPOS DE PROMOÇÃO ───
      'precoPromocional', 'desconto', 'promocaoAtiva'
    ];

    for (const campo of camposPermitidos) {
      if (data[campo] !== undefined) {
        updateData[campo] = data[campo];
      }
    }

    // Se precoPromocional for undefined ou null, mantém o valor existente
    if (data.precoPromocional === undefined) {
      // Não atualiza, mantém o valor atual
    }

    return this.model.update({
      where: { id },
      data: updateData,
      include: {
        imagens: {
          orderBy: {
            ordem: 'asc'
          }
        }
      }
    });
  }

  async updateEstoque(produtoId: string, quantidade: number): Promise<Produto> {
    return this.model.update({
      where: { id: produtoId },
      data: { estoque: quantidade },
      include: {
        imagens: {
          orderBy: {
            ordem: 'asc'
          }
        }
      }
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
      where: { deletedAt: null },
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
        this.logger.warn(`Erro ao parsear cores do produto: ${error.message}`);
      }
    }
    return Array.from(coresSet).sort();
  }

  async getTamanhosDisponiveis(): Promise<string[]> {
    const produtos = await this.model.findMany({
      where: { deletedAt: null },
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
        this.logger.warn(`Erro ao parsear tamanhos do produto: ${error.message}`);
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

  // ─── MÉTODO PARA ATUALIZAR APENAS A PROMOÇÃO ───
  async updatePromocao(produtoId: string, dadosPromocao: {
    precoPromocional?: number;
    desconto?: number;
    promocaoAtiva?: boolean;
  }): Promise<Produto> {
    const updateData: any = {};
    
    if (dadosPromocao.precoPromocional !== undefined) {
      updateData.precoPromocional = dadosPromocao.precoPromocional;
    }
    if (dadosPromocao.desconto !== undefined) {
      updateData.desconto = dadosPromocao.desconto;
    }
    if (dadosPromocao.promocaoAtiva !== undefined) {
      updateData.promocaoAtiva = dadosPromocao.promocaoAtiva;
    }

    return this.model.update({
      where: { id: produtoId },
      data: updateData,
      include: {
        imagens: {
          orderBy: {
            ordem: 'asc'
          }
        }
      }
    });
  }

  // ─── MÉTODO PARA BUSCAR PRODUTOS COM FILTROS AVANÇADOS ───
  async findWithFilters(filters: {
    categoria?: string;
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
    const where: any = { deletedAt: null };

    if (categoria) {
      where.categoria = {
        equals: categoria,
        mode: 'insensitive'
      };
    }

    if (precoMin !== undefined || precoMax !== undefined) {
      where.preco = {};
      if (precoMin !== undefined) where.preco.gte = precoMin;
      if (precoMax !== undefined) where.preco.lte = precoMax;
    }

    if (emPromocao) {
      where.promocaoAtiva = true;
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
        { categoria: { contains: busca, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        include: {
          imagens: {
            orderBy: {
              ordem: 'asc'
            }
          }
        },
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