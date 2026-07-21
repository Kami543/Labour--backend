import { Module, forwardRef } from '@nestjs/common';
import { ProdutoController } from './produto.controller';
import { ProdutoService } from './produto.service';
import { ProdutoRepository } from './produto.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { UserModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificacoesModule),
    UserModule,
  ],
  controllers: [ProdutoController],
  providers: [ProdutoService, ProdutoRepository],
  exports: [ProdutoService, ProdutoRepository],
})
export class ProdutoModule {}