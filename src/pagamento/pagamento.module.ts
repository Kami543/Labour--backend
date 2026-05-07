import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PagamentoController } from './pagamento.controller';
import { PagamentoService } from './services/pagamento.service';
import { PixService } from './services/pix.service';
import { AntiFraudeService } from './services/antifraude.service';
import { MercadoPagoGateway } from './gateway/mercadopago.gateway';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule, // Para acessar variáveis de ambiente no MercadoPagoGateway
    PrismaModule,
    NotificacoesModule,
  ],
  controllers: [PagamentoController],
  providers: [
    PagamentoService,
    PixService,
    AntiFraudeService,
    MercadoPagoGateway,
  ],
  exports: [PagamentoService, PixService],
})
export class PagamentoModule {}