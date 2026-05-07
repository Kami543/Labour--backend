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
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoStatusDto } from './dto/update-pedido-status.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Pedidos')
@ApiBearerAuth('access-token')
@Controller('pedidos')
@UseGuards(AuthGuard('jwt'))
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um novo pedido' })
  @ApiBody({ type: CreatePedidoDto })
  @ApiResponse({
    status: 201,
    description: 'Pedido criado com sucesso',
    schema: {
      example: {
        id: 'pedido_id',
        numero: 'cm8k3x...',
        status: 'pendente',
        subtotal: 119.80,
        frete: 10.00,
        imposto: 5.00,
        total: 134.80,
        userId: 'user_id',
        itens: [],
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Carrinho vazio ou dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(@Req() req: any, @Body() createPedidoDto: CreatePedidoDto) {
    const userId = req.user.userId;
    return this.pedidosService.create(userId, createPedidoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os pedidos do usuário' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Lista de pedidos retornada com sucesso',
    schema: {
      example: {
        data: [],
        total: 5,
        page: 1,
        limit: 10
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.userId;
    return this.pedidosService.findAll(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pedido por ID' })
  @ApiParam({ name: 'id', description: 'ID do pedido' })
  @ApiResponse({
    status: 200,
    description: 'Pedido encontrado com sucesso'
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.pedidosService.findOne(id, userId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Atualizar status do pedido' })
  @ApiParam({ name: 'id', description: 'ID do pedido' })
  @ApiBody({ type: UpdatePedidoStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso'
  })
  @ApiResponse({ status: 400, description: 'Status inválido' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdatePedidoStatusDto,
  ) {
    const userId = req.user.userId;
    return this.pedidosService.updateStatus(id, userId, updateStatusDto);
  }

  @Delete(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pedido' })
  @ApiParam({ name: 'id', description: 'ID do pedido' })
  @ApiResponse({
    status: 200,
    description: 'Pedido cancelado com sucesso'
  })
  @ApiResponse({ status: 400, description: 'Pedido não pode ser cancelado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  async cancel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.pedidosService.cancel(id, userId);
  }
}