# 🚀 VaultedMind Backend

The secure engine of VaultedMind, built with NestJS and focused on cryptographic integrity and high-performance health tracking.

## 🛡️ Security Architecture

### 1. Data Encryption (AES-256-GCM)
The core of our privacy model. We use `AES-256-GCM` with a unique Initialization Vector (IV) for every record.
- **Keys**: Managed via environment variables in production (K8s Secrets).
- **Scope**: User journals, custom field names, and field values are all encrypted at rest.

### 2. PII Anonymization (Blind Indexing)
To allow searching for users without storing their emails in plain text, we use **Blind Indexing**:
- An HMAC of the email is stored in a dedicated `email_index` column.
- This allows `O(1)` lookups while maintaining zero-knowledge of the user's actual email address in the index.

### 3. Protection Against Brute-Force
All authentication endpoints are protected by `ThrottlerModule`:
- **Login/Register**: Limited to 5 requests per minute per IP.

---

## 🏗️ Design Patterns
- **Domain-Driven Design (DDD)**: Logic is isolated into modules (Auth, Health, Common).
- **Repository Pattern**: Abstracted data access via TypeORM.
- **DTO Validation**: Strict typing and validation using `class-validator`.

---

## 🛠️ Development

### Installation
```bash
yarn install
```

### Running Locally
```bash
# Development mode
yarn dev

# Production build
yarn build
yarn start:prod
```

### Database Migrations
```bash
# Generate a new migration
yarn migration:generate src/database/migrations/Name

# Run migrations
yarn migration:run

# Revert last migration
yarn migration:revert
```

---

## 🧪 Testing
We maintain a high standard of testing to ensure cryptographic services never fail.

```bash
# Unit tests
yarn test

# E2E tests (Requires a running Postgres instance)
yarn test:e2e
```

---

## 📡 API Endpoints (Quick Ref)
- `POST /auth/register`: User signup.
- `POST /auth/login`: User authentication (JWT).
- `GET /health/daily-logs`: Fetch encrypted journals.
- `POST /health/import`: Bulk import from CSV/JSON.

---
© 2026 VaultedMind Backend Team
