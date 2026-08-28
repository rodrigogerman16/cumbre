# Modelo de datos (referencia para producción)

`src/db.js` implementa este mismo modelo sobre un archivo JSON porque este
sandbox no tiene acceso a internet para instalar Prisma/Postgres. Este es el
schema equivalente en Prisma, listo para pegar en `prisma/schema.prisma`
cuando corras el proyecto con conexión a internet real.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String
  name         String
  createdAt    DateTime   @default(now())
  routes       Route[]
  reactions    Reaction[]
}

enum RouteType {
  UN_DIA
  MULTI_DIA
}

enum Difficulty {
  FACIL
  MEDIA
  DIFICIL
}

model Route {
  id             String     @id @default(cuid())
  authorId       String
  author         User       @relation(fields: [authorId], references: [id])
  title          String
  description    String
  type           RouteType
  difficulty     Difficulty
  distanceKm     Float
  elevationGainM Int
  // En producción: LineString real (PostGIS) en vez de JSON de puntos x/y de canvas
  geometry       Json
  source         String     @default("manual") // "manual" | "gpx"
  createdAt      DateTime   @default(now())
  waypoints      Waypoint[]
  media          Media[]
  reactions      Reaction[]
}

enum WaypointType {
  REFUGIO
  AGUA
  MIRADOR
  PELIGRO
  CAMPAMENTO
  TECNICA
}

model Waypoint {
  id          String       @id @default(cuid())
  routeId     String
  route       Route        @relation(fields: [routeId], references: [id], onDelete: Cascade)
  order       Int
  lat         Float
  lng         Float
  kmMark      Float?
  type        WaypointType
  title       String
  description String
  // Marca fin de etapa/día -> la ruta se agrupa en "Día N" a partir de estos puntos
  isStageEnd  Boolean      @default(false)
  media       Media[]
  createdAt   DateTime     @default(now())
}

enum MediaType {
  PHOTO
  VIDEO
}

enum ModerationStatus {
  PENDING
  APPROVED
  REJECTED
}

model Media {
  id               String            @id @default(cuid())
  routeId          String
  route            Route             @relation(fields: [routeId], references: [id], onDelete: Cascade)
  waypointId       String?
  waypoint         Waypoint?         @relation(fields: [waypointId], references: [id], onDelete: Cascade)
  url              String
  type             MediaType
  moderationStatus ModerationStatus  @default(PENDING)
  moderationReason String?
  createdAt        DateTime          @default(now())
}

model Reaction {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  routeId   String
  route     Route    @relation(fields: [routeId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, routeId])
}
```

## Qué cambia al migrar de este prototipo a producción

1. **`src/db.js`** → reemplazar por `@prisma/client` apuntando a Postgres
   (idealmente con extensión PostGIS si más adelante querés queries
   geoespaciales tipo "rutas cerca mío"). Las funciones que llaman los
   handlers (`getDb`, `saveDb`, `newId`) desaparecen; los handlers en
   `src/routes/*.js` pasan a usar `prisma.route.findMany(...)` etc.
2. **`src/auth.js`** → `hashPassword`/`verifyPassword` se reemplazan por
   `bcrypt.hash`/`bcrypt.compare`; `signToken`/`verifyToken` por
   `jsonwebtoken`. Las firmas de las funciones son intercambiables.
3. **`src/moderation.js`** → implementar la llamada real a Sightengine,
   Google Cloud Vision SafeSearch o AWS Rekognition (ver comentarios en el
   archivo). Cambiar `MODERATION_MODE=stub` a `MODERATION_MODE=live` en
   `.env` una vez configurado.
4. **`public/js/components/map-canvas.js`** → hoy dibuja sobre un
   `<canvas>` con coordenadas x/y abstractas (no hay tiles porque no hay
   red). Reemplazar por Leaflet + capa de OpenStreetMap (o Mapbox GL con
   API key), y las coordenadas `x/y` de waypoints/geometría pasan a ser
   `lat/lng` reales. `waypoint.x/y` → `waypoint.lat/lng`.
5. **Storage de media** → hoy los archivos van a `server/uploads/` en
   disco local. En producción conviene subir a S3/Cloudflare R2 y guardar
   la URL pública (o firmada) en `Media.url`.
