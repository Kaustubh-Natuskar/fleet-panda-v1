# ---------- Build stage ----------
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

# ---------- Production stage ----------
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY prisma ./prisma
COPY src ./src

# Copy frontend and documentation assets
COPY public ./public
COPY docs ./docs
COPY README.md ./


EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node src/server.js"]
# worst thing ever "npx prisma db push" must not run here!!
