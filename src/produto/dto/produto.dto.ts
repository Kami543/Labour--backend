import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsDecimal,
  Min,
  Max,
  IsUrl,
  IsBoolean,
  IsUUID,
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
 */
export class CreateProdutoDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  nome: string;

  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  descricao?: string;

  @IsDecimal({ decimal_digits: '2' }, { message: 'Preço deve ser um número decimal com até 2 casas' })
  @IsPositive({ message: 'Preço deve ser positivo' })
  @Type(() => Number)
  preco: number;

  @IsString({ message: 'Categoria deve ser uma string' })
  @MinLength(2, { message: 'Categoria deve ter no mínimo 2 caracteres' })
  categoria: string; // Agora é string livre

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
}

/**
 * DTO para atualizar produto
 */
export class UpdateProdutoDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
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
 * DTO para resposta de produto
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

  constructor(produto: any) {
    this.id = produto.id;
    this.nome = produto.nome;
    this.slug = produto.slug;
    this.descricao = produto.descricao || '';
    this.preco = parseFloat(produto.preco);
    this.categoria = produto.categoria;
    this.tag = produto.tag || '';
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
    
    // Imagens
    if (produto.imagens && Array.isArray(produto.imagens)) {
      this.imagens = produto.imagens.map(img => new ProdutoImagemResponseDto(img));
    } else {
      this.imagens = [];
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
    this.detalhes = [];
  }
}