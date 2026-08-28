import { get, post, readJsonBody, sendJson, HttpError } from "../router.js";
import { getDb, saveDb, newId } from "../db.js";
import { requireAuth, optionalAuth, publicUser } from "./auth.js";
import { moderateBuffer } from "../moderation.js";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const UPLOADS_DIR = path.join(import.meta.dirname, "..", "..", "uploads");

const MIME_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function routeSummary(r, db, currentUserId) {
  const author = db.users.find((u) => u.id === r.authorId);
  const reactions = db.reactions.filter((x) => x.routeId === r.id);
  const waypoints = db.waypoints.filter((w) => w.routeId === r.id);
  const media = db.media.filter((m) => m.routeId === r.id && !m.waypointId && m.moderationStatus === "APPROVED");
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    difficulty: r.difficulty,
    distanceKm: r.distanceKm,
    elevationGainM: r.elevationGainM,
    source: r.source,
    createdAt: r.createdAt,
    author: author ? { id: author.id, name: author.name } : null,
    waypointCount: waypoints.length,
    stageCount: waypoints.filter((w) => w.isStageEnd).length + 1,
    reactionCount: reactions.length,
    reactedByMe: currentUserId ? reactions.some((x) => x.userId === currentUserId) : false,
    coverUrl: media[0]?.url || null,
  };
}

function waypointOut(w) {
  return {
    id: w.id,
    routeId: w.routeId,
    order: w.order,
    x: w.x,
    y: w.y,
    kmMark: w.kmMark,
    type: w.type,
    title: w.title,
    description: w.description,
    isStageEnd: w.isStageEnd,
  };
}

function mediaOut(m) {
  return {
    id: m.id,
    url: m.url,
    type: m.type,
    waypointId: m.waypointId,
    moderationStatus: m.moderationStatus,
    createdAt: m.createdAt,
  };
}

