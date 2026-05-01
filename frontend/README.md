# MovieReviewHub — Frontend

Next.js 15 (App Router) + TypeScript + TailwindCSS + shadcn/ui (Radix + Lucide + Geist) + TanStack Query + Zustand.

## Requisitos

- Node 20+
- pnpm 9+

## Setup

```powershell
pnpm install
cp .env.example .env.local   # o crea manual
pnpm dev
```

Abre <http://localhost:3000>.

## Variables de entorno

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

Reglas:

- `NEXT_PUBLIC_*` viaja al cliente. Solo URLs públicas, NUNCA secrets.
- Refresh token vive en cookie `httpOnly` emitida por el backend. Access token solo en memoria (Zustand). NO usar `localStorage`.

## Estructura

```text
src/
  app/          # rutas App Router + layouts + page.tsx
  features/     # logica por dominio (auth, movies, reviews, profile, admin)
  components/   # UI compartida (shadcn primitives + custom)
  hooks/        # hooks reutilizables cross-feature
  lib/          # cliente API, utils transversales (axios, tanstack config)
  services/     # llamadas API (las de cada feature viven en features/<x>/services)
  store/        # Zustand global (solo client state cross-feature)
  types/        # tipos TS compartidos (DTOs del backend)
  utils/        # helpers puros sin estado
```

Reglas:

- Estado servidor → TanStack Query. NO duplicar en Zustand.
- Estado cliente cross-feature (theme, auth token in-memory, toasts) → Zustand.
- Estado cliente local → `useState`.
- DTOs del backend tipados en `types/` y derivados de los DTO Java.

## Scripts

```powershell
pnpm dev       # dev server con Turbopack
pnpm build     # build prod
pnpm start     # arranca build prod
pnpm lint      # ESLint
```

## Deploy

Vercel — Project Settings:

- Root Directory: `frontend`
- Framework: Next.js (auto)
- Build command: `pnpm build`
- Env vars: `NEXT_PUBLIC_API_URL` apunta al backend en Render.
