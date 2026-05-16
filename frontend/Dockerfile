FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY src ./src
COPY public ./public
COPY index.html vite.config.js .env* ./

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve

# Create non-root user (use higher UID to avoid conflicts)
RUN addgroup -g 1001 appuser && adduser -D -u 1001 -G appuser appuser

# Copy built app from builder
COPY --from=builder --chown=1001:1001 /app/dist ./dist

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q -O- http://localhost:3000 || exit 1

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]

