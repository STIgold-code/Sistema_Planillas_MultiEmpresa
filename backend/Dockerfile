# Build desde la RAÍZ del repo (monorepo). Railway lo selecciona con la
# variable RAILWAY_DOCKERFILE_PATH=backend/Dockerfile, por eso los paths
# llevan el prefijo backend/.

FROM node:20-slim

WORKDIR /app

# Dependencias de sistema para Playwright, LibreOffice y los backups de base de
# datos.
#
# El cliente de PostgreSQL viene del repositorio oficial PGDG y NO del de Debian:
# bookworm empaqueta la version 15, y pg_dump se niega a volcar un servidor mas
# nuevo que el propio binario. Produccion corre PostgreSQL 18, asi que el cliente
# tiene que ser 18. El codename se lee de /etc/os-release para que la imagen
# siga funcionando si la base de node cambia de release de Debian.
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    libreoffice \
    && wget -qO /usr/share/keyrings/pgdg.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && . /etc/os-release \
    && echo "deb [signed-by=/usr/share/keyrings/pgdg.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-18 \
    && rm -rf /var/lib/apt/lists/*

# Guarda de build: el backup nocturno hace spawn('pg_dump') y durante meses fallo
# con ENOENT porque el binario nunca estuvo en la imagen. Si vuelve a faltar, la
# imagen no se construye en vez de desplegarse sin backups.
RUN pg_dump --version

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
