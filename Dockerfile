# Estágio 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências de build para Prisma (OpenSSL 1.1)
RUN apk add --no-cache python3 make g++ openssl1.1-compat

# Copiar arquivos de dependência
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build da aplicação NestJS
RUN npm run build

# Estágio 2: Produção
FROM node:18-alpine AS runner

WORKDIR /app

# Instalar curl para healthcheck e OpenSSL 1.1 para runtime
RUN apk add --no-cache curl openssl1.1-compat

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar dependências de produção
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copiar o build do NestJS
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Expor porta (Render usa PORT, mas 3000 é fallback)
EXPOSE 3000

ENV NODE_ENV=production

# Usar usuário não-root
USER nestjs

# Comando para iniciar
CMD ["node", "dist/main"]