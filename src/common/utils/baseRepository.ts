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
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class BaseRepository<T extends BaseEntity> {
  constructor(protected readonly prisma: PrismaService) {}

  protected get model(): any {
    throw new Error(
      'O método "model" deve ser implementado pela classe filha. Exemplo: protected get model() { return this.prisma.seuModelo; }',
    );
  }

  async create(data: any, include?: any): Promise<T> {
    try {
      return await this.model.create({ 
        data,
        ...(include && { include })
      });
    } catch (error) {
      this.handlePrismaError(error, 'criar registro');
    }
  }

  async findById(id: string | number, include?: any): Promise<T | null> {
    try {
      const result = await this.model.findUnique({ 
        where: { id },
        ...(include && { include })
      });
      if (!result) throw new NotFoundException('Registro não encontrado.');
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error, 'buscar registro por ID');
    }
  }

  async findAll(options?: PaginationOptions): Promise<PaginationResult<T>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.model.findMany({
          skip,
          take: limit,
          orderBy: options?.orderBy || { createdAt: 'desc' },
          ...(options?.include && { include: options.include }),
          ...(options?.select && { select: options.select }),
        }),
        this.model.count(),
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

  async findMany(
    where?: any,
    options?: PaginationOptions,
  ): Promise<PaginationResult<T>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: limit,
          orderBy: options?.orderBy || { createdAt: 'desc' },
          ...(options?.include && { include: options.include }),
          ...(options?.select && { select: options.select }),
        }),
        this.model.count({ where }),
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

  async findFirst(where: any, include?: any): Promise<T | null> {
    try {
      const result = await this.model.findFirst({ 
        where,
        ...(include && { include })
      });
      if (!result) throw new NotFoundException('Registro não encontrado.');
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error, 'buscar o primeiro registro');
    }
  }

  async update(id: string | number, data: any, include?: any): Promise<T> {
    try {
      return await this.model.update({
        where: { id },
        data,
        ...(include && { include })
      });
    } catch (error) {
      this.handlePrismaError(error, 'atualizar registro');
    }
  }

  async delete(id: string | number): Promise<T> {
    try {
      return await this.model.delete({
        where: { id },
      });
    } catch (error) {
      this.handlePrismaError(error, 'deletar registro');
    }
  }

  async deleteMany(where: any): Promise<{ count: number }> {
    try {
      return await this.model.deleteMany({ where });
    } catch (error) {
      this.handlePrismaError(error, 'deletar registros');
    }
  }

  async softDelete(id: string | number): Promise<T> {
    try {
      return await this.model.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      this.handlePrismaError(error, 'deletar registro (soft delete)');
    }
  }

  async softDeleteMany(where: any): Promise<{ count: number }> {
    try {
      return await this.model.updateMany({
        where,
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      this.handlePrismaError(error, 'deletar registros (soft delete)');
    }
  }

  async upsert(where: any, create: any, update: any, include?: any): Promise<T> {
    try {
      return await this.model.upsert({
        where,
        create,
        update,
        ...(include && { include })
      });
    } catch (error) {
      this.handlePrismaError(error, 'criar ou atualizar registro');
    }
  }

  async exists(where: any): Promise<boolean> {
    try {
      const count = await this.model.count({ where });
      return count > 0;
    } catch (error) {
      this.handlePrismaError(error, 'verificar existência do registro');
    }
  }

  async count(where?: any): Promise<number> {
    try {
      return await this.model.count({ where });
    } catch (error) {
      this.handlePrismaError(error, 'contar registros');
    }
  }

  // Método para buscar com includes dinâmicos
  async findWithIncludes(id: string | number, includes: string[]): Promise<T | null> {
    try {
      const includeObject = this.buildIncludeObject(includes);
      return await this.findById(id, includeObject);
    } catch (error) {
      this.handlePrismaError(error, 'buscar registro com includes');
    }
  }

  // Método para buscar todos com includes dinâmicos
  async findAllWithIncludes(
    where?: any,
    includes?: string[],
    options?: PaginationOptions
  ): Promise<PaginationResult<T>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const skip = (page - 1) * limit;

      const includeObject = includes ? this.buildIncludeObject(includes) : undefined;

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          skip,
          take: limit,
          orderBy: options?.orderBy || { createdAt: 'desc' },
          ...(includeObject && { include: includeObject }),
        }),
        this.model.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.handlePrismaError(error, 'buscar registros com includes');
    }
  }

  // Constrói objeto de include para o Prisma
  private buildIncludeObject(includes: string[]): any {
    const includeObj: any = {};
    for (const include of includes) {
      if (include === 'imagens') {
        includeObj.imagens = {
          orderBy: { ordem: 'asc' }
        };
      } else if (include === 'produto') {
        includeObj.produto = {
          include: {
            imagens: {
              orderBy: { ordem: 'asc' }
            }
          }
        };
      } else if (include === 'user') {
        includeObj.user = {
          select: {
            id: true,
            nome: true,
            email: true
          }
        };
      } else {
        includeObj[include] = true;
      }
    }
    return includeObj;
  }

  // ✅ CORRIGIDO: Tratamento centralizado de erros - mudado de private para protected
  protected handlePrismaError(error: any, operation: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': {
          const targetFields = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'desconhecido';
          throw new ConflictException(
            `Registro duplicado. Violação de constraint única nos campos: ${targetFields}.`,
          );
        }
        case 'P2003': {
          const fieldName = error.meta?.field_name ?? 'desconhecido';
          throw new BadRequestException(
            `Violação de chave estrangeira no campo: ${fieldName}.`,
          );
        }
        case 'P2000': {
          const colName = error.meta?.column_name ?? 'desconhecido';
          throw new BadRequestException(
            `Valor muito longo para o campo: ${colName}.`,
          );
        }
        case 'P2001':
        case 'P2025': {
          const cause = error.meta?.cause ?? 'desconhecida';
          throw new NotFoundException(
            `Registro não encontrado: ${cause}.`,
          );
        }
        case 'P2004': {
          const reason = error.meta?.reason ?? 'desconhecida';
          throw new ForbiddenException(
            `Restrições de banco de dados violadas: ${reason}.`,
          );
        }
        case 'P2011': {
          const nullConstraint = error.meta?.constraint ?? 'desconhecida';
          throw new BadRequestException(
            `Violação de constraint nula: ${nullConstraint}.`,
          );
        }
        case 'P2012': {
          const argumentName = error.meta?.argument_name ?? 'desconhecido';
          throw new BadRequestException(
            `Valor obrigatório ausente: ${argumentName}.`,
          );
        }
        case 'P2014': {
          const relationName = error.meta?.relation_name ?? 'desconhecida';
          throw new BadRequestException(
            `A operação violaria a relação obrigatória '${relationName}'.`,
          );
        }
        case 'P2015': {
          const modelAName = error.meta?.model_a_name ?? 'desconhecido';
          const modelBName = error.meta?.model_b_name ?? 'desconhecido';
          throw new NotFoundException(
            `Registro relacionado não encontrado entre '${modelAName}' e '${modelBName}'.`,
          );
        }
        case 'P2020': {
          const outOfRangeCol = error.meta?.column_name ?? 'desconhecido';
          throw new BadRequestException(
            `Valor fora do intervalo para o tipo no campo: ${outOfRangeCol}.`,
          );
        }
        case 'P2021': {
          const table = error.meta?.table ?? 'desconhecida';
          throw new InternalServerErrorException(
            `Tabela não existe no banco de dados: ${table}.`,
          );
        }
        case 'P2022': {
          const column = error.meta?.column ?? 'desconhecido';
          throw new InternalServerErrorException(
            `Coluna não existe no banco de dados: ${column}.`,
          );
        }
        default:
          throw new BadRequestException(
            `Erro ao ${operation}: ${error.message} (Código: ${error.code})`,
          );
      }
    }
    throw new InternalServerErrorException(
      `Erro inesperado ao ${operation}.`,
    );
  }
}