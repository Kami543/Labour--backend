// src/pedidos/pedidos.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoStatusDto } from './dto/update-pedido-status.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Pedidos')
@ApiBearerAuth('access-token')
@Controller('pedidos')
@UseGuards(AuthGuard('jwt'))
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo pedido' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso' })
  async create(@Req() req: any, @Body() createPedidoDto: CreatePedidoDto) {
    return this.pedidosService.create(req.user.userId, createPedidoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pedidos do usuário' })
  async findAll(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pedidosService.findByUser(req.user.userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pedido por ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.pedidosService.findOne(id, req.user.userId);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancelar pedido' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    return this.pedidosService.cancel(id, req.user.userId);
  }

  // ========== ROTAS ADMIN ==========

  @Get('admin/all')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Listar todos os pedidos (admin)' })
  async findAllAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.pedidosService.findAllAdmin(page, limit, status);
  }

  @Get('admin/status/:status')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Buscar pedidos por status' })
  async findByStatus(@Param('status') status: string) {
    return this.pedidosService.findByStatus(status);
  }

  @Get('admin/:id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Buscar pedido por ID (admin)' })
  async findOneAdmin(@Param('id') id: string) {
    return this.pedidosService.findOneAdmin(id);
  }

  @Put('admin/:id/status')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar status do pedido (admin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdatePedidoStatusDto,
    @Req() req: any,
  ) {
    return this.pedidosService.updateStatusAdmin(id, updateStatusDto, req.user.userId);
  }

  @Put('admin/:id/rastreio')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar código de rastreio' })
  async updateRastreio(
    @Param('id') id: string,
    @Body('codigoRastreio') codigoRastreio: string,
    @Req() req: any,
  ) {
    return this.pedidosService.updateRastreio(id, codigoRastreio, req.user.userId);
  }

  @Delete('admin/:id/cancel')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pedido (admin)' })
  async cancelAdmin(
    @Param('id') id: string,
    @Body('motivo') motivo?: string,
    @Req() req?: any,
  ) {
    return this.pedidosService.cancelAdmin(id, motivo, req?.user?.userId);
  }

  @Get('admin/cliente/:clienteId')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Buscar pedidos por cliente' })
  async findPedidosByCliente(
    @Param('clienteId') clienteId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pedidosService.findPedidosByCliente(clienteId, page, limit);
  }

  @Get('admin/stats/orders')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Estatísticas de pedidos' })
  async getOrderStats() {
    return this.pedidosService.getOrderStats();
  }

  @Get('admin/recent/orders')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Pedidos recentes' })
  async getRecentOrders(@Query('limit') limit?: number) {
    return this.pedidosService.getRecentOrders(limit);
  }

  @Get('admin/period/orders')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Pedidos por período' })
  async getOrdersByPeriod(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pedidosService.getOrdersByPeriod(
      new Date(startDate),
      new Date(endDate),
      page,
      limit,
    );
  }

  @Get('admin/search/orders')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Buscar pedidos' })
  async searchOrders(
    @Query('term') term: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pedidosService.searchOrders(term, page, limit);
  }
}