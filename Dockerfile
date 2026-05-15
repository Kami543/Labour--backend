# Estágio 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências de build para Prisma
# Alpine 3.21+ usa OpenSSL 3.x, mas Prisma 4 funciona com libcrypto3
RUN apk add --no-cache python3 make g++ openssl

# Copiar arquivos de dependência
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm install 

# Copiar código fonte
COPY . .

# Gerar Prisma Client com target específico
RUN npx prisma generate

# Build da aplicação NestJS
RUN npm run build

# Estágio 2: Produção
FROM node:18-alpine AS runner

WORKDIR /app

# Instalar curl para healthcheck e openssl
RUN apk add --no-cache curl openssl

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
EXPOSE 3001

ENV NODE_ENV=production

# Usar usuário não-root
USER nestjs

# Comando para iniciar
CMD ["node", "dist/main"]