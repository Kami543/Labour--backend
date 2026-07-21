# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
COPY prisma ./prisma/
COPY nest-cli.json ./
COPY tsconfig*.json ./

RUN npm ci

COPY src ./src

RUN npx prisma generate
RUN npm run build

RUN if [ ! -d "/app/dist" ]; then \
    echo "❌ Build falhou"; \
    exit 1; \
fi

RUN echo "✅ Build criado com sucesso!" && ls -la /app/dist/

# ============================================
FROM node:20-alpine AS runner

RUN addgroup -S nestjs && adduser -S nestjs -G nestjs

WORKDIR /app

COPY --from=builder --chown=nestjs:nestjs /app/package*.json ./
COPY --from=builder --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma

# Copiar arquivos .env se existirem
COPY .env* ./.env 2>/dev/null || true

# Verificar arquivos
RUN echo "📂 Verificando arquivos:" && ls -la /app/
RUN echo "📂 Verificando dist:" && ls -la /app/dist/
RUN echo "📂 Verificando main.js:" && ls -la /app/dist/main.js || echo "❌ main.js não encontrado!"

USER nestjs

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Comando com verificação
CMD ["sh", "-c", "echo '🚀 Iniciando...' && node dist/main.js"]