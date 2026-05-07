// src/modules/cart/cart.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { ProdutoRepository } from '../produtos/produto.repository';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private cartRepository: CartRepository,
    private produtoRepository: ProdutoRepository,
  ) {}

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const { produtoId, quantidade, tamanho, cor } = addToCartDto;

    // Verifica se o produto existe e tem estoque
    const produto = await this.produtoRepository.findById(produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (produto.estoque < quantidade) {
      throw new BadRequestException('Estoque insuficiente');
    }

    // Verifica se o item já existe no carrinho
    const existingItem = await this.cartRepository.findCartItem(
      userId,
      produtoId,
      tamanho,
      cor,
    );

    if (existingItem) {
      // Atualiza quantidade se já existir
      const novaQuantidade = existingItem.quantidade + quantidade;
      if (produto.estoque < novaQuantidade) {
        throw new BadRequestException('Estoque insuficiente');
      }
      return this.cartRepository.updateQuantidade(existingItem.id, novaQuantidade);
    }

    // Adiciona novo item
    return this.cartRepository.addItem({
      userId,
      produtoId,
      quantidade,
      tamanho,
      cor,
    });
  }

  async getCart(userId: string) {
    const cartItems = await this.cartRepository.findCartByUser(userId);
    
    const total = cartItems.reduce((sum, item) => {
      return sum + (Number(item.produto.preco) * item.quantidade);
    }, 0);

    const itemCount = cartItems.reduce((sum, item) => sum + item.quantidade, 0);

    return {
      items: cartItems,
      total,
      itemCount,
    };
  }

  async updateCartItem(userId: string, itemId: string, updateDto: UpdateCartItemDto) {
    const { quantidade } = updateDto;

    // Busca o item do carrinho
    const cartItem = await this.cartRepository.findByIdAndUser(itemId, userId);
    if (!cartItem) {
      throw new NotFoundException('Item do carrinho não encontrado');
    }

    if (quantidade <= 0) {
      return this.removeFromCart(userId, itemId);
    }

    // Verifica estoque
    if (cartItem.produto.estoque < quantidade) {
      throw new BadRequestException('Estoque insuficiente');
    }

    return this.cartRepository.updateQuantidade(itemId, quantidade);
  }

  async removeFromCart(userId: string, itemId: string) {
    const cartItem = await this.cartRepository.findByIdAndUser(itemId, userId);
    if (!cartItem) {
      throw new NotFoundException('Item do carrinho não encontrado');
    }

    await this.cartRepository.removeItem(itemId);
    return { message: 'Item removido do carrinho' };
  }

  async clearCart(userId: string) {
    await this.cartRepository.clearCart(userId);
    return { message: 'Carrinho limpo com sucesso' };
  }

  async getCartItemCount(userId: string) {
    const cartItems = await this.cartRepository.findCartByUser(userId);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantidade, 0);
    return { count: itemCount };
  }
}