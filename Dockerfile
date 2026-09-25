# syntax=docker/dockerfile:1

# ---------- Stage 1: install dependencies ----------
# Alpine keeps the image small; Node 22 is the current LTS line
FROM node:22-alpine AS deps
# Prisma's query engine needs OpenSSL on Alpine
RUN apk add --no-cache openssl
# All following commands run inside /app
WORKDIR /app
# Copy only the manifests first so this layer is cached until dependencies change
COPY package.json package-lock.json ./
# The postinstall script runs "prisma generate", which needs the schema
COPY prisma/schema.prisma ./prisma/schema.prisma
# Clean, reproducible install from the lockfile
RUN npm ci

# ---------- Stage 2: build the app and the seed script ----------
FROM node:22-alpine AS build
# OpenSSL again, because Prisma runs during the build
RUN apk add --no-cache openssl
# Work in the same folder as the deps stage
WORKDIR /app
# Reuse the installed node_modules from stage 1
COPY --from=deps /app/node_modules ./node_modules
# Copy the source code (filtered by .dockerignore)
COPY . .
# Turn off Next.js anonymous telemetry during the build
ENV NEXT_TELEMETRY_DISABLED=1
# Produce the standalone server in .next/standalone
RUN npm run build
# Bundle prisma/seed.ts into a single dist/seed.js that plain node can run
RUN npm run build:seed

# ---------- Stage 3: minimal runtime image ----------
FROM node:22-alpine AS runner
# OpenSSL for Prisma at runtime
RUN apk add --no-cache openssl
# Prisma CLI (same version as the app) to apply migrations on start-up;
# clearing npm's download cache in the same layer keeps ~200 MB out of the image
RUN npm install -g prisma@5.22.0 && npm cache clean --force
# Application folder
WORKDIR /app
# Production mode for Next.js and libraries
ENV NODE_ENV=production
# No telemetry at runtime either
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js standalone server listens on this port
ENV PORT=3000
# Listen on all interfaces so the load balancer can reach the container
ENV HOSTNAME=0.0.0.0
# Standalone server with only the node_modules it actually uses, owned by the non-root "node" user
COPY --from=build --chown=node:node /app/.next/standalone ./
# Static assets are not included in standalone output, so copy them next to it
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Schema and migrations for "prisma migrate deploy"
COPY --from=build --chown=node:node /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build --chown=node:node /app/prisma/migrations ./prisma/migrations
# Bundled seed script
COPY --from=build --chown=node:node /app/dist/seed.js ./dist/seed.js
# Lesson Markdown read by the seed script (it resolves paths relative to dist/)
COPY --from=build --chown=node:node /app/prisma/content/lessons ./dist/content/lessons
# Start-up script: builds DATABASE_URL, migrates, seeds, then starts the server
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
# Make the script executable
RUN chmod +x ./docker-entrypoint.sh
# Never run the app as root
USER node
# Document the port the container listens on
EXPOSE 3000
# Run the entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
