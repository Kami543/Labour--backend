// src/modules/notificacoes/notificacao.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Notificacao } from '@prisma/client';
import { TipoNotificacao } from '@prisma/client';
import { BaseRepository } from '../common/utils/baseRepository';

@Injectable()
export class NotificacaoRepository extends BaseRepository<Notificacao> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.notificacao;
  }

  async findByUser(userId: string, page?: number, limit?: number, apenasNaoLidas?: boolean) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;
    const where = { userId, ...(apenasNaoLidas && { lida: false }) };

    return this.model.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByIdAndUser(id: string, userId: string) {
    return this.model.findFirst({
      where: { id, userId }
    });
  }

  async createNotificacao(data: {
    userId: string;
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
  }) {
    return this.model.create({ data });
  }

  async markAsRead(id: string) {
    return this.model.update({
      where: { id },
      data: { lida: true }
    });
  }

  async markAllAsRead(userId: string) {
    return this.model.updateMany({
      where: { userId, lida: false },
      data: { lida: true }
    });
  }

  async countNaoLidas(userId: string): Promise<number> {
    return this.model.count({
      where: { userId, lida: false }
    });
  }

  async countByUser(userId: string): Promise<number> {
    return this.model.count({ where: { userId } });
  }

  async deleteAllRead(userId: string) {
    return this.model.deleteMany({
      where: { userId, lida: true }
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.model.delete({
      where: { id }
    });
  }
  
  async bulkCreate(notificacoes: Array<{
    userId: string;
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
  }>) {
    return this.prisma.$transaction(
      notificacoes.map(notificacao => this.model.create({ data: notificacao }))
    );
  }

  async getStats(userId: string) {
    const totalPorTipo = await this.model.groupBy({
      by: ['tipo'],
      where: { userId },
      _count: { tipo: true }
    });

    const ultimasSemana = await this.model.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    return { totalPorTipo, ultimasSemana };
  }
}