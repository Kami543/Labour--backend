// src/produto/produto.service.ts - VERSÃO COMPLETA CORRIGIDA
import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ProdutoRepository } from './produto.repository';
import { 
  CreateProdutoDto, 
  UpdateProdutoDto, 
  ProdutoResponseDto, 
  ProdutoDetailResponseDto, 
  FilterProdutoDto,
  UpdatePromocaoDto,
  PromocaoProdutoDto,
  BulkUpdateResponseDto
} from './dto/produto.dto';
import { slugify } from '../common/utils/slugify';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { UserRepository } from '../users/users.repository';
import { CategoriaProduto } from '@prisma/client';

@Injectable()
export class ProdutoService {
  private readonly logger = new Logger(ProdutoService.name);
  
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL = 60000;

  constructor(
    private readonly produtoRepository: ProdutoRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificacoesService))
    private readonly notificacoesService: NotificacoesService,
    private readonly userRepository: UserRepository,
  ) {}

  async create(createProdutoDto: CreateProdutoDto): Promise<ProdutoResponseDto> {
    this.logger.log('Criando novo produto...');
    
    if (!createProdutoDto.nome || createProdutoDto.nome.trim().length === 0) {
      throw new BadRequestException('Nome do produto é obrigatório');
    }
    
    const slug = slugify(createProdutoDto.nome);
    
    const slugExists = await this.produtoRepository.exists({ slug });
    if (slugExists) {
      throw new BadRequestException('Já existe um produto com este nome');
    }
    
    // Converte categoria para enum
    const categoriaEnum = this.getCategoriaEnum(createProdutoDto.categoria);
    
    // Pega a primeira imagem como principal
    const imagemPrincipal = createProdutoDto.imagens && createProdutoDto.imagens.length > 0
      ? createProdutoDto.imagens[0].url
      : '';

    const data = {
      nome: createProdutoDto.nome.trim(),
      slug,
      descricao: createProdutoDto.descricao?.trim() || '',
      preco: createProdutoDto.preco,
      imagem: imagemPrincipal,
      categoria: categoriaEnum,
      tag: createProdutoDto.tag || 'novo',
      estoque: Math.max(0, createProdutoDto.estoque || 0),
      cores: JSON.stringify(createProdutoDto.cores || []),
      tamanhos: JSON.stringify(createProdutoDto.tamanhos || []),
      // ─── CAMPOS DE PROMOÇÃO (SNAKE_CASE) ───
      preco_promocional: createProdutoDto.preco_promocional || createProdutoDto.precoPromocional || null,
      desconto: createProdutoDto.desconto || 0,
      promocao_ativa: createProdutoDto.promocao_ativa || createProdutoDto.promocaoAtiva || false,
    };

    const produto = await this.produtoRepository.create(data);
    this.logger.log(`Produto criado com ID: ${produto.id}`);
    
    // ─── NOTIFICA SOBRE PROMOÇÃO SE ATIVA ───
    if (produto.promocao_ativa && produto.desconto > 0) {
      this.notifyPromotion(produto.id, produto.desconto).catch(err => 
        this.logger.error(`Erro ao notificar promoção: ${err instanceof Error ? err.message : String(err)}`)
      );
    }
    
    this.notifyClientsAboutNewProduct(produto).catch(err => 
      this.logger.error(`Erro ao notificar: ${err instanceof Error ? err.message : String(err)}`)
    );
    
    return new ProdutoResponseDto(produto);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: ProdutoResponseDto[]; total: number; page: number; totalPages: number }> {
    this.logger.log(`Buscando produtos - Página ${page}, Limite ${limit}`);
    
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const safePage = Math.max(1, page);
    
    const result = await this.produtoRepository.findAll({
      page: safePage,
      limit: safeLimit,
    });
    
    return {
      data: result.data.map(produto => new ProdutoResponseDto(produto)),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    };
  }

  // ─── BUSCAR COM FILTROS AVANÇADOS ───
  async findWithFilters(filterDto: FilterProdutoDto): Promise<{ data: ProdutoResponseDto[]; total: number; page: number; limit: number }> {
    this.logger.log('Buscando produtos com filtros...');
    
    const categoria = filterDto.categoria ? this.getCategoriaEnum(filterDto.categoria) : undefined;
    
    const result = await this.produtoRepository.findWithFilters({
      categoria,
      precoMin: filterDto.precoMin,
      precoMax: filterDto.precoMax,
      emPromocao: filterDto.promocao_ativa || filterDto.promocaoAtiva,
      tag: filterDto.tag,
      busca: filterDto.busca,
      page: filterDto.page || 1,
      limit: filterDto.limit || 10,
    });
    
    return {
      data: result.data.map(produto => new ProdutoResponseDto(produto)),
      total: result.total,
      page: filterDto.page || 1,
      limit: filterDto.limit || 10,
    };
  }

  // ─── BUSCAR PRODUTOS EM PROMOÇÃO ───
  async findEmPromocao(): Promise<PromocaoProdutoDto[]> {
    const cacheKey = 'produtos:promocao';
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    this.logger.log('Buscando produtos em promoção...');
    const produtos = await this.produtoRepository.findEmPromocao();
    
    const response = produtos.map(produto => new PromocaoProdutoDto(produto));
    this.setInCache(cacheKey, response, 300000); // 5 minutos
    
    return response;
  }

  // ─── BUSCAR MAIORES DESCONTOS ───
  async findMaioresDescontos(limit: number = 10): Promise<PromocaoProdutoDto[]> {
    const safeLimit = Math.min(limit, 30);
    const cacheKey = `produtos:maiores-descontos:${safeLimit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    this.logger.log('Buscando produtos com maiores descontos...');
    const produtos = await this.produtoRepository.findMaioresDescontos(safeLimit);
    
    const response = produtos.map(produto => new PromocaoProdutoDto(produto));
    this.setInCache(cacheKey, response, 300000);
    
    return response;
  }

  async findById(id: string): Promise<ProdutoResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    this.logger.log(`Buscando produto com ID: ${id}`);
    
    const cached = this.getFromCache(`produto:${id}`);
    if (cached) {
      return new ProdutoResponseDto(cached);
    }
    
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    this.setInCache(`produto:${id}`, produto);
    
    return new ProdutoResponseDto(produto);
  }

  async findDetail(id: string): Promise<ProdutoDetailResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    this.logger.log(`Buscando detalhes do produto com ID: ${id}`);
    
    const [produto, avaliacaoMedia, totalAvaliacoes] = await Promise.all([
      this.produtoRepository.findById(id),
      this.produtoRepository.getAvaliacaoMedia(id).catch(() => 0),
      this.produtoRepository.countAvaliacoes(id).catch(() => 0)
    ]);
    
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    return new ProdutoDetailResponseDto(produto, avaliacaoMedia || 0, totalAvaliacoes || 0);
  }

  async findBySlug(slug: string): Promise<ProdutoDetailResponseDto> {
    if (!slug || slug.trim().length === 0) {
      throw new BadRequestException('Slug inválido');
    }
    
    this.logger.log(`Buscando produto por slug: ${slug}`);
    
    const cached = this.getFromCache(`produto:slug:${slug}`);
    if (cached) {
      const [avaliacaoMedia, totalAvaliacoes] = await Promise.all([
        this.produtoRepository.getAvaliacaoMedia(cached.id).catch(() => 0),
        this.produtoRepository.countAvaliacoes(cached.id).catch(() => 0)
      ]);
      return new ProdutoDetailResponseDto(cached, avaliacaoMedia || 0, totalAvaliacoes || 0);
    }
    
    const produto = await this.produtoRepository.findBySlug(slug);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    const [avaliacaoMedia, totalAvaliacoes] = await Promise.all([
      this.produtoRepository.getAvaliacaoMedia(produto.id).catch(() => 0),
      this.produtoRepository.countAvaliacoes(produto.id).catch(() => 0)
    ]);

    this.setInCache(`produto:slug:${slug}`, produto);

    return new ProdutoDetailResponseDto(produto, avaliacaoMedia || 0, totalAvaliacoes || 0);
  }

  async findByCategoria(categoria: string, page: number = 1, limit: number = 20): Promise<{ data: ProdutoResponseDto[]; total: number; page: number; totalPages: number }> {
    if (!categoria || categoria.trim().length === 0) {
      throw new BadRequestException('Categoria inválida');
    }
    
    this.logger.log(`Buscando produtos por categoria: ${categoria}`);
    
    const categoriaEnum = this.getCategoriaEnum(categoria);
    
    const safeLimit = Math.min(limit, 50);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;
    
    const allProdutos = await this.produtoRepository.findByCategoria(categoriaEnum);
    const paginatedData = allProdutos.slice(skip, skip + safeLimit);
    
    return {
      data: paginatedData.map(produto => new ProdutoResponseDto(produto)),
      total: allProdutos.length,
      page: safePage,
      totalPages: Math.ceil(allProdutos.length / safeLimit)
    };
  }

  async findByTag(tag: string, page: number = 1, limit: number = 20): Promise<{ data: ProdutoResponseDto[]; total: number; page: number; totalPages: number }> {
    if (!tag || tag.trim().length === 0) {
      throw new BadRequestException('Tag inválida');
    }
    
    this.logger.log(`Buscando produtos por tag: ${tag}`);
    
    const safeLimit = Math.min(limit, 50);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;
    
    const allProdutos = await this.produtoRepository.findByTag(tag);
    const paginatedData = allProdutos.slice(skip, skip + safeLimit);
    
    return {
      data: paginatedData.map(produto => new ProdutoResponseDto(produto)),
      total: allProdutos.length,
      page: safePage,
      totalPages: Math.ceil(allProdutos.length / safeLimit)
    };
  }

  async findEmEstoque(page: number = 1, limit: number = 50): Promise<{ data: ProdutoResponseDto[]; total: number; page: number; totalPages: number }> {
    this.logger.log('Buscando produtos em estoque...');
    
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;
    
    const allProdutos = await this.produtoRepository.findEmEstoque();
    const paginatedData = allProdutos.slice(skip, skip + safeLimit);
    
    return {
      data: paginatedData.map(produto => new ProdutoResponseDto(produto)),
      total: allProdutos.length,
      page: safePage,
      totalPages: Math.ceil(allProdutos.length / safeLimit)
    };
  }

  async findNovos(dias: number = 30, page: number = 1, limit: number = 20): Promise<{ data: ProdutoResponseDto[]; total: number; page: number; totalPages: number }> {
    const safeDias = Math.min(Math.max(1, dias), 90);
    const safeLimit = Math.min(limit, 50);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;
    
    this.logger.log(`Buscando produtos novos dos últimos ${safeDias} dias...`);
    
    const allProdutos = await this.produtoRepository.findNovos(safeDias);
    const paginatedData = allProdutos.slice(skip, skip + safeLimit);
    
    return {
      data: paginatedData.map(produto => new ProdutoResponseDto(produto)),
      total: allProdutos.length,
      page: safePage,
      totalPages: Math.ceil(allProdutos.length / safeLimit)
    };
  }

  async findPopulares(limit: number = 10): Promise<ProdutoResponseDto[]> {
    const safeLimit = Math.min(limit, 30);
    
    const cacheKey = `produtos:populares:${safeLimit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached.map(p => new ProdutoResponseDto(p));
    }
    
    this.logger.log('Buscando produtos populares...');
    const produtos = await this.produtoRepository.findPopulares(safeLimit);
    
    this.setInCache(cacheKey, produtos, 300000);
    
    return produtos.map(produto => new ProdutoResponseDto(produto));
  }

  async findSimilares(id: string, limit: number = 5): Promise<ProdutoResponseDto[]> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    const safeLimit = Math.min(limit, 10);
    
    this.logger.log(`Buscando produtos similares ao produto ${id}...`);
    
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    const similares = await this.produtoRepository.findSimilares(id, produto.categoria, safeLimit);
    return similares.map(produto => new ProdutoResponseDto(produto));
  }

  // ─── UPDATE COMPLETO ───
  async update(id: string, updateProdutoDto: UpdateProdutoDto): Promise<ProdutoResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    this.logger.log(`Atualizando produto com ID: ${id}`);
    
    const exists = await this.produtoRepository.exists({ id });
    if (!exists) {
      throw new NotFoundException('Produto não encontrado');
    }

    const produtoAtual = await this.produtoRepository.findById(id);
    const updateData: any = {};

    // Campos básicos
    if (updateProdutoDto.nome !== undefined && updateProdutoDto.nome.trim()) {
      updateData.nome = updateProdutoDto.nome.trim();
      updateData.slug = slugify(updateProdutoDto.nome);
    }
    if (updateProdutoDto.descricao !== undefined) {
      updateData.descricao = updateProdutoDto.descricao?.trim() || '';
    }
    if (updateProdutoDto.preco !== undefined && updateProdutoDto.preco > 0) {
      updateData.preco = updateProdutoDto.preco;
    }
    if (updateProdutoDto.categoria !== undefined) {
      updateData.categoria = this.getCategoriaEnum(updateProdutoDto.categoria);
    }
    if (updateProdutoDto.tag !== undefined) {
      updateData.tag = updateProdutoDto.tag;
    }
    if (updateProdutoDto.estoque !== undefined) {
      updateData.estoque = Math.max(0, updateProdutoDto.estoque);
    }
    if (updateProdutoDto.cores !== undefined) {
      updateData.cores = JSON.stringify(updateProdutoDto.cores);
    }
    if (updateProdutoDto.tamanhos !== undefined) {
      updateData.tamanhos = JSON.stringify(updateProdutoDto.tamanhos);
    }

    // ─── CAMPOS DE PROMOÇÃO (SNAKE_CASE) ───
    if (updateProdutoDto.promocao_ativa !== undefined) {
      updateData.promocao_ativa = updateProdutoDto.promocao_ativa;
    } else if (updateProdutoDto.promocaoAtiva !== undefined) {
      updateData.promocao_ativa = updateProdutoDto.promocaoAtiva;
    }
    
    if (updateProdutoDto.preco_promocional !== undefined) {
      updateData.preco_promocional = updateProdutoDto.preco_promocional;
    } else if (updateProdutoDto.precoPromocional !== undefined) {
      updateData.preco_promocional = updateProdutoDto.precoPromocional;
    }
    
    if (updateProdutoDto.desconto !== undefined) {
      updateData.desconto = updateProdutoDto.desconto;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Nenhum dado válido para atualização');
    }

    const updatedProduto = await this.produtoRepository.update(id, updateData);
    
    this.clearCache(`produto:${id}`);
    this.clearCache(`produto:slug:${updatedProduto.slug}`);
    this.clearCache('produtos:populares:*');
    this.clearCache('produtos:promocao');
    this.clearCache('produtos:maiores-descontos:*');
    
    this.logger.log(`Produto com ID ${id} atualizado`);

    // ─── DISPARA NOTIFICAÇÃO SE PROMOÇÃO FOI ATIVADA ───
    const promoFoiAtivada = 
      (updateData.promocao_ativa === true) &&
      !produtoAtual?.promocao_ativa &&
      (updateData.desconto || produtoAtual?.desconto || 0) > 0;

    if (promoFoiAtivada) {
      const descontoFinal = updateData.desconto || produtoAtual?.desconto || 0;
      this.notifyPromotion(id, descontoFinal).catch(err =>
        this.logger.error(`Erro ao notificar promoção: ${err instanceof Error ? err.message : String(err)}`)
      );
    }
    
    return new ProdutoResponseDto(updatedProduto);
  }

  // ─── ATUALIZAR APENAS PROMOÇÃO ───
  async updatePromocao(id: string, updatePromocaoDto: UpdatePromocaoDto): Promise<ProdutoResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    this.logger.log(`Atualizando promoção do produto ${id}`);
    
    const exists = await this.produtoRepository.exists({ id });
    if (!exists) {
      throw new NotFoundException('Produto não encontrado');
    }

    const produtoAtual = await this.produtoRepository.findById(id);
    
    const dadosPromocao: any = {};
    let promocaoFoiAtivada = false;

    if (updatePromocaoDto.promocao_ativa !== undefined) {
      dadosPromocao.promocao_ativa = updatePromocaoDto.promocao_ativa;
      if (updatePromocaoDto.promocao_ativa === true && !produtoAtual?.promocao_ativa) {
        promocaoFoiAtivada = true;
      }
    } else if (updatePromocaoDto.promocaoAtiva !== undefined) {
      dadosPromocao.promocao_ativa = updatePromocaoDto.promocaoAtiva;
      if (updatePromocaoDto.promocaoAtiva === true && !produtoAtual?.promocao_ativa) {
        promocaoFoiAtivada = true;
      }
    }
    
    if (updatePromocaoDto.preco_promocional !== undefined) {
      dadosPromocao.preco_promocional = updatePromocaoDto.preco_promocional;
    } else if (updatePromocaoDto.precoPromocional !== undefined) {
      dadosPromocao.preco_promocional = updatePromocaoDto.precoPromocional;
    }
    
    if (updatePromocaoDto.desconto !== undefined) {
      dadosPromocao.desconto = updatePromocaoDto.desconto;
      if (updatePromocaoDto.desconto > 0 && !produtoAtual?.promocao_ativa) {
        promocaoFoiAtivada = true;
      }
    }

    if (Object.keys(dadosPromocao).length === 0) {
      throw new BadRequestException('Nenhum dado de promoção para atualizar');
    }

    const updatedProduto = await this.produtoRepository.updatePromocao(id, dadosPromocao);
    
    this.clearCache(`produto:${id}`);
    this.clearCache('produtos:promocao');
    this.clearCache('produtos:maiores-descontos:*');
    this.clearCache(`produto:slug:${updatedProduto.slug}`);

    if (promocaoFoiAtivada) {
      const desconto = updatePromocaoDto.desconto || produtoAtual?.desconto || 0;
      if (desconto > 0) {
        this.notifyPromotion(id, desconto).catch(err =>
          this.logger.error(`Erro ao notificar promoção: ${err instanceof Error ? err.message : String(err)}`)
        );
      }
    }

    return new ProdutoResponseDto(updatedProduto);
  }

  // ─── ATUALIZAR IMAGEM ───
  async updateImagem(id: string, imagemUrl: string): Promise<ProdutoResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    if (!imagemUrl || imagemUrl.trim().length === 0) {
      throw new BadRequestException('URL da imagem é obrigatória');
    }
    
    this.logger.log(`Atualizando imagem do produto ${id}`);
    
    const exists = await this.produtoRepository.exists({ id });
    if (!exists) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    const updated = await this.produtoRepository.update(id, { imagem: imagemUrl });
    this.clearCache(`produto:${id}`);
    this.clearCache(`produto:slug:${updated.slug}`);
    
    return new ProdutoResponseDto(updated);
  }

  // ─── ATUALIZAÇÃO EM MASSA ───
  async bulkUpdate(ids: string[], updateDto: UpdateProdutoDto): Promise<BulkUpdateResponseDto> {
    this.logger.log(`Atualizando ${ids.length} produtos em massa`);
    
    const response = new BulkUpdateResponseDto();
    response.total = ids.length;

    for (const id of ids) {
      try {
        await this.update(id, updateDto);
        response.sucesso++;
        response.detalhes.push({ id, status: 'sucesso' });
      } catch (error) {
        response.erro++;
        response.detalhes.push({
          id,
          status: 'erro',
          mensagem: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    return response;
  }

  async updateEstoque(id: string, quantidade: number): Promise<ProdutoResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    if (quantidade < 0) {
      throw new BadRequestException('Quantidade não pode ser negativa');
    }
    
    this.logger.log(`Atualizando estoque do produto ${id} para ${quantidade}`);
    
    const exists = await this.produtoRepository.exists({ id });
    if (!exists) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    const updatedProduto = await this.produtoRepository.updateEstoque(id, quantidade);
    
    this.clearCache(`produto:${id}`);
    
    return new ProdutoResponseDto(updatedProduto);
  }

  async incrementEstoque(id: string, quantidade: number): Promise<ProdutoResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    if (quantidade <= 0) {
      throw new BadRequestException('Quantidade para incremento deve ser positiva');
    }
    
    this.logger.log(`Incrementando estoque do produto ${id} em +${quantidade}`);
    
    const exists = await this.produtoRepository.exists({ id });
    if (!exists) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    const updatedProduto = await this.produtoRepository.incrementEstoque(id, quantidade);
    
    this.clearCache(`produto:${id}`);
    
    return new ProdutoResponseDto(updatedProduto);
  }

  async decrementEstoque(id: string, quantidade: number): Promise<ProdutoResponseDto> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    if (quantidade <= 0) {
      throw new BadRequestException('Quantidade para decremento deve ser positiva');
    }
    
    this.logger.log(`Decrementando estoque do produto ${id} em -${quantidade}`);
    
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    if (produto.estoque < quantidade) {
      throw new BadRequestException(`Estoque insuficiente. Disponível: ${produto.estoque}`);
    }
    
    const updatedProduto = await this.produtoRepository.decrementEstoque(id, quantidade);
    
    this.clearCache(`produto:${id}`);
    
    return new ProdutoResponseDto(updatedProduto);
  }

  async delete(id: string): Promise<void> {
    if (!this.isValidId(id)) {
      throw new BadRequestException('ID inválido');
    }
    
    this.logger.log(`Deletando produto com ID: ${id}`);
    
    const exists = await this.produtoRepository.exists({ id });
    if (!exists) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    await this.produtoRepository.delete(id);
    
    this.clearCache(`produto:${id}`);
    this.clearCache('produtos:populares:*');
    this.clearCache('produtos:promocao');
    this.clearCache('produtos:maiores-descontos:*');
    
    this.logger.log(`Produto com ID ${id} deletado`);
  }

  async getCoresDisponiveis(): Promise<string[]> {
    const cached = this.getFromCache('cores:disponiveis');
    if (cached) return cached;
    
    const cores = await this.produtoRepository.getCoresDisponiveis();
    
    this.setInCache('cores:disponiveis', cores, 3600000);
    
    return cores;
  }

  async getTamanhosDisponiveis(): Promise<string[]> {
    const cached = this.getFromCache('tamanhos:disponiveis');
    if (cached) return cached;
    
    const tamanhos = await this.produtoRepository.getTamanhosDisponiveis();
    
    this.setInCache('tamanhos:disponiveis', tamanhos, 3600000);
    
    return tamanhos;
  }

  // ─── NOTIFY PROMOTION ───
  async notifyPromotion(produtoId: string, desconto: number, mensagemPersonalizada?: string): Promise<void> {
    if (!this.isValidId(produtoId)) {
      throw new BadRequestException('ID do produto inválido');
    }
    
    if (desconto <= 0 || desconto > 100) {
      throw new BadRequestException('Desconto deve estar entre 1 e 100');
    }
    
    const produto = await this.produtoRepository.findById(produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    if (!produto.promocao_ativa) {
      this.logger.warn(`Produto ${produtoId} não está com promoção ativa`);
      return;
    }
    
    const clients = await this.userRepository.findAllClients();
    const limitedClients = clients.slice(0, 100);
    
    if (limitedClients.length === 0) {
      this.logger.log('Nenhum cliente para notificar');
      return;
    }
    
    const valorOriginal = Number(produto.preco);
    const valorComDesconto = valorOriginal * (1 - desconto / 100);
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valorComDesconto);
    
    const mensagem = mensagemPersonalizada || 
      `🔥 ${produto.nome} com ${desconto}% OFF! Por apenas ${valorFormatado}. Aproveite!`;
    
    const notifyPromises = limitedClients.slice(0, 50).map(client => 
      this.notificacoesService.create(client.id, {
        tipo: 'promo',
        titulo: `🔥 ${desconto}% DE DESCONTO!`,
        mensagem: mensagem,
      }).catch(err => this.logger.error(`Erro notificar ${client.id}: ${err instanceof Error ? err.message : String(err)}`))
    );
    
    await Promise.allSettled(notifyPromises);
    
    this.logger.log(`Notificados ${notifyPromises.length} clientes sobre a promoção do produto ${produto.nome}`);
  }

  // ─── UTILITÁRIOS ───
  private getCategoriaEnum(categoria: string): CategoriaProduto {
    const categoriaMap: Record<string, CategoriaProduto> = {
      'masculino': CategoriaProduto.Masculino,
      'feminino': CategoriaProduto.Feminino,
      'acessorios': CategoriaProduto.Acessorios,
    };
  
    const normalized = categoria.toLowerCase().trim();
    const enumValue = categoriaMap[normalized];
  
    if (enumValue) {
      return enumValue;
    }
  
    // Tenta bater diretamente com um valor válido do enum
    const validValues = Object.values(CategoriaProduto);
    if (validValues.includes(categoria as CategoriaProduto)) {
      return categoria as CategoriaProduto;
    }
  
    throw new BadRequestException(
      `Categoria inválida: "${categoria}". Valores aceitos: Feminino, Masculino, Acessorios`
    );
  }

  private isValidId(id: string): boolean {
    return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setInCache(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    if (this.cache.size > 50) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  private clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern.replace('*', ''))) {
        this.cache.delete(key);
      }
    }
  }

  private async notifyClientsAboutNewProduct(produto: any): Promise<void> {
    try {
      const clients = await this.userRepository.findAllClients();
      const limitedClients = clients.slice(0, 50);
      
      if (limitedClients.length === 0) return;
      
      const valorFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(Number(produto.preco));
      
      const notifyPromises = limitedClients.slice(0, 30).map(client =>
        this.notificacoesService.create(client.id, {
          tipo: 'limitado',
          titulo: '✨ NOVIDADE NA COLEÇÃO!',
          mensagem: `Novo produto: ${produto.nome} - ${valorFormatado}`,
          
        }).catch(err => this.logger.error(`Erro notificar: ${err instanceof Error ? err.message : String(err)}`))
      );
      
      await Promise.allSettled(notifyPromises);
      
      this.logger.log(`Notificados ${notifyPromises.length} clientes sobre o novo produto`);
    } catch (error) {
      this.logger.error(`Erro ao notificar clientes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}