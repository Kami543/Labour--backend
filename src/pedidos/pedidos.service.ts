// src/pedidos/pedidos.service.ts - VERSÃO CORRIGIDA
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PedidoRepository } from './pedido.repository';
import { CartRepository } from '../cart/cart.repository';
import { ProdutoRepository } from '../produto/produto.repository';
import { UserRepository } from '../users/users.repository';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoStatusDto } from './dto/update-pedido-status.dto';
import { StatusPedido } from '@prisma/client';

interface PedidoItemInput {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
  tamanho: string | null;
  cor: string | null;
}

@Injectable()
export class PedidosService {
  private readonly logger = new Logger(PedidosService.name);

  constructor(
    private pedidoRepository: PedidoRepository,
    private cartRepository: CartRepository,
    private produtoRepository: ProdutoRepository,
    private notificacoesService: NotificacoesService,
    private userRepository: UserRepository,
  ) {}

  async create(userId: string, createPedidoDto: CreatePedidoDto) {
    this.logger.log(`Criando pedido para usuário: ${userId}`);
    
    // ✅ VALIDA ID
    if (!userId) {
      throw new BadRequestException('ID do usuário é obrigatório');
    }
    
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    
    const { itens, enderecoEntrega, frete = 0, imposto = 0, observacoes } = createPedidoDto;
    
    let cartItems: any[] = [];
    let subtotal = 0;
    const pedidoItens: PedidoItemInput[] = [];

    // ✅ PROCESSAMENTO COM LIMITES
    if (itens && itens.length > 0) {
      if (itens.length > 50) {
        throw new BadRequestException('Máximo de 50 itens por pedido');
      }
      
      this.logger.log(`📦 Criando pedido com ${itens.length} itens diretos`);
      
      for (const item of itens) {
        const produto = await this.produtoRepository.findById(item.produtoId);
        
        if (!produto) {
          throw new BadRequestException(`Produto ${item.produtoId} não encontrado`);
        }
        
        if (produto.estoque < item.quantidade) {
          throw new BadRequestException(`Estoque insuficiente para ${produto.nome}`);
        }
        
        const precoUnitario = Number(produto.preco);
        subtotal += precoUnitario * item.quantidade;
        
        pedidoItens.push({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: precoUnitario,
          tamanho: item.tamanho || null,
          cor: item.cor || null,
        });
        
        await this.produtoRepository.decrementEstoque(item.produtoId, item.quantidade);
      }
      
    } else {
      this.logger.log('🛒 Criando pedido a partir do carrinho');
      cartItems = await this.cartRepository.findCartByUser(userId);
      
      if (!cartItems || cartItems.length === 0) {
        throw new BadRequestException('Carrinho vazio.');
      }
      
      if (cartItems.length > 50) {
        throw new BadRequestException('Carrinho com muitos itens. Limite de 50.');
      }
      
      for (const item of cartItems) {
        if (item.produto.estoque < item.quantidade) {
          throw new BadRequestException(`Estoque insuficiente para ${item.produto.nome}`);
        }
        
        const precoUnitario = Number(item.produto.preco);
        subtotal += precoUnitario * item.quantidade;
        
        pedidoItens.push({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: precoUnitario,
          tamanho: item.tamanho || null,
          cor: item.cor || null,
        });
        
        await this.produtoRepository.decrementEstoque(item.produtoId, item.quantidade);
      }
    }
    
    const total = subtotal + Number(frete) + Number(imposto);
    
    // ✅ ENDEREÇO COM VALIDAÇÃO
    let enderecoFinal: Record<string, any> = {};
    
    if (enderecoEntrega && typeof enderecoEntrega === 'object' && Object.keys(enderecoEntrega).length > 0) {
      enderecoFinal = enderecoEntrega as Record<string, any>;
    } else if (user?.endereco && typeof user.endereco === 'object') {
      enderecoFinal = user.endereco as Record<string, any>;
    } else {
      enderecoFinal = {
        rua: 'Endereço não informado',
        numero: 'S/N',
        bairro: 'Não informado',
        cidade: 'Não informada',
        estado: 'Não informado',
        cep: '00000-000'
      };
    }
    
    // ✅ CRIA PEDIDO
    const pedido = await this.pedidoRepository.createPedido({
      userId,
      subtotal,
      frete: Number(frete),
      imposto: Number(imposto),
      total,
      enderecoEntrega: enderecoFinal,
      observacoes: observacoes || undefined,
      status: StatusPedido.pendente,
    });
    
    // ✅ CRIA ITENS DO PEDIDO EM LOTE
    for (const item of pedidoItens) {
      await this.pedidoRepository.createPedidoItem({
        pedidoId: pedido.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        tamanho: item.tamanho || undefined,
        cor: item.cor || undefined,
      });
    }
    
    // ✅ LIMPA CARRINHO
    if (cartItems.length > 0) {
      await this.cartRepository.clearCart(userId);
    }
    
    // ✅ NOTIFICAÇÕES ASSÍNCRONAS
    this.notificacoesService.create(userId, {
      tipo: 'sistema',
      titulo: '✅ Pedido criado!',
      mensagem: `Pedido #${pedido.numero} criado no valor de ${this.formatCurrency(total)}.`,
    }).catch(err => this.logger.error(`Erro notificação: ${err.message}`));
    
    this.notifyAdminsNewOrder(pedido, user, pedidoItens.length).catch(err => 
      this.logger.error(`Erro notificar admins: ${err.message}`)
    );
    
    return await this.pedidoRepository.findByIdAndUser(pedido.id, userId);
  }

