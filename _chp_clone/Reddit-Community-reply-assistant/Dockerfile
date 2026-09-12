FROM node:20-alpine AS base
RUN corepack enable && corepack prepare bun@1 --activate

WORKDIR /app

# Install dependencies (leveraging Docker cache)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false

# Generate Prisma client
COPY prisma ./prisma/
RUN bunx prisma generate

# Copy source code
COPY next.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
COPY components.json ./

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN bun run build

# ─── Production stage ───
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/public ./public

# Copy prisma for runtime schema
COPY --from=base --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=base --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Database directory (volume mounted)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 8080

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/community-reply.db"

CMD ["node", "server.js"]
