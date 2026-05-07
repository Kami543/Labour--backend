// produto/produto.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProdutoRepository } from './produto.repository';
import { CreateProdutoDto, UpdateProdutoDto, ProdutoResponseDto, ProdutoDetailResponseDto } from './dto/produto.dto';

@Injectable()
export class ProdutoService {
  private readonly logger = new Logger(ProdutoService.name);
  
  constructor(private readonly produtoRepository: ProdutoRepository) {}

  async create(createProdutoDto: CreateProdutoDto): Promise<ProdutoResponseDto> {
    this.logger.log('Criando novo produto...');
    
    const data = {
      nome: createProdutoDto.nome,
      descricao: createProdutoDto.descricao,
      preco: createProdutoDto.preco,
      imagem: createProdutoDto.imagem,
      categoria: createProdutoDto.categoria,
      tag: createProdutoDto.tag,
      estoque: createProdutoDto.estoque,
      cores: JSON.stringify(createProdutoDto.cores),
      tamanhos: JSON.stringify(createProdutoDto.tamanhos),
    };

    const produto = await this.produtoRepository.create(data);
    this.logger.log(`Produto criado com ID: ${produto.id}`);
    return new ProdutoResponseDto(produto);
  }

  async findAll() {
    this.logger.log('Buscando todos os produtos...');
    const produtos = await this.produtoRepository.findAll();
    return produtos.data.map(produto => new ProdutoResponseDto(produto));
  }

