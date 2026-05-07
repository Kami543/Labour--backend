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
    this.logger.log(`Encontrados ${cart.length} itens`);
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
  async addToCart(@CurrentUser('sub') userId: string, @Body() dto: AddToCartDto) {
    this.logger.log(`Adicionando produto ${dto.produtoId} ao carrinho`);
    await this.cartService.addToCart(userId, dto);
    
    // Retorna o carrinho completo atualizado
    const updatedCart = await this.cartService.getCart(userId);
    this.logger.log(`Carrinho agora tem ${updatedCart.length} itens`);
    return updatedCart;
  }

  @Put(':itemId')
  @ApiOperation({ summary: 'Atualizar quantidade do item' })
  async updateCartItem(
    @CurrentUser('sub') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    this.logger.log(`Atualizando item ${itemId}`);
    await this.cartService.updateCartItem(userId, itemId, dto);
    
    const updatedCart = await this.cartService.getCart(userId);
    return updatedCart;
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromCart(@CurrentUser('sub') userId: string, @Param('itemId') itemId: string) {
    this.logger.log(`Removendo item ${itemId} do carrinho`);
    await this.cartService.removeFromCart(userId, itemId);
    
    const updatedCart = await this.cartService.getCart(userId);
    return updatedCart;
  }
}