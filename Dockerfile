# Build stage
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package.json ./

# Install all dependencies (including dev for Prisma)
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Production stage
FROM node:20-slim

## need open ssl in both builder and actual build stage
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy application code
COPY src ./src
COPY prisma ./prisma

# Expose port
EXPOSE 3000

CMD ["node", "src/server.js"]
