#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[E2E Setup] Starting E2E test setup...${NC}"

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-vaultedmind_test}"
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

echo -e "${GREEN}[E2E Setup] All prerequisites ready! Starting E2E tests...${NC}"

# Run E2E tests (Jest manages app lifecycle via TestClient)
yarn test:e2e
TEST_RESULT=$?

exit $TEST_RESULT
