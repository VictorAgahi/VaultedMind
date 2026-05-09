#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[E2E Setup] Starting database and service setup...${NC}"

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-vaultedmind_test}"
SERVICE_PORT="${SERVICE_PORT:-3000}"
MAX_RETRIES=30
RETRY_DELAY=1

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}[E2E Setup] Waiting for PostgreSQL at $DB_HOST:$DB_PORT...${NC}"
RETRY_COUNT=0
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -gt $MAX_RETRIES ]; then
    echo -e "${RED}[E2E Setup] PostgreSQL failed to start after ${MAX_RETRIES} attempts${NC}"
    exit 1
  fi
  echo -e "${YELLOW}[E2E Setup] Waiting for PostgreSQL... (attempt $RETRY_COUNT/$MAX_RETRIES)${NC}"
  sleep $RETRY_DELAY
done
echo -e "${GREEN}[E2E Setup] PostgreSQL is ready!${NC}"

# Run migrations
echo -e "${YELLOW}[E2E Setup] Running migrations...${NC}"
if ! yarn migration:run; then
  echo -e "${RED}[E2E Setup] Migration failed${NC}"
  exit 1
fi
echo -e "${GREEN}[E2E Setup] Migrations completed!${NC}"

# Start the application in background
echo -e "${YELLOW}[E2E Setup] Starting NestJS application...${NC}"
yarn start:prod &
APP_PID=$!
echo -e "${YELLOW}[E2E Setup] Application started with PID $APP_PID${NC}"

# Wait for the application to be healthy
echo -e "${YELLOW}[E2E Setup] Waiting for application to be ready at http://127.0.0.1:$SERVICE_PORT/health...${NC}"
RETRY_COUNT=0
while true; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -gt $MAX_RETRIES ]; then
    echo -e "${RED}[E2E Setup] Application failed to start after ${MAX_RETRIES} attempts${NC}"
    echo -e "${RED}[E2E Setup] Last curl error:${NC}"
    curl -v "http://127.0.0.1:$SERVICE_PORT/health" 2>&1 | tail -10
    kill $APP_PID 2>/dev/null || true
    exit 1
  fi

  HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "http://127.0.0.1:$SERVICE_PORT/health" 2>/dev/null)
  HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}[E2E Setup] Application is healthy!${NC}"
    break
  fi

  echo -e "${YELLOW}[E2E Setup] Waiting for application to be ready... (attempt $RETRY_COUNT/$MAX_RETRIES, HTTP $HTTP_CODE)${NC}"
  sleep $RETRY_DELAY
done

echo -e "${GREEN}[E2E Setup] All systems ready! Starting E2E tests...${NC}"

# Run E2E tests
yarn test:e2e
TEST_RESULT=$?

# Cleanup
echo -e "${YELLOW}[E2E Setup] Cleaning up...${NC}"
kill $APP_PID 2>/dev/null || true
wait $APP_PID 2>/dev/null || true

exit $TEST_RESULT
