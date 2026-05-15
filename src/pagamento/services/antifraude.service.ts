import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface FraudAnalysisInput {
  userId: string;
  pedidoId: string;
  valor: number;
  ipAddress?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  tipoPagamento: string;
}

export interface FraudAnalysisResult {
  score: number;           // 0 (sem risco) a 1 (risco máximo)
  riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  aprovado: boolean;
  motivos: string[];
  analise: Record<string, any>;
}

@Injectable()
export class AntiFraudeService {
  private readonly logger = new Logger(AntiFraudeService.name);

  constructor(private prisma: PrismaService) {}

  async analisar(input: FraudAnalysisInput): Promise<FraudAnalysisResult> {
    const motivos: string[] = [];
    const analise: Record<string, any> = {};
    let score = 0;

    const [user, deviceConhecido, pedidosRecentes, transacoesRecentes] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          failedLoginAttempts: true,
          lastLoginIp: true,
        },
      }),
      input.deviceFingerprint
        ? this.prisma.deviceFingerprint.findUnique({
            where: { fingerprint: input.deviceFingerprint },
          })
        : null,
      this.prisma.pedido.count({
        where: {
          userId: input.userId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
        },
      }),
      this.prisma.transacao.findMany({
        where: {
          userId: input.userId,
          status: 'FALHOU',
          createdAt: { gte: new Date(Date.now() - 60 * 60_000) },
        },
        select: { id: true },
      }),
    ]);

    // ── Regra 1: Conta muito nova (< 24h) comprando alto valor
    if (user) {
      const idadeConta = Date.now() - user.createdAt.getTime();
      const horasConta = idadeConta / (1000 * 60 * 60);
      analise.idadeContaHoras = Math.round(horasConta);

      if (horasConta < 1 && input.valor > 200) {
        score += 0.4;
        motivos.push('Conta muito nova realizando compra de alto valor');
      } else if (horasConta < 24 && input.valor > 500) {
        score += 0.25;
        motivos.push('Conta nova com compra de valor elevado');
      }
    }

    // ── Regra 2: E-mail não verificado em compra alta
    if (user && !user.emailVerified && input.valor > 300) {
      score += 0.2;
      motivos.push('E-mail não verificado');
    }

    // ── Regra 3: Muitas tentativas falhas de login
    if (user && user.failedLoginAttempts > 3) {
      score += 0.15;
      motivos.push(`${user.failedLoginAttempts} tentativas de login falhas recentes`);
    }

    // ── Regra 4: Muitos pedidos em 24h
    analise.pedidosUltimas24h = pedidosRecentes;
    if (pedidosRecentes > 5) {
      score += 0.2;
      motivos.push(`Muitos pedidos em 24h: ${pedidosRecentes}`);
    }

    // ── Regra 5: Falhas de pagamento na última hora
    analise.falhasUltimaHora = transacoesRecentes.length;
    if (transacoesRecentes.length >= 3) {
      score += 0.35;
      motivos.push(`${transacoesRecentes.length} falhas de pagamento na última hora`);
    }

    // ── Regra 6: Dispositivo desconhecido + valor alto
    analise.dispositivoConhecido = !!deviceConhecido;
    analise.dispositivoConfiavel = deviceConhecido?.isTrusted ?? false;
    if (!deviceConhecido && input.valor > 1000) {
      score += 0.2;
      motivos.push('Dispositivo não reconhecido em compra de alto valor');
    }

    // ── Regra 7: IP diferente do login
    if (input.ipAddress && user?.lastLoginIp && input.ipAddress !== user.lastLoginIp) {
      analise.ipDiferente = true;
      score += 0.1;
      motivos.push('IP diferente do último login');
    }

    // ── Regra 8: Valor atípico (> R$ 5.000)
    if (input.valor > 5000) {
      score += 0.15;
      motivos.push('Valor da transação muito alto');
    }

    // Limita entre 0 e 1
    score = Math.min(1, Math.max(0, score));

    const riskLevel =
      score < 0.25 ? 'BAIXO' :
      score < 0.5  ? 'MEDIO' :
      score < 0.75 ? 'ALTO'  : 'CRITICO';

    const aprovado = score < 0.75; // bloqueia CRITICO

    this.logger.log(
      `🔍 Análise anti-fraude | usuário: ${input.userId} | score: ${score.toFixed(2)} | nível: ${riskLevel} | aprovado: ${aprovado}`,
    );

    if (!aprovado) {
      this.logger.warn(`🚨 Transação BLOQUEADA por alto risco | pedido: ${input.pedidoId} | motivos: ${motivos.join(', ')}`);
    }

    // Salva log de segurança
    await this.prisma.securityLog.create({
      data: {
        userId: input.userId,
        action: 'FRAUD_ANALYSIS',
        entityType: 'Pedido',
        entityId: input.pedidoId,
        details: { score, riskLevel, motivos, analise },
        ipAddress: input.ipAddress || '0.0.0.0',
        userAgent: '',
        status: aprovado ? 'SUCCESS' : 'BLOCKED',
        severity: riskLevel === 'CRITICO' ? 'CRITICAL' : riskLevel === 'ALTO' ? 'HIGH' : 'LOW',
      },
    });

    return { score, riskLevel, aprovado, motivos, analise };
  }

  // Registra ou atualiza device fingerprint após transação aprovada
  async registrarDevice(params: {
    userId: string;
    fingerprint: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<void> {
    await this.prisma.deviceFingerprint.upsert({
      where: { fingerprint: params.fingerprint },
      create: {
        userId: params.userId,
        fingerprint: params.fingerprint,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        lastSeenAt: new Date(),
      },
      update: {
        lastSeenAt: new Date(),
        ipAddress: params.ipAddress,
      },
    });
  }
}