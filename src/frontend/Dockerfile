# ==============================================================================
# Stage 1: Dependencies - Install all node_modules
# ==============================================================================
FROM node:20-alpine3.21 AS deps

# Security: Update OpenSSL to fix CVE-2025-15467, CVE-2025-69419, CVE-2025-69421
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache libc6-compat libcrypto3>=3.3.6-r0 libssl3>=3.3.6-r0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* .npmrc* ./

# Install dependencies with legacy peer deps
RUN npm ci --legacy-peer-deps

# ==============================================================================
# Stage 2: Builder - Build the Next.js application
# ==============================================================================
FROM node:20-alpine3.21 AS builder

# Security: Update OpenSSL
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all application files
COPY . .

# Set Next.js environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build argument for API URL - passed at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js application
RUN npm run build

# ==============================================================================
# Stage 3: Runner - Create minimal production image
# ==============================================================================
FROM node:20-alpine3.21 AS runner

# Security: Update OpenSSL to fix CVE-2025-15467, CVE-2025-69419, CVE-2025-69421
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache libcrypto3>=3.3.6-r0 libssl3>=3.3.6-r0

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Copy public assets
COPY --from=builder /app/public ./public

# Copy Next.js build output and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Set hostname to listen on all interfaces
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the Next.js application
# Using standalone server for optimal performance
CMD ["node", "server.js"]
