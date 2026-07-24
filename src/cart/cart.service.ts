// src/cart/cart.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { ProdutoRepository } from '../produto/produto.repository';
import { AddToCartDto } from './dto/cart.dto';
import { UpdateCartItemDto } from './dto/cart.dto';

// Adicione esta interface no topo do arquivo
interface ValidationResult {
  itemId: string;
  produtoId: string;
  nome: string;
  available: boolean;
  reason?: string;
  requestedQuantity?: number;
  availableQuantity?: number;
  price?: number;
}

@Injectable()
export class CartService {
  constructor(
    private cartRepository: CartRepository,
    private produtoRepository: ProdutoRepository,
  ) {}

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const { produtoId, quantidade, tamanho, cor } = addToCartDto;

    const produto = await this.produtoRepository.findById(produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (produto.estoque < quantidade) {
      throw new BadRequestException('Estoque insuficiente');
    }

    const existingItem = await this.cartRepository.findCartItem(
      userId,
      produtoId,
      tamanho,
      cor,
    );

    if (existingItem) {
      const novaQuantidade = existingItem.quantidade + quantidade;
      if (produto.estoque < novaQuantidade) {
        throw new BadRequestException('Estoque insuficiente');
      }
      await this.cartRepository.updateQuantidade(existingItem.id, novaQuantidade);
      return this.getCart(userId);
    }

    await this.cartRepository.addItem({
      userId,
      produtoId,
      quantidade,
      tamanho,
      cor,
    });
    
    return this.getCart(userId);
  }

  
       
  async getCart(userId: string) {
    const cartItems = await this.cartRepository.findCartByUser(userId);
  
    const total = cartItems.reduce((sum, item) => {
      return sum + (Number(item.produto.preco) * item.quantidade);
    }, 0);
  
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantidade, 0);
  
    const formattedItems = cartItems.map(item => {
      return {
        id: item.id,
        quantidade: item.quantidade,
        tamanho: item.tamanho,
        cor: item.cor,
        produto: {
          id: item.produto.id,
          nome: item.produto.nome,
          preco: Number(item.produto.preco),
          slug: item.produto.slug,
          categoria: item.produto.categoria,
          imagem: item.produto.imagem,
        }
      };
    });
  
    return {
      items: formattedItems,
      total: Number(total.toFixed(2)),
      itemCount
    };
  }

  async updateCartItem(userId: string, itemId: string, updateDto: UpdateCartItemDto) {
    const { quantidade } = updateDto;

    const cartItem = await this.cartRepository.findByIdAndUser(itemId, userId);
    if (!cartItem) {
      throw new NotFoundException('Item do carrinho não encontrado');
    }

    if (quantidade <= 0) {
      return this.removeFromCart(userId, itemId);
    }

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
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.cartRepository.clearCart(userId);
    return this.getCart(userId);
  }

  async getCartItemCount(userId: string) {
    const cartItems = await this.cartRepository.findCartByUser(userId);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantidade, 0);
    return { count: itemCount };
  }

  // Método auxiliar para validar itens do carrinho antes do checkout
  async validateCartItems(userId: string) {
    const cartItems = await this.cartRepository.findCartByUser(userId);
    
    const validationResults: ValidationResult[] = []; // Tipado corretamente
    let isValid = true;

    for (const item of cartItems) {
      const produto = await this.produtoRepository.findById(item.produtoId);
      
      if (!produto) {
        validationResults.push({
          itemId: item.id,
          produtoId: item.produtoId,
          nome: 'Produto não encontrado',
          available: false,
          reason: 'Produto não existe mais'
        });
        isValid = false;
        continue;
      }

      if (produto.estoque < item.quantidade) {
        validationResults.push({
          itemId: item.id,
          produtoId: item.produtoId,
          nome: produto.nome,
          available: false,
          reason: `Estoque insuficiente. Disponível: ${produto.estoque}`,
          requestedQuantity: item.quantidade,
          availableQuantity: produto.estoque
        });
        isValid = false;
      } else {
        validationResults.push({
          itemId: item.id,
          produtoId: item.produtoId,
          nome: produto.nome,
          available: true,
          price: Number(produto.preco)
        });
      }
    }

    return {
      isValid,
      items: validationResults,
      totalItems: cartItems.length
    };
  }

  // Método para sincronizar estoque após checkout
  async syncStockAfterCheckout(userId: string, itemsToRemove: string[]) {
    const cartItems = await this.cartRepository.findCartByUser(userId);
    
    for (const item of cartItems) {
      if (itemsToRemove.includes(item.id)) {
        await this.cartRepository.removeItem(item.id);
      }
    }
    
    return this.getCart(userId);
  }
}