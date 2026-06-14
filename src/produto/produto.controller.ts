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
import { CreateProdutoDto, UpdateProdutoDto, CreateProdutoImagemDto } from './dto/produto.dto';

@ApiBearerAuth('access-token')
@ApiTags('Produtos')
@Controller('products')
export class ProdutoController {
  private readonly logger = new Logger(ProdutoController.name);

  constructor(private readonly produtoService: ProdutoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um novo produto' })
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
  async findByCategoria(@Param('categoria') categoria: string) {
    this.logger.log(`Buscando produtos por categoria: ${categoria}...`);
    return this.produtoService.findByCategoria(categoria);
  }

  @Get('tag/:tag')
  @ApiOperation({ summary: 'Buscar produtos por tag' })
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
  async findNovos(@Query('dias') dias: string = '30') {
    const diasNum = parseInt(dias, 10);
    this.logger.log(`Buscando produtos novos dos últimos ${diasNum} dias...`);
    return this.produtoService.findNovos(diasNum);
  }

  @Get('populares')
  @ApiOperation({ summary: 'Buscar produtos populares' })
  async findPopulares(@Query('limit') limit: string = '10') {
    const limitNum = parseInt(limit, 10);
    this.logger.log('Buscando produtos populares...');
    return this.produtoService.findPopulares(limitNum);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Buscar produto por slug' })
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
  async findById(@Param('id') id: string) {
    this.logger.log(`Buscando produto com ID ${id}...`);
    return this.produtoService.findById(id);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Buscar produto com detalhes' })
  async findDetail(@Param('id') id: string) {
    this.logger.log(`Buscando detalhes do produto com ID ${id}...`);
    return this.produtoService.findDetail(id);
  }

  @Get(':id/similares')
  @ApiOperation({ summary: 'Buscar produtos similares' })
  async findSimilares(@Param('id') id: string, @Query('limit') limit: string = '5') {
    const limitNum = parseInt(limit, 10);
    this.logger.log(`Buscando produtos similares ao produto ${id}...`);
    return this.produtoService.findSimilares(id, limitNum);
  }

  @Post(':id/imagens')
  @ApiOperation({ summary: 'Adicionar imagem ao produto' })
  async addImagem(
    @Param('id') id: string, 
    @Body() imagemDto: CreateProdutoImagemDto
  ) {
    return this.produtoService.addImagem(id, imagemDto);
  }

  @Delete('imagens/:imagemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover imagem do produto' })
  async removeImagem(@Param('imagemId') imagemId: string): Promise<void> {
    return this.produtoService.removeImagem(imagemId);
  }

  @Put(':id/imagens/:imagemId/principal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Definir imagem como principal' })
  async setImagemPrincipal(
    @Param('id') id: string,
    @Param('imagemId') imagemId: string
  ): Promise<void> {
    return this.produtoService.setImagemPrincipal(id, imagemId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar um produto' })
  async update(@Param('id') id: string, @Body() updateProdutoDto: UpdateProdutoDto) {
    this.logger.log(`Atualizando produto com ID ${id}...`);
    return this.produtoService.update(id, updateProdutoDto);
  }

  @Put(':id/estoque')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar estoque do produto' })
  async updateEstoque(@Param('id') id: string, @Body('quantidade') quantidade: number) {
    this.logger.log(`Atualizando estoque do produto ${id} para ${quantidade}...`);
    return this.produtoService.updateEstoque(id, quantidade);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar um produto' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deletando produto com ID ${id}...`);
    return this.produtoService.delete(id);
  }
}