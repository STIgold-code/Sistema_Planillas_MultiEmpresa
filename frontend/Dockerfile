# Build desde la RAÍZ del repo (monorepo). Railway lo selecciona con la
# variable RAILWAY_DOCKERFILE_PATH=frontend/Dockerfile, por eso los paths
# llevan el prefijo frontend/. El next.config ya usa output: "standalone".

FROM node:20-slim AS builder
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .

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
CMD ["node", "server.js"]
