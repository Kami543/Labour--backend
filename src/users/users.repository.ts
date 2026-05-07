// user/repositories/user.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { BaseRepository } from '../common/utils/baseRepository';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.model.findFirst({
      where: { email },
    });
  }

  async findByCpf(cpf: string): Promise<User | null> {
    return this.model.findFirst({
      where: { cpf },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.model.findFirst({
      where: { email },
    });
    return !!user;
  }

  async cpfExists(cpf: string): Promise<boolean> {
    const user = await this.model.findFirst({
      where: { cpf },
    });
    return !!user;
  }

  async countPedidos(userId: string): Promise<number> {
    return this.prisma.pedido.count({
      where: { userId },
    });
  }

  async countCarrinho(userId: string): Promise<number> {
    return this.prisma.cartItem.count({
      where: { userId },
    });
  }

  async countNotificacoesNaoLidas(userId: string): Promise<number> {
    return this.prisma.notificacao.count({
      where: {
        userId,
        lida: false,
      },
    });
  }

  async findPedidosByUserId(userId: string) {
    return this.prisma.pedido.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCarrinhoByUserId(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: { produto: true },
    });
  }

  async findNotificacoesByUserId(userId: string, lidas: boolean = false) {
    return this.prisma.notificacao.findMany({
      where: {
        userId,
        lida: lidas,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}