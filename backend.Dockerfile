# Build stage
FROM node:24 AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.6.0 --activate
RUN echo "nodeLinker: node-modules" > .yarnrc.yml

# Copy package files
COPY vaultedMind/package.json vaultedMind/yarn.lock vaultedMind/.pnp.cjs vaultedMind/.pnp.loader.mjs ./
COPY vaultedMind/.yarn ./.yarn

# Install dependencies
RUN yarn install

# Copy source code
COPY vaultedMind/src ./src
COPY vaultedMind/tsconfig*.json ./
COPY vaultedMind/nest-cli.json ./
COPY vaultedMind/.prettierrc ./

# Build the application
RUN yarn build

# Production stage
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only
COPY vaultedMind/package.json vaultedMind/yarn.lock vaultedMind/.pnp.cjs vaultedMind/.pnp.loader.mjs ./
COPY vaultedMind/.yarn ./.yarn

RUN corepack enable && corepack prepare yarn@4.6.0 --activate && \
    yarn install --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/main.js"]
