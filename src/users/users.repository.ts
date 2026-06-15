// src/users/users.repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
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
    return this.model.findUnique({ where: { email } });
  }

  async findByCpf(cpf: string): Promise<User | null> {
    return this.model.findUnique({ where: { cpf } });
  }

  async findByRole(role: string): Promise<User[]> {
    return this.model.findMany({ where: { role: role as any } });
  }

  async findAllAdmins(): Promise<User[]> {
    return this.model.findMany({ where: { role: 'ADMIN' } });
  }

  async findAllClients(): Promise<User[]> {
    return this.model.findMany({ where: { role: 'USER' } });
  }

  async findActiveUsers(): Promise<User[]> {
    return this.model.findMany({
      where: {
        OR: [
          { lockedUntil: null },
          { lockedUntil: { lt: new Date() } }
        ]
      },
    });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return this.model.findMany({ where: { id: { in: ids } } });
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.model.findUnique({ where: { email }, select: { id: true } });
    return !!user;
  }

  async cpfExists(cpf: string): Promise<boolean> {
    const user = await this.model.findUnique({ where: { cpf }, select: { id: true } });
    return !!user;
  }

  async countByRole(role: string): Promise<number> {
    return this.prisma.user.count({ where: { role: role as any } });
  }

  async countPedidos(userId: string): Promise<number> {
    return this.prisma.pedido.count({ where: { userId } });
  }

  async countCarrinho(userId: string): Promise<number> {
    return this.prisma.cartItem.count({ where: { userId } });
  }

  async countNotificacoesNaoLidas(userId: string): Promise<number> {
    return this.prisma.notificacao.count({ where: { userId, lida: false } });
  }

  async findPedidosByUserId(userId: string) {
    return this.prisma.pedido.findMany({
      where: { userId },
      include: {
        itens: {
          include: {
            produto: {
              include: {
                imagens: { where: { isPrincipal: true }, take: 1, select: { url: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCarrinhoByUserId(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: { 
        produto: {
          include: {
            imagens: { where: { isPrincipal: true }, take: 1, select: { url: true } }
          }
        }
      },
    });
  }

  async findNotificacoesByUserId(userId: string, lidas: boolean = false) {
    return this.prisma.notificacao.findMany({
      where: { userId, lida: lidas },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLastLogin(id: string, ip: string) {
    return this.model.update({
      where: { id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip, failedLoginAttempts: 0 }
    });
  }

  async incrementFailedAttempts(id: string) {
    return this.model.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } }
    });
  }

  async lockUser(id: string, durationMinutes: number = 30) {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + durationMinutes);
    return this.model.update({
      where: { id },
      data: { lockedUntil, failedLoginAttempts: 0 }
    });
  }

  async enableTwoFactor(id: string, secret: string) {
    return this.model.update({
      where: { id },
      data: { twoFactorEnabled: true, twoFactorSecret: secret }
    });
  }

  async disableTwoFactor(id: string) {
    return this.model.update({
      where: { id },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });
  }

  async findWithPedidos(id: string) {
    const user = await this.model.findUnique({
      where: { id },
      include: {
        pedidos: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            itens: {
              include: {
                produto: {
                  include: {
                    imagens: { where: { isPrincipal: true }, take: 1, select: { url: true } }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async getDashboardStats(userId: string) {
    const [pedidosCount, carrinhoCount, notificacoesCount, ultimoPedido, user] = await Promise.all([
      this.countPedidos(userId),
      this.countCarrinho(userId),
      this.countNotificacoesNaoLidas(userId),
      this.prisma.pedido.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, total: true, status: true }
      }),
      this.findById(userId)
    ]);

    return { pedidosCount, carrinhoCount, notificacoesCount, ultimoPedido, membroDesde: user?.createdAt };
  }
}