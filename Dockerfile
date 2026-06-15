# ─────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Instala TUDO (incluindo dev deps)
RUN npm ci

# Se ainda faltar tipos específicos, instala eles explicitamente
RUN npm install --save-dev @types/multer @types/express

COPY . .
RUN npx prisma generate
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Runner
# ─────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup -S nestjs && adduser -S nestjs -G nestjs
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Instalar SÓ produção
RUN npm ci --omit=dev --ignore-scripts

# Copiar Prisma Client do builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copiar o build
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist

USER nestjs

ENV NODE_OPTIONS="--max-old-space-size=380"
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000
CMD ["node", "dist/main.js"]