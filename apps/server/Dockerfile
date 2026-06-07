# Bun backend image for Fly.io (or any container host).
FROM oven/bun:1.3 AS base
WORKDIR /app

# Prisma needs openssl + CA certs at runtime.
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install dependencies first (cached layer).
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# App source.
COPY . .

# Generate the Prisma client. prisma.config.ts has a local fallback DATABASE_URL,
# so generation works at build time without real secrets.
RUN bunx prisma generate

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Runtime secrets (DATABASE_URL, JWT_SECRET, ADMIN_PUBLISH_TOKEN, PUBLIC_BASE_URL,
# CODE_SIGNING_PRIVATE_KEY) are injected by the host (Fly secrets), not baked in.
CMD ["bun", "run", "src/index.ts"]
