# CLAUDE.md

Guidance for Claude Code when working in this repo.

## Project status

Active. Backend (Spring Boot) and frontend (Next.js) both scaffolded and feature-rich: auth (local + Google OAuth2), movies, series, reviews, custom lists, favorites, awards, people, public profiles, admin. 20+ commits. Flyway at V10. Originally developed on Windows; primary dev machine is now Linux.

The README is the original spec — the code has diverged from it (current state below is authoritative). When user requests contradict the README, follow the running code.

## Stack (real)

- **Backend**: Java 21, Spring Boot 3.5.0 (Web, Security, OAuth2 Client, Data JPA, Validation, Actuator), PostgreSQL, MapStruct, Lombok, Flyway, jjwt, Springdoc OpenAPI, Bucket4j (rate limiting), Logstash Logback encoder.
- **Frontend**: Next.js 16.2.4, React 19.2, TypeScript 5, TailwindCSS 4, shadcn/ui (Radix), TanStack Query 5, Zustand 5, Axios, Sonner, next-themes.
- **DB**: PostgreSQL (Supabase in prod via transaction pooler, see commit `8750eef`; local Postgres 16 via docker-compose).
- **Package managers**: backend Maven (`./mvnw`); frontend **pnpm** (lockfile committed — never use npm/yarn here).
- **Deploy**: Vercel (frontend), Render (backend, see `render.yaml`), Supabase (DB), GitHub Actions (CI + keep-alive scheduler, commit `9f19d01`).

## Backend layout

`backend/src/main/java/com/moviereviewhub/`:

```
common/  config/  exception/  security/  shared/
MoviereviewhubApplication.java
modules/
  admin/  auth/  favorite/  list/  movie/  people/
  review/  series/  seriesfavorite/  seriesreview/  tmdb/  user/
```

Conventions in use:

- API versioned under `/api/v1/...`.
- Controllers return DTOs, never entities. Pagination via `Page<T>`.
- Validation on request DTOs (`@NotBlank`, `@Email`, `@Size`).
- Centralized error handling via `@RestControllerAdvice`.
- JPA auditing (`createdAt`, `updatedAt`, `createdBy`).
- Soft delete (`deleted` flag) on users/reviews.
- Flyway migrations in `backend/src/main/resources/db/migration/` (currently `V1__init.sql` through `V10__user_profile_fields.sql`). Always add the next `V{N+1}__...sql` — never edit applied migrations.

### Auth

- Local: `BCryptPasswordEncoder` + JWT. Access 15 min in-memory; refresh 7 days as secure cookie, persisted in DB. Refresh via `POST /api/v1/auth/refresh`.
- OAuth2: Google (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`). Success → `OAUTH2_SUCCESS_REDIRECT` (default `http://localhost:3000/oauth/callback`). Profile completion flow exists for OAuth-only accounts.
- Roles: `ROLE_USER`, `ROLE_ADMIN`. `JwtAuthenticationFilter` registered in `SecurityFilterChain`.

### Required env vars (backend)

`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` (base64, 256-bit), `JWT_ACCESS_EXPIRATION_MS`, `JWT_REFRESH_EXPIRATION_MS`, `SERVER_PORT`, `CORS_ALLOWED_ORIGINS`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `TMDB_API_KEY`. Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH2_SUCCESS_REDIRECT`, `OAUTH2_FAILURE_REDIRECT`, `OAUTH2_ALLOWED_REDIRECT_ORIGINS`, `FLYWAY_DB_URL`, `TMDB_BASE_URL`, `TMDB_IMAGE_BASE_URL`, `TMDB_POSTER_SIZE`.

Local dev: `backend/.env` (gitignored). Sample: `.env.compose.example` at repo root (used by docker-compose).

## Frontend layout

`frontend/src/`:

```
app/  components/  features/  hooks/  lib/
services/  store/  types/  utils/
```

`features/` domains in use: `account`, `admin`, `auth`, `awards`, `cards`, `favorites`, `lists`, `movies`, `people`, `profile`, `reviews`, `series`. Co-locate hooks/components/services per feature.

Server state → TanStack Query. Cross-feature client state → Zustand. Do not mirror server data into Zustand.

API base URL via `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api/v1`).

## Commands

Backend (from `backend/`):
- Dev run with `.env` loaded: `./run-dev.sh` (Linux/macOS). Logs tee'd to `backend.log`.
- Build: `./mvnw clean package`
- Tests: `./mvnw test`

Frontend (from `frontend/`):
- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`

Full stack via Docker:
- `cp .env.compose.example .env` (repo root) → fill values → `docker compose up --build`.

## Seed scripts

Located at repo root. Originally PowerShell (`seed-tmdb.ps1`, `seed-users.ps1`, `seed-series-reviews.ps1`). On Linux run with `pwsh` (PowerShell Core), or port to bash when modifying — do not assume they work in plain bash.

## Linux migration notes

Project migrated from Windows. Things to know:
- `mvnw` is `+x` (commit `9f19d01`).
- `backend/run-dev.ps1` is the Windows version; `backend/run-dev.sh` is the Linux equivalent.
- `mvnw.cmd` is harmless; leave it.
- If `frontend/node_modules` was copied from Windows it will break — reinstall with `pnpm install`.
- Watch for CRLF in shell scripts if they fail to execute (`file backend/run-dev.sh`).
