// src/produto/dto/produto.dto.ts
import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  ArrayMinSize,
  Min,
  Max,
  IsUrl,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para imagem do produto
 */
export class CreateProdutoImagemDto {
  @IsUrl({}, { message: 'URL da imagem deve ser válida' })
  url: string;

  @IsString({ message: 'Texto alternativo deve ser uma string' })
  @IsOptional()
  altText?: string;

  @IsNumber({}, { message: 'Ordem deve ser um número' })
  @Min(0, { message: 'Ordem não pode ser negativa' })
  @IsOptional()
  ordem?: number;

  @IsBoolean({ message: 'isPrincipal deve ser booleano' })
  @IsOptional()
  isPrincipal?: boolean;
}

/**
 * DTO para criar um novo produto (com múltiplas imagens)
 * Suporta tanto camelCase quanto snake_case
 */
export class CreateProdutoDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  nome: string;

  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  descricao?: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço deve ser um número com até 2 casas decimais' })
  @IsPositive({ message: 'Preço deve ser positivo' })
  @Type(() => Number)
  preco: number;

  @IsString({ message: 'Categoria deve ser uma string' })
  @MinLength(2, { message: 'Categoria deve ter no mínimo 2 caracteres' })
  categoria: string;

  @IsString({ message: 'Tag deve ser uma string' })
  @IsOptional()
  tag?: string;

  @IsNumber({}, { message: 'Estoque deve ser um número' })
  @Min(0, { message: 'Estoque não pode ser negativo' })
  @Type(() => Number)
  estoque: number;

  @IsArray({ message: 'Cores deve ser um array' })
  @ArrayMinSize(1, { message: 'Deve ter no mínimo 1 cor' })
  cores: string[];

  @IsArray({ message: 'Tamanhos deve ser um array' })
  @ArrayMinSize(1, { message: 'Deve ter no mínimo 1 tamanho' })
  tamanhos: string[];

  @IsArray({ message: 'Imagens deve ser um array' })
  @IsOptional()
  imagens?: CreateProdutoImagemDto[];

  // ─── CAMPOS DE PROMOÇÃO (CAMELCASE PARA O DTO) ───
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço promocional deve ter até 2 casas decimais' })
  @IsPositive({ message: 'Preço promocional deve ser positivo' })
  @IsOptional()
  @Type(() => Number)
  precoPromocional?: number;

  // Suporte para snake_case também
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço promocional deve ter até 2 casas decimais' })
  @IsPositive({ message: 'Preço promocional deve ser positivo' })
  @IsOptional()
  @Type(() => Number)
  preco_promocional?: number;

  @IsNumber({}, { message: 'Desconto deve ser um número' })
  @Min(0, { message: 'Desconto não pode ser negativo' })
  @Max(100, { message: 'Desconto não pode ultrapassar 100%' })
  @IsOptional()
  @Type(() => Number)
  desconto?: number;

  @IsBoolean({ message: 'promocaoAtiva deve ser booleano' })
  @IsOptional()
  promocaoAtiva?: boolean;

  @IsBoolean({ message: 'promocao_ativa deve ser booleano' })
  @IsOptional()
  promocao_ativa?: boolean;
}

/**
 * DTO para atualizar produto
 * Suporta tanto camelCase quanto snake_case
 */
export class UpdateProdutoDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @IsOptional()
  nome?: string;

  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  descricao?: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço deve ser um número com até 2 casas decimais' })
  @IsPositive({ message: 'Preço deve ser positivo' })
  @IsOptional()
  @Type(() => Number)
  preco?: number;

  @IsString({ message: 'Categoria deve ser uma string' })
  @MinLength(2, { message: 'Categoria deve ter no mínimo 2 caracteres' })
  @IsOptional()
  categoria?: string;

  @IsString({ message: 'Tag deve ser uma string' })
  @IsOptional()
  tag?: string;

  @IsNumber({}, { message: 'Estoque deve ser um número' })
  @Min(0, { message: 'Estoque não pode ser negativo' })
  @IsOptional()
  @Type(() => Number)
  estoque?: number;

  @IsArray({ message: 'Cores deve ser um array' })
  @ArrayMinSize(1, { message: 'Deve ter no mínimo 1 cor' })
  @IsOptional()
  cores?: string[];

  @IsArray({ message: 'Tamanhos deve ser um array' })
  @ArrayMinSize(1, { message: 'Deve ter no mínimo 1 tamanho' })
  @IsOptional()
  tamanhos?: string[];

  // ─── CAMPOS DE PROMOÇÃO (CAMELCASE PARA O DTO) ───
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço promocional deve ter até 2 casas decimais' })
  @IsPositive({ message: 'Preço promocional deve ser positivo' })
  @IsOptional()
  @Type(() => Number)
  precoPromocional?: number;

  // Suporte para snake_case
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço promocional deve ter até 2 casas decimais' })
  @IsPositive({ message: 'Preço promocional deve ser positivo' })
  @IsOptional()
  @Type(() => Number)
  preco_promocional?: number;

  @IsNumber({}, { message: 'Desconto deve ser um número' })
  @Min(0, { message: 'Desconto não pode ser negativo' })
  @Max(100, { message: 'Desconto não pode ultrapassar 100%' })
  @IsOptional()
  @Type(() => Number)
  desconto?: number;

  @IsBoolean({ message: 'promocaoAtiva deve ser booleano' })
  @IsOptional()
  promocaoAtiva?: boolean;

  @IsBoolean({ message: 'promocao_ativa deve ser booleano' })
  @IsOptional()
  promocao_ativa?: boolean;
}

