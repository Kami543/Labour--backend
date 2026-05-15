// pedidos.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoStatusDto } from './dto/update-pedido-status.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Pedidos')
@ApiBearerAuth('access-token')
@Controller('pedidos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  // ============================================================
  // ⚠️  ROTAS ESTÁTICAS PRIMEIRO — antes de qualquer @Get(':id')
  //     O NestJS resolve rotas em ordem de declaração.
  //     Se @Get(':id') vier antes, ele captura "meus", "status",
  //     "cliente" etc. como se fossem IDs.
  // ============================================================

  // ── Usuário comum ──────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um novo pedido' })
  async create(@Req() req: any, @Body() createPedidoDto: CreatePedidoDto) {
    const userId = req.user.userId;
    return this.pedidosService.create(userId, createPedidoDto);
  }

  /**
   * GET /pedidos/meus
   * DEVE vir antes de @Get(':id') para não ser engolida pelo param dinâmico.
   */
  @Get('meus')
  @ApiOperation({ summary: 'Listar meus pedidos' })
  async findMyOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    return this.pedidosService.findByUser(userId, pageNum, limitNum);
  }

  /** GET /pedidos/meu/:id */
  @Get('meu/:id')
  @ApiOperation({ summary: 'Buscar meu pedido por ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.pedidosService.findOne(id, userId);
  }

  /** PATCH /pedidos/meu/:id/cancelar */
  @Patch('meu/:id/cancelar')
  @ApiOperation({ summary: 'Cancelar meu pedido' })
  async cancelMyOrder(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.pedidosService.cancel(id, userId);
  }

  // ── Admin — rotas estáticas ────────────────────────────────

  /** GET /pedidos  (lista paginada — admin) */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: Listar todos os pedidos' })
  async findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    return this.pedidosService.findAllAdmin(pageNum, limitNum, status);
  }

  /** GET /pedidos/status/:status */
  @Get('status/:status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: Buscar pedidos por status' })
  async findByStatus(@Param('status') status: string) {
    return this.pedidosService.findByStatus(status);
  }

  /** GET /pedidos/cliente/:clienteId */
  @Get('cliente/:clienteId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: Buscar pedidos por cliente' })
  async findByCliente(@Param('clienteId') clienteId: string) {
    return this.pedidosService.findByUser(clienteId);
  }

  // ── Admin — rotas com :id dinâmico (SEMPRE POR ÚLTIMO) ────

  /** GET /pedidos/:id */
  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: Buscar qualquer pedido por ID' })
  async findOneAdmin(@Param('id') id: string) {
    return this.pedidosService.findOneAdmin(id);
  }

  /** PATCH /pedidos/:id/status */
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: Atualizar status de qualquer pedido' })
  async updateStatusAdmin(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdatePedidoStatusDto,
  ) {
    return this.pedidosService.updateStatusAdmin(id, updateStatusDto);
  }

  /** PATCH /pedidos/:id/rastreio */
  @Patch(':id/rastreio')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: Atualizar código de rastreio' })
  async updateRastreio(
    @Param('id') id: string,
    @Body('codigoRastreio') codigoRastreio: string,
  ) {
    return this.pedidosService.updateRastreio(id, codigoRastreio);
  }

  /** POST /pedidos/:id/cancelar */
  @Post(':id/cancelar')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: Cancelar qualquer pedido' })
  async cancelAdmin(
    @Param('id') id: string,
    @Body('motivo') motivo?: string,
  ) {
    return this.pedidosService.cancelAdmin(id, motivo || '')
    }
}