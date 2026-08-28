# Cumbre

Plataforma para trazar y compartir rutas de trekking: dibujás la línea sobre
un mapa (o importás un GPX), marcás paradas (refugios, agua, miradores,
peligros, tramos técnicos) con fotos/video y descripción, y otros usuarios
reaccionan con un ícono propio — sin comentarios.

Monorepo con dos paquetes npm workspace:

- **`server/`** — API en Node.js + Express + TypeScript, Prisma ORM.
- **`web/`** — Frontend en React + Vite + TypeScript.

> Este repo reemplaza un prototipo funcional construido sin librerías
> externas (sandbox sin internet). Ese prototipo quedó preservado en
> `prototype/` como referencia de flujo/UX, pero ya no se mantiene —
> el código activo es `server/` y `web/`.

## Requisitos

- Node.js 20+ (probado con Node 22).
- npm 10+.
- No hace falta Postgres ni Docker para desarrollar: en dev se usa SQLite.

## Instalación

```bash
git clone <repo>
cd cumbre-app
npm install
```

`npm install` en la raíz instala las dependencias de `server/` y `web/`
juntas (npm workspaces).

### Variables de entorno

Copiá los `.env.example` de cada paquete:

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env.local
```

Los valores por defecto ya funcionan para desarrollo local (SQLite,
moderación en modo `stub`, JWT con secreto de dev). Ver el detalle de cada
variable en los propios `.env.example`.

### Base de datos

```bash
npm run prisma:migrate   # crea/actualiza server/prisma/dev.db (SQLite)
```

## Correr en desarrollo

```bash
npm run dev
```

Esto levanta **server** (`http://localhost:4000`) y **web**
(`http://localhost:5173`) en paralelo, con reinicio automático ante cambios.

Si preferís levantarlos por separado:

```bash
npm run dev -w server   # API en :4000
npm run dev -w web      # Frontend en :5173
```

Chequeo rápido de que la API está viva:

```bash
curl http://localhost:4000/health
# {"ok":true,"service":"cumbre-server"}
```

## Base de datos: SQLite en dev, Postgres en producción

El schema de Prisma (`server/prisma/schema.prisma`) es el mismo en ambos
entornos — mismos modelos, enums y relaciones. `server/src/lib/prisma.ts`
ya elige el driver solo, mirando `DATABASE_URL`: si empieza con `file:` usa
SQLite (`@prisma/adapter-better-sqlite3`), si no, Postgres
(`@prisma/adapter-pg`) — no hay que tocar código al pasar de un entorno a
otro. Los pasos completos (incluyendo regenerar las migraciones para
Postgres, que no son compatibles con las de SQLite) están en
[`DEPLOY.md`](./DEPLOY.md).

## Storage de fotos/video

En desarrollo, los archivos se guardan en `server/uploads/` y se sirven
desde `/uploads/*`. El código de guardado está aislado en un único módulo
(`server/src/lib/storage.ts`, se agrega en la Fase 2) para que subir a
S3/Cloudflare R2 en producción sea cambiar esa función, no los handlers de
las rutas.

## Moderación de contenido

Cada foto/video subido pasa por un hook de moderación antes de quedar
público. `MODERATION_MODE=stub` (default en dev) aprueba todo
automáticamente sin llamar a ningún servicio externo. Configurando
`MODERATION_MODE=sightengine` + `SIGHTENGINE_USER`/`SIGHTENGINE_SECRET` en
`server/.env` se activa la llamada real a la API de Sightengine.

## Despliegue

Guía completa paso a paso (Vercel para `web/`, Render para `server/` +
Postgres, Cloudflare R2 para media, Sightengine para moderación) en
[`DEPLOY.md`](./DEPLOY.md).

## Estructura

```
cumbre-app/
├── server/           # API Express + TypeScript
│   ├── prisma/        # schema.prisma, migraciones
│   ├── src/
│   │   ├── routes/     # handlers HTTP
│   │   ├── middleware/ # auth, etc.
│   │   ├── lib/        # prisma client, storage, moderación
│   │   └── index.ts    # entry point
│   └── uploads/        # fotos/video en dev (disco local)
├── web/              # React + Vite + TypeScript
│   └── src/
├── prototype/        # prototipo original sin dependencias (referencia)
├── DEPLOY.md         # guía de despliegue paso a paso
└── package.json      # workspaces root
```

## Estado del proyecto

Construcción por fases, cada una validada antes de pasar a la siguiente:

- [x] Fase 0 — Setup del monorepo
- [x] Fase 1 — Base de datos y auth
- [x] Fase 2 — API de rutas, waypoints, media y reacciones
- [x] Fase 3 — Frontend: shell, auth, feed
- [x] Fase 4 — Frontend: mapa y creación de ruta
- [x] Fase 5 — Frontend: detalle de ruta
- [x] Fase 6 — Pulido y despliegue
