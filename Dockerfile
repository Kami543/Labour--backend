# ─────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Instala TUDO (dev + prod) para poder compilar e rodar prisma generate
RUN npm ci --ignore-scripts

COPY . .

# Gerar client Prisma e compilar TypeScript
RUN npx prisma generate
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Runner
# ─────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup -S nestjs && adduser -S nestjs -G nestjs
WORKDIR /app

# Copiar package.json para instalar APENAS produção
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# npm ci --omit=dev instala só o que está em "dependencies", ignora "devDependencies"
# Isso é o passo que corta lucide-react, typescript, prisma CLI, etc.
RUN npm ci --omit=dev --ignore-scripts

# Gerar Prisma Client no ambiente de runtime correto
RUN npx prisma generate

# Copiar o build compilado
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist

USER nestjs

ENV NODE_OPTIONS="--max-old-space-size=400"
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "dist/main.js"]