  async findByUser(userId: string, page = 1, limit = 10) {
    if (!userId) {
      throw new BadRequestException('ID do usuário é obrigatório');
    }
    
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);
    
    const [data, total] = await Promise.all([
      this.pedidoRepository.findByUser(userId, safePage, safeLimit),
      this.pedidoRepository.countByUser(userId),
    ]);
    
    return { 
      data, 
      total, 
      page: safePage, 
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    };
  }

  async findOne(id: string, userId: string) {
    if (!id || !userId) {
      throw new BadRequestException('ID do pedido e usuário são obrigatórios');
    }
    
    const pedido = await this.pedidoRepository.findByIdAndUser(id, userId);
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return pedido;
  }

  async cancel(id: string, userId: string) {
    if (!id || !userId) {
      throw new BadRequestException('ID do pedido e usuário são obrigatórios');
    }
    
    const pedido = await this.findOne(id, userId);

    if (pedido.status !== StatusPedido.pendente) {
      throw new BadRequestException('Só é possível cancelar pedidos pendentes');
    }

    // ✅ RESTAURA ESTOQUE
    for (const item of pedido.itens || []) {
      await this.produtoRepository.incrementEstoque(item.produtoId, item.quantidade);
    }

    const canceledPedido = await this.pedidoRepository.updateStatus(id, StatusPedido.cancelado);

    await this.notificacoesService.create(userId, {
      tipo: 'sistema',
      titulo: '❌ Pedido cancelado',
      mensagem: `Pedido #${pedido.numero} foi cancelado.`,
    });

    return canceledPedido;
  }

  // ✅ MÉTODO CORRIGIDO: findAllAdmin com paginação
  async findAllAdmin(page = 1, limit = 10, status?: string) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;
    
    const where = status ? { status: status as StatusPedido } : {};
    
    const [data, total] = await Promise.all([
      this.pedidoRepository.findAllWithFilters(where, skip, safeLimit),
      this.pedidoRepository.countAllWithFilters(where),
    ]);

    return { 
      data, 
      total, 
      page: safePage, 
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    };
  }

  async findByStatus(status: string, page = 1, limit = 20) {
    if (!status) {
      throw new BadRequestException('Status é obrigatório');
    }
    
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    
    return this.pedidoRepository.findByStatus(status as StatusPedido, safePage, safeLimit);
  }

  async findOneAdmin(id: string) {
    if (!id) {
      throw new BadRequestException('ID do pedido é obrigatório');
    }
    
    const pedido = await this.pedidoRepository.findById(id);
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return pedido;
  }

  async updateStatusAdmin(id: string, updateStatusDto: UpdatePedidoStatusDto, adminId: string) {
    if (!id || !adminId) {
      throw new BadRequestException('ID do pedido e admin são obrigatórios');
    }
    
    const pedido = await this.pedidoRepository.findById(id);
    
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (pedido.status === StatusPedido.cancelado) {
      throw new BadRequestException('Pedido já cancelado');
    }

    const statusAntigo = pedido.status;
    const statusNovo = updateStatusDto.status;

    let dataEnvio: Date | undefined;
    let codigoRastreio: string | undefined;

    if (statusNovo === StatusPedido.enviado) {
      dataEnvio = new Date();
      codigoRastreio = updateStatusDto.codigoRastreio;
      
      if (!codigoRastreio) {
        throw new BadRequestException('Código de rastreio é obrigatório');
      }
    }

    const updatedPedido = await this.pedidoRepository.updateStatus(
      id,
      statusNovo,
      dataEnvio,
      codigoRastreio
    );

    // ✅ NOTIFICAÇÃO ASSÍNCRONA
    this.notifyUserStatusUpdate(pedido, statusAntigo, statusNovo, codigoRastreio).catch(err =>
      this.logger.error(`Erro notificar usuário: ${err.message}`)
    );

    return updatedPedido;
  }

  async updateRastreio(id: string, codigoRastreio: string, adminId: string) {
    if (!id || !codigoRastreio || !adminId) {
      throw new BadRequestException('Dados incompletos para atualização');
    }
    
    const pedido = await this.pedidoRepository.findById(id);
    
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const updatedPedido = await this.pedidoRepository.updateRastreio(id, codigoRastreio);

    await this.notificacoesService.create(pedido.userId, {
      tipo: 'entrega',
      titulo: '📦 Código de rastreio!',
      mensagem: `Pedido #${pedido.numero} - Código: ${codigoRastreio}`,
    });

    return updatedPedido;
  }

  async cancelAdmin(id: string, motivo?: string, adminId?: string) {
    if (!id) {
      throw new BadRequestException('ID do pedido é obrigatório');
    }
    
    const pedido = await this.pedidoRepository.findById(id);
    
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (pedido.status !== StatusPedido.pendente && pedido.status !== StatusPedido.pagamento_confirmado) {
      throw new BadRequestException('Só é possível cancelar pedidos pendentes ou com pagamento confirmado');
    }

    // ✅ RESTAURA ESTOQUE se necessário
    if (pedido.status === StatusPedido.pagamento_confirmado && pedido.itens) {
      for (const item of pedido.itens) {
        await this.produtoRepository.incrementEstoque(item.produtoId, item.quantidade);
      }
    }

    const observacoesAtualizadas = pedido.observacoes 
      ? `${pedido.observacoes}\n[ADMIN] Cancelado: ${motivo || 'Sem motivo'}`
      : `[ADMIN] Cancelado: ${motivo || 'Sem motivo'}`;

    const canceledPedido = await this.pedidoRepository.updateStatus(id, StatusPedido.cancelado);
    await this.pedidoRepository.update(id, { observacoes: observacoesAtualizadas });

    await this.notificacoesService.create(pedido.userId, {
      tipo: 'sistema',
      titulo: '⚠️ Pedido cancelado',
      mensagem: `Pedido #${pedido.numero} foi cancelado. Motivo: ${motivo || 'Não informado'}.`,
    });

    return canceledPedido;
  }

  async findPedidosByCliente(clienteId: string, page = 1, limit = 10) {
    return this.findByUser(clienteId, page, limit);
  }

  async getOrderStats() {
    return this.pedidoRepository.getOrderStats();
  }

  async getRecentOrders(limit: number = 10) {
    const safeLimit = Math.min(limit, 50);
    return this.pedidoRepository.findRecentOrders(safeLimit);
  }

  async getOrdersByPeriod(startDate: Date, endDate: Date, page = 1, limit = 10) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Datas de início e fim são obrigatórias');
    }
    
    if (startDate > endDate) {
      throw new BadRequestException('Data de início não pode ser maior que data de fim');
    }
    
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    
    return this.pedidoRepository.findByPeriod(startDate, endDate, safePage, safeLimit);
  }

  async searchOrders(searchTerm: string, page = 1, limit = 10) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new BadRequestException('Termo de busca deve ter pelo menos 2 caracteres');
    }
    
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);
    
    return this.pedidoRepository.findByCliente(searchTerm, safePage, safeLimit);
  }

  // ==================== MÉTODOS PRIVADOS ====================
  
  private async notifyAdminsNewOrder(pedido: any, user: any, totalItens: number) {
    // ✅ findAllAdmins sem argumento
    const admins = await this.userRepository.findAllAdmins();
    
    if (!admins || admins.length === 0) return;

    const valorFormatado = this.formatCurrency(pedido.total);
    const itensTexto = totalItens === 1 ? '1 item' : `${totalItens} itens`;

    // ✅ LIMITA NOTIFICAÇÕES
    const adminsToNotify = admins.slice(0, 10);
    
    const notifyPromises = adminsToNotify.map(admin =>
      this.notificacoesService.create(admin.id, {
        tipo: 'sistema',
        titulo: '🛒 NOVO PEDIDO!',
        mensagem: `Pedido #${pedido.numero} - ${user.nome} - ${itensTexto} - ${valorFormatado}`,
      }).catch(err => this.logger.error(`Erro notificar admin ${admin.id}: ${err.message}`))
    );
    
    await Promise.allSettled(notifyPromises);
  }

  private async notifyUserStatusUpdate(pedido: any, statusAntigo: string, statusNovo: string, codigoRastreio?: string) {
    const statusMessages: Record<string, { titulo: string; mensagem: string; tipo: any }> = {
      pagamento_confirmado: {
        tipo: 'pagamento',
        titulo: '✅ Pagamento Confirmado!',
        mensagem: `Pedido #${pedido.numero} - Pagamento confirmado.`,
      },
      enviado: {
        tipo: 'entrega',
        titulo: '📦 Pedido Enviado!',
        mensagem: `Pedido #${pedido.numero} foi enviado! ${codigoRastreio ? `Código: ${codigoRastreio}` : ''}`,
      },
      entregue: {
        tipo: 'entrega',
        titulo: '🎉 Pedido Entregue!',
        mensagem: `Pedido #${pedido.numero} foi entregue. Obrigado!`,
      },
      cancelado: {
        tipo: 'sistema',
        titulo: '❌ Pedido Cancelado',
        mensagem: `Pedido #${pedido.numero} foi cancelado.`,
      },
    };

    const message = statusMessages[statusNovo];
    if (message && statusAntigo !== statusNovo) {
      await this.notificacoesService.create(pedido.userId, {
        tipo: message.tipo,
        titulo: message.titulo,
        mensagem: message.mensagem,
      });
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
}