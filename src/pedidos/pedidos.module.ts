import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidoRepository } from './pedido.repository';
import { CartRepository } from '../cart/cart.repository';
import { ProdutoRepository } from '../produto/produto.repository';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { NotificacaoRepository } from '../notificacoes/notificacao.repository'; // Adicione esta importação
import { UserModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
  ],
  providers: [
    PedidosService,
    PedidoRepository,
    CartRepository,
    ProdutoRepository,
    NotificacoesService,
    NotificacaoRepository, 
  ],
  exports: [PedidosService],
})
export class PedidosModule {}