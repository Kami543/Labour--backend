# ─────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

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

# --omit=dev corta prisma CLI, typescript, etc.
# Após mover prisma para devDependencies, @img some junto
RUN npm ci --omit=dev --ignore-scripts

# Gerar só o Prisma Client (não a CLI inteira)
# npx aqui usa o prisma do devDep do builder — não instala de novo
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist

USER nestjs

# 380 MB → GC agressivo antes de atingir 512 MB
ENV NODE_OPTIONS="--max-old-space-size=380"
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000
CMD ["node", "dist/main.js"]