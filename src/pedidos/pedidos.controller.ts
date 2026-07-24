// src/pedidos/pedidos.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Req, 
  HttpCode, 
  HttpStatus,
  Logger 
} from '@nestjs/common';
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
  private readonly logger = new Logger(PedidosController.name);

  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo pedido' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso' })
  async create(@Req() req: any, @Body() createPedidoDto: CreatePedidoDto) {
    const userId = req.user.userId;
    this.logger.log(`🔄 Criando novo pedido para usuário: ${userId}`);
    this.logger.debug(`📦 Dados do pedido: ${JSON.stringify(createPedidoDto)}`);
    this.logger.debug(`👤 Usuário: ${JSON.stringify(req.user)}`);
    
    try {
      const result = await this.pedidosService.create(userId, createPedidoDto);
      this.logger.log(`✅ Pedido criado com sucesso! ID: ${result?.id || 'N/A'}`);
      this.logger.debug(`📦 Pedido criado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao criar pedido para usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar pedidos do usuário' })
  async findAll(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.userId;
    const pageNum = page || 1;
    const limitNum = limit || 10;
    
    this.logger.log(`🔄 Listando pedidos do usuário: ${userId} - Página: ${pageNum}, Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: page=${page}, limit=${limit}`);
    
    try {
      const result = await this.pedidosService.findByUser(userId, pageNum, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontrados ${count} pedidos para o usuário ${userId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao listar pedidos do usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('meus')
  @ApiOperation({ summary: 'Listar meus pedidos' })
  async findMeusPedidos(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.userId;
    const pageNum = page || 1;
    const limitNum = limit || 10;
    
    this.logger.log(`🔄 Listando meus pedidos (usuário: ${userId}) - Página: ${pageNum}, Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: page=${page}, limit=${limit}`);
    
    try {
      const result = await this.pedidosService.findByUser(userId, pageNum, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontrados ${count} pedidos para o usuário ${userId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao listar meus pedidos (usuário ${userId}): ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pedido por ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    this.logger.log(`🔄 Buscando pedido ID: "${id}" para usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: id=${id}, userId=${userId}`);
    
    try {
      const result = await this.pedidosService.findOne(id, userId);
      if (result) {
        this.logger.log(`✅ Pedido ${id} encontrado para usuário ${userId}`);
        this.logger.debug(`📦 Pedido: ${JSON.stringify(result)}`);
      } else {
        this.logger.warn(`⚠️ Pedido ${id} não encontrado para usuário ${userId}`);
      }
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar pedido ${id} para usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancelar pedido' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    this.logger.log(`🔄 Cancelando pedido ID: "${id}" para usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: id=${id}, userId=${userId}`);
    
    try {
      const result = await this.pedidosService.cancel(id, userId);
      this.logger.log(`✅ Pedido ${id} cancelado com sucesso pelo usuário ${userId}`);
      this.logger.debug(`📦 Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao cancelar pedido ${id} para usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
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
    const pageNum = page || 1;
    const limitNum = limit || 10;
    
    this.logger.log(`🔄 [ADMIN] Listando todos os pedidos - Página: ${pageNum}, Limite: ${limitNum}, Status: ${status || 'Todos'}`);
    this.logger.debug(`📊 Parâmetros: page=${page}, limit=${limit}, status=${status}`);
    
    try {
      const result = await this.pedidosService.findAllAdmin(pageNum, limitNum, status);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ [ADMIN] Encontrados ${count} pedidos`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao listar todos os pedidos: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('admin/status/:status')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Buscar pedidos por status' })
  async findByStatus(@Param('status') status: string) {
    this.logger.log(`🔄 [ADMIN] Buscando pedidos por status: "${status}"`);
    this.logger.debug(`📊 Parâmetros: status=${status}`);
    
    try {
      const result = await this.pedidosService.findByStatus(status);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ [ADMIN] Encontrados ${count} pedidos com status "${status}"`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao buscar pedidos por status "${status}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('admin/:id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Buscar pedido por ID (admin)' })
  async findOneAdmin(@Param('id') id: string) {
    this.logger.log(`🔄 [ADMIN] Buscando pedido ID: "${id}"`);
    this.logger.debug(`📊 Parâmetros: id=${id}`);
    
    try {
      const result = await this.pedidosService.findOneAdmin(id);
      if (result) {
        this.logger.log(`✅ [ADMIN] Pedido ${id} encontrado`);
        this.logger.debug(`📦 Pedido: ${JSON.stringify(result)}`);
      } else {
        this.logger.warn(`⚠️ [ADMIN] Pedido ${id} não encontrado`);
      }
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao buscar pedido ${id}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
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
    const adminId = req.user.userId;
    this.logger.log(`🔄 [ADMIN] Atualizando status do pedido ID: "${id}" para "${updateStatusDto.status}"`);
    this.logger.debug(`📊 Parâmetros: id=${id}, adminId=${adminId}`);
    this.logger.debug(`📦 Dados: ${JSON.stringify(updateStatusDto)}`);
    
    try {
      const result = await this.pedidosService.updateStatusAdmin(id, updateStatusDto, adminId);
      this.logger.log(`✅ [ADMIN] Status do pedido ${id} atualizado para "${updateStatusDto.status}"`);
      this.logger.debug(`📦 Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao atualizar status do pedido ${id}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
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
    const adminId = req.user.userId;
    this.logger.log(`🔄 [ADMIN] Atualizando código de rastreio do pedido ID: "${id}"`);
    this.logger.debug(`📊 Parâmetros: id=${id}, adminId=${adminId}, codigoRastreio=${codigoRastreio}`);
    
    try {
      const result = await this.pedidosService.updateRastreio(id, codigoRastreio, adminId);
      this.logger.log(`✅ [ADMIN] Código de rastreio do pedido ${id} atualizado`);
      this.logger.debug(`📦 Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao atualizar código de rastreio do pedido ${id}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
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
    const adminId = req?.user?.userId;
    this.logger.log(`🔄 [ADMIN] Cancelando pedido ID: "${id}"`);
    this.logger.debug(`📊 Parâmetros: id=${id}, adminId=${adminId}, motivo=${motivo}`);
    
    try {
      const result = await this.pedidosService.cancelAdmin(id, motivo, adminId);
      this.logger.log(`✅ [ADMIN] Pedido ${id} cancelado com sucesso`);
      this.logger.debug(`📦 Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao cancelar pedido ${id}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
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
    const pageNum = page || 1;
    const limitNum = limit || 10;
    
    this.logger.log(`🔄 [ADMIN] Buscando pedidos do cliente: "${clienteId}" - Página: ${pageNum}, Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: clienteId=${clienteId}, page=${page}, limit=${limit}`);
    
    try {
      const result = await this.pedidosService.findPedidosByCliente(clienteId, pageNum, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ [ADMIN] Encontrados ${count} pedidos para o cliente ${clienteId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao buscar pedidos do cliente ${clienteId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('admin/stats/orders')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Estatísticas de pedidos' })
  async getOrderStats() {
    this.logger.log('🔄 [ADMIN] Buscando estatísticas de pedidos');
    
    try {
      const result = await this.pedidosService.getOrderStats();
      this.logger.log('✅ [ADMIN] Estatísticas de pedidos obtidas com sucesso');
      this.logger.debug(`📊 Estatísticas: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao buscar estatísticas: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('admin/recent/orders')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Pedidos recentes' })
  async getRecentOrders(@Query('limit') limit?: number) {
    const limitNum = limit || 10;
    this.logger.log(`🔄 [ADMIN] Buscando pedidos recentes - Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: limit=${limit}`);
    
    try {
      const result = await this.pedidosService.getRecentOrders(limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ [ADMIN] Encontrados ${count} pedidos recentes`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao buscar pedidos recentes: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
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
    const pageNum = page || 1;
    const limitNum = limit || 10;
    
    this.logger.log(`🔄 [ADMIN] Buscando pedidos por período: ${startDate} até ${endDate}`);
    this.logger.debug(`📊 Parâmetros: startDate=${startDate}, endDate=${endDate}, page=${page}, limit=${limit}`);
    
    try {
      const result = await this.pedidosService.getOrdersByPeriod(
        new Date(startDate),
        new Date(endDate),
        pageNum,
        limitNum,
      );
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ [ADMIN] Encontrados ${count} pedidos no período`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao buscar pedidos por período: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
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
    const pageNum = page || 1;
    const limitNum = limit || 10;
    
    this.logger.log(`🔄 [ADMIN] Buscando pedidos com termo: "${term}" - Página: ${pageNum}, Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: term=${term}, page=${page}, limit=${limit}`);
    
    try {
      const result = await this.pedidosService.searchOrders(term, pageNum, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ [ADMIN] Encontrados ${count} pedidos para o termo "${term}"`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN] Erro ao buscar pedidos com termo "${term}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }
}