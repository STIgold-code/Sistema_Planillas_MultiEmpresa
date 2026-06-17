FROM node:20-slim

WORKDIR /app

# Install system dependencies for Playwright and LibreOffice
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    libreoffice \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci && npm cache clean --force

# Install Playwright browsers (only chromium to save space)
RUN npx playwright install chromium --with-deps

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3001

# Start command (migrations + app)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
