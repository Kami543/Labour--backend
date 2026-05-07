// src/modules/cart/cart.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/cart.dto';
import { UpdateCartItemDto } from './dto/cart.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Carrinho')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(AuthGuard('jwt'))
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os itens do carrinho' })
  @ApiResponse({
    status: 200,
    description: 'Carrinho retornado com sucesso',
    schema: {
      example: {
        items: [
          {
            id: 'cart_item_id',
            quantidade: 2,
            tamanho: 'M',
            cor: 'Preto',
            produto: {
              id: 'produto_id',
              nome: 'Camiseta Masculina',
              preco: 59.90,
              imagem: 'https://example.com/camiseta.jpg',
              slug: 'camiseta-masculina',
              estoque: 100
            },
            createdAt: '2024-01-01T00:00:00.000Z'
          }
        ],
        total: 119.80,
        itemCount: 2
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getCart(@Req() req: any) {
    const userId = req.user.userId;
    return this.cartService.getCart(userId);
  }

  @Get('count')
  @ApiOperation({ summary: 'Obter quantidade total de itens no carrinho' })
  @ApiResponse({
    status: 200,
    description: 'Quantidade retornada com sucesso',
    schema: {
      example: { count: 3 }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getCartItemCount(@Req() req: any) {
    const userId = req.user.userId;
    return this.cartService.getCartItemCount(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar produto ao carrinho' })
  @ApiBody({ type: AddToCartDto })
  @ApiResponse({
    status: 201,
    description: 'Produto adicionado ao carrinho com sucesso',
    schema: {
      example: {
        id: 'cart_item_id',
        quantidade: 2,
        tamanho: 'M',
        cor: 'Preto',
        userId: 'user_id',
        produtoId: 'produto_id',
        produto: {
          id: 'produto_id',
          nome: 'Camiseta Masculina',
          preco: 59.90,
          imagem: 'https://example.com/camiseta.jpg',
          slug: 'camiseta-masculina',
          estoque: 100
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Estoque insuficiente ou dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async addToCart(@Req() req: any, @Body() addToCartDto: AddToCartDto) {
    const userId = req.user.userId;
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Put(':itemId')
  @ApiOperation({ summary: 'Atualizar quantidade de um item no carrinho' })
  @ApiParam({ name: 'itemId', description: 'ID do item do carrinho', type: String })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item atualizado com sucesso',
    schema: {
      example: {
        id: 'cart_item_id',
        quantidade: 3,
        tamanho: 'M',
        cor: 'Preto',
        userId: 'user_id',
        produtoId: 'produto_id',
        produto: {
          id: 'produto_id',
          nome: 'Camiseta Masculina',
          preco: 59.90,
          imagem: 'https://example.com/camiseta.jpg'
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Estoque insuficiente ou quantidade inválida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Item do carrinho não encontrado' })
  async updateCartItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    const userId = req.user.userId;
    return this.cartService.updateCartItem(userId, itemId, updateCartItemDto);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item específico do carrinho' })
  @ApiParam({ name: 'itemId', description: 'ID do item do carrinho', type: String })
  @ApiResponse({ status: 204, description: 'Item removido com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Item do carrinho não encontrado' })
  async removeFromCart(@Req() req: any, @Param('itemId') itemId: string) {
    const userId = req.user.userId;
    return this.cartService.removeFromCart(userId, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Limpar carrinho completo' })
  @ApiResponse({ status: 204, description: 'Carrinho limpo com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async clearCart(@Req() req: any) {
    const userId = req.user.userId;
    return this.cartService.clearCart(userId);
  }
}