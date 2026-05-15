import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

interface PixPayloadOptions {
  chave: string;
  nomeRecebedor: string;
  cidadeRecebedor: string;
  valor?: number;
  txid?: string;
  descricao?: string;
}

interface PixQrCodeResult {
  payload: string;
  qrCodeBase64: string;
  qrCodeSvg: string;
  txid: string;
  expiracao: Date;
}

@Injectable()
export class PixService {
  private readonly logger = new Logger(PixService.name);

  gerarPayload(options: PixPayloadOptions): string {
    const nome = this.sanitizar(options.nomeRecebedor, 25);
    const cidade = this.sanitizar(options.cidadeRecebedor, 15);
    const txid = this.sanitizar(options.txid || this.gerarTxId(), 25).replace(/\s/g, '');
    const descricao = options.descricao ? this.sanitizar(options.descricao, 50) : '';

    const gui = this.tlv('00', 'br.gov.bcb.pix');
    const chaveTag = this.tlv('01', options.chave);
    const infoTag = descricao ? this.tlv('02', descricao) : '';
    const merchantInfo = this.tlv('26', gui + chaveTag + infoTag);

    const referencia = this.tlv('05', txid);
    const addDataField = this.tlv('62', referencia);

    let payload =
      this.tlv('00', '01') +
      this.tlv('01', '12') +
      merchantInfo +
      this.tlv('52', '0000') +
      this.tlv('53', '986') +
      (options.valor !== undefined ? this.tlv('54', options.valor.toFixed(2)) : '') +
      this.tlv('58', 'BR') +
      this.tlv('59', nome) +
      this.tlv('60', cidade) +
      addDataField +
      '6304';

    return payload + this.crc16(payload);
  }

  async gerarQrCode(options: PixPayloadOptions, expiracaoMinutos = 30): Promise<PixQrCodeResult> {
    const txid = options.txid || this.gerarTxId();
    const payload = this.gerarPayload({ ...options, txid });

    const [qrCodeBase64, qrCodeSvg] = await Promise.all([
      QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }),
      QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', width: 300, margin: 2 }),
    ]);

    const expiracao = new Date(Date.now() + expiracaoMinutos * 60_000);
    this.logger.log(`QR Code PIX gerado | txid: ${txid} | expira: ${expiracao.toISOString()}`);
    return { payload, qrCodeBase64, qrCodeSvg, txid, expiracao };
  }

  async gerarQrCodeFromPayload(payload: string): Promise<{ base64: string; svg: string }> {
    const [base64, svg] = await Promise.all([
      QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', type: 'image/png', width: 300, margin: 2 }),
      QRCode.toString(payload, { type: 'svg', width: 300, margin: 2 }),
    ]);
    return { base64, svg };
  }

  validarChavePix(chave: string): { valida: boolean; tipo: string | null } {
    const testes = [
      { regex: /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, tipo: 'CPF' },
      { regex: /^\d{2}\.?\d{3}\.?\d{3}\/?0001-?\d{2}$/, tipo: 'CNPJ' },
      { regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, tipo: 'EMAIL' },
      { regex: /^\+55\d{10,11}$/, tipo: 'TELEFONE' },
      { regex: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, tipo: 'ALEATORIA' },
    ];
    for (const { regex, tipo } of testes) {
      if (regex.test(chave)) return { valida: true, tipo };
    }
    return { valida: false, tipo: null };
  }

  gerarTxId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 25 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private tlv(id: string, valor: string): string {
    return `${id}${valor.length.toString().padStart(2, '0')}${valor}`;
  }

  private crc16(payload: string): string {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      }
    }
    return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  }

  private sanitizar(texto: string, maxLen: number): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .substring(0, maxLen)
      .trim();
  }
}