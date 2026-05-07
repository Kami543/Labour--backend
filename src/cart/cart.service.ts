// src/modules/cart/cart.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { ProdutoRepository } from '../produto/produto.repository';
import { AddToCartDto } from './dto/cart.dto';
import { UpdateCartItemDto } from './dto/cart.dto';

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
      await this.cartRepository.updateQuantidade(existingItem.id, novaQuantidade);
      // Retorna o carrinho completo após atualizar
      return this.getCart(userId);
    }

    // Adiciona novo item
    await this.cartRepository.addItem({
      userId,
      produtoId,
      quantidade,
      tamanho,
      cor,
    });
    
    // Retorna o carrinho completo
    return this.getCart(userId);
  }

  async getCart(userId: string) {
    const cartItems = await this.cartRepository.findCartByUser(userId);
    
    const total = cartItems.reduce((sum, item) => {
      return sum + (Number(item.produto.preco) * item.quantidade);
    }, 0);

    const itemCount = cartItems.reduce((sum, item) => sum + item.quantidade, 0);

    // 🔥 Retorna os items formatados como array (igual ao frontend espera)
    const formattedItems = cartItems.map(item => ({
      id: item.id,
      quantidade: item.quantidade,
      tamanho: item.tamanho,
      cor: item.cor,
      produto: {
        id: item.produto.id,
        nome: item.produto.nome,
        preco: Number(item.produto.preco),
        imagem: item.produto.imagem,
        categoria: item.produto.categoria,
      }
    }));

    // 🔥 Se o frontend espera array diretamente, retorne o array
    // Se espera objeto com items, descomente a linha abaixo e comente a outra
    return formattedItems; // ← Retorna array diretamente (Recomendado)
    // return { items: formattedItems, total, itemCount }; ← Alternativa
  }

  async updateCartItem(userId: string, itemId: string, updateDto: UpdateCartItemDto) {
    const { quantidade } = updateDto;

    // Busca o item do carrinho
    const cartItem = await this.cartRepository.findByIdAndUser(itemId, userId);
    if (!cartItem) {
      throw new NotFoundException('Item do carrinho não encontrado');
    }

    if (quantidade <= 0) {
      await this.removeFromCart(userId, itemId);
      return this.getCart(userId);
    }

    // Verifica estoque
    if (cartItem.produto.estoque < quantidade) {
      throw new BadRequestException('Estoque insuficiente');
    }

    await this.cartRepository.updateQuantidade(itemId, quantidade);
    return this.getCart(userId);
  }

  async removeFromCart(userId: string, itemId: string) {
    const cartItem = await this.cartRepository.findByIdAndUser(itemId, userId);
    if (!cartItem) {
      throw new NotFoundException('Item do carrinho não encontrado');
    }

    await this.cartRepository.removeItem(itemId);
    return this.getCart(userId); // ← Retorna carrinho atualizado
  }

  async clearCart(userId: string) {
    await this.cartRepository.clearCart(userId);
    return this.getCart(userId); // ← Retorna carrinho vazio
  }

  async getCartItemCount(userId: string) {
    const cartItems = await this.cartRepository.findCartByUser(userId);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantidade, 0);
    return { count: itemCount };
  }
}