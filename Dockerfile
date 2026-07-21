# Dockerfile - SEM .env (RECOMENDADO PARA RENDER)
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

# ============================================
FROM node:20-alpine AS runner

RUN addgroup -S nestjs && adduser -S nestjs -G nestjs

WORKDIR /app

COPY --from=builder --chown=nestjs:nestjs /app/package*.json ./
COPY --from=builder --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma

USER nestjs

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "dist/main.js"]