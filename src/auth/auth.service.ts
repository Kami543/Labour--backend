import { Injectable, UnauthorizedException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutos

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    try {
      const userExists = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (userExists) throw new ConflictException('E-mail já cadastrado');

      const hashedPassword = await bcrypt.hash(data.senha, 10);
      const user = await this.prisma.user.create({
        data: {
          ...data,
          senha: hashedPassword,
          role: 'USER',
        },
      });
      return this.generateToken(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async login(data: LoginDto) {
    try {
      let user = cache.get<{ id: string; email: string; nome: string; senha: string; role: string }>(`user:${data.email}`);
      if (!user) {
        const dbUser = await this.prisma.user.findUnique({
          where: { email: data.email },
        });
        if (dbUser) {
          user = dbUser;
          cache.set(`user:${data.email}`, user);
        }
      }

      if (!user) throw new UnauthorizedException('Credenciais inválidas');

      const isPasswordValid = await bcrypt.compare(data.senha, user.senha);
      if (!isPasswordValid) throw new UnauthorizedException('Credenciais inválidas');

      return this.generateToken(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    };
  }

  private handlePrismaError(error: any) {
    if (error?.code === 'P2024') {
      throw new ServiceUnavailableException('Serviço temporariamente ocupado. Tente novamente.');
    }
    throw error;
  }
}