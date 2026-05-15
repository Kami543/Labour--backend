// pedidos.service.ts - VERSÃO COMPLETA COM TODOS OS MÉTODOS ADMIN CORRIGIDOS

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PedidoRepository } from './pedido.repository';
import { CartRepository } from '../cart/cart.repository';
import { ProdutoRepository } from '../produto/produto.repository';
import { UserRepository } from '../users/users.repository';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoStatusDto } from './dto/update-pedido-status.dto';
import { StatusPedido } from '@prisma/client';

@Injectable()
export class PedidosService {
  constructor(
    private pedidoRepository: PedidoRepository,
    private cartRepository: CartRepository,
    private produtoRepository: ProdutoRepository,
    private notificacoesService: NotificacoesService,
    private userRepository: UserRepository,
  ) {}

  // ========== MÉTODOS EXISTENTES (USUÁRIO COMUM) ==========
  
  async create(userId: string, createPedidoDto: CreatePedidoDto) {
    const user = await this.userRepository.findById(userId);
    const cartItems = await this.cartRepository.findCartByUser(userId);

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Carrinho vazio');
    }

    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (Number(item.produto.preco) * item.quantidade);
    }, 0);

    const { frete = 0, imposto = 0, observacoes, enderecoEntrega } = createPedidoDto;
    const total = subtotal + frete + imposto;

    for (const item of cartItems) {
      if (item.produto.estoque < item.quantidade) {
        throw new BadRequestException(`Estoque insuficiente para ${item.produto.nome}`);
      }
    }

    const pedido = await this.pedidoRepository.createPedido({
      userId,
      subtotal,
      frete,
      imposto,
      total,
      enderecoEntrega: enderecoEntrega || user?.endereco || 'Endereço não informado',
      observacoes,
      status: StatusPedido.pendente,
    });

    for (const item of cartItems) {
      await this.pedidoRepository.createPedidoItem({
        pedidoId: pedido.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.produto.preco,
        tamanho: item.tamanho ?? undefined,
        cor: item.cor ?? undefined,
      });

      await this.produtoRepository.decrementEstoque(item.produtoId, item.quantidade);
    }

    await this.cartRepository.clearCart(userId);

    await this.notificacoesService.create(userId, {
      tipo: 'sistema',
      titulo: 'Pedido criado',
      mensagem: `Seu pedido ${pedido.numero} foi criado com sucesso`,
    });

    return await this.pedidoRepository.findByIdAndUser(pedido.id, userId);
  }
  
  async findByUser(userId: string, page = 1, limit = 10) {
    const [data, total] = await Promise.all([
      this.pedidoRepository.findByUser(userId, page, limit),
      this.pedidoRepository.countByUser(userId),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, userId: string) {
    const pedido = await this.pedidoRepository.findByIdAndUser(id, userId);
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return pedido;
  }

  async cancel(id: string, userId: string) {
    const pedido = await this.findOne(id, userId);

    if (pedido.status !== StatusPedido.pendente) {
      throw new BadRequestException('Só é possível cancelar pedidos pendentes');
    }

    for (const item of pedido.itens) {
      await this.produtoRepository.incrementEstoque(item.produtoId, item.quantidade);
    }

    const canceledPedido = await this.pedidoRepository.updateStatus(id, StatusPedido.cancelado);

    await this.notificacoesService.create(userId, {
      tipo: 'sistema',
      titulo: 'Pedido cancelado',
      mensagem: `Seu pedido ${pedido.numero} foi cancelado`,
    });

    return canceledPedido;
  }

  // ========== NOVOS MÉTODOS PARA ADMIN ==========
  
  /**
   * Admin: Buscar TODOS os pedidos de todos os usuários
   */
  async findAllAdmin(page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    
    const where = status ? { status: status as StatusPedido } : {};
    
    const [data, total] = await Promise.all([
      this.pedidoRepository.findAllWithFilters(where, skip, limit),
      this.pedidoRepository.countAllWithFilters(where),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Admin: Buscar pedidos por status
   */
  async findByStatus(status: string) {
    const pedidos = await this.pedidoRepository.findByStatus(status as StatusPedido);
    return pedidos;
  }

  /**
   * Admin: Buscar qualquer pedido por ID (sem verificar userId)
   */
  async findOneAdmin(id: string) {
    const pedido = await this.pedidoRepository.findById(id);
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return pedido;
  }

  /**
   * Admin: Atualizar status de qualquer pedido - VERSÃO CORRIGIDA
   */
  async updateStatusAdmin(id: string, updateStatusDto: UpdatePedidoStatusDto) {
    const pedido = await this.pedidoRepository.findById(id);
    
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (pedido.status === StatusPedido.cancelado) {
      throw new BadRequestException('Pedido já cancelado');
    }

    let dataEnvio: Date | undefined;
    let codigoRastreio: string | undefined;

    // Only set dataEnvio and codigoRastreio when status is 'enviado'
    if (updateStatusDto.status === StatusPedido.enviado) {
      dataEnvio = new Date();
      codigoRastreio = updateStatusDto.codigoRastreio;
      
      // Validate codigoRastreio is provided when status is 'enviado'
      if (!codigoRastreio) {
        throw new BadRequestException('Código de rastreio é obrigatório quando status for "enviado"');
      }
    }

    // If status is 'entregue', set dataEntrega
    if (updateStatusDto.status === StatusPedido.entregue) {
      // You might want to add logic here for delivery date
    }

    const updatedPedido = await this.pedidoRepository.updateStatus(
      id,
      updateStatusDto.status,
      dataEnvio,
      codigoRastreio
    );

    // Send notification to user
    await this.notificacoesService.create(pedido.userId, {
      tipo: 'entrega',
      titulo: 'Status do pedido atualizado',
      mensagem: `Seu pedido ${pedido.numero} foi atualizado para ${updateStatusDto.status}`,
    });

    return updatedPedido;
  }

  /**
   * Admin: Atualizar código de rastreio
   */
  async updateRastreio(id: string, codigoRastreio: string) {
    const pedido = await this.pedidoRepository.findById(id);
    
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const updatedPedido = await this.pedidoRepository.updateRastreio(id, codigoRastreio);

    await this.notificacoesService.create(pedido.userId, {
      tipo: 'entrega',
      titulo: 'Pedido enviado',
      mensagem: `Seu pedido ${pedido.numero} foi enviado. Código de rastreio: ${codigoRastreio}`,
    });

    return updatedPedido;
  }

  /**
   * Admin: Cancelar qualquer pedido
   */
  async cancelAdmin(id: string, motivo?: string) {
    const pedido = await this.pedidoRepository.findById(id);

    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (pedido.status !== StatusPedido.pendente) {
      throw new BadRequestException('Só é possível cancelar pedidos pendentes');
    }

    for (const item of pedido.itens) {
      await this.produtoRepository.incrementEstoque(item.produtoId, item.quantidade);
    }

    const canceledPedido = await this.pedidoRepository.updateStatus(id, StatusPedido.cancelado);

    await this.notificacoesService.create(pedido.userId, {
      tipo: 'sistema',
      titulo: 'Pedido cancelado',
      mensagem: `Seu pedido ${pedido.numero} foi cancelado. Motivo: ${motivo || 'Não informado'}`,
    });

    return canceledPedido;
  }

  /**
   * Admin: Buscar pedidos por cliente
   */
  async findPedidosByCliente(clienteId: string, page = 1, limit = 10) {
    const [data, total] = await Promise.all([
      this.pedidoRepository.findByUser(clienteId, page, limit),
      this.pedidoRepository.countByUser(clienteId),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Admin: Obter estatísticas de pedidos
   */
  async getOrderStats() {
    return this.pedidoRepository.getOrderStats();
  }

  /**
   * Admin: Buscar pedidos recentes
   */
  async getRecentOrders(limit: number = 10) {
    return this.pedidoRepository.findRecentOrders(limit);
  }

  /**
   * Admin: Buscar pedidos por período
   */
  async getOrdersByPeriod(startDate: Date, endDate: Date, page = 1, limit = 10) {
    return this.pedidoRepository.findByPeriod(startDate, endDate, page, limit);
  }

  /**
   * Admin: Buscar pedidos por termo de busca
   */
  async searchOrders(searchTerm: string, page = 1, limit = 10) {
    return this.pedidoRepository.findByCliente(searchTerm, page, limit);
  }
}