// src/modules/notificacoes/notificacao.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Notificacao, TipoNotificacao } from '@prisma/client';

@Injectable()
export class NotificacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get model() {
    return this.prisma.notificacao;
  }

  async create(data: {
    userId: string;
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
    lida?: boolean;
  }): Promise<Notificacao> {
    return this.model.create({ data });
  }

  async findByUser(
    userId: string,
    apenasNaoLidas?: boolean,
    skip = 0,
    take = 20,
  ): Promise<Notificacao[]> {
    const where: { userId: string; lida?: boolean } = { userId };
    if (apenasNaoLidas) where.lida = false;

    return this.model.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async countByUser(userId: string, apenasNaoLidas?: boolean): Promise<number> {
    const where: { userId: string; lida?: boolean } = { userId };
    if (apenasNaoLidas) where.lida = false;
    return this.model.count({ where });
  }

  async findByIdAndUser(id: string, userId: string): Promise<Notificacao | null> {
    return this.model.findFirst({ where: { id, userId } });
  }

  async countNaoLidas(userId: string): Promise<number> {
    return this.model.count({ where: { userId, lida: false } });
  }

  async markAsRead(id: string): Promise<Notificacao> {
    return this.model.update({
      where: { id },
      data: { lida: true },
    });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    return this.model.updateMany({
      where: { userId, lida: false },
      data: { lida: true },
    });
  }

  async delete(id: string): Promise<Notificacao> {
    return this.model.delete({ where: { id } });
  }

  async deleteAllRead(userId: string): Promise<{ count: number }> {
    return this.model.deleteMany({ where: { userId, lida: true } });
  }

  async bulkCreate(
    notificacoes: Array<{
      userId: string;
      tipo: TipoNotificacao;
      titulo: string;
      mensagem: string;
    }>,
  ): Promise<Notificacao[]> {
    return this.prisma.$transaction(
      notificacoes.map((n) => this.model.create({ data: n })),
    );
  }

  async getStats(userId: string): Promise<{
    total: number;
    naoLidas: number;
    ultimasSemana: number;
    totalPorTipo: Record<string, number>;
  }> {
    const umaSemanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, naoLidas, ultimasSemana, notificacoes] = await Promise.all([
      this.model.count({ where: { userId } }),
      this.model.count({ where: { userId, lida: false } }),
      this.model.count({
        where: { userId, createdAt: { gte: umaSemanaAtras } },
      }),
      this.model.findMany({
        where: { userId },
        select: { tipo: true },
      }),
    ]);

    const totalPorTipo = notificacoes.reduce<Record<string, number>>(
      (acc, { tipo }) => {
        acc[tipo] = (acc[tipo] ?? 0) + 1;
        return acc;
      },
      {},
    );

    return { total, naoLidas, ultimasSemana, totalPorTipo };
  }
}