# Vault - Monorepo Project

A modern, full-stack application combining a NestJS backend with a Next.js frontend, orchestrated through Docker Compose with automated CI/CD pipelines.

## 📋 Project Structure

```
vault-projet/
├── vaultedMind/           # NestJS Backend
│   ├── src/               # Source code
│   ├── test/              # Test files
│   ├── dist/              # Built output
│   ├── package.json       # Dependencies
│   ├── yarn.lock          # Lockfile
│   └── tsconfig.json      # TypeScript config
├── vault-front/           # Next.js Frontend
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   ├── .next/             # Build output
│   ├── package.json       # Dependencies
│   └── tsconfig.json      # TypeScript config
├── docker-compose.yml     # Docker Compose configuration
├── backend.Dockerfile     # Backend Docker build
├── frontend.Dockerfile    # Frontend Docker build
└── .github/workflows/     # CI/CD pipelines
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose (latest)
- Node.js 24.x (for local development)
- Yarn 4.6.0+ (for backend)
- npm 10.x+ (for frontend)

### Development Mode

1. **Setup environment variables**

```bash
# Copy example env files
cp vaultedMind/.env.example vaultedMind/.env.local
cp vault-front/.env.example vault-front/.env.local
```

2. **Backend development**

```bash
cd vaultedMind
yarn install
yarn dev
```

Server runs at `http://localhost:3001`

3. **Frontend development**

```bash
cd vault-front
npm install
npm run dev
```

App runs at `http://localhost:3000`

### Production with Docker Compose

```bash
# Build and start all services
docker compose up --build

# Run in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Services:**
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Database**: postgres://localhost:5432

### Environment Variables

Create a `.env` file at the project root:

```env
# Database
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=vaultedmind
DB_PORT=5432

# Backend
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Ports
FRONTEND_PORT=3000
BACKEND_PORT=3001

# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NODE_ENV=production
```

## 🧪 Testing

### Backend Tests

```bash
cd vaultedMind

# Unit tests
yarn test:unit

# E2E tests (requires Docker)
yarn test:e2e

# All tests
yarn test
```

### Frontend Tests

```bash
cd vault-front

# Jest tests
npm test

# E2E tests (requires running app)
npm run test:e2e
```

## 🔨 Build & Deployment

### Build Docker Images Locally

```bash
# Build both images
docker compose build

# Build specific service
docker compose build backend
docker compose build frontend
```

### Production Build

```bash
# Backend
cd vaultedMind
yarn build

# Frontend
cd vault-front
npm run build
```

## 🚦 CI/CD Pipelines

Automated workflows run on every push to `main` and `develop` branches:

### Backend Pipeline (`.github/workflows/backend.yml`)
- ✅ Install dependencies
- ✅ Lint code
- ✅ Build application
- ✅ Run unit tests
- ✅ Build Docker image

**Trigger**: Changes in `vaultedMind/`, `backend.Dockerfile`, or `docker-compose.yml`

### Frontend Pipeline (`.github/workflows/frontend.yml`)
- ✅ Install dependencies
- ✅ Lint code
- ✅ Build application
- ✅ Build Docker image

**Trigger**: Changes in `vault-front/`, `frontend.Dockerfile`, or `docker-compose.yml`

### E2E Tests (`.github/workflows/backend-e2e.yml`)
- ✅ Setup test database
- ✅ Run migrations
- ✅ Run E2E tests
- ✅ Upload coverage reports

**Trigger**: Changes in `vaultedMind/` or `docker-compose.yml`

## 📦 Monorepo Guidelines

### Adding Dependencies

**Backend (Yarn):**
```bash
cd vaultedMind
yarn add package-name
```

**Frontend (npm):**
```bash
cd vault-front
npm install package-name
```

### File Structure Rules

- **Backend**: Keep NestJS modules organized in `src/`
- **Frontend**: Follow Next.js App Router conventions in `src/`
- **Docker**: Use Dockerfiles at project root with names: `backend.Dockerfile`, `frontend.Dockerfile`
- **CI/CD**: All workflows in `.github/workflows/`
- **Config**: Environment variables in `.env` files (git-ignored)

## 📝 Git Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature branches

### Commit Conventions

```bash
# Format: type(scope): message
git commit -m "feat(auth): add JWT refresh token"
git commit -m "fix(api): handle null response"
git commit -m "docs(readme): update setup instructions"
```

### Before Pushing

```bash
# Backend
cd vaultedMind
yarn lint
yarn test

# Frontend
cd vault-front
npm run lint
npm test
```

## 🐛 Troubleshooting

### Docker Issues

```bash
# Clean up all containers and volumes
docker compose down -v

# Rebuild from scratch
docker compose up --build --no-cache

# Check service logs
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
```

### Database Issues

```bash
# Reset database
docker compose down -v
docker compose up -d postgres
yarn migration:run
```

### Permission Errors

```bash
# Fix node_modules permissions
chmod -R 755 node_modules
```

## 🔒 Security Considerations

- **Secrets**: Store in `.env.local` (git-ignored)
- **Database**: Default credentials are for development only
- **CORS**: Configure `NEXT_PUBLIC_BACKEND_URL` correctly
- **SSL**: Use HTTPS in production

## 📚 Documentation

- **Backend**: See `vaultedMind/README.md`
- **Frontend**: See `vault-front/README.md`
- **API**: Check NestJS controllers for endpoints
- **Database**: See migrations in `vaultedMind/src/migrations/`

## 🤝 Contributing

1. Create a feature branch from `develop`
2. Make changes and test locally
3. Commit with conventional messages
4. Push and create a pull request
5. Ensure CI/CD pipelines pass
6. Request review and merge

## 📄 License

All rights reserved.

---

**Last Updated**: 2026-05-09
**Maintainers**: Development Team
