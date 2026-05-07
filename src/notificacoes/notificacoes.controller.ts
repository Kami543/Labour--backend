// src/modules/notificacoes/notificacoes.controller.ts
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
  ApiExtraModels,
} from '@nestjs/swagger';
import { NotificacoesService } from './notificacoes.service';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Notificacoes')
@ApiBearerAuth('access-token')
@Controller('notificacoes')
@UseGuards(AuthGuard('jwt'))
@ApiExtraModels(CreateNotificacaoDto)
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Criar notificação para usuário',
    description: 'Cria uma nova notificação para o usuário autenticado (geralmente usado pelo sistema ou admin)'
  })
  @ApiBody({ type: CreateNotificacaoDto })
  @ApiResponse({
    status: 201,
    description: 'Notificação criada com sucesso',
    schema: {
      example: {
        id: 'notificacao_id',
        userId: 'user_id',
        tipo: 'sistema',
        titulo: 'Bem-vindo!',
        mensagem: 'Seja bem-vindo ao sistema',
        lida: false,
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(@Req() req: any, @Body() createDto: CreateNotificacaoDto) {
    const userId = req.user.userId;
    return this.notificacoesService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar notificações do usuário',
    description: 'Retorna todas as notificações do usuário com paginação e filtros'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    example: 1,
    description: 'Número da página'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    example: 20,
    description: 'Itens por página'
  })
  @ApiQuery({ 
    name: 'apenasNaoLidas', 
    required: false, 
    example: false,
    description: 'Filtrar apenas notificações não lidas'
  })
  @ApiResponse({
    status: 200,
    description: 'Notificações listadas com sucesso',
    schema: {
      example: {
        data: [
          {
            id: 'notificacao_id',
            tipo: 'sistema',
            titulo: 'Pedido criado',
            mensagem: 'Seu pedido foi criado',
            lida: false,
            createdAt: '2024-01-01T00:00:00.000Z'
          }
        ],
        total: 5,
        page: 1,
        limit: 20,
        naoLidas: 2,
        mensagem: 'Você tem 2 notificações não lidas'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('apenasNaoLidas') apenasNaoLidas?: boolean,
  ) {
    const userId = req.user.userId;
    return this.notificacoesService.findAll(
      userId,
      page,
      limit,
      apenasNaoLidas === true,
    );
  }

  @Get('unread/count')
  @ApiOperation({ 
    summary: 'Contar notificações não lidas',
    description: 'Retorna o número total de notificações não lidas do usuário'
  })
  @ApiResponse({
    status: 200,
    description: 'Contagem retornada com sucesso',
    schema: {
      example: {
        count: 3,
        mensagem: 'Você tem 3 notificações não lidas'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async countUnread(@Req() req: any) {
    const userId = req.user.userId;
    const count = await this.notificacoesService.getUnreadCount(userId); // Use o método correto
    return {
      count,
      mensagem: `Você tem ${count} ${count === 1 ? 'notificação não lida' : 'notificações não lidas'}`
    };
  }

  @Put(':id/read')
  @ApiOperation({ 
    summary: 'Marcar notificação como lida',
    description: 'Marca uma notificação específica como lida'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID da notificação',
    example: 'cm8k3x...',
    required: true 
  })
  @ApiResponse({
    status: 200,
    description: 'Notificação marcada como lida',
    schema: {
      example: {
        id: 'notificacao_id',
        lida: true,
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.notificacoesService.markAsRead(userId, id);
  }

  @Put('mark-all-read')
  @ApiOperation({ 
    summary: 'Marcar todas notificações como lidas',
    description: 'Marca todas as notificações do usuário como lidas'
  })
  @ApiResponse({
    status: 200,
    description: 'Todas notificações marcadas como lidas',
    schema: {
      example: {
        count: 3,
        mensagem: '3 notificações foram marcadas como lidas'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.notificacoesService.markAllAsRead(userId);
    const count = typeof result === 'number' ? result : result.count || 0;
    return {
      count,
      mensagem: `${count} ${count === 1 ? 'notificação foi' : 'notificações foram'} marcada${count === 1 ? '' : 's'} como lida${count === 1 ? '' : 's'}`
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Deletar notificação',
    description: 'Remove uma notificação específica'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID da notificação',
    example: 'cm8k3x...'
  })
  @ApiResponse({ status: 204, description: 'Notificação deletada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.notificacoesService.delete(userId, id);
  }

  @Delete('read/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Deletar todas notificações lidas',
    description: 'Remove permanentemente todas as notificações já lidas do usuário'
  })
  @ApiResponse({
    status: 200,
    description: 'Notificações lidas removidas',
    schema: {
      example: {
        count: 5,
        mensagem: '5 notificações lidas foram removidas'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async deleteAllRead(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.notificacoesService.deleteAllRead(userId);
    const count = typeof result === 'number' ? result : result.count || 0;
    return {
      count,
      mensagem: `${count} ${count === 1 ? 'notificação lida foi' : 'notificações lidas foram'} removida${count === 1 ? '' : 's'}`
    };
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Estatísticas de notificações',
    description: 'Retorna estatísticas detalhadas das notificações do usuário'
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
    schema: {
      example: {
        totalPorTipo: [
          { tipo: 'sistema', _count: 10 },
          { tipo: 'entrega', _count: 5 },
          { tipo: 'promocao', _count: 3 }
        ],
        ultimasSemana: 3,
        totalNaoLidas: 2,
        totalNotificacoes: 18
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getStats(@Req() req: any) {
    const userId = req.user.userId;
    const stats = await this.notificacoesService.getStats(userId);
    const totalNaoLidas = await this.notificacoesService.getUnreadCount(userId);
    
    // Calcular total corretamente
    const totalNotificacoes = stats.totalPorTipo.reduce((acc, curr) => {
      return acc + (typeof curr._count === 'number' ? curr._count : 0);
    }, 0);
    
    return {
      ...stats,
      totalNaoLidas,
      totalNotificacoes
    };
  }
}