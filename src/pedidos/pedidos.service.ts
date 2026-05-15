// pedidos.service.ts - VERSÃO COMPLETAMENTE CORRIGIDA
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PedidoRepository } from './pedido.repository';
import { CartRepository } from '../cart/cart.repository';
import { ProdutoRepository } from '../produto/produto.repository';
import { UserRepository } from '../users/users.repository';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CreatePedidoDto, CreatePedidoItemDto } from './dto/create-pedido.dto';
import { UpdatePedidoStatusDto } from './dto/update-pedido-status.dto';
import { StatusPedido } from '@prisma/client';

// Interface para os itens do pedido
interface PedidoItemInput {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
  tamanho: string | null;
  cor: string | null;
}

@Injectable()
export class PedidosService {
  constructor(
    private pedidoRepository: PedidoRepository,
    private cartRepository: CartRepository,
    private produtoRepository: ProdutoRepository,
    private notificacoesService: NotificacoesService,
    private userRepository: UserRepository,
  ) {}

  // ========== MÉTODO CREATE CORRIGIDO ==========
  
  async create(userId: string, createPedidoDto: CreatePedidoDto) {
    const user = await this.userRepository.findById(userId);
    const { itens, enderecoEntrega, frete = 0, imposto = 0, observacoes } = createPedidoDto;
    
    let cartItems: any[] = [];
    let subtotal = 0;
    const pedidoItens: PedidoItemInput[] = []; // ← TIPO EXPLÍCITO

    // VERIFICA SE TEM ITENS DIRETOS NO DTO
    if (itens && itens.length > 0) {
      console.log(`📦 Criando pedido com ${itens.length} itens diretos`);
      
      // Processa os itens enviados diretamente
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
        
        // Atualiza estoque
        await this.produtoRepository.decrementEstoque(item.produtoId, item.quantidade);
      }
      
    } else {
      // SE NÃO TEM ITENS DIRETOS, USA O CARRINHO
      console.log('🛒 Criando pedido a partir do carrinho');
      cartItems = await this.cartRepository.findCartByUser(userId);
      
      if (!cartItems || cartItems.length === 0) {
        throw new BadRequestException('Carrinho vazio. Adicione itens ao carrinho antes de finalizar o pedido.');
      }
      
      // Processa itens do carrinho
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
    
    // Calcula total
    const total = subtotal + Number(frete) + Number(imposto);
    
    // Busca endereço (prioriza o enviado, depois o do usuário)
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
    
    // Cria o pedido
    const pedido = await this.pedidoRepository.createPedido({
      userId,
      subtotal,
      frete: Number(frete),
      imposto: Number(imposto),
      total,
      enderecoEntrega: enderecoFinal,
      observacoes: observacoes || undefined, // ← null não é permitido, usar undefined
      status: StatusPedido.pendente,
    });
    
    // Adiciona os itens ao pedido
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
    
    // Se usou carrinho, limpa ele
    if (cartItems.length > 0) {
      await this.cartRepository.clearCart(userId);
    }
    
    // Notifica o usuário
    await this.notificacoesService.create(userId, {
      tipo: 'sistema',
      titulo: 'Pedido criado',
      mensagem: `Seu pedido ${pedido.numero} foi criado com sucesso no valor de ${this.formatCurrency(total)}`,
    });
    
    // Retorna o pedido completo
    return await this.pedidoRepository.findByIdAndUser(pedido.id, userId);
  }
  
  // ========== MÉTODOS EXISTENTES (SEM ALTERAÇÕES) ==========
  
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

  // ========== MÉTODOS ADMIN ==========
  
  async findAllAdmin(page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    
    const where = status ? { status: status as StatusPedido } : {};
    
    const [data, total] = await Promise.all([
      this.pedidoRepository.findAllWithFilters(where, skip, limit),
      this.pedidoRepository.countAllWithFilters(where),
    ]);

    return { data, total, page, limit };
  }

  async findByStatus(status: string) {
    const pedidos = await this.pedidoRepository.findByStatus(status as StatusPedido);
    return pedidos;
  }

  async findOneAdmin(id: string) {
    const pedido = await this.pedidoRepository.findById(id);
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return pedido;
  }

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

    if (updateStatusDto.status === StatusPedido.enviado) {
      dataEnvio = new Date();
      codigoRastreio = updateStatusDto.codigoRastreio;
      
      if (!codigoRastreio) {
        throw new BadRequestException('Código de rastreio é obrigatório quando status for "enviado"');
      }
    }

    const updatedPedido = await this.pedidoRepository.updateStatus(
      id,
      updateStatusDto.status,
      dataEnvio,
      codigoRastreio
    );

    await this.notificacoesService.create(pedido.userId, {
      tipo: 'entrega',
      titulo: 'Status do pedido atualizado',
      mensagem: `Seu pedido ${pedido.numero} foi atualizado para ${updateStatusDto.status}`,
    });

    return updatedPedido;
  }

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

  async cancelAdmin(id: string, motivo?: string) {
    const pedido = await this.pedidoRepository.findById(id);
    
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (pedido.status !== StatusPedido.pendente && pedido.status !== StatusPedido.pagamento_confirmado) {
      throw new BadRequestException('Só é possível cancelar pedidos pendentes ou com pagamento confirmado');
    }

    if (pedido.status === StatusPedido.pagamento_confirmado && pedido.itens) {
      for (const item of pedido.itens) {
        await this.produtoRepository.incrementEstoque(item.produtoId, item.quantidade);
      }
    }

    const observacoesAtualizadas = pedido.observacoes 
      ? `${pedido.observacoes}\n[ADMIN] Cancelado: ${motivo || 'Sem motivo informado'}`
      : `[ADMIN] Cancelado: ${motivo || 'Sem motivo informado'}`;

    const canceledPedido = await this.pedidoRepository.updateStatus(id, StatusPedido.cancelado);

    await this.pedidoRepository.update(id, { observacoes: observacoesAtualizadas });

    await this.notificacoesService.create(pedido.userId, {
      tipo: 'sistema',
      titulo: 'Pedido cancelado pelo administrador',
      mensagem: `Seu pedido ${pedido.numero} foi cancelado. Motivo: ${motivo || 'Não informado'}`,
    });

    return canceledPedido;
  }

  async findPedidosByCliente(clienteId: string, page = 1, limit = 10) {
    const [data, total] = await Promise.all([
      this.pedidoRepository.findByUser(clienteId, page, limit),
      this.pedidoRepository.countByUser(clienteId),
    ]);

    return { data, total, page, limit };
  }

  async getOrderStats() {
    return this.pedidoRepository.getOrderStats();
  }

  async getRecentOrders(limit: number = 10) {
    return this.pedidoRepository.findRecentOrders(limit);
  }

  async getOrdersByPeriod(startDate: Date, endDate: Date, page = 1, limit = 10) {
    return this.pedidoRepository.findByPeriod(startDate, endDate, page, limit);
  }

  async searchOrders(searchTerm: string, page = 1, limit = 10) {
    return this.pedidoRepository.findByCliente(searchTerm, page, limit);
  }

  // Helper privado
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
}