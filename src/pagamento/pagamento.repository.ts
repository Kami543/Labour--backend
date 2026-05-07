import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetodoPagamento, TipoPagamento } from '@prisma/client';
import { BaseRepository } from '../common/utils/baseRepository';

@Injectable()
export class PagamentoRepository extends BaseRepository<MetodoPagamento> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.metodoPagamento;
  }

  async findByUser(userId: string) {
    return this.model.findMany({
      where: { userId },
      orderBy: { pagamentoDefault: 'desc' },
    });
  }

  async findByIdAndUser(id: string, userId: string) {
    return this.model.findFirst({
      where: { id, userId },
    });
  }

  async findDefaultByUser(userId: string) {
    return this.model.findFirst({
      where: { userId, pagamentoDefault: true },
    });
  }

  async createMetodo(data: {
    userId: string;
    tipo: TipoPagamento;          // ← era "string", agora é o enum correto
    ultimosDigitos?: string;
    pagamentoDefault?: boolean;
  }) {
    return this.model.create({ data });
  }

  async updateDefault(id: string, isDefault: boolean) {
    return this.model.update({
      where: { id },
      data: { pagamentoDefault: isDefault },
    });
  }

  async removeAllDefaults(userId: string) {
    return this.model.updateMany({
      where: { userId, pagamentoDefault: true },
      data: { pagamentoDefault: false },
    });
  }

  async deleteByIdAndUser(id: string, userId: string) {
    return this.model.deleteMany({
      where: { id, userId },
    });
  }
}