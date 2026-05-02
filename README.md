# MovieReviewHub

Full-stack movie catalog with reviews, ratings, favorites, and TMDB integration. Built as a portfolio project showcasing modern Java/Spring + Next.js patterns end-to-end: JWT auth with refresh rotation, modular monolith backend, TanStack Query state management, Docker deploy, and CI on every push.

**Live demo**

- App: <https://movie-review-hub-tau.vercel.app>
- API docs: <https://moviereviewhub-backend.onrender.com/swagger-ui.html>
- Health: <https://moviereviewhub-backend.onrender.com/actuator/health>

> Backend runs on Render free tier and sleeps after 15 min idle. First request after sleep takes ~30s while the container wakes up.

---

## Stack

**Backend** — Java 21 · Spring Boot 3.5 · Spring Security · Spring Data JPA · PostgreSQL · Flyway · JJWT · Springdoc OpenAPI · Bucket4j · Logstash JSON logs · Testcontainers · JUnit 5 · Mockito

**Frontend** — Next.js 16 (App Router) · TypeScript · TailwindCSS · shadcn/ui · TanStack Query · Zustand · next-themes · sonner · axios

**Infra** — Docker (multi-stage, non-root) · docker-compose · GitHub Actions · Render (backend) · Vercel (frontend) · Supabase (Postgres) · UptimeRobot (keep-alive)

---

## Features

### Public

- Movie catalog with search by title, filter by genre, infinite scroll.
- Movie detail with rating average, reviews list, "More like this" carousel.
- Trending and Top Rated rows on home (data-driven from real activity).
- Dark mode with system detection.
- Skeleton loaders, search debounce, toast notifications, mobile-first responsive.
- Dynamic SEO (`generateMetadata` per movie with OpenGraph + Twitter cards).

### Authenticated

- JWT auth: 15 min access (in-memory) + 7-day refresh (httpOnly cookie, DB-tracked, rotated on use).
- Silent session restore on app load.
- Profile page with own reviews and favorites tabs.
- Write/edit/delete reviews (1 per movie), toggle favorites.
- Auto-retry on 401 via interceptor + dedup-safe refresh.

### Admin

- User management: list, search, ban/unban (soft delete) — guard against self-ban.
- Review moderation: list all, delete any.
- Movie CRUD with form validation.
- Stats dashboard: counts of users, movies, reviews, favorites.
- TMDB import: search The Movie Database, import movies into local catalog with one click; idempotent via `tmdb_id` unique index.

### Production

- Rate limiting on auth endpoints (10 req/min per IP via Bucket4j, X-Forwarded-For aware).
- Structured JSON logs in prod (logstash-logback-encoder, parseable by any log platform).
- Pretty colored logs in dev.
- Cross-site cookie config (`SameSite=None`, `Secure`) for Vercel ↔ Render setup.
- Spring Actuator health endpoint for uptime monitoring.

---

## Architecture

### Backend (modular monolith)

```
src/main/java/com/moviereviewhub/
  common/          — BaseEntity (audit + soft delete), shared DTOs, audit
  config/          — @ConfigurationProperties, RestClient, JpaAuditing
  security/        — SecurityFilterChain, JWT filter, rate limit filter, UserDetails
  exception/       — ApiException hierarchy, GlobalExceptionHandler
  modules/
    auth/          — register, login, refresh (rotation), logout
    user/          — User entity, /me, role-based authorization
    movie/         — CRUD, search, trending, top-rated, similar (native SQL)
    review/        — owner-only edit, owner-or-admin delete, rating stats
    favorite/      — composite PK (user_id, movie_id), idempotent toggle
    tmdb/          — RestClient → TMDB API → import to DB
    admin/         — user/review listing, ban, stats aggregation
```

Conventions: DTOs always (no entity leakage), `@Valid` request validation, `Page<T>` for lists, `@PreAuthorize` for admin routes, soft delete via `deleted` flag, audit columns auto-populated via `AuditingEntityListener` + custom `SecurityAuditorAware`.

