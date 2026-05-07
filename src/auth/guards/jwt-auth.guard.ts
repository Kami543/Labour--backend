import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Adicione lógica personalizada aqui se necessário
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Se houver erro ou o usuário não existir, lança uma exceção de não autorizado
    if (err || !user) {
      throw err || new UnauthorizedException('Você precisa estar logado para acessar este recurso');
    }
    return user;
  }
}