# ── Stage 1: Install dependencies ──────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build the application ────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# .env.local is copied in and read automatically by Next.js at build time
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install bash (Alpine only has sh) — needed by shell-api launch profiles
# Install nsenter via util-linux — used to execute commands on the host OS
RUN apk add --no-cache bash util-linux

# Copy only what the standalone server needs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=root:root /app/.next/standalone ./
COPY --from=builder --chown=root:root /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
