# ─────────────────────────────────────────────────────────────
# Dockerfile del frontend (Next.js 16 standalone).
# El next.config ya usa output: "standalone".
# ─────────────────────────────────────────────────────────────

FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* se inyecta en BUILD time. Railway pasa las service
# variables como build args; por eso se declara como ARG aquí.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── Runtime ───
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
# El servidor standalone respeta el PORT que inyecta Railway.
CMD ["node", "server.js"]
