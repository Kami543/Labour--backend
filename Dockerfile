# Dockerfile - UNIFICADO
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências de build
RUN apk add --no-cache python3 make g++ openssl

# Copiar arquivos
COPY package*.json ./
COPY prisma ./prisma/
COPY nest-cli.json ./
COPY tsconfig*.json ./

RUN npm ci

COPY src ./src

# Gerar Prisma Client
RUN npx prisma generate

# Build
RUN npm run build

# Verificar build
RUN if [ ! -d "/app/dist" ]; then \
    echo "❌ Build falhou"; \
    exit 1; \
fi

# ============================================
FROM node:20-alpine AS runner

RUN addgroup -S nestjs && adduser -S nestjs -G nestjs

WORKDIR /app

# Copiar dependências
COPY --from=builder --chown=nestjs:nestjs /app/package*.json ./
COPY --from=builder --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma

USER nestjs

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Para Web Service
CMD ["node", "dist/main.js"]

# Para Worker (descomente se for worker)
# CMD ["node", "dist/worker.js"]