/**
 * DTO para atualizar apenas a promoção
 */
export class UpdatePromocaoDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço promocional deve ter até 2 casas decimais' })
  @IsPositive({ message: 'Preço promocional deve ser positivo' })
  @IsOptional()
  @Type(() => Number)
  precoPromocional?: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço promocional deve ter até 2 casas decimais' })
  @IsPositive({ message: 'Preço promocional deve ser positivo' })
  @IsOptional()
  @Type(() => Number)
  preco_promocional?: number;

  @IsNumber({}, { message: 'Desconto deve ser um número' })
  @Min(0, { message: 'Desconto não pode ser negativo' })
  @Max(100, { message: 'Desconto não pode ultrapassar 100%' })
  @IsOptional()
  @Type(() => Number)
  desconto?: number;

  @IsBoolean({ message: 'promocaoAtiva deve ser booleano' })
  @IsOptional()
  promocaoAtiva?: boolean;

  @IsBoolean({ message: 'promocao_ativa deve ser booleano' })
  @IsOptional()
  promocao_ativa?: boolean;
}

/**
 * DTO para resposta de imagem
 */
export class ProdutoImagemResponseDto {
  id: string;
  url: string;
  altText?: string;
  ordem: number;
  isPrincipal: boolean;
  createdAt: Date;

  constructor(imagem: any) {
    this.id = imagem.id;
    this.url = imagem.url;
    this.altText = imagem.altText;
    this.ordem = imagem.ordem;
    this.isPrincipal = imagem.isPrincipal;
    this.createdAt = imagem.createdAt;
  }
}

/**
 * DTO para resposta de produto (SNAKE_CASE para o Prisma)
 */
export class ProdutoResponseDto {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  preco: number;
  categoria: string;
  tag: string;
  estoque: number;
  cores: string[];
  tamanhos: string[];
  imagens: ProdutoImagemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
  
  // ─── CAMPOS DE PROMOÇÃO (SNAKE_CASE PARA O PRISMA) ───
  preco_promocional?: number;
  desconto: number;
  promocao_ativa: boolean;

  constructor(produto: any) {
    this.id = produto.id;
    this.nome = produto.nome;
    this.slug = produto.slug;
    this.descricao = produto.descricao || '';
    this.preco = typeof produto.preco === 'number' ? produto.preco : parseFloat(produto.preco);
    this.categoria = produto.categoria;
    this.tag = produto.tag || '';
    this.estoque = produto.estoque;
    
    // Cores
    if (Array.isArray(produto.cores)) {
      this.cores = produto.cores;
    } else if (produto.cores) {
      try {
        this.cores = typeof produto.cores === 'string' ? JSON.parse(produto.cores) : produto.cores;
      } catch {
        this.cores = [];
      }
    } else {
      this.cores = [];
    }
    
    // Tamanhos
    if (Array.isArray(produto.tamanhos)) {
      this.tamanhos = produto.tamanhos;
    } else if (produto.tamanhos) {
      try {
        this.tamanhos = typeof produto.tamanhos === 'string' ? JSON.parse(produto.tamanhos) : produto.tamanhos;
      } catch {
        this.tamanhos = [];
      }
    } else {
      this.tamanhos = [];
    }
    
    // Imagens
    if (produto.imagens && Array.isArray(produto.imagens)) {
      this.imagens = produto.imagens.map((img: any) => new ProdutoImagemResponseDto(img));
    } else {
      this.imagens = [];
    }
    
    // ─── CAMPOS DE PROMOÇÃO (SNAKE_CASE) ───
    this.preco_promocional = produto.preco_promocional ? 
      (typeof produto.preco_promocional === 'number' ? produto.preco_promocional : parseFloat(produto.preco_promocional)) : 
      undefined;
    this.desconto = produto.desconto || 0;
    this.promocao_ativa = produto.promocao_ativa || false;
    
    this.createdAt = produto.createdAt;
    this.updatedAt = produto.updatedAt;
  }
}

