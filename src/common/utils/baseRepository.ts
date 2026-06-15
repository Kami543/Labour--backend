// src/common/utils/baseRepository.ts
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
  maxLimit?: number;
  where?: any;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export abstract class BaseRepository<T extends BaseEntity> {
  protected readonly DEFAULT_MAX_LIMIT = 50;
  protected readonly DEFAULT_LIMIT = 10;
  protected readonly MAX_INCLUDE_DEPTH = 2;
  protected readonly QUERY_TIMEOUT_MS = 10000;

  constructor(protected readonly prisma: PrismaService) {}

  protected abstract get model(): any;

  async create(data: any, include?: any): Promise<T> {
    try {
      const result = await this.model.create({ data });
      return result as T;
    } catch (error) {
      this.handlePrismaError(error, 'criar registro');
    }
  }

  async findById(id: string | number, include?: any): Promise<T | null> {
    try {
      const result = await this.model.findUnique({
        where: { id: this.normalizeId(id) },
      });
      return result as T | null;
    } catch (error) {
      this.handlePrismaError(error, 'buscar registro por ID');
    }
  }

  async findAll(options?: PaginationOptions): Promise<PaginationResult<T>> {
    try {
      const maxLimit = options?.maxLimit || this.DEFAULT_MAX_LIMIT;
      let limit = Math.min(options?.limit || this.DEFAULT_LIMIT, maxLimit);
      const page = Math.max(options?.page || 1, 1);
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.model.findMany({
          where: options?.where || {},
          skip,
          take: limit,
          orderBy: options?.orderBy || { createdAt: 'desc' },
        }),
        this.model.count({ where: options?.where || {} }),
      ]);

      return {
        data: data as T[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.handlePrismaError(error, 'buscar registros');
    }
  }

  async findMany(where?: any, options?: PaginationOptions): Promise<PaginationResult<T>> {
    try {
      const maxLimit = options?.maxLimit || this.DEFAULT_MAX_LIMIT;
      let limit = Math.min(options?.limit || this.DEFAULT_LIMIT, maxLimit);
      const page = Math.max(options?.page || 1, 1);
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.model.findMany({
          where: where || {},
          skip,
          take: limit,
          orderBy: options?.orderBy || { createdAt: 'desc' },
        }),
        this.model.count({ where: where || {} }),
      ]);

      return {
        data: data as T[],
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
      const result = await this.model.findFirst({ where });
      return result as T | null;
    } catch (error) {
      this.handlePrismaError(error, 'buscar o primeiro registro');
    }
  }

  async update(id: string | number, data: any, include?: any): Promise<T> {
    try {
      const result = await this.model.update({
        where: { id: this.normalizeId(id) },
        data,
      });
      return result as T;
    } catch (error) {
      this.handlePrismaError(error, 'atualizar registro');
    }
  }

  async delete(id: string | number): Promise<T> {
    try {
      const result = await this.model.delete({
        where: { id: this.normalizeId(id) },
      });
      return result as T;
    } catch (error) {
      this.handlePrismaError(error, 'deletar registro');
    }
  }

  async deleteMany(where: any, maxDeletions = 1000): Promise<{ count: number }> {
    try {
      if (!where || Object.keys(where).length === 0) {
        throw new BadRequestException('Delete em massa requer filtros específicos');
      }

      const result = await this.model.deleteMany({ where });
      return { count: result.count };
    } catch (error) {
      this.handlePrismaError(error, 'deletar registros');
    }
  }

  async softDelete(id: string | number): Promise<T> {
    try {
      const result = await this.model.update({
        where: { id: this.normalizeId(id) },
        data: { deletedAt: new Date() },
      });
      return result as T;
    } catch (error) {
      this.handlePrismaError(error, 'deletar registro (soft delete)');
    }
  }

  async softDeleteMany(where: any, maxDeletions = 1000): Promise<{ count: number }> {
    try {
      if (!where || Object.keys(where).length === 0) {
        throw new BadRequestException('Soft delete em massa requer filtros específicos');
      }

      const result = await this.model.updateMany({
        where,
        data: { deletedAt: new Date() },
      });
      return { count: result.count };
    } catch (error) {
      this.handlePrismaError(error, 'deletar registros (soft delete)');
    }
  }

  async upsert(where: any, create: any, update: any, include?: any): Promise<T> {
    try {
      const result = await this.model.upsert({
        where,
        create,
        update,
      });
      return result as T;
    } catch (error) {
      this.handlePrismaError(error, 'criar ou atualizar registro');
    }
  }

  async exists(where: any): Promise<boolean> {
    try {
      const count = await this.model.count({ where, take: 1 });
      return count > 0;
    } catch (error) {
      this.handlePrismaError(error, 'verificar existência do registro');
    }
  }

  async count(where?: any, maxCount = 100000): Promise<number> {
    try {
      const count = await this.model.count({ where: where || {} });
      return Math.min(count, maxCount);
    } catch (error) {
      this.handlePrismaError(error, 'contar registros');
    }
  }

  private normalizeId(id: string | number): string | number {
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      return parseInt(id, 10);
    }
    return id;
  }

  protected handlePrismaError(error: any, operation: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(`Registro duplicado.`);
        case 'P2003':
          throw new BadRequestException(`Violação de chave estrangeira.`);
        case 'P2001':
        case 'P2025':
          throw new NotFoundException(`Registro não encontrado.`);
        case 'P2000':
          throw new BadRequestException(`Valor muito longo.`);
        case 'P2011':
          throw new BadRequestException(`Campo obrigatório não pode ser nulo.`);
        default:
          throw new InternalServerErrorException(`Erro ao ${operation}: ${error.message}`);
      }
    }
    throw new InternalServerErrorException(`Erro inesperado ao ${operation}.`);
  }
}