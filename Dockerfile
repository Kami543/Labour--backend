FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl openssl-dev

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

RUN npm run build
RUN npm prune --production

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
# ✅ REMOVIDO --optimize-for-size (não é uma flag válida)
ENV NODE_OPTIONS="--max-old-space-size=1024"

CMD ["node", "dist/main.js"]