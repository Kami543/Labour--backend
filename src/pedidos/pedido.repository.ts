// pedido.repository.ts - VERSÃO CORRIGIDA (sem campo 'imagem')

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Pedido, StatusPedido } from '@prisma/client';
import { BaseRepository } from '../common/utils/baseRepository';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PedidoRepository extends BaseRepository<Pedido> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.pedido;
  }

  // ========== MÉTODOS EXISTENTES ==========
  
  async findByUser(userId: string, page?: number, limit?: number) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    return this.model.findMany({
      where: { userId },
      skip,
      take,
      include: {
        itens: {
          include: { 
            produto: {
              include: {
                imagens: {
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
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
        itens: {
          include: { 
            produto: {
              include: {
                imagens: {
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            cpf: true,
          }
        }
      }
    });
  }

  async findByNumero(numero: string) {
    return this.model.findUnique({
      where: { numero },
      include: {
        itens: {
          include: { 
            produto: {
              include: {
                imagens: {
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          }
        }
      }
    });
  }

  async createPedido(data: {
    userId: string;
    subtotal: number;
    frete: number;
    imposto: number;
    total: number;
    enderecoEntrega: any;
    observacoes?: string;
    status: StatusPedido;
  }) {
    return this.model.create({
      data: {
        userId: data.userId,
        numero: this.generateNumeroPedido(),
        subtotal: data.subtotal,
        frete: data.frete,
        imposto: data.imposto,
        total: data.total,
        enderecoEntrega: data.enderecoEntrega,
        observacoes: data.observacoes,
        status: data.status,
      },
      include: {
        itens: true,
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          }
        }
      }
    });
  }

  async createPedidoItem(data: {
    pedidoId: string;
    produtoId: string;
    quantidade: number;
    precoUnitario: number | Decimal;
    tamanho?: string | null;
    cor?: string | null;
  }) {
    const precoUnitario = data.precoUnitario instanceof Decimal 
      ? data.precoUnitario 
      : new Decimal(data.precoUnitario);
    
    return this.prisma.pedidoItem.create({
      data: {
        pedidoId: data.pedidoId,
        produtoId: data.produtoId,
        quantidade: data.quantidade,
        precoUnitario: precoUnitario,
        tamanho: data.tamanho,
        cor: data.cor,
      }
    });
  }

  async updateStatus(id: string, status: StatusPedido, dataEnvio?: Date, codigoRastreio?: string) {
    const updateData: any = { status };
    if (dataEnvio) updateData.dataEnvio = dataEnvio;
    if (codigoRastreio) updateData.codigoRastreio = codigoRastreio;
    if (status === 'entregue') updateData.dataEntrega = new Date();

    return this.model.update({
      where: { id },
      data: updateData,
      include: {
        itens: {
          include: { 
            produto: {
              include: {
                imagens: {
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          }
        }
      }
    });
  }

  async updatePagamento(id: string, dataPagamento: Date) {
    return this.model.update({
      where: { id },
      data: { dataPagamento, status: 'pagamento_confirmado' }
    });
  }

  async countByUser(userId: string) {
    return this.model.count({ where: { userId } });
  }

  private generateNumeroPedido(): string {
    return `PED-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  // ========== MÉTODOS PARA ADMIN (CORRIGIDOS) ==========

  /**
   * Buscar pedido por ID sem restrição de usuário (para admin)
   * CORRIGIDO - sem campo 'imagem'
   */
  async findById(id: string) {
    return this.model.findUnique({
      where: { id },
      include: {
        itens: {
          include: { 
            produto: {
              select: {
                id: true,
                nome: true,
                preco: true,
                slug: true,
                imagens: {  // ← CORRIGIDO: imagens em vez de imagem
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            cpf: true,
          }
        }
      }
    });
  }

  /**
   * Buscar todos os pedidos com filtros e paginação (para admin)
   * CORRIGIDO - sem campo 'imagem'
   */
  async findAllWithFilters(where: any, skip: number, take: number) {
    return this.model.findMany({
      where,
      skip,
      take,
      include: {
        itens: {
          include: { 
            produto: {
              select: {
                id: true,
                nome: true,
                preco: true,
                slug: true,
                imagens: {  // ← CORRIGIDO: imagens em vez de imagem
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            cpf: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Contar total de pedidos com filtros (para admin)
   */
  async countAllWithFilters(where: any) {
    return this.model.count({ where });
  }

  /**
   * Buscar pedidos por status (para admin)
   */
  async findByStatus(status: StatusPedido, page?: number, limit?: number) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    return this.model.findMany({
      where: { status },
      skip,
      take,
      include: {
        itens: {
          include: { 
            produto: {
              include: {
                imagens: {
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Buscar pedidos por período (para admin)
   */
  async findByPeriod(startDate: Date, endDate: Date, page?: number, limit?: number) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    return this.model.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        }
      },
      skip,
      take,
      include: {
        itens: {
          include: { 
            produto: {
              include: {
                imagens: {
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Buscar estatísticas de pedidos (para dashboard admin)
   */
  async getOrderStats() {
    const [total, pending, paid, shipped, delivered, cancelled, totalValue] = await Promise.all([
      this.model.count(),
      this.model.count({ where: { status: 'pendente' } }),
      this.model.count({ where: { status: 'pagamento_confirmado' } }),
      this.model.count({ where: { status: 'enviado' } }),
      this.model.count({ where: { status: 'entregue' } }),
      this.model.count({ where: { status: 'cancelado' } }),
      this.model.aggregate({
        _sum: {
          total: true
        }
      }),
    ]);

    return {
      total,
      pending,
      paid,
      shipped,
      delivered,
      cancelled,
      totalRevenue: totalValue._sum.total || 0,
    };
  }

  /**
   * Buscar pedidos recentes (para dashboard admin)
   * CORRIGIDO - sem campo 'imagem'
   */
  async findRecentOrders(limit: number = 10) {
    return this.model.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          }
        },
        itens: {
          take: 3,
          include: {
            produto: {
              select: {
                nome: true,
                imagens: {  // ← CORRIGIDO: imagens em vez de imagem
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Atualizar código de rastreio de um pedido
   */
  async updateRastreio(id: string, codigoRastreio: string) {
    return this.model.update({
      where: { id },
      data: { 
        codigoRastreio,
        dataEnvio: new Date(),
        status: 'enviado'
      },
      include: {
        itens: {
          include: { 
            produto: {
              include: {
                imagens: {
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          }
        }
      }
    });
  }

  /**
   * Buscar pedidos por cliente (email, nome ou CPF)
   * CORRIGIDO - sem campo 'imagem'
   */
  async findByCliente(searchTerm: string, page?: number, limit?: number) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    return this.model.findMany({
      where: {
        OR: [
          { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
          { user: { nome: { contains: searchTerm, mode: 'insensitive' } } },
          { user: { cpf: { contains: searchTerm } } },
          { numero: { contains: searchTerm, mode: 'insensitive' } },
        ]
      },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            cpf: true,
          }
        },
        itens: {
          include: { 
            produto: {
              select: {
                id: true,
                nome: true,
                preco: true,
                slug: true,
                imagens: {  // ← CORRIGIDO: imagens em vez de imagem
                  where: { isPrincipal: true },
                  take: 1,
                  select: { url: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Contar pedidos por status (para dashboard)
   */
  async countByStatus() {
    const statuses = Object.values(StatusPedido);
    const counts = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await this.model.count({ where: { status } })
      }))
    );
    return counts;
  }

  /**
   * Buscar faturamento por período
   */
  async getRevenueByPeriod(startDate: Date, endDate: Date) {
    const result = await this.model.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          not: 'cancelado'
        }
      },
      _sum: {
        total: true
      },
      _count: true
    });

    return {
      totalRevenue: result._sum.total || 0,
      totalOrders: result._count,
    };
  }
}