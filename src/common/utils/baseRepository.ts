// base.repository.ts
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface BaseEntity {
  id: string | number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  include?: any;
  select?: any;
  orderBy?: any;
  maxLimit?: number; // Limite máximo por página
  where?: any; // Filtros adicionais
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BatchOptions {
  batchSize?: number;
  onProgress?: (processed: number, total: number) => void;
}

@Injectable()
export abstract class BaseRepository<T extends BaseEntity> {
  // Configurações padrão para segurança de memória
  protected readonly DEFAULT_MAX_LIMIT = 50;
  protected readonly DEFAULT_LIMIT = 10;
  protected readonly MAX_INCLUDE_DEPTH = 2;
  protected readonly QUERY_TIMEOUT_MS = 10000;

  constructor(protected readonly prisma: PrismaService) {}

  // Método abstrato que deve ser implementado pela classe filha
  protected abstract get model(): any;

  /**
   * Cria um novo registro com timeout e sanitização
   */
  async create(data: any, include?: any): Promise<T> {
    try {
      const sanitizedInclude = include ? this.sanitizeInclude(include) : undefined;
      
      const result = await this.withTimeout(
        this.model.create({
          data,
          ...(sanitizedInclude && { include: sanitizedInclude }),
        })
      );
      
      return result;
    } catch (error) {
      this.handlePrismaError(error, 'criar registro');
    }
  }

  /**
   * Busca registro por ID com cache opcional
   */
  async findById(id: string | number, include?: any, useCache = false): Promise<T | null> {
    try {
      const cacheKey = `${this.model.name}:${id}`;
      
      if (useCache && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      const sanitizedInclude = include ? this.sanitizeInclude(include) : undefined;
      
      const result = await this.withTimeout(
        this.model.findUnique({
          where: { id: this.normalizeId(id) },
          ...(sanitizedInclude && { include: sanitizedInclude }),
        })
      );
      
      if (!result) {
        throw new NotFoundException(`Registro com ID ${id} não encontrado.`);
      }
      
      if (useCache) {
        this.cache.set(cacheKey, result);
        setTimeout(() => this.cache.delete(cacheKey), 30000); // Cache por 30s
      }
      
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handlePrismaError(error, 'buscar registro por ID');
    }
  }

  /**
   * Busca todos os registros com paginação segura
   */
  async findAll(options?: PaginationOptions): Promise<PaginationResult<T>> {
    try {
      // Validações de segurança
      const maxLimit = options?.maxLimit || this.DEFAULT_MAX_LIMIT;
      let limit = Math.min(options?.limit || this.DEFAULT_LIMIT, maxLimit);
      const page = Math.max(options?.page || 1, 1);
      const skip = (page - 1) * limit;
      
      // Prefere select ao invés de include para economizar memória
      const shouldUseSelect = !!options?.select && !options?.include;
      const shouldUseInclude = !!options?.include && !options?.select;
      
      // Executa queries em paralelo
      const [data, total] = await Promise.all([
        this.withTimeout(
          this.model.findMany({
            where: options?.where || {},
            skip,
            take: limit,
            orderBy: options?.orderBy || { createdAt: 'desc' },
            ...(shouldUseSelect && { select: this.sanitizeSelect(options.select) }),
            ...(shouldUseInclude && { include: this.sanitizeInclude(options.include) }),
          })
        ),
        this.model.count({ where: options?.where || {} }),
      ]);
      
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.handlePrismaError(error, 'buscar registros');
    }
  }

  /**
   * Busca registros com filtros personalizados
   */
  async findMany(where?: any, options?: PaginationOptions): Promise<PaginationResult<T>> {
    try {
      const maxLimit = options?.maxLimit || this.DEFAULT_MAX_LIMIT;
      let limit = Math.min(options?.limit || this.DEFAULT_LIMIT, maxLimit);
      const page = Math.max(options?.page || 1, 1);
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.withTimeout(
          this.model.findMany({
            where: where || {},
            skip,
            take: limit,
            orderBy: options?.orderBy || { createdAt: 'desc' },
            ...(options?.select && { select: this.sanitizeSelect(options.select) }),
            ...(options?.include && { include: this.sanitizeInclude(options.include) }),
          })
        ),
        this.model.count({ where: where || {} }),
      ]);
      
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.handlePrismaError(error, 'buscar registros filtrados');
    }
  }

  /**
   * Busca o primeiro registro que corresponde ao filtro
   */
  async findFirst(where: any, include?: any): Promise<T | null> {
    try {
      const sanitizedInclude = include ? this.sanitizeInclude(include) : undefined;
      
      const result = await this.withTimeout(
        this.model.findFirst({
          where,
          ...(sanitizedInclude && { include: sanitizedInclude }),
        })
      );
      
      if (!result) {
        throw new NotFoundException('Registro não encontrado.');
      }
      
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handlePrismaError(error, 'buscar o primeiro registro');
    }
  }

  /**
   * Atualiza um registro existente
   */
  async update(id: string | number, data: any, include?: any): Promise<T> {
    try {
      const sanitizedInclude = include ? this.sanitizeInclude(include) : undefined;
      
      const result = await this.withTimeout(
        this.model.update({
          where: { id: this.normalizeId(id) },
          data,
          ...(sanitizedInclude && { include: sanitizedInclude }),
        })
      );
      
      // Limpa cache se existir
      this.clearCache(`${this.model.name}:${id}`);
      
      return result;
    } catch (error) {
      this.handlePrismaError(error, 'atualizar registro');
    }
  }

  /**
   * Delete físico de um registro
   */
  async delete(id: string | number): Promise<T> {
    try {
      const result = await this.withTimeout(
        this.model.delete({
          where: { id: this.normalizeId(id) },
        })
      );
      
      this.clearCache(`${this.model.name}:${id}`);
      
      return result;
    } catch (error) {
      this.handlePrismaError(error, 'deletar registro');
    }
  }

  /**
   * Delete em massa com limite de segurança
   */
  async deleteMany(where: any, maxDeletions = 1000): Promise<{ count: number }> {
    try {
      // Previne deleção em massa sem where
      if (!where || Object.keys(where).length === 0) {
        throw new BadRequestException('Delete em massa requer filtros específicos');
      }
      
      // Verifica quantidade antes de deletar
      const count = await this.model.count({ where });
      
      if (count > maxDeletions) {
        throw new BadRequestException(
          `Delete em massa limitado a ${maxDeletions} registros. Use filtros mais específicos.`
        );
      }
      
      const result = await this.withTimeout(
        this.model.deleteMany({ where })
      );
      
      return result;
    } catch (error) {
      this.handlePrismaError(error, 'deletar registros');
    }
  }

  /**
   * Soft delete (marca como deletado)
   */
  async softDelete(id: string | number): Promise<T> {
    try {
      const result = await this.withTimeout(
        this.model.update({
          where: { id: this.normalizeId(id) },
          data: { deletedAt: new Date() },
        })
      );
      
      this.clearCache(`${this.model.name}:${id}`);
      
      return result;
    } catch (error) {
      this.handlePrismaError(error, 'deletar registro (soft delete)');
    }
  }

  /**
   * Soft delete em massa
   */
  async softDeleteMany(where: any, maxDeletions = 1000): Promise<{ count: number }> {
    try {
      if (!where || Object.keys(where).length === 0) {
        throw new BadRequestException('Soft delete em massa requer filtros específicos');
      }
      
      const count = await this.model.count({ where });
      
      if (count > maxDeletions) {
        throw new BadRequestException(
          `Soft delete em massa limitado a ${maxDeletions} registros.`
        );
      }
      
      const result = await this.withTimeout(
        this.model.updateMany({
          where,
          data: { deletedAt: new Date() },
        })
      );
      
      return result;
    } catch (error) {
      this.handlePrismaError(error, 'deletar registros (soft delete)');
    }
  }

  /**
   * Upsert: atualiza ou cria se não existir
   */
  async upsert(where: any, create: any, update: any, include?: any): Promise<T> {
    try {
      const sanitizedInclude = include ? this.sanitizeInclude(include) : undefined;
      
      const result = await this.withTimeout(
        this.model.upsert({
          where,
          create,
          update,
          ...(sanitizedInclude && { include: sanitizedInclude }),
        })
      );
      
      return result;
    } catch (error) {
      this.handlePrismaError(error, 'criar ou atualizar registro');
    }
  }

  /**
   * Verifica se um registro existe
   */
  async exists(where: any): Promise<boolean> {
    try {
      const count = await this.model.count({ where, take: 1 });
      return count > 0;
    } catch (error) {
      this.handlePrismaError(error, 'verificar existência do registro');
    }
  }

  /**
   * Conta registros com limites de segurança
   */
  async count(where?: any, maxCount = 100000): Promise<number> {
    try {
      const count = await this.model.count({ where: where || {} });
      return Math.min(count, maxCount);
    } catch (error) {
      this.handlePrismaError(error, 'contar registros');
    }
  }

  /**
   * Streaming de dados para processamento em lote (economiza memória)
   */
  async *streamAll(batchSize = 50, where?: any): AsyncGenerator<T[]> {
    let skip = 0;
    let hasMore = true;
    
    while (hasMore) {
      const batch = await this.model.findMany({
        where: where || {},
        skip,
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });
      
      if (batch.length === 0) {
        hasMore = false;
      } else {
        yield batch;
        skip += batchSize;
        
        // Sugere coleta de lixo a cada 10 batches
        if (skip % (batchSize * 10) === 0 && global.gc) {
          global.gc();
        }
      }
    }
  }

  /**
   * Processa todos os registros em lotes (útil para operações em massa)
   */
  async processInBatches(
    callback: (batch: T[]) => Promise<void>,
    options?: BatchOptions & { where?: any }
  ): Promise<{ processed: number; total: number }> {
    const batchSize = options?.batchSize || 50;
    const where = options?.where || {};
    
    const total = await this.count(where);
    let processed = 0;
    
    for await (const batch of this.streamAll(batchSize, where)) {
      await callback(batch);
      processed += batch.length;
      
      if (options?.onProgress) {
        options.onProgress(processed, total);
      }
    }
    
    return { processed, total };
  }

  /**
   * Busca com includes dinâmicos e validação de profundidade
   */
  async findWithIncludes(id: string | number, includes: string[], maxDepth = 2): Promise<T | null> {
    try {
      const includeObject = this.buildIncludeObject(includes, maxDepth);
      return await this.findById(id, includeObject);
    } catch (error) {
      this.handlePrismaError(error, 'buscar registro com includes');
    }
  }

  /**
   * Constrói objeto de include com validação de segurança
   */
  private buildIncludeObject(includes: string[], maxDepth: number, currentDepth = 0): any {
    if (currentDepth >= maxDepth) {
      return {};
    }
    
    const includeObj: any = {};
    
    for (const include of includes) {
      // Previne includes perigosos
      const dangerousIncludes = ['password', 'token', 'secret', 'hash'];
      if (dangerousIncludes.includes(include)) {
        continue;
      }
      
      switch (include) {
        case 'imagens':
          includeObj.imagens = {
            orderBy: { ordem: 'asc' },
            take: 10, // Limita número de imagens
          };
          break;
          
        case 'produto':
          includeObj.produto = {
            include: this.buildIncludeObject(['imagens'], maxDepth, currentDepth + 1),
          };
          break;
          
        case 'user':
          includeObj.user = {
            select: {
              id: true,
              nome: true,
              email: true,
              avatar: true,
            },
          };
          break;
          
        case 'pedidos':
          includeObj.pedidos = {
            take: 20, // Limita número de pedidos
            orderBy: { createdAt: 'desc' },
          };
          break;
          
        default:
          // Só inclui se for um campo seguro
          if (this.isSafeInclude(include)) {
            includeObj[include] = true;
          }
          break;
      }
    }
    
    return includeObj;
  }

  /**
   * Valida se o include é seguro
   */
  private isSafeInclude(field: string): boolean {
    const unsafeFields = [
      'password', 'senha', 'token', 'secret', 
      'hash', 'salt', 'privateKey', 'private_key'
    ];
    return !unsafeFields.includes(field.toLowerCase());
  }

  /**
   * Sanitiza objeto de include prevenindo recursão excessiva
   */
  private sanitizeInclude(include: any, depth = 0): any {
    if (depth >= this.MAX_INCLUDE_DEPTH) {
      return {};
    }
    
    if (!include || typeof include !== 'object') {
      return include;
    }
    
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(include)) {
      // Pula campos perigosos
      if (!this.isSafeInclude(key)) {
        continue;
      }
      
      if (value === true) {
        sanitized[key] = true;
      } else if (typeof value === 'object') {
        if (value.include) {
          sanitized[key] = {
            include: this.sanitizeInclude(value.include, depth + 1),
            ...(value.take && { take: Math.min(value.take, 50) }),
            ...(value.select && { select: this.sanitizeSelect(value.select) }),
          };
        } else {
          sanitized[key] = this.sanitizeInclude(value, depth + 1);
        }
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitiza select evitando campos pesados
   */
  private sanitizeSelect(select: any): any {
    if (!select || typeof select !== 'object') {
      return select;
    }
    
    const heavyFields = ['data', 'binaryData', 'largeText', 'content', 'description'];
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(select)) {
      if (!heavyFields.includes(key) && this.isSafeInclude(key)) {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Normaliza ID para o tipo correto
   */
  private normalizeId(id: string | number): string | number {
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      return parseInt(id, 10);
    }
    return id;
  }

  /**
   * Timeout para queries lentas
   */
  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${this.QUERY_TIMEOUT_MS}ms`)), this.QUERY_TIMEOUT_MS);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  // Sistema de cache simples
  private cache = new Map<string, any>();
  
  private clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else if (this.cache.size > 100) {
      // Limpa cache antigo se crescer demais
      const keysToDelete = Array.from(this.cache.keys()).slice(0, 50);
      keysToDelete.forEach(k => this.cache.delete(k));
    }
  }

  /**
   * Tratamento centralizado de erros Prisma
   */
  protected handlePrismaError(error: any, operation: string): never {
    // Log do erro em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Prisma Error] ${operation}:`, error);
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          const targetFields = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'desconhecido';
          throw new ConflictException(
            `Registro duplicado. Violação de constraint única nos campos: ${targetFields}.`
          );
          
        case 'P2003':
          throw new BadRequestException(
            `Violação de chave estrangeira. Verifique os relacionamentos.`
          );
          
        case 'P2001':
        case 'P2025':
          throw new NotFoundException(
            `Registro não encontrado para realizar ${operation}.`
          );
          
        case 'P2000':
          throw new BadRequestException(
            `Valor muito longo para o campo especificado.`
          );
          
        case 'P2011':
          throw new BadRequestException(
            `Campo obrigatório não pode ser nulo.`
          );
          
        case 'P2014':
          throw new BadRequestException(
            `Operação violaria relação obrigatória entre registros.`
          );
          
        case 'P2016':
          throw new InternalServerErrorException(
            `Erro de consulta: formato de dados inválido.`
          );
          
        case 'P2020':
          throw new BadRequestException(
            `Valor fora do intervalo permitido para o tipo do campo.`
          );
          
        case 'P2021':
          throw new InternalServerErrorException(
            `Tabela não encontrada no banco de dados.`
          );
          
        default:
          throw new InternalServerErrorException(
            `Erro ao ${operation}: ${error.message} (Código: ${error.code})`
          );
      }
    }
    
    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new BadRequestException(
        `Erro de validação: ${error.message.split('\n')[0]}`
      );
    }
    
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new InternalServerErrorException(
        `Operação muito lenta: timeout ao ${operation}. Tente com menos dados.`
      );
    }
    
    throw new InternalServerErrorException(
      `Erro inesperado ao ${operation}. Tente novamente mais tarde.`
    );
  }
}