import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Pedido } from '@prisma/client';
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

  async findByUser(userId: string, page?: number, limit?: number) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    return this.model.findMany({
      where: { userId },
      skip,
      take,
      include: {
        itens: {
          include: { produto: true }
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
          include: { produto: true }
        },
        user: true
      }
    });
  }

  async findByNumero(numero: string) {
    return this.model.findUnique({
      where: { numero }
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
    status: any;
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
        user: true
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
    
    // Calculate subtotal
    const subtotal = precoUnitario.times(data.quantidade);
    
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

  async updateStatus(id: string, status: any, dataEnvio?: Date, codigoRastreio?: string) {
    const updateData: any = { status };
    if (dataEnvio) updateData.dataEnvio = dataEnvio;
    if (codigoRastreio) updateData.codigoRastreio = codigoRastreio;
    if (status === 'entregue') updateData.dataEntrega = new Date();

    return this.model.update({
      where: { id },
      data: updateData
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
}