/**
 * DTO para resposta de produto em promoção
 */
export class PromocaoProdutoDto {
  id: string;
  nome: string;
  slug: string;
  preco: number;
  preco_promocional?: number;
  desconto: number;
  promocao_ativa: boolean;
  imagemPrincipal?: string;
  categoria: string;

  constructor(produto: any) {
    this.id = produto.id;
    this.nome = produto.nome;
    this.slug = produto.slug;
    this.preco = typeof produto.preco === 'number' ? produto.preco : parseFloat(produto.preco);
    this.preco_promocional = produto.preco_promocional ? 
      (typeof produto.preco_promocional === 'number' ? produto.preco_promocional : parseFloat(produto.preco_promocional)) : 
      undefined;
    this.desconto = produto.desconto || 0;
    this.promocao_ativa = produto.promocao_ativa || false;
    this.categoria = produto.categoria;
    
    // Pega a imagem principal
    if (produto.imagens && Array.isArray(produto.imagens)) {
      const principal = produto.imagens.find((img: any) => img.isPrincipal);
      this.imagemPrincipal = principal?.url || produto.imagens[0]?.url;
    }
  }
}

/**
 * DTO para resposta detalhada de produto (com métricas)
 */
export class ProdutoDetailResponseDto extends ProdutoResponseDto {
  avaliacaoMedia: number;
  totalAvaliacoes: number;
  emEstoque: boolean;
  imagemPrincipal?: string;

  constructor(
    produto: any,
    avaliacaoMedia: number = 0,
    totalAvaliacoes: number = 0,
  ) {
    super(produto);
    this.avaliacaoMedia = Math.round(avaliacaoMedia * 10) / 10;
    this.totalAvaliacoes = totalAvaliacoes;
    this.emEstoque = this.estoque > 0;
    
    // Pega a imagem principal ou a primeira imagem
    const imagemPrincipal = this.imagens.find(img => img.isPrincipal) || this.imagens[0];
    this.imagemPrincipal = imagemPrincipal?.url;
  }
}

/**
 * DTO para filtro de produtos
 */
export class FilterProdutoDto {
  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  categoria?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Preço mínimo deve ser um número' })
  @Min(0, { message: 'Preço mínimo não pode ser negativo' })
  precoMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Preço máximo deve ser um número' })
  @Min(0, { message: 'Preço máximo não pode ser negativo' })
  precoMax?: number;

  @IsOptional()
  @IsString({ message: 'Tag deve ser uma string' })
  tag?: string;

  @IsOptional()
  @IsString({ message: 'Termo de busca deve ser uma string' })
  busca?: string;

  @IsOptional()
  @IsArray({ message: 'Cores deve ser um array' })
  cores?: string[];

  @IsOptional()
  @IsArray({ message: 'Tamanhos deve ser um array' })
  tamanhos?: string[];

  // ─── SUPORTE PARA AMBOS OS FORMATOS ───
  @IsOptional()
  @IsBoolean({ message: 'promocaoAtiva deve ser booleano' })
  promocaoAtiva?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'promocao_ativa deve ser booleano' })
  promocao_ativa?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Página deve ser no mínimo 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Limit deve ser no mínimo 1' })
  @Max(100, { message: 'Limit deve ser no máximo 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'Ordenação deve ser uma string' })
  sort?: 'nome' | 'preco' | 'createdAt' = 'createdAt';

  @IsOptional()
  @IsString({ message: 'Direção deve ser asc ou desc' })
  order?: 'asc' | 'desc' = 'desc';
}

/**
 * DTO para atualizar estoque
 */
export class UpdateEstoqueDto {
  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @Min(0, { message: 'Quantidade não pode ser negativa' })
  @Type(() => Number)
  quantidade: number;

  @IsString({ message: 'Operação deve ser uma string' })
  operacao: 'adicionar' | 'remover' | 'definir';
}

/**
 * DTO para resposta de atualização em massa
 */
export class BulkUpdateResponseDto {
  total: number;
  sucesso: number;
  erro: number;
  detalhes: Array<{
    id: string;
    status: 'sucesso' | 'erro';
    mensagem?: string;
  }>;

  constructor() {
    this.total = 0;
    this.sucesso = 0;
    this.erro = 0;
    this.detalhes = [];
  }
}