  async findById(id: string): Promise<ProdutoResponseDto> {
    this.logger.log(`Buscando produto com ID: ${id}`);
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      this.logger.error(`Produto com ID ${id} não encontrado`);
      throw new NotFoundException('Produto não encontrado');
    }
    return new ProdutoResponseDto(produto);
  }

  async findDetail(id: string): Promise<ProdutoDetailResponseDto> {
    this.logger.log(`Buscando detalhes do produto com ID: ${id}`);
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      this.logger.error(`Produto com ID ${id} não encontrado`);
      throw new NotFoundException('Produto não encontrado');
    }

    const avaliacaoMedia = await this.produtoRepository.getAvaliacaoMedia(id);
    const totalAvaliacoes = await this.produtoRepository.countAvaliacoes(id);

    return new ProdutoDetailResponseDto(produto, avaliacaoMedia, totalAvaliacoes);
  }

  async findBySlug(slug: string): Promise<ProdutoDetailResponseDto> {
    this.logger.log(`Buscando produto por slug: ${slug}`);
    const produto = await this.produtoRepository.findBySlug(slug);
    if (!produto) {
      this.logger.error(`Produto com slug ${slug} não encontrado`);
      throw new NotFoundException('Produto não encontrado');
    }

    const avaliacaoMedia = await this.produtoRepository.getAvaliacaoMedia(produto.id);
    const totalAvaliacoes = await this.produtoRepository.countAvaliacoes(produto.id);

    return new ProdutoDetailResponseDto(produto, avaliacaoMedia, totalAvaliacoes);
  }

  async findByCategoria(categoria: string) {
    this.logger.log(`Buscando produtos por categoria: ${categoria}`);
    const produtos = await this.produtoRepository.findByCategoria(categoria);
    return produtos.map(produto => new ProdutoResponseDto(produto));
  }

  async findByTag(tag: string) {
    this.logger.log(`Buscando produtos por tag: ${tag}`);
    const produtos = await this.produtoRepository.findByTag(tag);
    return produtos.map(produto => new ProdutoResponseDto(produto));
  }

  async findEmEstoque() {
    this.logger.log('Buscando produtos em estoque...');
    const produtos = await this.produtoRepository.findEmEstoque();
    return produtos.map(produto => new ProdutoResponseDto(produto));
  }

  async findNovos(dias: number = 30) {
    this.logger.log(`Buscando produtos novos dos últimos ${dias} dias...`);
    const produtos = await this.produtoRepository.findNovos(dias);
    return produtos.map(produto => new ProdutoResponseDto(produto));
  }

  async findPopulares(limit: number = 10) {
    this.logger.log('Buscando produtos populares...');
    const produtos = await this.produtoRepository.findPopulares(limit);
    return produtos.map(produto => new ProdutoResponseDto(produto));
  }

  async findSimilares(id: string, limit: number = 5) {
    this.logger.log(`Buscando produtos similares ao produto ${id}...`);
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    const similares = await this.produtoRepository.findSimilares(id, produto.categoria, limit);
    return similares.map(produto => new ProdutoResponseDto(produto));
  }

  async update(id: string, updateProdutoDto: UpdateProdutoDto): Promise<ProdutoResponseDto> {
    this.logger.log(`Atualizando produto com ID: ${id}`);
    
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      this.logger.error(`Produto com ID ${id} não encontrado`);
      throw new NotFoundException('Produto não encontrado');
    }

    const updateData: any = {};

    if (updateProdutoDto.nome !== undefined) updateData.nome = updateProdutoDto.nome;
    if (updateProdutoDto.descricao !== undefined) updateData.descricao = updateProdutoDto.descricao;
    if (updateProdutoDto.preco !== undefined) updateData.preco = updateProdutoDto.preco;
    if (updateProdutoDto.imagem !== undefined) updateData.imagem = updateProdutoDto.imagem;
    if (updateProdutoDto.categoria !== undefined) updateData.categoria = updateProdutoDto.categoria;
    if (updateProdutoDto.tag !== undefined) updateData.tag = updateProdutoDto.tag;
    if (updateProdutoDto.estoque !== undefined) updateData.estoque = updateProdutoDto.estoque;
    
    if (updateProdutoDto.cores !== undefined) {
      updateData.cores = JSON.stringify(updateProdutoDto.cores);
    }
    if (updateProdutoDto.tamanhos !== undefined) {
      updateData.tamanhos = JSON.stringify(updateProdutoDto.tamanhos);
    }

    const updatedProduto = await this.produtoRepository.update(id, updateData);
    this.logger.log(`Produto com ID ${id} atualizado com sucesso`);
    return new ProdutoResponseDto(updatedProduto);
  }

  async updateEstoque(id: string, quantidade: number): Promise<ProdutoResponseDto> {
    this.logger.log(`Atualizando estoque do produto ${id} para ${quantidade}`);
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    const updatedProduto = await this.produtoRepository.updateEstoque(id, quantidade);
    return new ProdutoResponseDto(updatedProduto);
  }

  async incrementEstoque(id: string, quantidade: number): Promise<ProdutoResponseDto> {
    this.logger.log(`Incrementando estoque do produto ${id} em +${quantidade}`);
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    const updatedProduto = await this.produtoRepository.incrementEstoque(id, quantidade);
    return new ProdutoResponseDto(updatedProduto);
  }

  async decrementEstoque(id: string, quantidade: number): Promise<ProdutoResponseDto> {
    this.logger.log(`Decrementando estoque do produto ${id} em -${quantidade}`);
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    const updatedProduto = await this.produtoRepository.decrementEstoque(id, quantidade);
    return new ProdutoResponseDto(updatedProduto);
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deletando produto com ID: ${id}`);
    const produto = await this.produtoRepository.findById(id);
    if (!produto) {
      this.logger.error(`Produto com ID ${id} não encontrado`);
      throw new NotFoundException('Produto não encontrado');
    }
    await this.produtoRepository.delete(id);
    this.logger.log(`Produto com ID ${id} deletado com sucesso`);
  }

  async getCoresDisponiveis(): Promise<string[]> {
    return this.produtoRepository.getCoresDisponiveis();
  }

  async getTamanhosDisponiveis(): Promise<string[]> {
    return this.produtoRepository.getTamanhosDisponiveis();
  }
}