// --- Feed ---
get("/api/routes", async (req, res) => {
  const user = await optionalAuth(req);
  const db = await getDb();
  const url = new URL(req.url, "http://localhost");
  const typeFilter = url.searchParams.get("type");
  const difficultyFilter = url.searchParams.get("difficulty");

  let list = [...db.routes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (typeFilter) list = list.filter((r) => r.type === typeFilter);
  if (difficultyFilter) list = list.filter((r) => r.difficulty === difficultyFilter);

  sendJson(res, 200, { routes: list.map((r) => routeSummary(r, db, user?.id)) });
});

// --- Create route ---
post("/api/routes", async (req, res) => {
  const user = await requireAuth(req);
  const body = await readJsonBody(req);

  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const type = body.type === "MULTI_DIA" ? "MULTI_DIA" : "UN_DIA";
  const difficulty = ["FACIL", "MEDIA", "DIFICIL"].includes(body.difficulty) ? body.difficulty : "MEDIA";
  const distanceKm = Number(body.distanceKm) || 0;
  const elevationGainM = Math.round(Number(body.elevationGainM) || 0);
  const geometry = Array.isArray(body.geometry) ? body.geometry : [];
  const source = body.source === "gpx" ? "gpx" : "manual";

  if (!title) throw new HttpError(400, "El título es requerido");
  if (geometry.length < 2) throw new HttpError(400, "La ruta necesita al menos 2 puntos trazados");

  const db = await getDb();
  const now = new Date().toISOString();
  const newRoute = {
    id: newId(),
    authorId: user.id,
    title,
    description,
    type,
    difficulty,
    distanceKm,
    elevationGainM,
    geometry,
    source,
    createdAt: now,
  };
  db.routes.push(newRoute);
  await saveDb();

  sendJson(res, 201, { route: routeSummary(newRoute, db, user.id) });
});

// --- Route detail ---
get("/api/routes/:id", async (req, res) => {
  const user = await optionalAuth(req);
  const db = await getDb();
  const r = db.routes.find((x) => x.id === req.params.id);
  if (!r) throw new HttpError(404, "Ruta no encontrada");

  const waypoints = db.waypoints
    .filter((w) => w.routeId === r.id)
    .sort((a, b) => a.order - b.order)
    .map(waypointOut);

  const media = db.media
    .filter((m) => m.routeId === r.id && m.moderationStatus === "APPROVED")
    .map(mediaOut);

  sendJson(res, 200, {
    route: {
      ...routeSummary(r, db, user?.id),
      geometry: r.geometry,
      waypoints,
      media,
    },
  });
});

function requireRouteOwnership(db, routeId, userId) {
  const r = db.routes.find((x) => x.id === routeId);
  if (!r) throw new HttpError(404, "Ruta no encontrada");
  if (r.authorId !== userId) throw new HttpError(403, "No sos el autor de esta ruta");
  return r;
}

// --- Add waypoint ---
post("/api/routes/:id/waypoints", async (req, res) => {
  const user = await requireAuth(req);
  const db = await getDb();
  const r = requireRouteOwnership(db, req.params.id, user.id);
  const body = await readJsonBody(req);

  const validTypes = ["REFUGIO", "AGUA", "MIRADOR", "PELIGRO", "CAMPAMENTO", "TECNICA"];
  const type = validTypes.includes(body.type) ? body.type : "TECNICA";
  const title = String(body.title || "").trim();
  if (!title) throw new HttpError(400, "El título de la parada es requerido");

  const existing = db.waypoints.filter((w) => w.routeId === r.id);
  const waypoint = {
    id: newId(),
    routeId: r.id,
    order: Number.isFinite(body.order) ? body.order : existing.length,
    x: Number(body.x) || 0,
    y: Number(body.y) || 0,
    kmMark: body.kmMark != null ? Number(body.kmMark) : null,
    type,
    title,
    description: String(body.description || "").trim(),
    isStageEnd: Boolean(body.isStageEnd),
    createdAt: new Date().toISOString(),
  };
  db.waypoints.push(waypoint);
  await saveDb();

  sendJson(res, 201, { waypoint: waypointOut(waypoint) });
});

// --- Upload media (base64 JSON payload; no multipart parser dependency) ---
post("/api/routes/:id/media", async (req, res) => {
  const user = await requireAuth(req);
  const db = await getDb();
  const r = requireRouteOwnership(db, req.params.id, user.id);
  const body = await readJsonBody(req, 30 * 1024 * 1024);

  const dataUrl = String(body.dataUrl || "");
  const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new HttpError(400, "dataUrl inválido");
  const mimeType = match[1];
  const ext = MIME_EXT[mimeType];
  if (!ext) throw new HttpError(415, `Tipo de archivo no soportado: ${mimeType}`);

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 25 * 1024 * 1024) throw new HttpError(413, "Archivo demasiado grande (máx 25MB)");

  const moderation = await moderateBuffer(buffer, mimeType);

  const filename = `${newId()}.${ext}`;
  if (!existsSync(UPLOADS_DIR)) await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);

  const waypointId = body.waypointId || null;
  if (waypointId && !db.waypoints.some((w) => w.id === waypointId && w.routeId === r.id)) {
    throw new HttpError(400, "waypointId inválido");
  }

  const media = {
    id: newId(),
    routeId: r.id,
    waypointId,
    url: `/uploads/${filename}`,
    type: mimeType.startsWith("video") ? "VIDEO" : "PHOTO",
    moderationStatus: moderation.status,
    moderationReason: moderation.reason,
    createdAt: new Date().toISOString(),
  };
  db.media.push(media);
  await saveDb();

  sendJson(res, 201, { media: mediaOut(media) });
});

// --- Toggle reaction ---
post("/api/routes/:id/react", async (req, res) => {
  const user = await requireAuth(req);
  const db = await getDb();
  const r = db.routes.find((x) => x.id === req.params.id);
  if (!r) throw new HttpError(404, "Ruta no encontrada");

  const idx = db.reactions.findIndex((x) => x.routeId === r.id && x.userId === user.id);
  let reacted;
  if (idx >= 0) {
    db.reactions.splice(idx, 1);
    reacted = false;
  } else {
    db.reactions.push({ id: newId(), userId: user.id, routeId: r.id, createdAt: new Date().toISOString() });
    reacted = true;
  }
  await saveDb();

  const count = db.reactions.filter((x) => x.routeId === r.id).length;
  sendJson(res, 200, { reacted, count });
});
