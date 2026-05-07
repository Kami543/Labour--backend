// produto/produto.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProdutoService } from './produto.service';
import { CreateProdutoDto, UpdateProdutoDto } from './dto/produto.dto';

@ApiBearerAuth('access-token')
@ApiTags('Products')
@Controller('products')
export class ProdutoController {
  private readonly logger = new Logger(ProdutoController.name);

  constructor(private readonly produtoService: ProdutoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um novo produto' })
  @ApiBody({ description: 'Dados para criar um novo produto', type: CreateProdutoDto })
  async create(@Body() createProdutoDto: CreateProdutoDto) {
    this.logger.log('Criando um novo produto...');
    return this.produtoService.create(createProdutoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Buscar todos os produtos' })
  async findAll() {
    this.logger.log('Buscando todos os produtos...');
    return this.produtoService.findAll();
  }

  @Get('categoria/:categoria')
  @ApiOperation({ summary: 'Buscar produtos por categoria' })
  @ApiParam({ name: 'categoria', required: true })
  async findByCategoria(@Param('categoria') categoria: string) {
    this.logger.log(`Buscando produtos por categoria: ${categoria}...`);
    return this.produtoService.findByCategoria(categoria);
  }

  @Get('tag/:tag')
  @ApiOperation({ summary: 'Buscar produtos por tag' })
  @ApiParam({ name: 'tag', required: true })
  async findByTag(@Param('tag') tag: string) {
    this.logger.log(`Buscando produtos por tag: ${tag}...`);
    return this.produtoService.findByTag(tag);
  }

  @Get('estoque/disponivel')
  @ApiOperation({ summary: 'Buscar produtos em estoque' })
  async findEmEstoque() {
    this.logger.log('Buscando produtos em estoque...');
    return this.produtoService.findEmEstoque();
  }

  @Get('novos')
  @ApiOperation({ summary: 'Buscar produtos novos' })
  @ApiQuery({ name: 'dias', required: false, type: Number, description: 'Dias para considerar como novo' })
  async findNovos(@Query('dias') dias: string = '30') {
    const diasNum = parseInt(dias, 10);
    this.logger.log(`Buscando produtos novos dos últimos ${diasNum} dias...`);
    return this.produtoService.findNovos(diasNum);
  }

  @Get('populares')
  @ApiOperation({ summary: 'Buscar produtos populares' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limite de resultados' })
  async findPopulares(@Query('limit') limit: string = '10') {
    const limitNum = parseInt(limit, 10);
    this.logger.log('Buscando produtos populares...');
    return this.produtoService.findPopulares(limitNum);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Buscar produto por slug' })
  @ApiParam({ name: 'slug', required: true })
  async findBySlug(@Param('slug') slug: string) {
    this.logger.log(`Buscando produto por slug: ${slug}...`);
    return this.produtoService.findBySlug(slug);
  }

  @Get('cores')
  @ApiOperation({ summary: 'Buscar cores disponíveis' })
  async getCoresDisponiveis() {
    this.logger.log('Buscando cores disponíveis...');
    return this.produtoService.getCoresDisponiveis();
  }

  @Get('tamanhos')
  @ApiOperation({ summary: 'Buscar tamanhos disponíveis' })
  async getTamanhosDisponiveis() {
    this.logger.log('Buscando tamanhos disponíveis...');
    return this.produtoService.getTamanhosDisponiveis();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiParam({ name: 'id', required: true })
  async findById(@Param('id') id: string) {
    this.logger.log(`Buscando produto com ID ${id}...`);
    return this.produtoService.findById(id);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Buscar produto com detalhes' })
  @ApiParam({ name: 'id', required: true })
  async findDetail(@Param('id') id: string) {
    this.logger.log(`Buscando detalhes do produto com ID ${id}...`);
    return this.produtoService.findDetail(id);
  }

  @Get(':id/similares')
  @ApiOperation({ summary: 'Buscar produtos similares' })
  @ApiParam({ name: 'id', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limite de resultados' })
  async findSimilares(@Param('id') id: string, @Query('limit') limit: string = '5') {
    const limitNum = parseInt(limit, 10);
    this.logger.log(`Buscando produtos similares ao produto ${id}...`);
    return this.produtoService.findSimilares(id, limitNum);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar um produto' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ description: 'Dados para atualizar o produto', type: UpdateProdutoDto })
  async update(@Param('id') id: string, @Body() updateProdutoDto: UpdateProdutoDto) {
    this.logger.log(`Atualizando produto com ID ${id}...`);
    return this.produtoService.update(id, updateProdutoDto);
  }

  @Put(':id/estoque')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar estoque do produto' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ description: 'Quantidade do estoque', schema: { properties: { quantidade: { type: 'number' } } } })
  async updateEstoque(@Param('id') id: string, @Body('quantidade') quantidade: number) {
    this.logger.log(`Atualizando estoque do produto ${id} para ${quantidade}...`);
    return this.produtoService.updateEstoque(id, quantidade);
  }

  @Put(':id/estoque/increment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Incrementar estoque do produto' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ description: 'Quantidade a incrementar', schema: { properties: { quantidade: { type: 'number' } } } })
  async incrementEstoque(@Param('id') id: string, @Body('quantidade') quantidade: number) {
    this.logger.log(`Incrementando estoque do produto ${id} em +${quantidade}...`);
    return this.produtoService.incrementEstoque(id, quantidade);
  }

  @Put(':id/estoque/decrement')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decrementar estoque do produto' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ description: 'Quantidade a decrementar', schema: { properties: { quantidade: { type: 'number' } } } })
  async decrementEstoque(@Param('id') id: string, @Body('quantidade') quantidade: number) {
    this.logger.log(`Decrementando estoque do produto ${id} em -${quantidade}...`);
    return this.produtoService.decrementEstoque(id, quantidade);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar um produto' })
  @ApiParam({ name: 'id', required: true })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deletando produto com ID ${id}...`);
    return this.produtoService.delete(id);
  }
}