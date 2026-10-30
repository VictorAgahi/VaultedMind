# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Next.js on port 3000)
npm run build     # Production build
npm run lint      # ESLint
```

No test suite is configured. UI verification requires running `npm run dev` and inspecting in browser.

## Project Overview

**VaultedMind** — a French-language mental health journaling PWA with AES-256 encryption. Backend is a separate service at `http://vault-backend` (server-side) or `NEXT_PUBLIC_BACKEND_URL` (client-side, defaults to `http://localhost:8080`).

## Architecture

### Auth Flow
- `src/middleware.ts` — Edge middleware that decodes JWT from `access_token` cookie and redirects unauthenticated requests to `/login`. Public routes: `/, /login, /register, /about, /contact, /privacy, /terms`.
- `src/context/auth-context.tsx` — Client-side `AuthProvider` wrapping the entire app. Calls `/auth/me` on mount. Use `useAuth()` hook to access `user`, `isAuthenticated`, `login`, `logout`.
- Session expiry (`401` only; a `403` such as `AI_CONSENT_REQUIRED` is surfaced as an error message, and network errors never log out) in `apiService` triggers `window.location.href = "/login?reason=session_expired"`, which middleware uses to clear the cookie.

### API Layer
- `src/services/api.service.ts` — Singleton `apiService` with typed `.get<T>()`, `.post<T,D>()`, `.put<T,D>()`, `.patch<T,D>()`, `.delete<T>()`. All requests use `credentials: "include"` for cookie-based auth. Always import from `@/services/api.service`.

### UI Stack
- **MUI v9** (Material UI) is the primary component library — use MUI components, not Shadcn/Radix.
- **Tailwind CSS v4** is also available but MUI is dominant. Avoid mixing both in the same component.
- Theme is defined in `src/theme/theme.ts` (charte "Le carnet scellé": primary `#1E5B53`, accent `#F2B544`, light + dark color schemes via MUI CSS variables). Never hard-code colors: use palette paths (`primary.main`) or `var(--mui-palette-*)`. Chart colors come from `src/theme/chart-tokens.ts` (CSS vars defined in `globals.css`), max 6 series in fixed order.
- Mobile-first: bottom nav (`bottom-nav.tsx`) with a central "new entry" button that dispatches `NEW_ENTRY_EVENT`; dialogs become bottom sheets under 600px (theme override); charts use `ChartContainer` (fixed 240px height on mobile) and `ChartCard`.
- Saving a day goes through `POST /health/daily-logs/entry` (atomic: log + values + `clearedFieldIds`). Offline saves are queued by `src/utils/entry-outbox.ts` and flushed on `online`.
- AI: the assistant is the full-screen route `/ai/chat` (`chat-screen.tsx`, sized with `visualViewport` so the composer stays above the keyboard). AI requires explicit consent via `AiConsentDialog`; replies with `safety: true` must show `CrisisResources`.
- New accounts land on `/onboarding` (field packs in `components/onboarding/field-packs.ts`); accounts with zero fields are redirected there.
- Global layout (`src/app/layout.tsx`) wraps everything in: `AppRouterCacheProvider` → `ThemeProvider` → `AuthProvider`. The `<AIChatBot>`, `<BottomNav>`, and `<Footer>` are rendered globally.

### Page Pattern
Pages are thin server components that delegate to a `*-client.tsx` file:
```
src/app/dashboard/page.tsx  →  dashboard-client.tsx  (Client Component)
src/app/analytics/page.tsx  →  analytics-client.tsx  (Client Component)
```

### Key Features & Their Components
| Feature | Location |
|---|---|
| Daily log CRUD | `src/components/daily-logs-manager/` |
| Analytics / charts | `src/components/analytics/` (Recharts-based) |
| AI insights panel | `src/components/ai-insights/insights-panel.tsx` |
| AI chatbot | `src/components/ai-insights/ai-chatbot.tsx` |
| Custom fields | `src/components/custom-fields-manager/` |
| CSV bulk import | `src/app/import/` |
| Correlation study | `src/components/correlation-study/` |

### Data Types
All shared types live in `src/types/index.ts`. Key types: `User`, `DailyLog`, `CustomField`, `FieldType` (enum), `AIInsightResponseDto`, `BulkImportDto`.

## Important Constraints

- **No `useEffect` for data fetching** — use Server Components or Server Actions instead. `useEffect` is only acceptable for non-data concerns (event listeners, DOM side-effects, AbortController cleanup).
- **MUI over Tailwind** for new components — the project uses MUI's `sx` prop and `Box`/`Stack` layout primitives pervasively.
- **PWA** — the app has a web manifest and service worker (`sw.js`). Don't break the `manifest.ts` or `robots.ts` files in `src/app/`.
- **French UI** — all user-facing text is in French. Keep it consistent.
