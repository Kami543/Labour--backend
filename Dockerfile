# Dockerfile - MULTI-STAGE OTIMIZADO
FROM node:20-alpine AS builder

WORKDIR /app

# Instala ferramentas de build
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# Copia apenas o necessário para instalar dependências
COPY package*.json ./
COPY prisma ./prisma/

# ✅ PASSO 1: Instala todas as dependências (dev + prod)
RUN npm install

# ✅ PASSO 2: Gera Prisma Client
RUN npx prisma generate

# ✅ PASSO 3: Copia código fonte
COPY . .

# ✅ PASSO 4: Build da aplicação
RUN npm run build

# ✅ PASSO 5: Limpa dependências de desenvolvimento
RUN npm prune --production

# Imagem final
FROM node:20-alpine AS runner

WORKDIR /app

# Instala openssl para o Prisma
RUN apk add --no-cache openssl

# Cria usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copia arquivos necessários
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Gera Prisma Client novamente (garantia)
RUN npx prisma generate

# Usuário não-root
USER nestjs

EXPOSE 3000

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

CMD ["node", "dist/main.js"]