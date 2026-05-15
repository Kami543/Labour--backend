import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { TipoPagamento } from '@prisma/client';

export interface MpPixResponse {
  transactionId: string;
  status: string;
  qrCode: string;         // Base64 do QR Code gerado pelo MP
  qrCodeText: string;     // Copia-e-cola
  expiracao: Date;
  valor: number;
}

export interface MpBoletoResponse {
  transactionId: string;
  status: string;
  boletoUrl: string;
  boletoBarcode: string;
  expiracao: Date;
  valor: number;
}

export interface MpCartaoResponse {
  transactionId: string;
  status: string;
  valor: number;
  parcelas: number;
  bandeira: string;
  ultimosDigitos: string;
  receiptUrl?: string;
}

@Injectable()
export class MercadoPagoGateway {
  private readonly logger = new Logger(MercadoPagoGateway.name);
  private readonly http: AxiosInstance;
  private readonly accessToken: string;

  constructor(private config: ConfigService) {
    const accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is required but not configured in environment variables');
    }
    this.accessToken = accessToken;

    this.http = axios.create({
      baseURL: 'https://api.mercadopago.com',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': '', // será sobrescrito por requisição
      },
      timeout: 15_000,
    });

    // Interceptor de log
    this.http.interceptors.response.use(
      (res) => {
        this.logger.debug(`[MP] ${res.config.method?.toUpperCase()} ${res.config.url} → ${res.status}`);
        return res;
      },
      (err) => {
        this.logger.error(`[MP] Erro: ${err.response?.data?.message || err.message}`);
        return Promise.reject(err);
      },
    );
  }

  // ─────────────────────────────────────────
  // PIX
  // ─────────────────────────────────────────

  async criarPagamentoPix(params: {
    pedidoId: string;
    valor: number;
    nomeComprador: string;
    emailComprador: string;
    cpfComprador: string;
    descricao: string;
    expiracaoMinutos?: number;
    idempotencyKey: string;
  }): Promise<MpPixResponse> {
    const expiracao = new Date();
    expiracao.setMinutes(expiracao.getMinutes() + (params.expiracaoMinutos || 30));

    const payload = {
      transaction_amount: params.valor,
      description: params.descricao,
      payment_method_id: 'pix',
      date_of_expiration: expiracao.toISOString(),
      payer: {
        email: params.emailComprador,
        first_name: params.nomeComprador.split(' ')[0],
        last_name: params.nomeComprador.split(' ').slice(1).join(' ') || 'N/A',
        identification: { type: 'CPF', number: params.cpfComprador.replace(/\D/g, '') },
      },
      external_reference: params.pedidoId,
      notification_url: this.config.get('WEBHOOK_URL') + '/pagamento/webhook/mercadopago',
    };

    try {
      const { data } = await this.http.post('/v1/payments', payload, {
        headers: { 'X-Idempotency-Key': params.idempotencyKey },
      });

      return {
        transactionId: data.id.toString(),
        status: data.status,
        qrCode: data.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        qrCodeText: data.point_of_interaction?.transaction_data?.qr_code || '',
        expiracao,
        valor: params.valor,
      };
    } catch (err: any) {
      this.logger.error(`Falha ao criar PIX no MercadoPago: ${JSON.stringify(err.response?.data)}`);
      throw new InternalServerErrorException('Falha ao gerar PIX. Tente novamente.');
    }
  }

  // ─────────────────────────────────────────
  // BOLETO
  // ─────────────────────────────────────────

  async criarPagamentoBoleto(params: {
    pedidoId: string;
    valor: number;
    nomeComprador: string;
    emailComprador: string;
    cpfComprador: string;
    enderecoComprador: any;
    descricao: string;
    expiracaoDias?: number;
    idempotencyKey: string;
  }): Promise<MpBoletoResponse> {
    const expiracao = new Date();
    expiracao.setDate(expiracao.getDate() + (params.expiracaoDias || 3));

    const payload = {
      transaction_amount: params.valor,
      description: params.descricao,
      payment_method_id: 'bolbradesco',
      date_of_expiration: expiracao.toISOString(),
      payer: {
        email: params.emailComprador,
        first_name: params.nomeComprador.split(' ')[0],
        last_name: params.nomeComprador.split(' ').slice(1).join(' ') || 'N/A',
        identification: { type: 'CPF', number: params.cpfComprador.replace(/\D/g, '') },
        address: {
          zip_code: params.enderecoComprador?.cep?.replace(/\D/g, ''),
          street_name: params.enderecoComprador?.rua,
          street_number: params.enderecoComprador?.numero,
          neighborhood: params.enderecoComprador?.bairro,
          city: params.enderecoComprador?.cidade,
          federal_unit: params.enderecoComprador?.estado,
        },
      },
      external_reference: params.pedidoId,
      notification_url: this.config.get('WEBHOOK_URL') + '/pagamento/webhook/mercadopago',
    };

    try {
      const { data } = await this.http.post('/v1/payments', payload, {
        headers: { 'X-Idempotency-Key': params.idempotencyKey },
      });

      return {
        transactionId: data.id.toString(),
        status: data.status,
        boletoUrl: data.transaction_details?.external_resource_url || '',
        boletoBarcode: data.barcode?.content || '',
        expiracao,
        valor: params.valor,
      };
    } catch (err: any) {
      this.logger.error(`Falha ao criar boleto no MercadoPago: ${JSON.stringify(err.response?.data)}`);
      throw new InternalServerErrorException('Falha ao gerar boleto. Tente novamente.');
    }
  }

  // ─────────────────────────────────────────
  // CARTÃO CRÉDITO / DÉBITO
  // ─────────────────────────────────────────

  async criarPagamentoCartao(params: {
    pedidoId: string;
    valor: number;
    nomeComprador: string;
    emailComprador: string;
    cpfComprador: string;
    cardToken: string;
    parcelas?: number;
    descricao: string;
    tipo: TipoPagamento;
    idempotencyKey: string;
  }): Promise<MpCartaoResponse> {
    const payload = {
      transaction_amount: params.valor,
      token: params.cardToken,
      description: params.descricao,
      installments: params.parcelas || 1,
      payment_method_id: params.tipo === TipoPagamento.CARTAO_DEBITO ? undefined : undefined, // detectado automaticamente pelo token
      payer: {
        email: params.emailComprador,
        identification: { type: 'CPF', number: params.cpfComprador.replace(/\D/g, '') },
      },
      external_reference: params.pedidoId,
      capture: true, // captura automática
      notification_url: this.config.get('WEBHOOK_URL') + '/pagamento/webhook/mercadopago',
    };

    try {
      const { data } = await this.http.post('/v1/payments', payload, {
        headers: { 'X-Idempotency-Key': params.idempotencyKey },
      });

      return {
        transactionId: data.id.toString(),
        status: data.status,
        valor: params.valor,
        parcelas: data.installments,
        bandeira: data.payment_method_id,
        ultimosDigitos: data.card?.last_four_digits || '',
        receiptUrl: data.transaction_details?.acquirer_reference,
      };
    } catch (err: any) {
      const mpError = err.response?.data?.cause?.[0];
      this.logger.error(`Falha no cartão MP: ${JSON.stringify(err.response?.data)}`);

      const mensagens: Record<string, string> = {
        '2001': 'Cartão sem fundos suficientes.',
        '2004': 'Cartão expirado.',
        '2007': 'Limite de crédito excedido.',
        '3034': 'CVV inválido.',
        '3035': 'Cartão bloqueado pelo emissor.',
        '3036': 'Cartão roubado.',
      };
      const msg = mpError ? (mensagens[mpError.code] || `Erro no pagamento: ${mpError.description}`) : 'Falha no cartão.';
      throw new InternalServerErrorException(msg);
    }
  }

  // ─────────────────────────────────────────
  // CONSULTA / REEMBOLSO
  // ─────────────────────────────────────────

  async consultarPagamento(transactionId: string) {
    const { data } = await this.http.get(`/v1/payments/${transactionId}`);
    return data;
  }

  async reembolsarPagamento(transactionId: string, valor?: number) {
    const payload = valor ? { amount: valor } : {};
    const { data } = await this.http.post(`/v1/payments/${transactionId}/refunds`, payload, {
      headers: { 'X-Idempotency-Key': `refund-${transactionId}-${Date.now()}` },
    });
    return data;
  }

  // ─────────────────────────────────────────
  // VERIFICAÇÃO DE WEBHOOK
  // ─────────────────────────────────────────

  verificarAssinaturaWebhook(rawBody: string, signature: string, requestId: string): boolean {
    const crypto = require('crypto');
    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    if (!secret) return true; // desabilitado se não configurado

    // Formato MP: ts=<timestamp>;v1=<hash>
    const parts = signature.split(';').reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v;
      return acc;
    }, {} as Record<string, string>);

    const manifest = `id:${requestId};request-id:${requestId};ts:${parts.ts};`;
    const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    return hmac === parts.v1;
  }

  mapearStatus(mpStatus: string): string {
    const map: Record<string, string> = {
      pending: 'AGUARDANDO_PAGAMENTO',
      approved: 'PAGO',
      authorized: 'AGUARDANDO_PAGAMENTO',
      in_process: 'EM_ANALISE',
      in_mediation: 'EM_ANALISE',
      rejected: 'FALHOU',
      cancelled: 'CANCELADO',
      refunded: 'REEMBOLSADO',
      charged_back: 'CHARGEBACK',
    };
    return map[mpStatus] || 'AGUARDANDO_PAGAMENTO';
  }
}