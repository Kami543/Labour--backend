import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hora

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey',
    });
  }

  async validate(payload: any) {
    const cacheKey = `user:${payload.sub}`;
    let user = cache.get<{ id: string; email: string; nome: string; role: string }>(cacheKey);

    if (!user) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, nome: true, role: true },
      });
      if (dbUser) {
        user = dbUser;
        cache.set(cacheKey, user);
      }
    }

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado ou token inválido');
    }

    return {
      sub: user.id,
      userId: user.id, 
      email: user.email,
      role: user.role,
      nome: user.nome,
    };
  }
}