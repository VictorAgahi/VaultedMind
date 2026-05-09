# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY vault-front/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY vault-front .

# Build the Next.js app
RUN npm run build

# Production stage
FROM node:24-alpine

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install only production dependencies
COPY vault-front/package*.json ./
RUN npm ci --only=production

# Copy built app from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
