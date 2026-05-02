# Deployment Guide

Stack prod: **Vercel** (frontend) + **Render** (backend) + **Supabase** (Postgres). Free tier todo.

---

## 1. Supabase — DB

Ya tienes proyecto. Si no:

1. <https://supabase.com> → New project. Region cerca de Render (Frankfurt si vas a usar región EU).
2. Settings → Database → **Connection string** → tab **JDBC**.
3. Copia los datos del **Session Pooler** (puerto 5432, IPv4):
   - Host: `aws-0-<region>.pooler.supabase.com`
   - User: `postgres.<projectref>`
   - Password: el de la DB (no el de tu cuenta Supabase)
   - JDBC URL: `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres`

> NO uses Direct (puerto 5432 + `db.<ref>.supabase.co`) en Render free — es IPv6, Render no lo alcanza.

> NO uses Transaction Pooler (puerto 6543) con JPA — rompe PreparedStatements.

---

## 2. Backend en Render

### 2.1. Conecta el repo

1. <https://render.com> → New → **Blueprint**.
2. Conecta GitHub repo `MovieReviewHub`.
3. Render detecta `render.yaml` y propone crear el servicio.
4. Aprueba. Render no podrá hacer build hasta rellenar secrets.

### 2.2. Rellena env vars `sync: false`

Dashboard → tu servicio → **Environment**:

| Var | Valor |
|---|---|
| `DB_URL` | `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres` |
| `DB_USERNAME` | `postgres.<projectref>` |
| `DB_PASSWORD` | password real Supabase |
| `JWT_SECRET` | base64 256 bits — `openssl rand -base64 32` |
| `CORS_ALLOWED_ORIGINS` | `https://<tu-app>.vercel.app` (rellenar tras paso 3) |
| `TMDB_API_KEY` | TMDB Read Access Token (opcional) |

### 2.3. Deploy

Render builds del `Dockerfile` + arranca. Tarda ~3-5 min primer deploy. URL: `https://moviereviewhub-backend.onrender.com` (o similar).

### 2.4. Verifica

```
GET https://moviereviewhub-backend.onrender.com/actuator/health
→ {"status":"UP"}
```

```
GET https://moviereviewhub-backend.onrender.com/v3/api-docs
→ JSON OpenAPI
```

---

## 3. Frontend en Vercel

### 3.1. Conecta repo

1. <https://vercel.com> → Add New → Project.
2. Importa GitHub repo `MovieReviewHub`.
3. Configure Project:
   - **Root Directory**: `frontend`
   - Framework Preset: **Next.js** (auto)
   - Build / Output: defaults

### 3.2. Env vars

Project → Settings → Environment Variables:

| Var | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://moviereviewhub-backend.onrender.com/api/v1` |

Aplica a **Production**, **Preview** y **Development**.

### 3.3. Deploy

Click Deploy. Tarda ~1-2 min. URL: `https://<proyecto>.vercel.app`.

### 3.4. Vuelve a Render — actualiza CORS

Render → Environment → `CORS_ALLOWED_ORIGINS` = la URL Vercel real (sin trailing slash).

Dispara redeploy: Manual Deploy → Deploy latest commit. O push cualquier cambio.

---

## 4. Promueve un user a admin

Tras registrarte en `https://<vercel>.vercel.app/register`, en Supabase Dashboard → SQL Editor:

```sql
UPDATE users SET role='ROLE_ADMIN' WHERE email='tu@email.com';
```

Logout + login en la app para refrescar JWT con el role nuevo.

---

## 5. Cookies cross-site — qué cambia vs local

Local (mismo origin distinto port): `Lax` + Secure off.
Prod (Vercel + Render distintos dominios):

- `COOKIE_SECURE=true` (HTTPS obligatorio para cross-site)
- `COOKIE_SAME_SITE=None` (cross-site cookies)

Ambos ya seteados en `render.yaml`. NO los cambies a otra cosa o login no persiste.

Frontend axios usa `withCredentials: true` → ya configurado en [lib/api.ts](frontend/src/lib/api.ts).

---

## 6. Caveats free tier

### Render

- **Cold start**: backend duerme tras 15min idle. Siguiente request tarda ~30s mientras arranca. Después responde rápido.
- **Mitigación**: usa <https://uptimerobot.com> para hacer ping a `/actuator/health` cada 5min. Mantiene el servicio caliente sin gastar plan paid.
- **Memoria**: 512MB. Suficiente para Spring Boot con Hikari pool=10.

### Vercel

- **Sin cold start** (edge). Free incluye dominio `*.vercel.app`. SSL auto.
- **Build minutes**: 6000/mes. Más que suficiente para dev solo.

### Supabase

- **Free tier**: 500MB DB, 2GB transfer/mes. **Pause tras 7 días sin actividad**.
- Si pausa: dashboard → Restore. Toma <1min.

---

## 7. Auto-deploy

- **Vercel**: auto en cada push a `master`. Sin config extra.
- **Render**: `autoDeploy: true` en `render.yaml` → push a master dispara redeploy.

GitHub Actions actualmente solo corre tests. Si quieres bloquear deploy hasta tests verdes, configura **Branch protection** en GitHub: master requiere checks `Backend CI` + `Frontend CI` ✓.

---

## 8. Troubleshooting

### Backend en Render no arranca

```
Render dashboard → Logs
```

Mira último error. Casos comunes:
- `password authentication failed for user "postgres"` → password mal en DB_PASSWORD.
- `Connection refused` → DB_URL apunta a IPv6 (direct), cambia a pooler.
- `JWT_SECRET` not set / not base64 → JWT secret faltante o con `-`/`_` no estándar.
- OOM kill → Render free 512MB se queda corto en startup. Reintenta deploy.

### Frontend no llama backend

DevTools → Network. ¿Ves CORS error?
- Verifica `CORS_ALLOWED_ORIGINS` en Render = URL Vercel **exacta**.
- ¿Cookie `refreshToken` se setea pero no se manda en requests? → `COOKIE_SAME_SITE=None`.

### Login funciona pero refresh falla

- Cookie no llega al refresh endpoint → cross-site cookie config mal. Verifica `Secure=true` + `SameSite=None`.
- DevTools → Application → Cookies → confirma `refreshToken` presente con flags `HttpOnly`, `Secure`, `SameSite=None`.
