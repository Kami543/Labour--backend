# Dockerfile - VERSÃO CORRIGIDA
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências de build
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# Copia arquivos de package
COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências
RUN npm ci --only=production && \
    npm install --save-dev typescript @types/node @nestjs/cli @nestjs/schematics

# Gera Prisma Client
RUN npx prisma generate

# Copia código fonte
COPY . .

# Verifica se os arquivos existem antes do build
RUN ls -la src/ && ls -la tsconfig.json

# Tenta compilar com mais informações
RUN npx tsc --noEmit --pretty || true  # Mostra erros sem parar
RUN npx tsc -p tsconfig.build.json 2>&1 | tee /tmp/tsc-errors.log && \
    if [ ${PIPESTATUS[0]} -ne 0 ]; then \
        echo "❌ Erros de compilação:" && \
        cat /tmp/tsc-errors.log && \
        exit 1; \
    fi

# Verifica se o build foi gerado
RUN ls -la dist/ && echo "✅ Build OK"

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

RUN npx prisma generate

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

CMD ["node", "dist/main.js"]