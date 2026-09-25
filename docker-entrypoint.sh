#!/bin/sh
# Stop at the first failing command so a broken migration never starts the app
set -e

# On AWS, ECS injects the database parts from Secrets Manager instead of one URL.
# Build DATABASE_URL from them when it isn't already set (local Docker sets it directly).
if [ -z "$DATABASE_URL" ]; then
  # sslmode=require: RDS for PostgreSQL 15+ only accepts TLS connections
  export DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public&sslmode=require"
fi

# Apply any pending migrations (Prisma takes a lock, so parallel tasks are safe)
prisma migrate deploy --schema ./prisma/schema.prisma

# Upsert course content and badges (idempotent, guarded by an advisory lock)
if [ "$SEED_ON_START" = "true" ]; then
  node ./dist/seed.js
fi

# Replace the shell with the Next.js server so it receives stop signals directly
exec node server.js
