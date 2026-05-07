/*
  Warnings:

  - A unique constraint covering the columns `[tokenCard]` on the table `metodos_pagamento` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `metodos_pagamento` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `tipo` on the `metodos_pagamento` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "StatusTransacao" AS ENUM ('AGUARDANDO_PAGAMENTO', 'PAGO', 'FALHOU', 'REEMBOLSADO', 'CANCELADO', 'EM_ANALISE', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "TipoPagamento" AS ENUM ('CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'BOLETO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "GatewayPagamento" AS ENUM ('MERCADO_PAGO', 'STRIPE', 'PAGSEGURO', 'PIX_DIRETO', 'BOLETO_DIRETO');

-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'pagamento';

-- AlterTable
ALTER TABLE "metodos_pagamento" ADD COLUMN     "dadosCriptografados" JSONB,
ADD COLUMN     "deviceFingerprint" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "pixKey" TEXT,
ADD COLUMN     "tokenCard" TEXT,
ADD COLUMN     "tokenProvider" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userAgent" TEXT,
DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoPagamento" NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "transacoes" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "gateway" "GatewayPagamento" NOT NULL,
    "tipo" "TipoPagamento" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusTransacao" NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    "pixQrCode" TEXT,
    "pixQrCodeText" TEXT,
    "pixExpiration" TIMESTAMP(3),
    "boletoUrl" TEXT,
    "boletoBarcode" TEXT,
    "boletoExpiration" TIMESTAMP(3),
    "cardBrand" TEXT,
    "installmentCount" INTEGER DEFAULT 1,
    "installmentValue" DECIMAL(10,2),
    "paymentData" JSONB,
    "metadata" JSONB,
    "webhookUrl" TEXT,
    "webhookSent" BOOLEAN NOT NULL DEFAULT false,
    "webhookResponse" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "fraudScore" DOUBLE PRECISION,
    "fraudAnalysis" JSONB,
    "riskLevel" TEXT,
    "pedidoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "transacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "transacaoId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipo" "TipoPagamento" NOT NULL,
    "status" "StatusTransacao" NOT NULL,
    "gateway" "GatewayPagamento" NOT NULL,
    "paymentDetails" JSONB,
    "receiptUrl" TEXT,
    "invoiceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chargebacks" (
    "id" TEXT NOT NULL,
    "transacaoId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "evidencias" JSONB,
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataResolucao" TIMESTAMP(3),

    CONSTRAINT "chargebacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "transacaoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "statusCode" INTEGER NOT NULL,
    "attemptCount" INTEGER NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_fingerprints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "acceptLanguage" TEXT,
    "platform" TEXT,
    "screenResolution" TEXT,
    "timezone" TEXT,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transacoes_transactionId_key" ON "transacoes"("transactionId");

-- CreateIndex
CREATE INDEX "transacoes_status_idx" ON "transacoes"("status");

-- CreateIndex
CREATE INDEX "transacoes_transactionId_idx" ON "transacoes"("transactionId");

-- CreateIndex
CREATE INDEX "transacoes_pedidoId_idx" ON "transacoes"("pedidoId");

-- CreateIndex
CREATE INDEX "transacoes_userId_idx" ON "transacoes"("userId");

-- CreateIndex
CREATE INDEX "transacoes_createdAt_idx" ON "transacoes"("createdAt");

-- CreateIndex
CREATE INDEX "transacoes_fraudScore_idx" ON "transacoes"("fraudScore");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_transacaoId_key" ON "pagamentos"("transacaoId");

-- CreateIndex
CREATE INDEX "pagamentos_pedidoId_idx" ON "pagamentos"("pedidoId");

-- CreateIndex
CREATE INDEX "pagamentos_userId_idx" ON "pagamentos"("userId");

-- CreateIndex
CREATE INDEX "pagamentos_status_idx" ON "pagamentos"("status");

-- CreateIndex
CREATE INDEX "webhook_logs_transacaoId_idx" ON "webhook_logs"("transacaoId");

-- CreateIndex
CREATE INDEX "webhook_logs_createdAt_idx" ON "webhook_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_fingerprints_fingerprint_key" ON "device_fingerprints"("fingerprint");

-- CreateIndex
CREATE INDEX "device_fingerprints_userId_idx" ON "device_fingerprints"("userId");

-- CreateIndex
CREATE INDEX "device_fingerprints_fingerprint_idx" ON "device_fingerprints"("fingerprint");

-- CreateIndex
CREATE INDEX "security_logs_userId_idx" ON "security_logs"("userId");

-- CreateIndex
CREATE INDEX "security_logs_action_idx" ON "security_logs"("action");

-- CreateIndex
CREATE INDEX "security_logs_createdAt_idx" ON "security_logs"("createdAt");

-- CreateIndex
CREATE INDEX "security_logs_severity_idx" ON "security_logs"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "metodos_pagamento_tokenCard_key" ON "metodos_pagamento"("tokenCard");

-- CreateIndex
CREATE INDEX "metodos_pagamento_userId_pagamentoDefault_idx" ON "metodos_pagamento"("userId", "pagamentoDefault");

-- CreateIndex
CREATE INDEX "metodos_pagamento_tokenCard_idx" ON "metodos_pagamento"("tokenCard");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_cpf_idx" ON "users"("cpf");

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "transacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargebacks" ADD CONSTRAINT "chargebacks_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "transacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "transacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_fingerprints" ADD CONSTRAINT "device_fingerprints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
