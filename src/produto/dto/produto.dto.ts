// produto.dto.ts

import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayMinSize,
  IsDecimal,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Enum de categorias de produto
 */
export enum CategoriaProduto {
  FEMININO = 'Feminino',
  MASCULINO = 'Masculino',
  ACESSORIOS = 'Acessorios',
}

/**
 * DTO para criar um novo produto
 */
export class CreateProdutoDto {
  @IsString({ message: 'Nome deve ser uma string' })
  nome: string;

  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  descricao?: string;

  @IsDecimal({ decimal_digits: '2' }, { message: 'Preço deve ser um número decimal com até 2 casas' })
  @IsPositive({ message: 'Preço deve ser positivo' })
  @Type(() => Number)
  preco: number;

  @IsString({ message: 'Imagem deve ser uma URL' })
  imagem: string;

  @IsEnum(CategoriaProduto, {
    message: 'Categoria deve ser: Feminino, Masculino ou Acessorios',
  })
  categoria: CategoriaProduto;

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
}

/**
 * DTO para atualizar produto
 */
export class UpdateProdutoDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  nome?: string;

  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  descricao?: string;

  @IsDecimal({ decimal_digits: '2' }, { message: 'Preço deve ser um número decimal com até 2 casas' })
  @IsPositive({ message: 'Preço deve ser positivo' })
  @IsOptional()
  @Type(() => Number)
  preco?: number;

  @IsString({ message: 'Imagem deve ser uma URL' })
  @IsOptional()
  imagem?: string;

  @IsEnum(CategoriaProduto, {
    message: 'Categoria deve ser: Feminino, Masculino ou Acessorios',
  })
  @IsOptional()
  categoria?: CategoriaProduto;

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
}

/**
 * DTO para resposta de produto
 */
export class ProdutoResponseDto {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  preco: number;
  imagem: string;
  categoria: CategoriaProduto;
  tag: string;
  estoque: number;
  cores: string[];
  tamanhos: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(produto: any) {
    this.id = produto.id;
    this.nome = produto.nome;
    this.slug = produto.slug;
    this.descricao = produto.descricao;
    this.preco = parseFloat(produto.preco);
    this.imagem = produto.imagem;
    this.categoria = produto.categoria;
    this.tag = produto.tag;
    this.estoque = produto.estoque;
    
    // Cores
    if (Array.isArray(produto.cores)) {
      this.cores = produto.cores;
    } else if (produto.cores) {
      this.cores = JSON.parse(produto.cores);
    } else {
      this.cores = [];
    }
    
    // Tamanhos
    if (Array.isArray(produto.tamanhos)) {
      this.tamanhos = produto.tamanhos;
    } else if (produto.tamanhos) {
      this.tamanhos = JSON.parse(produto.tamanhos);
    } else {
      this.tamanhos = [];
    }
    
    this.createdAt = produto.createdAt;
    this.updatedAt = produto.updatedAt;
  }
}

/**
 * DTO para resposta detalhada de produto (com métricas)
 */
export class ProdutoDetailResponseDto extends ProdutoResponseDto {
  avaliacaoMedia: number;
  totalAvaliacoes: number;
  emEstoque: boolean;
  descontoPercentual: number;

  constructor(
    produto: any,
    avaliacaoMedia: number = 0,
    totalAvaliacoes: number = 0,
    descontoPercentual: number = 0,
  ) {
    super(produto);
    this.avaliacaoMedia = Math.round(avaliacaoMedia * 10) / 10;
    this.totalAvaliacoes = totalAvaliacoes;
    this.emEstoque = this.estoque > 0;
    this.descontoPercentual = descontoPercentual;
    }
  }


/**
 * DTO para filtro de produtos
 */
export class FilterProdutoDto {
  @IsOptional()
  @IsEnum(CategoriaProduto)
  categoria: CategoriaProduto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Preço mínimo deve ser um número' })
  precoMin: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Preço máximo deve ser um número' })
  precoMax: number;

  @IsOptional()
  @IsString({ message: 'Tag deve ser uma string' })
  tag: string;

  @IsOptional()
  @IsString({ message: 'Termo de busca deve ser uma string' })
  busca: string;

  @IsOptional()
  @IsArray({ message: 'Cores deve ser um array' })
  cores: string[];

  @IsOptional()
  @IsArray({ message: 'Tamanhos deve ser um array' })
  tamanhos: string[];

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Página deve ser no mínimo 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Limit deve ser no mínimo 1' })
  @Max(100, { message: 'Limit deve ser no máximo 100' })
  limit: number = 10;

  @IsOptional()
  @IsString({ message: 'Ordenação deve ser uma string' })
  sort: 'nome' | 'preco' | 'createdAt' = 'createdAt';

  @IsOptional()
  @IsString({ message: 'Direção deve ser asc ou desc' })
  order: 'asc' | 'desc' = 'desc';
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
    this.detalhes = [];
  }
}
