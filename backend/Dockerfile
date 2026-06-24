# Build desde la RAÍZ del repo (monorepo). Railway lo selecciona con la
# variable RAILWAY_DOCKERFILE_PATH=backend/Dockerfile, por eso los paths
# llevan el prefijo backend/.

FROM node:20-slim

WORKDIR /app

# Dependencias de sistema para Playwright y LibreOffice
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    libreoffice \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Archivos de dependencias
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Instalar dependencias
RUN npm ci && npm cache clean --force

# Navegador de Playwright (solo chromium)
RUN npx playwright install chromium --with-deps

# Código del backend
COPY backend/ .

# Build
RUN npm run build

EXPOSE 3001

# Migraciones + arranque
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
