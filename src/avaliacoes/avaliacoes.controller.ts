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
    return this.avaliacoesService.create(userId, createAvaliacaoDto);
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
    return this.avaliacoesService.findByProduto(produtoId, page, limit);
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
    return this.avaliacoesService.getProdutoRating(produtoId);
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
    return this.avaliacoesService.findUserAvaliacoes(userId);
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
    return this.avaliacoesService.update(userId, id, updateAvaliacaoDto);
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
    return this.avaliacoesService.delete(userId, id);
  }
}