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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'Carrinho retornado com sucesso' })
  async getCart(@CurrentUser('sub') userId: string) {
    this.logger.log(`🔄 Buscando carrinho do usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: userId=${userId}`);
    
    try {
      const cart = await this.cartService.getCart(userId);
      const itemCount = cart?.items?.length || 0;
      this.logger.log(`✅ Encontrados ${itemCount} itens no carrinho do usuário ${userId}`);
      this.logger.debug(`📦 Carrinho: ${JSON.stringify(cart)}`);
      return cart;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar carrinho do usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('count')
  @ApiOperation({ summary: 'Quantidade de itens' })
  @ApiResponse({ status: 200, description: 'Quantidade retornada com sucesso' })
  async getCartItemCount(@CurrentUser('sub') userId: string) {
    this.logger.log(`🔄 Buscando quantidade de itens do carrinho do usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: userId=${userId}`);
    
    try {
      const result = await this.cartService.getCartItemCount(userId);
      const count = typeof result === 'number' ? result : result?.count || 0;
      this.logger.log(`✅ Carrinho do usuário ${userId} possui ${count} itens`);
      this.logger.debug(`📊 Resultado: ${JSON.stringify(result)}`);
      return { count };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar quantidade de itens do usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar produto ao carrinho' })
  @ApiResponse({ status: 201, description: 'Produto adicionado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async addToCart(@CurrentUser('sub') userId: string, @Body() dto: AddToCartDto) {
    this.logger.log(`🔄 Adicionando produto ao carrinho do usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: userId=${userId}, produtoId=${dto.produtoId}`);
    this.logger.debug(`📦 Dados: ${JSON.stringify(dto)}`);
    
    try {
      const result = await this.cartService.addToCart(userId, dto);
      const itemCount = result?.items?.length || 0;
      this.logger.log(`✅ Produto ${dto.produtoId} adicionado ao carrinho do usuário ${userId}`);
      this.logger.log(`📊 Carrinho agora possui ${itemCount} itens`);
      this.logger.debug(`📦 Carrinho atualizado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao adicionar produto ${dto.produtoId} ao carrinho do usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Put(':itemId')
  @ApiOperation({ summary: 'Atualizar quantidade do item' })
  @ApiResponse({ status: 200, description: 'Item atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Item não encontrado' })
  async updateCartItem(
    @CurrentUser('sub') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    this.logger.log(`🔄 Atualizando item ${itemId} do carrinho do usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: userId=${userId}, itemId=${itemId}, quantidade=${dto.quantidade}`);
    this.logger.debug(`📦 Dados: ${JSON.stringify(dto)}`);
    
    try {
      const updatedCart = await this.cartService.updateCartItem(userId, itemId, dto);
      const itemCount = updatedCart?.items?.length || 0;
      this.logger.log(`✅ Item ${itemId} atualizado com sucesso para o usuário ${userId}`);
      this.logger.log(`📊 Carrinho agora possui ${itemCount} itens`);
      this.logger.debug(`📦 Carrinho atualizado: ${JSON.stringify(updatedCart)}`);
      return updatedCart;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao atualizar item ${itemId} do carrinho do usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover item do carrinho' })
  @ApiResponse({ status: 200, description: 'Item removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Item não encontrado' })
  async removeFromCart(@CurrentUser('sub') userId: string, @Param('itemId') itemId: string) {
    this.logger.log(`🔄 Removendo item ${itemId} do carrinho do usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: userId=${userId}, itemId=${itemId}`);
    
    try {
      const updatedCart = await this.cartService.removeFromCart(userId, itemId);
      const itemCount = updatedCart?.items?.length || 0;
      this.logger.log(`✅ Item ${itemId} removido do carrinho do usuário ${userId}`);
      this.logger.log(`📊 Carrinho agora possui ${itemCount} itens`);
      this.logger.debug(`📦 Carrinho atualizado: ${JSON.stringify(updatedCart)}`);
      return updatedCart;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao remover item ${itemId} do carrinho do usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Limpar carrinho' })
  @ApiResponse({ status: 200, description: 'Carrinho limpo com sucesso' })
  async clearCart(@CurrentUser('sub') userId: string) {
    this.logger.log(`🔄 Limpando carrinho do usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: userId=${userId}`);
    
    try {
      const emptyCart = await this.cartService.clearCart(userId);
      const itemCount = emptyCart?.items?.length || 0;
      this.logger.log(`✅ Carrinho do usuário ${userId} foi limpo com sucesso`);
      this.logger.log(`📊 Carrinho agora possui ${itemCount} itens`);
      this.logger.debug(`📦 Carrinho vazio: ${JSON.stringify(emptyCart)}`);
      return emptyCart;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao limpar carrinho do usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }
}