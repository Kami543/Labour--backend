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

  async create(userId: string, createPedidoDto: CreatePedidoDto) {
    // Get user data for address
    const user = await this.userRepository.findById(userId);
    
    // Busca o carrinho do usuário
    const cartItems = await this.cartRepository.findCartByUser(userId);

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Carrinho vazio');
    }

    // Calcula valores
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (Number(item.produto.preco) * item.quantidade);
    }, 0);

    const { frete = 0, imposto = 0, observacoes, enderecoEntrega } = createPedidoDto;
    const total = subtotal + frete + imposto;

    // Verifica estoque
    for (const item of cartItems) {
      if (item.produto.estoque < item.quantidade) {
        throw new BadRequestException(`Estoque insuficiente para ${item.produto.nome}`);
      }
    }

    // Cria o pedido
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

    // Cria os itens do pedido
    for (const item of cartItems) {
      await this.pedidoRepository.createPedidoItem({
        pedidoId: pedido.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.produto.preco,
        tamanho: item.tamanho ?? undefined, // Convert null to undefined
        cor: item.cor ?? undefined, // Convert null to undefined
      });

      // Atualiza estoque
      await this.produtoRepository.decrementEstoque(item.produtoId, item.quantidade);
    }

    // Limpa o carrinho
    await this.cartRepository.clearCart(userId);

    // Cria notificação
    await this.notificacoesService.create(userId, {
      tipo: 'sistema',
      titulo: 'Pedido criado',
      mensagem: `Seu pedido ${pedido.numero} foi criado com sucesso`,
    });

    return await this.pedidoRepository.findByIdAndUser(pedido.id, userId);
  }
  
  async findAll(userId: string, page = 1, limit = 10) {
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

  async updateStatus(id: string, userId: string, updateStatusDto: UpdatePedidoStatusDto) {
    const pedido = await this.findOne(id, userId);

    if (pedido.status === StatusPedido.cancelado) {
      throw new BadRequestException('Pedido já cancelado');
    }

    let dataEnvio: Date | undefined;
    let codigoRastreio: string | undefined;

    if (updateStatusDto.status === StatusPedido.enviado) {
      dataEnvio = new Date();
      codigoRastreio = updateStatusDto.codigoRastreio;
    }

    const updatedPedido = await this.pedidoRepository.updateStatus(
      id,
      updateStatusDto.status,
      dataEnvio,
      codigoRastreio
    );

    // Notifica usuário
    await this.notificacoesService.create(userId, {
      tipo: 'entrega',
      titulo: 'Status do pedido atualizado',
      mensagem: `Seu pedido ${pedido.numero} está ${updateStatusDto.status}`,
    });

    return updatedPedido;
  }

  async cancel(id: string, userId: string) {
    const pedido = await this.findOne(id, userId);

    if (pedido.status !== StatusPedido.pendente) {
      throw new BadRequestException('Só é possível cancelar pedidos pendentes');
    }

    // Retorna ao estoque
    for (const item of pedido.itens) {
      await this.produtoRepository.incrementEstoque(item.produtoId, item.quantidade);
    }

    const canceledPedido = await this.pedidoRepository.updateStatus(
      id, 
      StatusPedido.cancelado
    );

    await this.notificacoesService.create(userId, {
      tipo: 'sistema',
      titulo: 'Pedido cancelado',
      mensagem: `Seu pedido ${pedido.numero} foi cancelado`,
    });

    return canceledPedido;
  }
}