import { Injectable, ConflictException, Logger } from '@nestjs/common';
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
      this.handlePrismaError(error);
    }
  }

  async findByCpf(cpf: string): Promise<User | null> {
    try {
      return await this.model.findUnique({
        where: { cpf },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async emailExists(email: string): Promise<boolean> {
    try {
      const user = await this.model.findUnique({
        where: { email },
        select: { id: true }, // só seleciona o ID (mais leve)
      });
      return !!user;
    } catch (error) {
      this.handlePrismaError(error);
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
      this.handlePrismaError(error);
    }
  }

  async countPedidos(userId: string): Promise<number> {
    try {
      return await this.prisma.pedido.count({
        where: { userId },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async countCarrinho(userId: string): Promise<number> {
    try {
      return await this.prisma.cartItem.count({
        where: { userId },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async countNotificacoesNaoLidas(userId: string): Promise<number> {
    try {
      return await this.prisma.notificacao.count({
        where: { userId, lida: false },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findPedidosByUserId(userId: string) {
    try {
      return await this.prisma.pedido.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findCarrinhoByUserId(userId: string) {
    try {
      return await this.prisma.cartItem.findMany({
        where: { userId },
        include: { produto: true },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findNotificacoesByUserId(userId: string, lidas: boolean = false) {
    try {
      return await this.prisma.notificacao.findMany({
        where: { userId, lida: lidas },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  // 👇 Tratamento centralizado do erro P2024
  private handlePrismaError(error: any): never {
    if (error?.code === 'P2024') {
      this.logger.error('Timeout na conexão com o banco de dados (P2024)');
      throw new ConflictException(
        'O servidor está temporariamente ocupado. Por favor, tente novamente em alguns instantes.',
      );
    }
    throw error;
  }
}