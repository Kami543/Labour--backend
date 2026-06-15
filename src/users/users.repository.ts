// src/users/users.repository.ts - VERSÃO CORRIGIDA
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
    if (!email) return null;
    return this.model.findUnique({ where: { email } });
  }

  async findByCpf(cpf: string): Promise<User | null> {
    if (!cpf) return null;
    return this.model.findUnique({ where: { cpf } });
  }

  // ✅ CORRIGIDO - Retorna User[] completo
  async findByRole(role: string, limit?: number): Promise<User[]> {
    const take = limit ? Math.min(limit, 200) : undefined;
    return this.model.findMany({ 
      where: { role: role as any },
      take
    });
  }

  // ✅ CORRIGIDO - Retorna User[] completo
  async findAllAdmins(limit?: number): Promise<User[]> {
    const take = limit ? Math.min(limit, 100) : undefined;
    return this.model.findMany({ 
      where: { role: 'ADMIN' },
      take
    });
  }

  // ✅ CORRIGIDO - Retorna User[] completo
  async findAllClients(limit?: number): Promise<User[]> {
    const take = limit ? Math.min(limit, 200) : undefined;
    return this.model.findMany({ 
      where: { role: 'USER' },
      take
    });
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
    if (!ids || ids.length === 0) return [];
    return this.model.findMany({ 
      where: { id: { in: ids } },
      take: 100
    });
  }

  async emailExists(email: string): Promise<boolean> {
    return this.exists({ email });
  }

  async cpfExists(cpf: string): Promise<boolean> {
    return this.exists({ cpf });
  }

  async countByRole(role: string): Promise<number> {
    return this.prisma.user.count({ where: { role: role as any } });
  }

  async countPedidos(userId: string): Promise<number> {
    if (!userId) return 0;
    return this.prisma.pedido.count({ where: { userId } });
  }

  async countCarrinho(userId: string): Promise<number> {
    if (!userId) return 0;
    return this.prisma.cartItem.count({ where: { userId } });
  }

  async countNotificacoesNaoLidas(userId: string): Promise<number> {
    if (!userId) return 0;
    return this.prisma.notificacao.count({ where: { userId, lida: false } });
  }

  async findPedidosByUserId(userId: string, page: number = 1, limit: number = 10) {
    if (!userId) return [];
    const safeLimit = Math.min(limit, 50);
    const skip = (Math.max(1, page) - 1) * safeLimit;
    
    return this.prisma.pedido.findMany({
      where: { userId },
      skip,
      take: safeLimit,
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

  async findCarrinhoByUserId(userId: string, limit?: number): Promise<any> {
    if (!userId) return [];
    const take = limit ? Math.min(limit, 100) : undefined;
    
    return this.prisma.cartItem.findMany({
      where: { userId },
      take,
      include: { 
        produto: {
          include: {
            imagens: { where: { isPrincipal: true }, take: 1, select: { url: true } }
          }
        }
      },
    });
  }

  async findNotificacoesByUserId(userId: string, lidas: boolean = false, page: number = 1, limit: number = 20) {
    if (!userId) return [];
    const safeLimit = Math.min(limit, 50);
    const skip = (Math.max(1, page) - 1) * safeLimit;
    
    return this.prisma.notificacao.findMany({
      where: { userId, lida: lidas },
      skip,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLastLogin(id: string, ip: string) {
    if (!id) throw new Error('ID obrigatório');
    return this.model.update({
      where: { id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip, failedLoginAttempts: 0 }
    });
  }

  async incrementFailedAttempts(id: string) {
    if (!id) throw new Error('ID obrigatório');
    return this.model.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } }
    });
  }

  async lockUser(id: string, durationMinutes: number = 30) {
    if (!id) throw new Error('ID obrigatório');
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + Math.min(durationMinutes, 1440));
    return this.model.update({
      where: { id },
      data: { lockedUntil, failedLoginAttempts: 0 }
    });
  }

  async enableTwoFactor(id: string, secret: string) {
    if (!id || !secret) throw new Error('ID e secret obrigatórios');
    return this.model.update({
      where: { id },
      data: { twoFactorEnabled: true, twoFactorSecret: secret }
    });
  }

  async disableTwoFactor(id: string) {
    if (!id) throw new Error('ID obrigatório');
    return this.model.update({
      where: { id },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });
  }

  async findWithPedidos(id: string, limit: number = 10) {
    if (!id) throw new NotFoundException('ID obrigatório');
    const safeLimit = Math.min(limit, 20);
    
    const user = await this.model.findUnique({
      where: { id },
      include: {
        pedidos: {
          orderBy: { createdAt: 'desc' },
          take: safeLimit,
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
    if (!userId) return null;
    
    const [pedidosCount, carrinhoCount, notificacoesCount, ultimoPedido, user] = await Promise.all([
      this.countPedidos(userId),
      this.countCarrinho(userId),
      this.countNotificacoesNaoLidas(userId),
      this.prisma.pedido.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, total: true, status: true }
      }),
      this.findById(userId).catch(() => null)
    ]);

    return { 
      pedidosCount, 
      carrinhoCount, 
      notificacoesCount, 
      ultimoPedido, 
      membroDesde: user?.createdAt 
    };
  }
}