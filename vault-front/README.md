# VaultedMind Frontend

A premium, glassmorphic mental health dashboard built with Next.js 15 and Material UI.

## Features
- **Modern Dashboard**: Visual progress tracking with Recharts.
- **Dynamic Journals**: Fluid entry system for daily logs and custom metadata.
- **Premium UI**: Glassmorphism, smooth transitions, and high-quality typography (Inter/Outfit).
- **Responsive Design**: Fully optimized for Desktop, Tablet, and Mobile.
- **Zero-Knowledge Sync**: Data is decrypted only on the client-side (future goal) / Secure API communication.

---

## Frontend Security
- **Strict CSP**: Content Security Policy allows only trusted API domains.
- **HSTS Enforcement**: Ensuring all traffic remains on HTTPS.
- **JWT Persistence**: Secure HttpOnly cookies (in production) / Managed auth state.
- **Public Safety Pages**: Built-in Privacy, Terms, and Contact pages for compliance.

---

## Development

### Setup
```bash
npm install
```

### Run
```bash
npm run dev
```

### Environment Variables
Required in .env.local:
```bash
NEXT_PUBLIC_BACKEND_URL=https://api-vault-mind.cyrus-ag.com
```

---

## Architecture
- `src/app`: Next.js App Router (File-based routing).
- `src/components`: Atomic design inspired components (Atoms, Molecules, Organisms).
- `src/services`: API communication layer using Axios/Fetch.
- `src/theme`: Centralized MUI theme configuration.

---

## Build & Deployment
```bash
# Production build
npm run build

# Start production server
npm start
```

---
© 2026 VaultedMind
