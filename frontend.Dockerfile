# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY vault-front/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy configuration files
COPY vault-front/next.config.ts ./
COPY vault-front/tsconfig.json ./
COPY vault-front/postcss.config.mjs ./
COPY vault-front/tailwind.config.ts* ./

# Copy source code
COPY vault-front/src ./src
COPY vault-front/public ./public

# Set build-time environment variables
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

# Build the Next.js app with cache mount for .next/cache
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Production stage
FROM node:24-alpine

WORKDIR /app

# Create a non-root user
RUN addgroup -g 1001 vault && \
    adduser -u 1001 -G vault -s /bin/sh -D vault

ENV NODE_ENV=production

# Install production dependencies
COPY vault-front/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Copy configuration and built app
COPY vault-front/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# Set ownership to the non-root user
RUN chown -R vault:vault /app

USER vault

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
