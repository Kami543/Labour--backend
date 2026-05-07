import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PixService } from './pix.service';
import { MercadoPagoGateway } from '../gateway/mercadopago.gateway';
import { AntiFraudeService } from './antifraude.service';
import { NotificacoesService } from '../../notificacoes/notificacoes.service';
import { CreateMetodoPagamentoDto } from '../dto/create-metodo-pagamento.dto';
import { ProcessarPagamentoDto } from '../dto/processar-pagamento.dto';
import {
  GatewayPagamento,
  StatusTransacao,
  StatusPedido,
  TipoPagamento,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface PagamentoResponse {
  transacaoId: string;
  status: string;
  tipo: TipoPagamento;
  gateway: GatewayPagamento;
  valor: number;

  pix?: {
    qrCodeBase64: string;
    qrCodeSvg: string;
    copiaCola: string;
    txid: string;
    expiracao: string;
    linkPagamento: string; // deep link pix:// para apps bancários
  };

  boleto?: {
    url: string;
    codigoBarras: string;
    expiracao: string;
  };

  cartao?: {
    parcelas: number;
    valorParcela: number;
    bandeira: string;
    ultimosDigitos: string;
    receiptUrl?: string;
  };
}

@Injectable()
export class PagamentoService {
  private readonly logger = new Logger(PagamentoService.name);

  constructor(
    private prisma: PrismaService,
    private pixService: PixService,
    private mercadoPago: MercadoPagoGateway,
    private antiFraude: AntiFraudeService,
    private notificacoes: NotificacoesService,
  ) {}

  // ══════════════════════════════════════════════
  //  MÉTODOS DE PAGAMENTO SALVOS
  // ══════════════════════════════════════════════

  async createMetodoPagamento(userId: string, dto: CreateMetodoPagamentoDto) {
    if (dto.tipo === TipoPagamento.PIX && dto.pixKey) {
      const { valida } = this.pixService.validarChavePix(dto.pixKey);
      if (!valida) throw new BadRequestException('Chave PIX inválida.');
    }

    if (dto.pagamentoDefault) {
      await this.prisma.metodoPagamento.updateMany({
        where: { userId, pagamentoDefault: true },
        data: { pagamentoDefault: false },
      });
    }

    return this.prisma.metodoPagamento.create({
      data: {
        userId,
        tipo: dto.tipo,
        tokenCard: dto.tokenCard,
        tokenProvider: dto.tokenProvider,
        ultimosDigitos: dto.ultimosDigitos,
        pixKey: dto.pixKey,
        pagamentoDefault: dto.pagamentoDefault ?? false,
        deviceFingerprint: dto.deviceFingerprint,
      },
      select: {
        id: true,
        tipo: true,
        ultimosDigitos: true,
        pagamentoDefault: true,
        createdAt: true,
      },
    });
  }

  async findMetodosPagamento(userId: string) {
    return this.prisma.metodoPagamento.findMany({
      where: { userId },
      select: {
        id: true,
        tipo: true,
        ultimosDigitos: true,
        pagamentoDefault: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: [{ pagamentoDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updateMetodoPagamentoDefault(userId: string, id: string) {
    await this.assertOwnsMetodo(userId, id);

    await this.prisma.$transaction([
      this.prisma.metodoPagamento.updateMany({
        where: { userId, pagamentoDefault: true },
        data: { pagamentoDefault: false },
      }),
      this.prisma.metodoPagamento.update({
        where: { id },
        data: { pagamentoDefault: true },
      }),
    ]);

    return { mensagem: 'Método de pagamento padrão atualizado.' };
  }

  async deleteMetodoPagamento(userId: string, id: string) {
    const metodo = await this.assertOwnsMetodo(userId, id);

    if (metodo.pagamentoDefault) {
      throw new BadRequestException(
        'Não é possível remover o método padrão. Defina outro como padrão primeiro.',
      );
    }

    await this.prisma.metodoPagamento.delete({ where: { id } });
  }

  // ══════════════════════════════════════════════
  //  PROCESSAR PAGAMENTO — orquestrador principal
  // ══════════════════════════════════════════════

  async processarPagamento(userId: string, dto: ProcessarPagamentoDto): Promise<PagamentoResponse> {
    // 1. Valida pedido
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      include: {
        user: { select: { nome: true, email: true, cpf: true, endereco: true } },
      },
    });

    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    if (pedido.userId !== userId) throw new ForbiddenException('Acesso negado.');
    if (pedido.status !== 'pendente') {
      throw new ConflictException(`Pedido já está com status: ${pedido.status}.`);
    }

    const valor = Number(pedido.total);
    const idempotencyKey = `${pedido.id}-${dto.tipoPagamento}-${Date.now()}`;

    // 2. Análise anti-fraude
    const fraude = await this.antiFraude.analisar({
      userId,
      pedidoId: pedido.id,
      valor,
      ipAddress: dto.ipAddress,
      deviceFingerprint: dto.deviceFingerprint,
      tipoPagamento: dto.tipoPagamento,
    });

    if (!fraude.aprovado) {
      throw new ForbiddenException(
        `Transação bloqueada por análise de segurança: ${fraude.motivos.join('; ')}`,
      );
    }

    // 3. Cria transação pendente (idempotente)
    const transacao = await this.prisma.transacao.create({
      data: {
        transactionId: `PENDING-${uuidv4()}`,
        gateway: dto.gateway,
        tipo: dto.tipoPagamento,
        valor,
        status: StatusTransacao.AGUARDANDO_PAGAMENTO,
        pedidoId: pedido.id,
        userId,
        fraudScore: fraude.score,
        fraudAnalysis: fraude.analise as any,
        riskLevel: fraude.riskLevel,
        metadata: { idempotencyKey, deviceFingerprint: dto.deviceFingerprint },
      },
    });

    // 4. Despacha para o método de pagamento
    try {
      let resposta: PagamentoResponse;

      switch (dto.tipoPagamento) {
        case TipoPagamento.PIX:
          resposta = await this.processarPix(transacao.id, pedido, valor, dto, idempotencyKey);
          break;
        case TipoPagamento.BOLETO:
          resposta = await this.processarBoleto(transacao.id, pedido, valor, dto, idempotencyKey);
          break;
        case TipoPagamento.CARTAO_CREDITO:
        case TipoPagamento.CARTAO_DEBITO:
          resposta = await this.processarCartao(transacao.id, pedido, valor, dto, idempotencyKey);
          break;
        default:
          throw new BadRequestException(`Tipo de pagamento não suportado: ${dto.tipoPagamento}`);
      }

      // Registra device fingerprint após aprovação
      if (dto.deviceFingerprint && dto.ipAddress) {
        await this.antiFraude.registrarDevice({
          userId,
          fingerprint: dto.deviceFingerprint,
          ipAddress: dto.ipAddress,
          userAgent: '',
        });
      }

      return resposta;
    } catch (err) {
      await this.prisma.transacao.update({
        where: { id: transacao.id },
        data: { status: StatusTransacao.FALHOU },
      });
      throw err;
    }
  }

  // ══════════════════════════════════════════════
  //  PIX — QR Code + copia-e-cola + deep link
  // ══════════════════════════════════════════════

  private async processarPix(
    transacaoId: string,
    pedido: any,
    valor: number,
    dto: ProcessarPagamentoDto,
    idempotencyKey: string,
  ): Promise<PagamentoResponse> {
    const expiracaoMinutos = dto.pixExpiracaoMinutos ?? 30;

    let qrCodeBase64: string;
    let qrCodeSvg: string;
    let copiaCola: string;
    let txid: string;
    let expiracao: Date;
    let gatewayTransactionId: string;

    if (dto.gateway === GatewayPagamento.MERCADO_PAGO) {
      // MercadoPago gera o QR Code e o copia-e-cola automaticamente
      const mpResp = await this.mercadoPago.criarPagamentoPix({
        pedidoId: pedido.id,
        valor,
        nomeComprador: pedido.user.nome,
        emailComprador: pedido.user.email,
        cpfComprador: pedido.user.cpf,
        descricao: `Pedido #${pedido.numero}`,
        expiracaoMinutos,
        idempotencyKey,
      });

      copiaCola = mpResp.qrCodeText;
      expiracao = mpResp.expiracao;
      gatewayTransactionId = mpResp.transactionId;

      // Gera QR Code localmente (Base64 + SVG) a partir do copia-e-cola do MP
      const qrLocal = await this.pixService.gerarQrCodeFromPayload(copiaCola);
      qrCodeBase64 = qrLocal.base64;
      qrCodeSvg = qrLocal.svg;
      txid = mpResp.transactionId;
    } else {
      // PIX Direto: gera payload EMV com a chave da loja
      const chaveLoja = process.env.PIX_CHAVE_LOJA;
      if (!chaveLoja) throw new BadRequestException('Chave PIX da loja não configurada.');

      const pixResult = await this.pixService.gerarQrCode(
        {
          chave: chaveLoja,
          nomeRecebedor: process.env.PIX_NOME_RECEBEDOR || 'Loja',
          cidadeRecebedor: process.env.PIX_CIDADE_RECEBEDOR || 'SAO PAULO',
          valor,
          descricao: `Pedido ${pedido.numero}`,
        },
        expiracaoMinutos,
      );

      qrCodeBase64 = pixResult.qrCodeBase64;
      qrCodeSvg = pixResult.qrCodeSvg;
      copiaCola = pixResult.payload;
      txid = pixResult.txid;
      expiracao = pixResult.expiracao;
      gatewayTransactionId = txid;
    }

    await this.prisma.transacao.update({
      where: { id: transacaoId },
      data: {
        transactionId: gatewayTransactionId,
        pixQrCode: qrCodeBase64,
        pixQrCodeText: copiaCola,
        pixExpiration: expiracao,
      },
    });

    this.logger.log(`🔵 PIX gerado | pedido: ${pedido.numero} | expira: ${expiracao.toISOString()}`);

    return {
      transacaoId,
      status: 'AGUARDANDO_PAGAMENTO',
      tipo: TipoPagamento.PIX,
      gateway: dto.gateway,
      valor,
      pix: {
        qrCodeBase64,
        qrCodeSvg,
        copiaCola,
        txid,
        expiracao: expiracao.toISOString(),
        linkPagamento: `pix://${copiaCola}`, // deep link universal
      },
    };
  }

  // ══════════════════════════════════════════════
  //  BOLETO
  // ══════════════════════════════════════════════

  private async processarBoleto(
    transacaoId: string,
    pedido: any,
    valor: number,
    dto: ProcessarPagamentoDto,
    idempotencyKey: string,
  ): Promise<PagamentoResponse> {
    const mpResp = await this.mercadoPago.criarPagamentoBoleto({
      pedidoId: pedido.id,
      valor,
      nomeComprador: pedido.user.nome,
      emailComprador: pedido.user.email,
      cpfComprador: pedido.user.cpf,
      enderecoComprador: pedido.user.endereco,
      descricao: `Pedido #${pedido.numero}`,
      expiracaoDias: dto.boletoExpiracaoDias ?? 3,
      idempotencyKey,
    });

    await this.prisma.transacao.update({
      where: { id: transacaoId },
      data: {
        transactionId: mpResp.transactionId,
        boletoUrl: mpResp.boletoUrl,
        boletoBarcode: mpResp.boletoBarcode,
        boletoExpiration: mpResp.expiracao,
      },
    });

    this.logger.log(`🟡 Boleto gerado | pedido: ${pedido.numero}`);

    return {
      transacaoId,
      status: 'AGUARDANDO_PAGAMENTO',
      tipo: TipoPagamento.BOLETO,
      gateway: dto.gateway,
      valor,
      boleto: {
        url: mpResp.boletoUrl,
        codigoBarras: mpResp.boletoBarcode,
        expiracao: mpResp.expiracao.toISOString(),
      },
    };
  }

  // ══════════════════════════════════════════════
  //  CARTÃO CRÉDITO / DÉBITO
  // ══════════════════════════════════════════════

  private async processarCartao(
    transacaoId: string,
    pedido: any,
    valor: number,
    dto: ProcessarPagamentoDto,
    idempotencyKey: string,
  ): Promise<PagamentoResponse> {
    // Resolve token (avulso ou método salvo)
    let cardToken = dto.cardToken;

    if (!cardToken && dto.metodoPagamentoId) {
      const metodo = await this.prisma.metodoPagamento.findFirst({
        where: { id: dto.metodoPagamentoId, userId: pedido.userId },
      });
      if (!metodo?.tokenCard) throw new BadRequestException('Token do cartão não encontrado.');
      cardToken = metodo.tokenCard;

      await this.prisma.metodoPagamento.update({
        where: { id: dto.metodoPagamentoId },
        data: { lastUsedAt: new Date() },
      });
    }

    if (!cardToken) throw new BadRequestException('Token do cartão é obrigatório.');

    const mpResp = await this.mercadoPago.criarPagamentoCartao({
      pedidoId: pedido.id,
      valor,
      nomeComprador: pedido.user.nome,
      emailComprador: pedido.user.email,
      cpfComprador: pedido.user.cpf,
      cardToken,
      parcelas: dto.parcelas ?? 1,
      descricao: `Pedido #${pedido.numero}`,
      tipo: dto.tipoPagamento,
      idempotencyKey,
    });

    const statusFinal =
      mpResp.status === 'approved' ? StatusTransacao.PAGO : StatusTransacao.FALHOU;
    const valorParcela = valor / (dto.parcelas ?? 1);

    // Atualiza transação + pedido + cria pagamento em uma transação atômica
    await this.prisma.$transaction([
      this.prisma.transacao.update({
        where: { id: transacaoId },
        data: {
          transactionId: mpResp.transactionId,
          status: statusFinal,
          cardBrand: mpResp.bandeira,
          installmentCount: dto.parcelas ?? 1,
          installmentValue: valorParcela,
          paidAt: statusFinal === StatusTransacao.PAGO ? new Date() : null,
        },
      }),
      ...(statusFinal === StatusTransacao.PAGO
        ? [
            this.prisma.pedido.update({
              where: { id: pedido.id },
              data: {
                status: StatusPedido.pagamento_confirmado,
                dataPagamento: new Date(),
              },
            }),
            this.prisma.pagamento.create({
              data: {
                transacaoId,
                pedidoId: pedido.id,
                userId: pedido.userId,
                valor,
                tipo: dto.tipoPagamento,
                status: StatusTransacao.PAGO,
                gateway: dto.gateway,
                receiptUrl: mpResp.receiptUrl,
              },
            }),
          ]
        : []),
    ]);

    if (statusFinal === StatusTransacao.PAGO) {
      await this.notificacoes.create(pedido.userId, {
        tipo: 'pagamento',
        titulo: 'Pagamento aprovado! ✅',
        mensagem: `Seu pedido #${pedido.numero} foi pago com sucesso.`,
      });
      this.logger.log(`🟢 Cartão aprovado | pedido: ${pedido.numero}`);
    } else {
      this.logger.warn(`🔴 Cartão recusado | pedido: ${pedido.numero}`);
    }

    return {
      transacaoId,
      status: statusFinal === StatusTransacao.PAGO ? 'PAGO' : 'FALHOU',
      tipo: dto.tipoPagamento,
      gateway: dto.gateway,
      valor,
      cartao: {
        parcelas: dto.parcelas ?? 1,
        valorParcela,
        bandeira: mpResp.bandeira,
        ultimosDigitos: mpResp.ultimosDigitos,
        receiptUrl: mpResp.receiptUrl,
      },
    };
  }

  // ══════════════════════════════════════════════
  //  WEBHOOK — MercadoPago notifica mudanças de status
  // ══════════════════════════════════════════════

  async processarWebhookMercadoPago(
    payload: any,
    signature: string,
    requestId: string,
    rawBody: string,
  ): Promise<void> {
    const valido = this.mercadoPago.verificarAssinaturaWebhook(rawBody, signature, requestId);
    if (!valido) {
      this.logger.warn('🚨 Webhook MercadoPago com assinatura inválida — ignorado');
      return;
    }

    if (payload.type !== 'payment') return;

    const mpPaymentId = payload.data?.id?.toString();
    if (!mpPaymentId) return;

    const mpData = await this.mercadoPago.consultarPagamento(mpPaymentId);
    const novoStatus = this.mercadoPago.mapearStatus(mpData.status) as StatusTransacao;
    const pedidoExternalRef: string = mpData.external_reference;

    // Busca transação pelo ID do gateway
    const transacao = await this.prisma.transacao.findFirst({
      where: {
        OR: [
          { transactionId: mpPaymentId },
          { pedidoId: pedidoExternalRef },
        ],
      },
      include: { pedido: true },
    });

    if (!transacao) {
      this.logger.warn(`Webhook: transação não encontrada para MP ID ${mpPaymentId}`);
      return;
    }

    // Evita reprocessamento desnecessário
    if (transacao.status === novoStatus) return;

    const updates: any = { transactionId: mpPaymentId, status: novoStatus };
    const pedidoUpdate: any = {};

    if (novoStatus === StatusTransacao.PAGO) {
      updates.paidAt = new Date();
      pedidoUpdate.status = StatusPedido.pagamento_confirmado;
      pedidoUpdate.dataPagamento = new Date();
    } else if (novoStatus === StatusTransacao.CANCELADO) {
      updates.cancelledAt = new Date();
      pedidoUpdate.status = StatusPedido.cancelado;
    } else if (novoStatus === StatusTransacao.REEMBOLSADO) {
      updates.refundedAt = new Date();
    }

    await this.prisma.$transaction([
      this.prisma.transacao.update({ where: { id: transacao.id }, data: updates }),
      ...(Object.keys(pedidoUpdate).length > 0
        ? [this.prisma.pedido.update({ where: { id: transacao.pedidoId }, data: pedidoUpdate })]
        : []),
      ...(novoStatus === StatusTransacao.PAGO
        ? [
            this.prisma.pagamento.upsert({
              where: { transacaoId: transacao.id },
              create: {
                transacaoId: transacao.id,
                pedidoId: transacao.pedidoId,
                userId: transacao.userId,
                valor: transacao.valor,
                tipo: transacao.tipo,
                status: StatusTransacao.PAGO,
                gateway: transacao.gateway,
              },
              update: { status: StatusTransacao.PAGO },
            }),
          ]
        : []),
      this.prisma.webhookLog.create({
        data: {
          transacaoId: transacao.id,
          url: '/pagamento/webhook/mercadopago',
          payload: payload as any,
          response: mpData as any,
          statusCode: 200,
          attemptCount: 1,
        },
      }),
    ]);

    // Notifica o usuário sobre mudança de status relevante
    const notificacaoMap: Partial<Record<StatusTransacao, { titulo: string; mensagem: string }>> = {
      [StatusTransacao.PAGO]: {
        titulo: 'Pagamento confirmado! ✅',
        mensagem: `Pedido #${transacao.pedido.numero} pago com sucesso.`,
      },
      [StatusTransacao.FALHOU]: {
        titulo: 'Falha no pagamento ❌',
        mensagem: `Houve um problema com o pagamento do pedido #${transacao.pedido.numero}.`,
      },
      [StatusTransacao.CANCELADO]: {
        titulo: 'Pagamento cancelado',
        mensagem: `O pagamento do pedido #${transacao.pedido.numero} foi cancelado.`,
      },
    };

    const notif = notificacaoMap[novoStatus];
    if (notif) {
      await this.notificacoes.create(transacao.userId, {
        tipo: 'pagamento',
        ...notif,
      });
    }

    this.logger.log(`🔔 Webhook processado | transação: ${transacao.id} | ${transacao.status} → ${novoStatus}`);
  }

  // ══════════════════════════════════════════════
  //  REEMBOLSO
  // ══════════════════════════════════════════════

  async reembolsar(userId: string, transacaoId: string, valor?: number): Promise<void> {
    const transacao = await this.prisma.transacao.findFirst({
      where: { id: transacaoId, userId },
      include: { pedido: true },
    });

    if (!transacao) throw new NotFoundException('Transação não encontrada.');
    if (transacao.status !== StatusTransacao.PAGO) {
      throw new ConflictException('Apenas transações pagas podem ser reembolsadas.');
    }

    await this.mercadoPago.reembolsarPagamento(transacao.transactionId, valor);

    await this.prisma.$transaction([
      this.prisma.transacao.update({
        where: { id: transacaoId },
        data: { status: StatusTransacao.REEMBOLSADO, refundedAt: new Date() },
      }),
      this.prisma.pagamento.updateMany({
        where: { transacaoId },
        data: { status: StatusTransacao.REEMBOLSADO },
      }),
    ]);

    await this.notificacoes.create(userId, {
      tipo: 'pagamento',
      titulo: 'Reembolso solicitado',
      mensagem: `O reembolso do pedido #${transacao.pedido.numero} foi iniciado.`,
    });

    this.logger.log(`💸 Reembolso iniciado | transação: ${transacaoId}`);
  }

  // ══════════════════════════════════════════════
  //  HISTÓRICO
  // ══════════════════════════════════════════════

  async getHistoricoPagamentos(userId: string) {
    return this.prisma.pagamento.findMany({
      where: { userId },
      include: {
        pedido: { select: { numero: true, status: true } },
        transacao: {
          select: {
            tipo: true,
            gateway: true,
            cardBrand: true,
            installmentCount: true,
            fraudScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransacaoStatus(userId: string, transacaoId: string) {
    const transacao = await this.prisma.transacao.findFirst({
      where: { id: transacaoId, userId },
      select: {
        id: true,
        status: true,
        tipo: true,
        valor: true,
        pixQrCode: true,
        pixQrCodeText: true,
        pixExpiration: true,
        boletoUrl: true,
        boletoBarcode: true,
        boletoExpiration: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (!transacao) throw new NotFoundException('Transação não encontrada.');

    // Verifica se PIX expirou
    if (transacao.tipo === TipoPagamento.PIX && transacao.pixExpiration) {
      const expirado = transacao.pixExpiration < new Date();
      if (expirado && transacao.status === StatusTransacao.AGUARDANDO_PAGAMENTO) {
        await this.prisma.transacao.update({
          where: { id: transacaoId },
          data: { status: StatusTransacao.CANCELADO, cancelledAt: new Date() },
        });
        return { ...transacao, status: StatusTransacao.CANCELADO, pixExpirado: true };
      }
    }

    return transacao;
  }

  // ══════════════════════════════════════════════
  //  HELPERS PRIVADOS
  // ══════════════════════════════════════════════

  private async assertOwnsMetodo(userId: string, id: string) {
    const metodo = await this.prisma.metodoPagamento.findFirst({
      where: { id, userId },
    });
    if (!metodo) throw new NotFoundException('Método de pagamento não encontrado.');
    return metodo;
  }
}