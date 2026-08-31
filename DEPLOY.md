# Guía de despliegue

Arquitectura recomendada (la misma que ya está preparada en el código):

| Pieza              | Servicio                          | Por qué                                                                 |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------ |
| Frontend (`web/`)  | [Vercel](https://vercel.com)       | Deploy de Vite sin configuración extra, gratis para este tamaño de app. |
| Backend (`server/`)| [Render](https://render.com)       | Web Service de Node + Postgres administrado en el mismo dashboard.      |
| Base de datos      | Postgres (Render o [Supabase](https://supabase.com)) | Mismo `schema.prisma` en cualquiera de los dos, solo cambia `DATABASE_URL`. |
| Storage de media   | [Cloudflare R2](https://developers.cloudflare.com/r2/) | Compatible con S3, sin costo de egreso. El código ya soporta `STORAGE_DRIVER=s3`. |
| Moderación         | [Sightengine](https://sightengine.com) | Tier gratuito, ya integrado en `MODERATION_MODE=sightengine`.          |

Railway es intercambiable por Render en todo lo de abajo si lo preferís (ambos ofrecen Postgres administrado + Web Service de Node).

## 1. Base de datos: Postgres

El schema de Prisma (`server/prisma/schema.prisma`) ya está fijo en
`provider = "postgresql"`, y las migraciones (`server/prisma/migrations/`)
ya están generadas y commiteadas — no hace falta tocar nada de eso, solo
conseguir una base y apuntarle `DATABASE_URL`.

**Importante**: una vez que el schema quedó en `postgresql`, dev y prod
usan el mismo motor — ya no se puede volver a SQLite sin regenerar las
migraciones de nuevo (son SQL específico de cada motor, no intercambiable).
`src/lib/prisma.ts` elige el driver (`@prisma/adapter-pg` vs.
`@prisma/adapter-better-sqlite3`) solo mirando si `DATABASE_URL` empieza
con `file:`, pero eso ya no aplica en este proyecto salvo que decidas
volver atrás a propósito.

Dos opciones para la base, ambas funcionan igual de bien:

### Opción A: Postgres administrado por Render (mismo dashboard que el backend)

Dashboard de Render → **New** → **PostgreSQL**. Anotá la **Internal
Database URL** (para el backend, si vive en Render) y la **External
Database URL** (para correr migraciones desde tu máquina).

### Opción B: Supabase (tier gratuito, tiene su propio dashboard)

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **Settings → Database → Connection string**, pestaña **URI**.
3. **Ojo con esto**: Supabase muestra varias variantes (`Direct connection`,
   `Transaction pooler`, `Session pooler`). La de **Direct connection**
   (`db.<ref>.supabase.co:5432`) suele resolver **solo por IPv6** — si tu
   red no tiene salida IPv6 (la mayoría de las hogareñas en Argentina no la
   tienen), la conexión da timeout (`P1001: Can't reach database server`)
   aunque la URL esté perfecta. Usá **Session pooler**
   (`aws-...pooler.supabase.com:5432`, con IPv4) tanto para migrar como
   para el backend en producción. El de "Transaction pooler" (puerto
   `6543`) no sirve para migraciones porque no soporta prepared statements.

### Aplicar las migraciones a una base nueva

Con `DATABASE_URL` apuntando a tu base (Render o Supabase, la de arriba):

```bash
cd server
DATABASE_URL="postgresql://usuario:pass@host:5432/postgres" npx prisma migrate deploy
```

`migrate deploy` aplica las migraciones ya commiteadas sin generar nuevas
(a diferencia de `migrate dev`, que es solo para cuando cambiás el schema
en desarrollo). Confirmá que funcionó con un `select count(*)` rápido:

```bash
DATABASE_URL="postgresql://usuario:pass@host:5432/postgres" npx tsx -e "
import('@prisma/client').then(async ({ PrismaClient }) => {
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
  console.log('users:', await prisma.user.count());
  await prisma.\$disconnect();
});
"
```

## 2. Backend en Render

1. **New** → **Web Service**, conectá el repo de GitHub, **Root Directory**: `server`.
2. **Build Command**: `npm install && npx prisma generate && npm run build`
3. **Pre-Deploy Command**: `npx prisma migrate deploy` (aplica migraciones pendientes sin generar nuevas).
4. **Start Command**: `npm start`
5. Variables de entorno (Render → Environment):

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_URL` | Internal Database URL de Render, o la de "Session pooler" si usás Supabase |
   | `JWT_SECRET` | un valor aleatorio largo (ej. `openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | la URL de producción del frontend (ej. `https://cumbre.vercel.app`) |
   | `STORAGE_DRIVER` | `s3` |
   | `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL_BASE` | ver paso 4 (Cloudflare R2) |
   | `MODERATION_MODE` | `sightengine` |
   | `SIGHTENGINE_USER`, `SIGHTENGINE_SECRET` | ver paso 5 |

   Render inyecta `PORT` automáticamente; el servidor ya lee `process.env.PORT`, no hace falta seteatlo a mano.

## 3. Media: Cloudflare R2

1. Cloudflare Dashboard → R2 → **Create bucket**.
2. **Manage R2 API Tokens** → creá un token con permiso **Object Read & Write** sobre ese bucket. Te da `Access Key ID` y `Secret Access Key`.
3. Tu **Account ID** aparece en el dashboard de R2 → `S3_ENDPOINT = https://<account_id>.r2.cloudflarestorage.com`.
4. `S3_REGION` podés dejarlo en `auto`.
5. Para que las fotos sean accesibles públicamente: en el bucket, **Settings** → conectá un dominio custom o activá el subdominio `r2.dev`. Esa URL pública (sin barra final) es `S3_PUBLIC_URL_BASE`.

## 4. Moderación: Sightengine

1. Creá una cuenta en [sightengine.com](https://sightengine.com) (tier gratuito).
2. Dashboard → copiá `API User` y `API Secret` → `SIGHTENGINE_USER` / `SIGHTENGINE_SECRET`.
3. Con `MODERATION_MODE=sightengine`, cada foto se modera contra la API real; cada video se muestrea cada 2 segundos y se modera cada frame (ver `server/src/lib/moderation.ts`).

## 5. Frontend en Vercel

1. **Add New** → **Project**, importá el repo, **Root Directory**: `web`.
2. Framework preset: **Vite** (Vercel lo detecta solo).
3. Variable de entorno: `VITE_API_BASE_URL` = la URL pública del backend en Render (ej. `https://cumbre-server.onrender.com`).
4. Deploy. Vercel construye con `npm run build` y sirve `dist/` automáticamente.

## 6. Atar las puntas (CORS)

Una vez que Vercel te dio la URL definitiva del frontend, actualizá `CORS_ORIGIN` en Render con esa URL exacta (sin barra final) y redeployá el backend. En producción (`NODE_ENV=production`) el server **no** acepta cualquier `localhost:<puerto>` como en dev — solo el origen configurado.

## 7. Checklist post-deploy

- [ ] `curl https://<tu-backend>.onrender.com/health` → `{"ok":true,...}`
- [ ] Registrarte y loguearte desde el frontend en producción
- [ ] Crear una ruta, subir una foto, y confirmar que se ve (queda servida desde R2, no desde el backend)
- [ ] Reaccionar a una ruta y refrescar — el estado debe persistir
- [ ] Revisar los logs de Render la primera vez que se suba una foto/video para confirmar que la moderación real (Sightengine) no está tirando errores de credenciales

## Notas

- `server/uploads/` (disco local) solo se usa en dev con `STORAGE_DRIVER=local`. En producción con `STORAGE_DRIVER=s3` nunca se escribe ahí.
- Rotar `JWT_SECRET` invalida todas las sesiones activas (los tokens firmados con el secreto viejo dejan de validar).
- `bcrypt` compila un binario nativo en el `npm install` — el entorno Linux de Render lo resuelve solo; no hace falta nada especial (el problema de binario que vimos en desarrollo fue específico de Windows + npm en este entorno).
