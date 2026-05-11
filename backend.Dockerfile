# Build stage
FROM node:24 AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.6.0 --activate
RUN echo "nodeLinker: node-modules" > .yarnrc.yml

# Copy package files
COPY vault-back/package.json vault-back/yarn.lock ./
COPY vault-back/.yarn ./.yarn

# Install dependencies
RUN --mount=type=cache,target=/root/.yarn/berry/cache \
    yarn install

# Copy source code
COPY vault-back/src ./src
COPY vault-back/scripts ./scripts
COPY vault-back/tsconfig*.json ./
COPY vault-back/nest-cli.json ./
COPY vault-back/.prettierrc ./

# Build the application
RUN --mount=type=cache,target=/app/dist/.cache \
    yarn build

# Production stage
FROM node:24-alpine

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Create a non-root user
RUN addgroup -g 1001 vault && \
    adduser -u 1001 -G vault -s /bin/sh -D vault

ENV NODE_ENV=production

# Copy package files and node_modules from builder
COPY vault-back/package.json vault-back/yarn.lock ./
COPY --from=builder /app/.yarnrc.yml ./
COPY vault-back/.yarn ./.yarn
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set ownership to the non-root user
RUN chown -R vault:vault /app

USER vault

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/main.js"]
