# Cumbre — prototipo funcional

App para trazar y compartir rutas de trekking: dibujás la línea en un mapa,
marcás paradas (refugios, agua, miradores, peligros, tramos técnicos) con
fotos/video y descripción, y otros usuarios ven la ruta con reacciones
(ícono de pico de montaña, sin comentarios).

## Cómo correrlo

Requisitos: Node.js 20 o superior (usa `node --env-file`, nativo desde Node 20.6).

```bash
cd server
npm install   # no hay dependencias externas todavía — ver "Por qué no hay
              # Express/Prisma/Leaflet" más abajo
npm run dev
```

Abrí `http://localhost:4000`. Los datos se guardan en `server/data/db.json`
y las fotos/videos subidos en `server/uploads/`.

## Qué está implementado

- Registro / login con sesión (token firmado, sin cookies).
- Feed con filtros (tipo de recorrido, dificultad) y reacción con ícono
  propio (no un corazón, sin comentarios — como pediste).
- Crear ruta: dibujar la línea a mano sobre el mapa, o importar un archivo
  `.gpx` y editar los puntos después. Metadata (título, tipo, dificultad,
  distancia, desnivel, descripción, fotos generales).
- Agregar paradas sobre la línea: tipo (refugio / agua / mirador / peligro
  / campamento / técnica), título, descripción, fotos/video, y el toggle
  **"fin de etapa"** — así una travesía multi-día es una sola ruta con
  varios refugios marcados, no rutas separadas por día.
- Vista de ruta: línea + paradas sobre el mapa, badges de "Día 1 / Día 2…"
  calculados a partir de esas paradas de fin de etapa, galería, reacción.
- Hook de moderación de contenido en cada subida de foto/video (ver abajo).

## Por qué no hay Express / Prisma / Leaflet

Esta sesión de Claude corrió en un sandbox sin salida a internet para
instalar paquetes (política de red de la organización). Para poder
construir algo que yo mismo pudiera correr y probar de punta a punta,
usé solo Node.js nativo (sin Express, sin base de datos real, sin
librería de mapas) en vez de detenerme ahí.

Todo el código está organizado para que cambiar cada pieza por la versión
"real" sea directo — no hay que rediseñar nada:

| Hoy (prototipo) | Producción |
|---|---|
| `server/src/db.js` — JSON en disco | Postgres + Prisma (`server/schema.md` tiene el schema Prisma listo para pegar) |
| `server/src/auth.js` — scrypt + HMAC nativos | `bcryptjs` + `jsonwebtoken` |
| `server/src/moderation.js` — aprueba todo automáticamente | Sightengine / Google Cloud Vision SafeSearch / AWS Rekognition (ver comentarios en el archivo) |
| `public/js/components/map-canvas.js` — canvas propio, coordenadas x/y abstractas | Leaflet + OpenStreetMap (o Mapbox), coordenadas lat/lng reales |
| Frontend vanilla JS (sin build) | Podés migrar a React/Vite si el equipo lo prefiere; la estructura por páginas ya está pensada para eso |

Con internet normal (tu máquina, un servidor real), instalar esas
librerías y hacer el swap es trabajo de un día, no una reescritura.

## Verificado

Corrí el flujo completo con un navegador automatizado en esta sesión:
registro → crear ruta dibujando la línea → agregar parada con "fin de
etapa" → publicar → ver el detalle con los badges de días → reaccionar →
volver al feed y ver la ruta con el contador actualizado. Sin errores de
consola. Las capturas de esa corrida están en las imágenes que te mandé
en el chat.
