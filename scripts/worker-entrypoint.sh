#!/bin/sh
set -e

REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}
MAX_RETRIES=${MAX_RETRIES:-30}
RETRY_DELAY=2

echo "🚀 Starting worker (type: ${WORKER_TYPE:-default})..."

# Aguardar Redis
echo "⏳ Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}..."
retries=0
while ! nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; do
    retries=$((retries + 1))
    if [ "$retries" -ge "$MAX_RETRIES" ]; then
        echo "❌ Redis not available after ${MAX_RETRIES} attempts. Exiting."
        exit 1
    fi
    sleep "$RETRY_DELAY"
done
echo "✅ Redis ready!"

# Aguardar Postgres
echo "⏳ Waiting for Postgres..."
retries=0
while ! nc -z postgres 5432 2>/dev/null; do
    retries=$((retries + 1))
    if [ "$retries" -ge "$MAX_RETRIES" ]; then
        echo "❌ Postgres not available after ${MAX_RETRIES} attempts. Exiting."
        exit 1
    fi
    sleep "$RETRY_DELAY"
done
echo "✅ Postgres ready!"

# Graceful shutdown
trap 'echo "🛑 Shutting down worker..."; exit 0' INT TERM

exec node dist/worker.js