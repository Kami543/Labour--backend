// src/modules/notificacoes/notificacoes.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificacaoRepository } from './notificacao.repository';
import { CreateNotificacaoDto } from './dto/create-notificacao.dto';
import { TipoNotificacao } from '@prisma/client';

@Injectable()
export class NotificacoesService {
  constructor(
    private notificacaoRepository: NotificacaoRepository,
  ) {}

  async create(userId: string, createDto: CreateNotificacaoDto) {
    return this.notificacaoRepository.createNotificacao({
      userId,
      tipo: createDto.tipo as TipoNotificacao,
      titulo: createDto.titulo,
      mensagem: createDto.mensagem,
    });
  }

  async findAll(userId: string, page?: number, limit?: number, apenasNaoLidas?: boolean) {
    const [data, total, naoLidas] = await Promise.all([
      this.notificacaoRepository.findByUser(userId, page, limit, apenasNaoLidas),
      this.notificacaoRepository.countByUser(userId),
      this.notificacaoRepository.countNaoLidas(userId),
    ]);

    return {
      data,
      total,
      page: page || 1,
      limit: limit || 20,
      naoLidas,
      mensagem: `Você tem ${naoLidas} ${naoLidas === 1 ? 'notificação não lida' : 'notificações não lidas'}`
    };
  }

  async markAsRead(userId: string, id: string) {
    // Primeiro verifica se a notificação pertence ao usuário
    const notificacao = await this.notificacaoRepository.findByIdAndUser(id, userId);
    
    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notificacao.lida) {
      return notificacao; // Já está lida
    }

    return this.notificacaoRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<{ count: number; message: string }> {
    const result = await this.notificacaoRepository.markAllAsRead(userId);
    
    // O resultado do updateMany retorna { count: number }
    const count = result.count || 0;
    
    return {
      count,
      message: `${count} ${count === 1 ? 'notificação foi' : 'notificações foram'} marcada${count === 1 ? '' : 's'} como lida${count === 1 ? '' : 's'}`
    };
  }

  async delete(userId: string, id: string) {
    // Verifica se a notificação pertence ao usuário
    const notificacao = await this.notificacaoRepository.findByIdAndUser(id, userId);
    
    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }

    return this.notificacaoRepository.delete(id);
  }

  async deleteAllRead(userId: string): Promise<{ count: number; message: string }> {
    const result = await this.notificacaoRepository.deleteAllRead(userId);
    
    // O resultado do deleteMany retorna { count: number }
    const count = result.count || 0;
    
    return {
      count,
      message: `${count} ${count === 1 ? 'notificação lida foi' : 'notificações lidas foram'} removida${count === 1 ? '' : 's'}`
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificacaoRepository.countNaoLidas(userId);
  }

  async getStats(userId: string) {
    const stats = await this.notificacaoRepository.getStats(userId);
    const totalNaoLidas = await this.getUnreadCount(userId);
    
    return {
      ...stats,
      totalNaoLidas
    };
  }
}