### Frontend

```
src/
  app/             — Next.js App Router (pages + layouts + server components for SEO)
  features/        — domain-grouped (auth, movies, reviews, favorites, admin)
                     each feature has services/, hooks/, components/
  components/      — shared UI (shadcn primitives + theme toggle + admin nav)
  lib/             — axios instance with interceptors (Bearer + 401 refresh dedup)
  store/           — Zustand for in-memory access token only
  hooks/           — useDebouncedValue, useIntersection
  types/           — TS types mirroring backend DTOs
```

State boundaries:

- **Server state** → TanStack Query (queries + mutations + invalidations).
- **Client cross-feature state** → Zustand (only auth token).
- **Local UI state** → `useState`.
- Cookies (refresh token) handled by browser, never read by JS.

### Auth flow

```
register  →  201
login     →  body: accessToken (memory) + Set-Cookie: refreshToken (httpOnly, 7d)
api call  →  Authorization: Bearer <access>
401       →  axios interceptor calls /auth/refresh
refresh   →  validates DB row, rotates: revokes old, issues new pair
logout    →  revokes server-side, clears cookie
app boot  →  silent /auth/refresh restores session if cookie valid
```

---

## Quick start (Docker)

```bash
git clone https://github.com/juliosnchz264/MovieReviewHub.git
cd MovieReviewHub
cp .env.compose.example .env       # generate JWT_SECRET inside
docker compose up --build
```

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:8080>
- Postgres: localhost:5432

Generate a real JWT secret:

```bash
# Linux/macOS
openssl rand -base64 32
```

```powershell
# Windows PowerShell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

---

## Local dev (without Docker)

### Backend

```powershell
cd backend
.\run-dev.ps1                      # loads backend/.env then mvnw spring-boot:run
```

Requires Java 21 + a Postgres reachable (Supabase or local).

### Frontend

```powershell
cd frontend
pnpm install
pnpm dev
```

`.env.local` needs `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`.

### Seed data

```powershell
.\seed-movies.ps1                  # ~15 popular movies with TMDB posters
.\seed-users.ps1 -UserCount 20     # users + reviews + favorites
```

Or import directly from TMDB UI: log in as admin → `/admin/movies/import`.

---

## Tests

```powershell
cd backend
.\mvnw test
```

- Unit (Mockito): `AuthServiceTest`
- Integration (Testcontainers + real Postgres + Spring context): `UserRepositoryTest`, `AuthControllerIT`

Requires Docker daemon running. CI runs them on Ubuntu where this is rock solid; on Windows + Docker Desktop newer engines occasional flakes are known.

---

## CI / CD

- `.github/workflows/backend.yml` — Maven test + package + jar artifact (path-filtered to `backend/**`).
- `.github/workflows/frontend.yml` — pnpm lint + Next build (path-filtered to `frontend/**`).
- Render auto-deploys backend on push to `master` (Blueprint in `render.yaml`).
- Vercel auto-deploys frontend on push to `master` (root dir `frontend`).

---

## Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step Supabase + Render + Vercel setup, including cross-site cookie configuration and free-tier caveats.

---

## What I learned building this

- Wiring JWT refresh rotation cleanly without leaking access tokens to localStorage.
- Cross-site cookie pitfalls when frontend and backend live on different domains (Vercel ↔ Render).
- Cache invalidation strategy in TanStack Query (broad-key invalidation vs surgical `setQueryData` for optimistic UI).
- Splitting Next.js client components from server components purely for `generateMetadata` SEO without losing interactivity.
- Native SQL vs JPQL trade-offs for trending/recommendation queries with subqueries.
- Bucket4j as a lightweight rate limit before reaching for Redis.
- Spring profiles to swap log encoders (pretty in dev, JSON in prod) without code changes.

---

## Roadmap (not yet implemented)

- Per-movie OG image generation (instead of poster) for richer link previews.
- Review reactions (helpful / unhelpful).
- Email verification on register.
- E2E tests with Playwright.

---

## License

MIT
