# 🎬 MovieReviewHub

Catálogo de Películas con Reseñas desarrollado con arquitectura moderna Full Stack, seguridad JWT y despliegue cloud gratuito.

---

## 🚀 Stack Tecnológico

### Backend

* ✅ Java 21 + Spring Boot 3.4+
* Spring Web
* Spring Security
* Spring Data JPA
* Validation
* PostgreSQL Driver
* Lombok (opcional)
* MapStruct
* Springdoc OpenAPI
* Flyway
* Testcontainers
* JWT con jjwt o Auth0 java-jwt

### Frontend

* React + Next.js 15+
* TypeScript
* TailwindCSS
* TanStack Query
* Zustand
* Axios o Fetch API
* UI: Tailwind + shadcn/ui
* Estado: Zustand (global) + TanStack Query (server state)

### Base de Datos

* Supabase PostgreSQL

---

## 📁 Arquitectura Backend

```text
src/main/java/com/moviereviewhub

common/
config/
security/
exception/
modules/
  auth/
  user/
  movie/
  review/
  favorite/
  admin/
shared/
```

---

## 🔐 JWT Security Correcto

* Access Token corto: 15 min
* Refresh Token largo: 7 días
* Guardar Refresh Token en DB
* Passwords: BCryptPasswordEncoder
* Roles:

  * ROLE_USER
  * ROLE_ADMIN
* Filtros:

  * JwtAuthenticationFilter
  * SecurityFilterChain

---

## 🧱 Entidades Recomendadas

### User

```text
id
username
email
password
role
createdAt
updatedAt
createdBy
```

### Películas

```text
id
title
description
genre
imageUrl
releaseDate
createdAt
updatedAt
createdBy
```

### Review

```text
id
rating (1-5)
comment
user_id
movie_id
createdAt
updatedAt
createdBy
```

### Auditoría

* `@EnableJpaAuditing`

### Soft Delete

```text
deleted = true
```

Especialmente reviews y users.

---

## 🔗 Relaciones

```text
users ↔ reviews           1:N
movies ↔ reviews          1:N
users ↔ favorites ↔ movies N:N
```

---

## 📈 Escalabilidad REAL (Tips Pro)

1. DTO siempre (nunca devolver entities directas)
2. Paginación `Page<Movie>`
3. Logs con SLF4J + Logback
4. Rate limiting con Bucket4j
5. Validaciones:

   * `@NotBlank`
   * `@Email`
   * `@Size`
6. Manejo global de errores `@RestControllerAdvice`
7. Versionado API `/api/v1/movies`
8. Swagger con Springdoc OpenAPI
9. Docker desde el inicio
10. Tests obligatorios

### Tests Unitarios

* Services
* JWT utils

### Tests de Integración

* Controllers
* Repositories

### Herramientas

* JUnit 5
* Mockito
* Testcontainers

---

## 🌟 Funcionalidades TOP para Portfolio

### Usuario

* Registro/Login JWT
* Perfil
* Favoritos
* Mis reviews

### Películas

* Buscar
* Filtrar
* Categorías
* Ver detalle

### Reviews

* Crear review
* Editar review
* Rating promedio

### Admin

* CRUD películas
* Ban users

---

## 🖥️ Frontend Senior Architecture

```text
src/

app/
features/
components/
hooks/
lib/
services/
store/
types/
utils/
```

### Features

```text
features/auth
features/movies
features/reviews
features/profile
features/admin
```

---

## 💼 Para que se vea Senior

Añade:

* CI/CD GitHub Actions
* Docker Compose
* Tests unitarios
* Tests integración
* Dark mode
* Responsive
* SEO

### UI que impresiona reclutadores

* Skeleton loaders
* Infinite scroll
* Search debounce
* Dark mode
* Responsive perfecto
* Toast notifications
* Loading states

---

## 🎬 Portfolio Top Top

### Integra API externa

* TMDB
* Posters reales

---

## ☁️ Despliegue Gratis Realista 2026

### Frontend

* Vercel

### Backend

* Render

### DB

* Supabase

### CI/CD

* GitHub Actions

---

## 🚀 MVP REAL (Versión 1)

### Auth

```text
Login
↓
Access token guardado en memoria
Refresh token cookie segura
API calls con Authorization Bearer accessToken
Expira access token
↓
POST /refresh automático
↓
Nuevo access token
```

### Movies

* Listar películas
* Buscar por título
* Filtrar por género
* Ver detalle película

### Reviews

* Crear reseña
* Editar propia reseña
* Eliminar propia reseña
* Rating promedio

### User

* Perfil
* Mis reviews
* Favoritos

---

## 🏆 V2 (Nivel Reclutador)

### Admin Panel

* CRUD películas
* Ban usuarios
* Dashboard stats
* Moderar reviews

### UX

* Dark mode
* Skeleton loading
* Infinite scroll
* Toasts
* Mobile first

---

## 🧠 V3 (Nivel SaaS)

### Inteligencia

* Recomendaciones similares
* Tendencias
* Mejor puntuadas
* IA resumen reseñas
