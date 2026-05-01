# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Greenfield. The repository currently contains only `README.md` and empty `backend/` and `frontend/` directories — no commits, no build files, no source. The README is the spec; this file summarizes the load-bearing decisions inside it so future instances do not have to re-derive them.

When asked to scaffold, follow the structure and tech choices below rather than inventing new ones. When the user asks for something that contradicts the README (e.g., a different DB, a different auth scheme), confirm the deviation explicitly before generating code.

## Stack (planned)

- **Backend**: Java 21, Spring Boot 3.4+ (Web, Security, Data JPA, Validation), PostgreSQL, MapStruct, Flyway migrations, Springdoc OpenAPI, Testcontainers, JWT (jjwt or Auth0 java-jwt).
- **Frontend**: Next.js 15+ with React + TypeScript, TailwindCSS + shadcn/ui, TanStack Query (server state) + Zustand (client/global state).
- **DB**: Supabase PostgreSQL.
- **Deploy targets**: Vercel (frontend), Render (backend), Supabase (DB), GitHub Actions (CI/CD).

## Backend architecture (planned)

Modular package layout under `src/main/java/com/moviereviewhub`:

```
common/        config/        security/      exception/
modules/
  auth/  user/  movie/  review/  favorite/  admin/
shared/
```

Conventions baked into the spec (apply these without being asked):

- **API versioning**: routes under `/api/v1/...`.
- **DTOs always** — controllers must never return JPA entities.
- **Pagination**: list endpoints return `Page<T>`.
- **Validation**: `@NotBlank`, `@Email`, `@Size` on request DTOs.
- **Errors**: centralized via `@RestControllerAdvice`.
- **Auditing**: `@EnableJpaAuditing` with `createdAt`, `updatedAt`, `createdBy` on every entity.
- **Soft delete**: `deleted` flag (especially on `users` and `reviews`) — never hard-delete.

### JWT model

- Access token: 15 min, in-memory on the client.
- Refresh token: 7 days, persisted in DB, delivered as a secure cookie.
- Passwords: `BCryptPasswordEncoder`.
- Roles: `ROLE_USER`, `ROLE_ADMIN`.
- Filters: `JwtAuthenticationFilter` registered in `SecurityFilterChain`.
- Refresh flow is server-driven: `POST /refresh` issues a new access token from the refresh cookie.

### Domain relations

```
users ↔ reviews             1:N
movies ↔ reviews            1:N
users ↔ favorites ↔ movies  N:N
```

## Frontend architecture (planned)

```
src/
  app/  features/  components/  hooks/  lib/  services/  store/  types/  utils/
```

`features/` is split by domain (`auth`, `movies`, `reviews`, `profile`, `admin`) — co-locate hooks, components, and services per feature rather than splitting by technical layer across the tree.

Server state goes through TanStack Query; only cross-feature client state belongs in Zustand. Don't mirror server data into Zustand.

## Commands

No build tooling has been initialized yet. Once scaffolded:
- Backend will use Maven or Gradle (decide at scaffold time).
- Frontend will use the package manager chosen during `create-next-app` (default: npm).

Until then, do not fabricate commands. If the user asks to "run tests" or "build" before scaffolding, scaffold first or ask which tool to set up.
