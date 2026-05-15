// src/modules/notificacoes/notificacoes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoNotificacao } from '@prisma/client';
import { NotificacaoRepository } from './notificacao.repository';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';

@Injectable()
export class NotificacoesService {
  constructor(private readonly notificacaoRepository: NotificacaoRepository) {}

  async create(userId: string, dto: CreateNotificacaoDto) {
    return this.notificacaoRepository.create({
      userId,
      tipo: dto.tipo as TipoNotificacao,
      titulo: dto.titulo,
      mensagem: dto.mensagem,
      lida: false,
    });
  }

  async findAll(
    userId: string,
    page?: number,
    limit?: number,
    apenasNaoLidas?: boolean,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [data, total, naoLidas] = await Promise.all([
      this.notificacaoRepository.findByUser(userId, apenasNaoLidas, skip, limitNum),
      this.notificacaoRepository.countByUser(userId),
      this.notificacaoRepository.countNaoLidas(userId),
    ]);

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      naoLidas,
      mensagem: `Você tem ${naoLidas} ${naoLidas === 1 ? 'notificação não lida' : 'notificações não lidas'}`,
    };
  }

  async markAsRead(userId: string, id: string) {
    const notificacao = await this.notificacaoRepository.findByIdAndUser(id, userId);

    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notificacao.lida) return notificacao;

    return this.notificacaoRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificacaoRepository.markAllAsRead(userId);
    return { count: result.count };
  }

  async delete(userId: string, id: string) {
    const notificacao = await this.notificacaoRepository.findByIdAndUser(id, userId);

    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }

    return this.notificacaoRepository.delete(id);
  }

  async deleteAllRead(userId: string) {
    const result = await this.notificacaoRepository.deleteAllRead(userId);
    return { count: result.count };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificacaoRepository.countNaoLidas(userId);
  }

  async getStats(userId: string) {
    const stats = await this.notificacaoRepository.getStats(userId);

    const totalPorTipo = Object.entries(stats.totalPorTipo).map(([tipo, count]) => ({
      tipo,
      _count: count,
    }));

    return {
      totalPorTipo,
      ultimasSemana: stats.ultimasSemana,
      totalNaoLidas: stats.naoLidas,
      totalNotificacoes: stats.total,
    };
  }
}