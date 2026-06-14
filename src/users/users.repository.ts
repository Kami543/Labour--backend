import { Injectable, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { BaseRepository } from '../common/utils/baseRepository';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  private readonly logger = new Logger(UserRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.user;
  }

  // ✅ Usando findUnique para campos únicos (mais rápido)
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.model.findUnique({
        where: { email },
      });
    } catch (error) {
      this.handlePrismaError(error, 'buscar usuário por email');
    }
  }

  async findByCpf(cpf: string): Promise<User | null> {
    try {
      return await this.model.findUnique({
        where: { cpf },
      });
    } catch (error) {
      this.handlePrismaError(error, 'buscar usuário por CPF');
    }
  }

  async emailExists(email: string): Promise<boolean> {
    try {
      const user = await this.model.findUnique({
        where: { email },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      this.handlePrismaError(error, 'verificar existência de email');
    }
  }

  async cpfExists(cpf: string): Promise<boolean> {
    try {
      const user = await this.model.findUnique({
        where: { cpf },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      this.handlePrismaError(error, 'verificar existência de CPF');
    }
  }

  async countPedidos(userId: string): Promise<number> {
    try {
      return await this.prisma.pedido.count({
        where: { userId },
      });
    } catch (error) {
      this.handlePrismaError(error, 'contar pedidos do usuário');
    }
  }

  async countCarrinho(userId: string): Promise<number> {
    try {
      return await this.prisma.cartItem.count({
        where: { userId },
      });
    } catch (error) {
      this.handlePrismaError(error, 'contar itens do carrinho');
    }
  }

  async countNotificacoesNaoLidas(userId: string): Promise<number> {
    try {
      return await this.prisma.notificacao.count({
        where: { userId, lida: false },
      });
    } catch (error) {
      this.handlePrismaError(error, 'contar notificações não lidas');
    }
  }

  async findPedidosByUserId(userId: string) {
    try {
      return await this.prisma.pedido.findMany({
        where: { userId },
        include: {
          itens: {
            include: {
              produto: {
                include: {
                  imagens: {
                    where: { isPrincipal: true },
                    take: 1,
                    select: { url: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handlePrismaError(error, 'buscar pedidos do usuário');
    }
  }

  async findCarrinhoByUserId(userId: string) {
    try {
      return await this.prisma.cartItem.findMany({
        where: { userId },
        include: { 
          produto: {
            include: {
              imagens: {
                where: { isPrincipal: true },
                take: 1,
                select: { url: true }
              }
            }
          }
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'buscar carrinho do usuário');
    }
  }

  async findNotificacoesByUserId(userId: string, lidas: boolean = false) {
    try {
      return await this.prisma.notificacao.findMany({
        where: { userId, lida: lidas },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handlePrismaError(error, 'buscar notificações do usuário');
    }
  }

  async updateLastLogin(id: string, ip: string) {
    try {
      return await this.model.update({
        where: { id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip,
          failedLoginAttempts: 0
        }
      });
    } catch (error) {
      this.handlePrismaError(error, 'atualizar último login');
    }
  }

  async incrementFailedAttempts(id: string) {
    try {
      return await this.model.update({
        where: { id },
        data: {
          failedLoginAttempts: { increment: 1 }
        }
      });
    } catch (error) {
      this.handlePrismaError(error, 'incrementar tentativas falhas');
    }
  }

  async lockUser(id: string, durationMinutes: number = 30) {
    try {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + durationMinutes);
      
      return await this.model.update({
        where: { id },
        data: {
          lockedUntil,
          failedLoginAttempts: 0
        }
      });
    } catch (error) {
      this.handlePrismaError(error, 'bloquear usuário');
    }
  }

  async enableTwoFactor(id: string, secret: string) {
    try {
      return await this.model.update({
        where: { id },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret
        }
      });
    } catch (error) {
      this.handlePrismaError(error, 'ativar 2FA');
    }
  }

  async disableTwoFactor(id: string) {
    try {
      return await this.model.update({
        where: { id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null
        }
      });
    } catch (error) {
      this.handlePrismaError(error, 'desativar 2FA');
    }
  }

  async findWithPedidos(id: string) {
    try {
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
                      imagens: {
                        where: { isPrincipal: true },
                        take: 1,
                        select: { url: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }
      
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handlePrismaError(error, 'buscar usuário com pedidos');
    }
  }

  // ✅ CORRIGIDO: getDashboardStats - usando userId corretamente
  async getDashboardStats(userId: string) {
    try {
      const [pedidosCount, carrinhoCount, notificacoesCount, ultimoPedido, user] = await Promise.all([
        this.countPedidos(userId),
        this.countCarrinho(userId),
        this.countNotificacoesNaoLidas(userId),
        this.prisma.pedido.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, total: true, status: true }
        }),
        this.findById(userId) // Busca o usuário para obter o createdAt
      ]);

      return {
        pedidosCount,
        carrinhoCount,
        notificacoesCount,
        ultimoPedido,
        membroDesde: user?.createdAt // Usa o createdAt do usuário encontrado
      };
    } catch (error) {
      this.handlePrismaError(error, 'buscar estatísticas do dashboard');
    }
  }
}