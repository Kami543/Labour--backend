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
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { CurrentUser } from '../common/decorators/current-user.decorator'; 

@ApiTags('Carrinho')
@ApiBearerAuth('access-token')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Listar itens do carrinho' })
  async getCart(@CurrentUser('sub') userId: string) {
    this.logger.log(`Buscando carrinho do usuário: ${userId}`);
    const cart = await this.cartService.getCart(userId);
    // CORRIGIDO: agora cart é um objeto com propriedade items
    this.logger.log(`Encontrados ${cart.items.length} itens`);
    return cart;
  }

  @Get('count')
  @ApiOperation({ summary: 'Quantidade de itens' })
  async getCartItemCount(@CurrentUser('sub') userId: string) {
    const result = await this.cartService.getCartItemCount(userId);
    const count = typeof result === 'number' ? result : result.count;
    return { count };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar produto ao carrinho' })
  async addToCart(@CurrentUser('sub') userId: string, @Body() dto: AddToCartDto) {
    this.logger.log(`Adicionando produto ${dto.produtoId} ao carrinho`);
    const result = await this.cartService.addToCart(userId, dto);
    
    // CORRIGIDO: result já é o carrinho completo
    this.logger.log(`Carrinho agora tem ${result.items.length} itens`);
    return result;
  }

  @Put(':itemId')
  @ApiOperation({ summary: 'Atualizar quantidade do item' })
  async updateCartItem(
    @CurrentUser('sub') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    this.logger.log(`Atualizando item ${itemId}`);
    const updatedCart = await this.cartService.updateCartItem(userId, itemId, dto);
    // CORRIGIDO: updatedCart já é o carrinho completo
    return updatedCart;
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover item do carrinho' })
  async removeFromCart(@CurrentUser('sub') userId: string, @Param('itemId') itemId: string) {
    this.logger.log(`Removendo item ${itemId} do carrinho`);
    const updatedCart = await this.cartService.removeFromCart(userId, itemId);
    // CORRIGIDO: retorna o carrinho atualizado
    return updatedCart;
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Limpar carrinho' })
  async clearCart(@CurrentUser('sub') userId: string) {
    this.logger.log(`Limpando carrinho do usuário ${userId}`);
    const emptyCart = await this.cartService.clearCart(userId);
    return emptyCart;
  }
}