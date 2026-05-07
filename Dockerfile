# Estágio 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências de build para Prisma
RUN apk add --no-cache python3 make g++ openssl

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

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar dependências de produção
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copiar o build do NestJS
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Expor porta
EXPOSE 3000

ENV NODE_ENV=production

# Comando para iniciar
CMD ["node", "dist/main"]