// src/modules/avaliacoes/avaliacoes.controller.ts
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
  Logger,
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
import { AvaliacoesService } from './avaliacoes.service';
import { CreateAvaliacaoDto } from './dto/create-avaliacao.dto';
import { UpdateAvaliacaoDto } from './dto/update-avaliacao.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Avaliações')
@ApiBearerAuth('access-token')
@Controller('avaliacoes')
export class AvaliacoesController {
  private readonly logger = new Logger(AvaliacoesController.name);

  constructor(private readonly avaliacoesService: AvaliacoesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar avaliação de produto' })
  @ApiBody({ type: CreateAvaliacaoDto })
  @ApiResponse({
    status: 201,
    description: 'Avaliação criada com sucesso'
  })
  @ApiResponse({ status: 400, description: 'Usuário já avaliou ou não comprou o produto' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async create(@Req() req: any, @Body() createAvaliacaoDto: CreateAvaliacaoDto) {
    const userId = req.user.userId;
    this.logger.log(`🔄 Criando avaliação para usuário: ${userId}, produto: ${createAvaliacaoDto.produtoId}`);
    this.logger.debug(`📊 Parâmetros: userId=${userId}, produtoId=${createAvaliacaoDto.produtoId}`);
    this.logger.debug(`📦 Dados da avaliação: ${JSON.stringify(createAvaliacaoDto)}`);
    this.logger.debug(`👤 Usuário: ${JSON.stringify(req.user)}`);
    
    try {
      const result = await this.avaliacoesService.create(userId, createAvaliacaoDto);
      this.logger.log(`✅ Avaliação criada com sucesso! ID: ${result?.id || 'N/A'}`);
      this.logger.debug(`📦 Avaliação criada: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao criar avaliação para usuário ${userId}, produto ${createAvaliacaoDto.produtoId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('produto/:produtoId')
  @ApiOperation({ summary: 'Buscar avaliações de um produto' })
  @ApiParam({ name: 'produtoId', description: 'ID do produto' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Avaliações encontradas com sucesso'
  })
  async findByProduto(
    @Param('produtoId') produtoId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page || 1;
    const limitNum = limit || 10;
    
    this.logger.log(`🔄 Buscando avaliações do produto: ${produtoId} - Página: ${pageNum}, Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: produtoId=${produtoId}, page=${page}, limit=${limit}`);
    
    try {
      const result = await this.avaliacoesService.findByProduto(produtoId, pageNum, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontradas ${count} avaliações para o produto ${produtoId}`);
      this.logger.debug(`📦 Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar avaliações do produto ${produtoId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('produto/:produtoId/rating')
  @ApiOperation({ summary: 'Buscar média de avaliações do produto' })
  @ApiParam({ name: 'produtoId', description: 'ID do produto' })
  @ApiResponse({
    status: 200,
    description: 'Média calculada com sucesso',
    schema: {
      example: {
        media: 4.5,
        totalAvaliacoes: 10,
        distribuicao: { 5: 6, 4: 2, 3: 1, 2: 1 }
      }
    }
  })
  async getProdutoRating(@Param('produtoId') produtoId: string) {
    this.logger.log(`🔄 Buscando média de avaliações do produto: ${produtoId}`);
    this.logger.debug(`📊 Parâmetros: produtoId=${produtoId}`);
    
    try {
      const result = await this.avaliacoesService.getProdutoRating(produtoId);
      this.logger.log(`✅ Média calculada para o produto ${produtoId}: ${result?.media || 0} (${result?.totalAvaliacoes || 0} avaliações)`);
      this.logger.debug(`📦 Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar média de avaliações do produto ${produtoId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('minhas-avaliacoes')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Buscar avaliações do usuário logado' })
  @ApiResponse({
    status: 200,
    description: 'Avaliações encontradas com sucesso'
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findUserAvaliacoes(@Req() req: any) {
    const userId = req.user.userId;
    this.logger.log(`🔄 Buscando avaliações do usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: userId=${userId}`);
    this.logger.debug(`👤 Usuário: ${JSON.stringify(req.user)}`);
    
    try {
      const result = await this.avaliacoesService.findUserAvaliacoes(userId);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontradas ${count} avaliações para o usuário ${userId}`);
      this.logger.debug(`📦 Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar avaliações do usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Atualizar avaliação' })
  @ApiParam({ name: 'id', description: 'ID da avaliação' })
  @ApiBody({ type: UpdateAvaliacaoDto })
  @ApiResponse({
    status: 200,
    description: 'Avaliação atualizada com sucesso'
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Avaliação não encontrada' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateAvaliacaoDto: UpdateAvaliacaoDto,
  ) {
    const userId = req.user.userId;
    this.logger.log(`🔄 Atualizando avaliação ID: ${id} para usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: userId=${userId}, id=${id}`);
    this.logger.debug(`📦 Dados de atualização: ${JSON.stringify(updateAvaliacaoDto)}`);
    this.logger.debug(`👤 Usuário: ${JSON.stringify(req.user)}`);
    
    try {
      const result = await this.avaliacoesService.update(userId, id, updateAvaliacaoDto);
      this.logger.log(`✅ Avaliação ${id} atualizada com sucesso para usuário ${userId}`);
      this.logger.debug(`📦 Avaliação atualizada: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao atualizar avaliação ${id} para usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar avaliação' })
  @ApiParam({ name: 'id', description: 'ID da avaliação' })
  @ApiResponse({ status: 204, description: 'Avaliação deletada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Avaliação não encontrada' })
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    this.logger.log(`🔄 Deletando avaliação ID: ${id} para usuário: ${userId}`);
    this.logger.debug(`📊 Parâmetros: userId=${userId}, id=${id}`);
    this.logger.debug(`👤 Usuário: ${JSON.stringify(req.user)}`);
    
    try {
      const result = await this.avaliacoesService.delete(userId, id);
      this.logger.log(`✅ Avaliação ${id} deletada com sucesso para usuário ${userId}`);
      this.logger.debug(`📦 Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao deletar avaliação ${id} para usuário ${userId}: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }
}