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
  }
  
  export interface PaginationOptions {
    page?: number;
    limit?: number;
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
  
    async create(data: any): Promise<T> {
      try {
        return await this.model.create({ data });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          switch (error.code) {
            case 'P2002': {
              const targetFields =
                (error.meta?.target as string[] | undefined)?.join(', ') ??
                'desconhecido';
              const uniqueConstraint = error.meta?.constraint ?? 'desconhecida';
              throw new ConflictException(
                `Registro duplicado. Violação de constraint única "${uniqueConstraint}" nos campos: ${targetFields}.`,
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
            case 'P2001': {
              const notFoundConstraint = error.meta?.constraint ?? 'desconhecida';
              throw new NotFoundException(
                `Registro relacionado não encontrado na condição: ${notFoundConstraint}.`,
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
              const parentName = error.meta?.parent_name ?? 'desconhecido';
              const childName = error.meta?.child_name ?? 'desconhecido';
              throw new BadRequestException(
                `A mudança violaria a relação obrigatória '${relationName}' entre os modelos '${parentName}' e '${childName}'.`,
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
            case 'P2025': {
              const cause = error.meta?.cause ?? 'desconhecida';
              throw new NotFoundException(
                `Operação falhou devido a dependências não encontradas: ${cause}.`,
              );
            }
            default:
              throw new BadRequestException(
                `Erro ao criar registro: ${error.message} (Código: ${error.code})`,
              );
          }
        }
        throw new InternalServerErrorException(
          'Erro inesperado ao criar registro.',
        );
      }
    }
  
    async findById(id: string | number): Promise<T | null> {
      try {
        const result = await this.model.findUnique({ where: { id } });
        if (!result) throw new NotFoundException('Registro não encontrado.');
        return result;
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          switch (error.code) {
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
              throw new InternalServerErrorException(
                `Erro ao buscar registro por ID: ${error.message} (Código: ${error.code})`,
              );
          }
        }
        throw new InternalServerErrorException(
          'Erro ao buscar registro por ID.',
        );
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
            orderBy: { createdAt: 'desc' },
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
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw new InternalServerErrorException(
            `Erro ao buscar registros: ${error.message} (Código: ${error.code})`,
          );
        }
        throw new InternalServerErrorException('Erro ao buscar registros.');
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
            orderBy: { createdAt: 'desc' },
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
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw new InternalServerErrorException(
            `Erro ao buscar registros filtrados: ${error.message} (Código: ${error.code})`,
          );
        }
        throw new InternalServerErrorException(
          'Erro ao buscar registros filtrados.',
        );
      }
    }
  
    async findFirst(where: any): Promise<T | null> {
      try {
        const result = await this.model.findFirst({ where });
        if (!result) throw new NotFoundException('Registro não encontrado.');
        return result;
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          switch (error.code) {
            case 'P2001': {
              const notFoundConstraint = error.meta?.constraint ?? 'desconhecida';
              throw new NotFoundException(
                `Registro não encontrado na condição: ${notFoundConstraint}.`,
              );
            }
            default:
              throw new InternalServerErrorException(
                `Erro ao buscar o primeiro registro: ${error.message} (Código: ${error.code})`,
              );
          }
        }
        throw new InternalServerErrorException(
          'Erro ao buscar o primeiro registro.',
        );
      }
    }
  
    async update(id: string | number, data: any): Promise<T> {
      try {
        return await this.model.update({
          where: { id },
          data,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          switch (error.code) {
            case 'P2025': {
              const cause = error.meta?.cause ?? 'desconhecida';
              throw new NotFoundException(
                `Registro para atualização não encontrado: ${cause}.`,
              );
            }
            case 'P2002': {
              const targetFields =
                (error.meta?.target as string[] | undefined)?.join(', ') ??
                'desconhecido';
              const uniqueConstraint = error.meta?.constraint ?? 'desconhecida';
              throw new ConflictException(
                `Registro duplicado. Violação de constraint única "${uniqueConstraint}" nos campos: ${targetFields}.`,
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
            case 'P2001': {
              const notFoundConstraint = error.meta?.constraint ?? 'desconhecida';
              throw new NotFoundException(
                `Registro relacionado não encontrado na condição: ${notFoundConstraint}.`,
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
              const parentName = error.meta?.parent_name ?? 'desconhecido';
              const childName = error.meta?.child_name ?? 'desconhecido';
              throw new BadRequestException(
                `A mudança violaria a relação obrigatória '${relationName}' entre os modelos '${parentName}' e '${childName}'.`,
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
            default:
              throw new BadRequestException(
                `Erro ao atualizar registro: ${error.message} (Código: ${error.code})`,
              );
          }
        }
        throw new InternalServerErrorException(
          'Erro inesperado ao atualizar registro.',
        );
      }
    }
  
    async delete(id: string | number): Promise<T> {
      try {
        return await this.model.delete({
          where: { id },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          switch (error.code) {
            case 'P2025': {
              const cause = error.meta?.cause ?? 'desconhecida';
              throw new NotFoundException(
                `Registro para deleção não encontrado: ${cause}.`,
              );
            }
            case 'P2003': {
              const fieldName = error.meta?.field_name ?? 'desconhecido';
              throw new BadRequestException(
                `Violação de chave estrangeira no campo: ${fieldName}.`,
              );
            }
            case 'P2004': {
              const reason = error.meta?.reason ?? 'desconhecida';
              throw new ForbiddenException(
                `Restrições de banco de dados violadas: ${reason}.`,
              );
            }
            case 'P2014': {
              const relationName = error.meta?.relation_name ?? 'desconhecida';
              const parentName = error.meta?.parent_name ?? 'desconhecido';
              const childName = error.meta?.child_name ?? 'desconhecido';
              throw new BadRequestException(
                `A deleção violaria a relação obrigatória '${relationName}' entre os modelos '${parentName}' e '${childName}'.`,
              );
            }
            default:
              throw new BadRequestException(
                `Erro ao deletar registro: ${error.message} (Código: ${error.code})`,
              );
          }
        }
        throw new InternalServerErrorException(
          'Erro inesperado ao deletar registro.',
        );
      }
    }
  
    async deleteMany(where: any): Promise<{ count: number }> {
      try {
        return await this.model.deleteMany({ where });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          switch (error.code) {
            case 'P2003': {
              const fieldName = error.meta?.field_name ?? 'desconhecido';
              throw new BadRequestException(
                `Violação de chave estrangeira no campo: ${fieldName}.`,
              );
            }
            case 'P2004': {
              const reason = error.meta?.reason ?? 'desconhecida';
              throw new ForbiddenException(
                `Restrições de banco de dados violadas: ${reason}.`,
              );
            }
            case 'P2014': {
              const relationName = error.meta?.relation_name ?? 'desconhecida';
              const parentName = error.meta?.parent_name ?? 'desconhecido';
              const childName = error.meta?.child_name ?? 'desconhecido';
              throw new BadRequestException(
                `A deleção violaria a relação obrigatória '${relationName}' entre os modelos '${parentName}' e '${childName}'.`,
              );
            }
            case 'P2025': {
              const cause = error.meta?.cause ?? 'desconhecida';
              throw new NotFoundException(
                `Registros para deleção não encontrados: ${cause}.`,
              );
            }
            default:
              throw new BadRequestException(
                `Erro ao deletar registros: ${error.message} (Código: ${error.code})`,
              );
          }
        }
        throw new BadRequestException('Erro ao deletar registros.');
      }
    }
  
    async softDelete(id: string | number): Promise<T> {
      try {
        return await this.model.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          switch (error.code) {
            case 'P2025': {
              const cause = error.meta?.cause ?? 'desconhecida';
              throw new NotFoundException(
                `Registro para deleção não encontrado: ${cause}.`,
              );
            }
            default:
              throw new InternalServerErrorException(
                `Erro ao deletar registro: ${error.message} (Código: ${error.code})`,
              );
          }
        }
        throw new InternalServerErrorException('Erro ao deletar registro.');
      }
    }
  
    async softDeleteMany(where: any): Promise<{ count: number }> {
      try {
        return await this.model.updateMany({
          where,
          data: { deletedAt: new Date() },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          switch (error.code) {
            case 'P2025': {
              const cause = error.meta?.cause ?? 'desconhecida';
              throw new NotFoundException(
                `Registros para deleção não encontrados: ${cause}.`,
              );
            }
            default:
              throw new InternalServerErrorException(
                `Erro ao deletar registros: ${error.message} (Código: ${error.code})`,
              );
          }
        }
        throw new InternalServerErrorException('Erro ao deletar registros.');
      }
    }
  
    async upsert(where: any, create: any, update: any): Promise<T> {
      try {
        return await this.model.upsert({
          where,
          create,
          update,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          switch (error.code) {
            case 'P2002': {
              const targetFields =
                (error.meta?.target as string[] | undefined)?.join(', ') ??
                'desconhecido';
              const uniqueConstraint = error.meta?.constraint ?? 'desconhecida';
              throw new ConflictException(
                `Registro duplicado. Violação de constraint única "${uniqueConstraint}" nos campos: ${targetFields}.`,
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
            case 'P2001': {
              const notFoundConstraint = error.meta?.constraint ?? 'desconhecida';
              throw new NotFoundException(
                `Registro relacionado não encontrado na condição: ${notFoundConstraint}.`,
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
              const parentName = error.meta?.parent_name ?? 'desconhecido';
              const childName = error.meta?.child_name ?? 'desconhecido';
              throw new BadRequestException(
                `A mudança violaria a relação obrigatória '${relationName}' entre os modelos '${parentName}' e '${childName}'.`,
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
            default:
              throw new BadRequestException(
                `Erro ao criar ou atualizar registro: ${error.message} (Código: ${error.code})`,
              );
          }
        }
        throw new InternalServerErrorException(
          'Erro inesperado ao criar ou atualizar registro.',
        );
      }
    }
  
    async exists(where: any): Promise<boolean> {
      try {
        const count = await this.model.count({ where });
        return count > 0;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw new InternalServerErrorException(
            `Erro ao verificar existência do registro: ${error.message} (Código: ${error.code})`,
          );
        }
        throw new InternalServerErrorException(
          'Erro ao verificar existência do registro.',
        );
      }
    }
  
    async count(where?: any): Promise<number> {
      try {
        return await this.model.count({ where });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw new InternalServerErrorException(
            `Erro ao contar registros: ${error.message} (Código: ${error.code})`,
          );
        }
        throw new InternalServerErrorException('Erro ao contar registros.');
      }
    }
  }