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
import { CreateProdutoDto, UpdateProdutoDto, UpdatePromocaoDto } from './dto/produto.dto';

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
    this.logger.log('🔄 Criando um novo produto...');
    this.logger.debug(`📦 Dados do produto: ${JSON.stringify(createProdutoDto)}`);
    
    try {
      const result = await this.produtoService.create(createProdutoDto);
      this.logger.log(`✅ Produto criado com sucesso! ID: ${result?.id || 'N/A'}`);
      this.logger.debug(`📦 Produto criado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao criar produto: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Buscar todos os produtos' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    this.logger.log(`🔄 Buscando todos os produtos - Página: ${pageNum}, Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: page=${page}, limit=${limit}`);
    
    try {
      const result = await this.produtoService.findAll(pageNum, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontrados ${count} produtos`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar produtos: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('categoria/:categoria')
  @ApiOperation({ summary: 'Buscar produtos por categoria' })
  async findByCategoria(
    @Param('categoria') categoria: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    this.logger.log(`🔄 Buscando produtos por categoria: "${categoria}" - Página: ${pageNum}, Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: categoria=${categoria}, page=${page}, limit=${limit}`);
    
    try {
      const result = await this.produtoService.findByCategoria(categoria, pageNum, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontrados ${count} produtos na categoria "${categoria}"`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar produtos por categoria "${categoria}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('tag/:tag')
  @ApiOperation({ summary: 'Buscar produtos por tag' })
  async findByTag(
    @Param('tag') tag: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    this.logger.log(`🔄 Buscando produtos por tag: "${tag}" - Página: ${pageNum}, Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: tag=${tag}, page=${page}, limit=${limit}`);
    
    try {
      const result = await this.produtoService.findByTag(tag, pageNum, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontrados ${count} produtos com tag "${tag}"`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar produtos por tag "${tag}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('estoque/disponivel')
  @ApiOperation({ summary: 'Buscar produtos em estoque' })
  async findEmEstoque(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    
    this.logger.log(`🔄 Buscando produtos em estoque - Página: ${pageNum}, Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: page=${page}, limit=${limit}`);
    
    try {
      const result = await this.produtoService.findEmEstoque(pageNum, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontrados ${count} produtos em estoque`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar produtos em estoque: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('novos')
  @ApiOperation({ summary: 'Buscar produtos novos' })
  async findNovos(
    @Query('dias') dias: string = '30',
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const diasNum = parseInt(dias, 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    this.logger.log(`🔄 Buscando produtos novos dos últimos ${diasNum} dias - Página: ${pageNum}, Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: dias=${dias}, page=${page}, limit=${limit}`);
    
    try {
      const result = await this.produtoService.findNovos(diasNum, pageNum, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontrados ${count} produtos novos`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar produtos novos: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('populares')
  @ApiOperation({ summary: 'Buscar produtos populares' })
  async findPopulares(@Query('limit') limit: string = '10') {
    const limitNum = parseInt(limit, 10);
    
    this.logger.log(`🔄 Buscando produtos populares - Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: limit=${limit}`);
    
    try {
      const result = await this.produtoService.findPopulares(limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontrados ${count} produtos populares`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar produtos populares: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Buscar produto por slug' })
  async findBySlug(@Param('slug') slug: string) {
    this.logger.log(`🔄 Buscando produto por slug: "${slug}"`);
    this.logger.debug(`📊 Parâmetros: slug=${slug}`);
    
    try {
      const result = await this.produtoService.findBySlug(slug);
      if (result) {
        this.logger.log(`✅ Produto encontrado: ID ${result.id}`);
        this.logger.debug(`📦 Produto: ${JSON.stringify(result)}`);
      } else {
        this.logger.warn(`⚠️ Produto com slug "${slug}" não encontrado`);
      }
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar produto por slug "${slug}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('cores')
  @ApiOperation({ summary: 'Buscar cores disponíveis' })
  async getCoresDisponiveis() {
    this.logger.log('🔄 Buscando cores disponíveis...');
    
    try {
      const result = await this.produtoService.getCoresDisponiveis();
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontradas ${count} cores disponíveis`);
      this.logger.debug(`🎨 Cores: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar cores disponíveis: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get('tamanhos')
  @ApiOperation({ summary: 'Buscar tamanhos disponíveis' })
  async getTamanhosDisponiveis() {
    this.logger.log('🔄 Buscando tamanhos disponíveis...');
    
    try {
      const result = await this.produtoService.getTamanhosDisponiveis();
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontrados ${count} tamanhos disponíveis`);
      this.logger.debug(`📏 Tamanhos: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar tamanhos disponíveis: ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  async findById(@Param('id') id: string) {
    this.logger.log(`🔄 Buscando produto com ID: "${id}"`);
    this.logger.debug(`📊 Parâmetros: id=${id}`);
    
    try {
      const result = await this.produtoService.findById(id);
      if (result) {
        this.logger.log(`✅ Produto encontrado: ${result.nome || 'N/A'}`);
        this.logger.debug(`📦 Produto: ${JSON.stringify(result)}`);
      } else {
        this.logger.warn(`⚠️ Produto com ID "${id}" não encontrado`);
      }
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar produto por ID "${id}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Buscar produto com detalhes' })
  async findDetail(@Param('id') id: string) {
    this.logger.log(`🔄 Buscando detalhes do produto com ID: "${id}"`);
    this.logger.debug(`📊 Parâmetros: id=${id}`);
    
    try {
      const result = await this.produtoService.findDetail(id);
      if (result) {
        this.logger.log(`✅ Detalhes encontrados para produto ID "${id}"`);
        this.logger.debug(`📦 Detalhes: ${JSON.stringify(result)}`);
      } else {
        this.logger.warn(`⚠️ Detalhes não encontrados para produto ID "${id}"`);
      }
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar detalhes do produto "${id}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Get(':id/similares')
  @ApiOperation({ summary: 'Buscar produtos similares' })
  async findSimilares(@Param('id') id: string, @Query('limit') limit: string = '5') {
    const limitNum = parseInt(limit, 10);
    
    this.logger.log(`🔄 Buscando produtos similares ao produto ID: "${id}" - Limite: ${limitNum}`);
    this.logger.debug(`📊 Parâmetros: id=${id}, limit=${limit}`);
    
    try {
      const result = await this.produtoService.findSimilares(id, limitNum);
      const count = Array.isArray(result) ? result.length : ((result as any)?.data?.length || 0);
      this.logger.log(`✅ Encontrados ${count} produtos similares`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar produtos similares para "${id}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar um produto' })
  async update(@Param('id') id: string, @Body() updateProdutoDto: UpdateProdutoDto) {
    this.logger.log(`🔄 Atualizando produto com ID: "${id}"`);
    this.logger.debug(`📦 Dados para atualização: ${JSON.stringify(updateProdutoDto)}`);
    this.logger.debug(`📊 Parâmetros: id=${id}`);
    
    try {
      const result = await this.produtoService.update(id, updateProdutoDto);
      this.logger.log(`✅ Produto "${id}" atualizado com sucesso!`);
      this.logger.debug(`📦 Produto atualizado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao atualizar produto "${id}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Put(':id/estoque')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar estoque do produto' })
  async updateEstoque(@Param('id') id: string, @Body('quantidade') quantidade: number) {
    this.logger.log(`🔄 Atualizando estoque do produto ID: "${id}" para ${quantidade}`);
    this.logger.debug(`📊 Parâmetros: id=${id}, quantidade=${quantidade}`);
    
    try {
      const result = await this.produtoService.updateEstoque(id, quantidade);
      this.logger.log(`✅ Estoque do produto "${id}" atualizado para ${quantidade}`);
      this.logger.debug(`📦 Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao atualizar estoque do produto "${id}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Put(':id/promocao')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar promoção do produto' })
  async updatePromocao(@Param('id') id: string, @Body() updatePromocaoDto: UpdatePromocaoDto) {
    this.logger.log(`🔄 Atualizando promoção do produto ID: "${id}"`);
    this.logger.debug(`📦 Dados da promoção: ${JSON.stringify(updatePromocaoDto)}`);
    this.logger.debug(`📊 Parâmetros: id=${id}`);
    
    try {
      const result = await this.produtoService.updatePromocao(id, updatePromocaoDto);
      this.logger.log(`✅ Promoção do produto "${id}" atualizada com sucesso!`);
      this.logger.debug(`📦 Resultado: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao atualizar promoção do produto "${id}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar um produto' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`🔄 Deletando produto com ID: "${id}"`);
    this.logger.debug(`📊 Parâmetros: id=${id}`);
    
    try {
      await this.produtoService.delete(id);
      this.logger.log(`✅ Produto "${id}" deletado com sucesso!`);
    } catch (error: any) {
      this.logger.error(`❌ Erro ao deletar produto "${id}": ${error.message}`);
      this.logger.debug(`🔍 Stack trace: ${error.stack}`);
      throw error;
    }
  }
}