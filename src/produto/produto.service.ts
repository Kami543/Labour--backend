// src/produto/produto.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProdutoRepository } from './produto.repository';
import { 
  CreateProdutoDto, 
  UpdateProdutoDto, 
  ProdutoResponseDto, 
  ProdutoDetailResponseDto, 
  CreateProdutoImagemDto, 
  ProdutoImagemResponseDto 
} from './dto/produto.dto';
import { slugify } from '../common/utils/slugify';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { UserRepository } from '../users/users.repository';

@Injectable()
export class ProdutoService {
  private readonly logger = new Logger(ProdutoService.name);
  
  constructor(
    private readonly produtoRepository: ProdutoRepository,
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    private readonly userRepository: UserRepository,
  ) {}

  async create(createProdutoDto: CreateProdutoDto): Promise<ProdutoResponseDto> {
    this.logger.log('Criando novo produto...');
    
    const slug = slugify(createProdutoDto.nome);
    
    const existingProduto = await this.produtoRepository.findBySlug(slug);
    if (existingProduto) {
      throw new BadRequestException('Já existe um produto com este nome');
    }
    
    const data = {
      nome: createProdutoDto.nome,
      slug,
      descricao: createProdutoDto.descricao,
      preco: createProdutoDto.preco,
      categoria: createProdutoDto.categoria,
      tag: createProdutoDto.tag,
      estoque: createProdutoDto.estoque,
      cores: JSON.stringify(createProdutoDto.cores || []),
      tamanhos: JSON.stringify(createProdutoDto.tamanhos || []),
    };

    const imagens = createProdutoDto.imagens?.map((img, index) => ({
      url: img.url,
      altText: img.altText || createProdutoDto.nome,
      ordem: img.ordem !== undefined ? img.ordem : index,
      isPrincipal: img.isPrincipal || index === 0
    }));

    const produto = await this.produtoRepository.createWithImages(data, imagens);
    this.logger.log(`Produto criado com ID: ${produto.id}`);
    
    await this.notifyClientsAboutNewProduct(produto);
    
    return new ProdutoResponseDto(produto);
  }

  async findAll() {
    this.logger.log('Buscando todos os produtos...');
    const produtos = await this.produtoRepository.findAll();
    return produtos.data.map(produto => new ProdutoResponseDto(produto));
  }

  async findById(id: string): Promise<ProdutoResponseDto> {
    this.logger.log(`Buscando produto com ID: ${id}`);
    const produto = await this.produtoRepository.findByIdWithImages(id);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    return new ProdutoResponseDto(produto);
  }

  async findDetail(id: string): Promise<ProdutoDetailResponseDto> {
    this.logger.log(`Buscando detalhes do produto com ID: ${id}`);
    const produto = await this.produtoRepository.findByIdWithImages(id);
    if (!produto) {
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

  // ✅ MÉTODO ADICIONADO
  async findNovos(dias: number = 30) {
    this.logger.log(`Buscando produtos novos dos últimos ${dias} dias...`);
    const produtos = await this.produtoRepository.findNovos(dias);
    return produtos.map(produto => new ProdutoResponseDto(produto));
  }

  // ✅ MÉTODO ADICIONADO
  async findPopulares(limit: number = 10) {
    this.logger.log('Buscando produtos populares...');
    const produtos = await this.produtoRepository.findPopulares(limit);
    return produtos.map(produto => new ProdutoResponseDto(produto));
  }

  // ✅ MÉTODO ADICIONADO
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
      throw new NotFoundException('Produto não encontrado');
    }

    const updateData: any = {};

    if (updateProdutoDto.nome !== undefined) {
      updateData.nome = updateProdutoDto.nome;
      updateData.slug = slugify(updateProdutoDto.nome);
    }
    if (updateProdutoDto.descricao !== undefined) updateData.descricao = updateProdutoDto.descricao;
    if (updateProdutoDto.preco !== undefined) updateData.preco = updateProdutoDto.preco;
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
    this.logger.log(`Produto com ID ${id} atualizado`);
    return new ProdutoResponseDto(updatedProduto);
  }

  // ✅ MÉTODO ADICIONADO
  async addImagem(produtoId: string, imagemDto: CreateProdutoImagemDto): Promise<ProdutoImagemResponseDto> {
    this.logger.log(`Adicionando imagem ao produto ${produtoId}`);
    
    const produto = await this.produtoRepository.findById(produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    const existingImagens = await this.prisma.produtoImagem.count({
      where: { produtoId }
    });
    
    const isFirstImage = existingImagens === 0;
    const imagem = await this.produtoRepository.addImagem(produtoId, {
      url: imagemDto.url,
      altText: imagemDto.altText,
      ordem: imagemDto.ordem !== undefined ? imagemDto.ordem : existingImagens,
      isPrincipal: imagemDto.isPrincipal || isFirstImage
    });
    
    if (imagem.isPrincipal) {
      await this.produtoRepository.updateImagemPrincipal(produtoId, imagem.id);
    }
    
    return new ProdutoImagemResponseDto(imagem);
  }

  // ✅ MÉTODO ADICIONADO
  async removeImagem(imagemId: string): Promise<void> {
    this.logger.log(`Removendo imagem ${imagemId}`);
    await this.produtoRepository.removeImagem(imagemId);
  }

  // ✅ MÉTODO ADICIONADO
  async setImagemPrincipal(produtoId: string, imagemId: string): Promise<void> {
    this.logger.log(`Definindo imagem ${imagemId} como principal do produto ${produtoId}`);
    
    const produto = await this.produtoRepository.findById(produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    await this.produtoRepository.updateImagemPrincipal(produtoId, imagemId);
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
      throw new NotFoundException('Produto não encontrado');
    }
    await this.produtoRepository.delete(id);
    this.logger.log(`Produto com ID ${id} deletado`);
  }

  async getCoresDisponiveis(): Promise<string[]> {
    return this.produtoRepository.getCoresDisponiveis();
  }

  async getTamanhosDisponiveis(): Promise<string[]> {
    return this.produtoRepository.getTamanhosDisponiveis();
  }

  async notifyPromotion(produtoId: string, desconto: number, mensagemPersonalizada?: string): Promise<void> {
    const produto = await this.produtoRepository.findById(produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    
    const clients = await this.userRepository.findAllClients();
    if (clients.length === 0) return;
    
    const valorOriginal = Number(produto.preco);
    const valorComDesconto = valorOriginal * (1 - desconto / 100);
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valorComDesconto);
    
    const mensagem = mensagemPersonalizada || 
      `🔥 ${produto.nome} com ${desconto}% OFF! Por apenas ${valorFormatado}. Aproveite!`;
    
    for (const client of clients) {
      await this.notificacoesService.create(client.id, {
        tipo: 'promo',
        titulo: `🔥 ${desconto}% DE DESCONTO!`,
        mensagem: mensagem,
      });
    }
  }

  private async notifyClientsAboutNewProduct(produto: any): Promise<void> {
    try {
      const clients = await this.userRepository.findAllClients();
      
      if (clients.length === 0) return;
      
      const valorFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(Number(produto.preco));
      
      for (const client of clients) {
        await this.notificacoesService.create(client.id, {
          tipo: 'limitado',
          titulo: '✨ NOVIDADE NA COLEÇÃO!',
          mensagem: `Novo produto: ${produto.nome} - ${valorFormatado} - ${produto.categoria}`,
        });
      }
      
      this.logger.log(`Notificados ${clients.length} clientes sobre o novo produto`);
    } catch (error) {
      this.logger.error(`Erro ao notificar clientes: ${error.message}`);
    }
  }
}