# ==========================================
# Stage 1: Build stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package management files & prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for Nest CLI & Prisma Client generation)
RUN npm ci

# Copy full source code & configurations
COPY . .

# Generate Prisma Client for MariaDB adapter into generated/prisma
RUN npx prisma generate

# Build NestJS production bundle into dist/
RUN npm run build

# ==========================================
# Stage 2: Production runtime stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules and compiled output from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

# Default port
EXPOSE 8080

# Start NestJS backend application
CMD ["node", "dist/src/main.js"]
