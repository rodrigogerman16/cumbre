import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { MediaType, ModerationStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http-error.js';
import { moderateMedia } from '../lib/moderation.js';
import { saveMediaFile } from '../lib/storage.js';
import { MEDIA_EXT_BY_MIME, uploadMedia } from '../middleware/upload.js';
import { getUserId, optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

// ---------- validación ----------

const geoPointSchema = z.object({ lat: z.number(), lng: z.number() });

const createRouteSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(4000).default(''),
  type: z.enum(['UN_DIA', 'MULTI_DIA']),
  difficulty: z.enum(['FACIL', 'MEDIA', 'DIFICIL']),
  distanceKm: z.number().positive(),
  elevationGainM: z.number().int().min(0),
  geometry: z.array(geoPointSchema).min(2, 'La ruta necesita al menos 2 puntos trazados'),
  source: z.enum(['manual', 'gpx']).default('manual'),
});

const updateRouteSchema = createRouteSchema.partial();

const waypointSchema = z.object({
  order: z.number().int().min(0).optional(),
  lat: z.number(),
  lng: z.number(),
  kmMark: z.number().nonnegative().nullable().optional(),
  type: z.enum(['REFUGIO', 'AGUA', 'MIRADOR', 'PELIGRO', 'CAMPAMENTO', 'TECNICA']),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).default(''),
  isStageEnd: z.boolean().default(false),
});

// ---------- serialización ----------

const routeSummaryInclude = {
  author: { select: { id: true, name: true } },
  _count: { select: { reactions: true, waypoints: true } },
  waypoints: { where: { isStageEnd: true }, select: { id: true } },
  media: {
    where: { moderationStatus: ModerationStatus.APPROVED, waypointId: null },
    orderBy: { createdAt: 'asc' },
    take: 1,
    select: { url: true },
  },
} satisfies Prisma.RouteInclude;

type RouteSummaryRow = Prisma.RouteGetPayload<{ include: typeof routeSummaryInclude }>;

function serializeRouteSummary(route: RouteSummaryRow, reactedByMe: boolean) {
  return {
    id: route.id,
    title: route.title,
    description: route.description,
    type: route.type,
    difficulty: route.difficulty,
    distanceKm: route.distanceKm,
    elevationGainM: route.elevationGainM,
    source: route.source,
    createdAt: route.createdAt,
    author: route.author,
    waypointCount: route._count.waypoints,
    stageCount: route.waypoints.length + 1,
    reactionCount: route._count.reactions,
    reactedByMe,
    coverUrl: route.media[0]?.url ?? null,
  };
}

const mediaSelect = {
  id: true,
  url: true,
  type: true,
  moderationStatus: true,
  createdAt: true,
  waypointId: true,
} satisfies Prisma.MediaSelect;

const routeDetailInclude = {
  author: { select: { id: true, name: true } },
  _count: { select: { reactions: true } },
  media: {
    where: { moderationStatus: ModerationStatus.APPROVED, waypointId: null },
    orderBy: { createdAt: 'asc' },
    select: mediaSelect,
  },
  waypoints: {
    orderBy: { order: 'asc' },
    include: {
      media: {
        where: { moderationStatus: ModerationStatus.APPROVED },
        orderBy: { createdAt: 'asc' },
        select: mediaSelect,
      },
    },
  },
} satisfies Prisma.RouteInclude;

type RouteDetailRow = Prisma.RouteGetPayload<{ include: typeof routeDetailInclude }>;

function serializeWaypoint(waypoint: RouteDetailRow['waypoints'][number]) {
  return {
    id: waypoint.id,
    routeId: waypoint.routeId,
    order: waypoint.order,
    lat: waypoint.lat,
    lng: waypoint.lng,
    kmMark: waypoint.kmMark,
    type: waypoint.type,
    title: waypoint.title,
    description: waypoint.description,
    isStageEnd: waypoint.isStageEnd,
    media: waypoint.media,
  };
}

function serializeRouteDetail(route: RouteDetailRow, reactedByMe: boolean) {
  return {
    id: route.id,
    title: route.title,
    description: route.description,
    type: route.type,
    difficulty: route.difficulty,
    distanceKm: route.distanceKm,
    elevationGainM: route.elevationGainM,
    source: route.source,
    geometry: route.geometry,
    createdAt: route.createdAt,
    author: route.author,
    waypoints: route.waypoints.map(serializeWaypoint),
    media: route.media,
    waypointCount: route.waypoints.length,
    stageCount: route.waypoints.filter((w) => w.isStageEnd).length + 1,
    reactionCount: route._count.reactions,
    reactedByMe,
  };
}

// ---------- helpers ----------

async function findOwnedRoute(routeId: string, userId: string) {
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) throw new HttpError(404, 'Ruta no encontrada');
  if (route.authorId !== userId) throw new HttpError(403, 'No sos el autor de esta ruta');
  return route;
}

async function hasReacted(userId: string, routeId: string): Promise<boolean> {
  const reaction = await prisma.reaction.findUnique({
    where: { userId_routeId: { userId, routeId } },
  });
  return reaction !== null;
}

// ---------- feed ----------

router.get('/', optionalAuth, async (req, res) => {
  const { type, difficulty } = req.query;

  const where: Prisma.RouteWhereInput = {};
  if (type === 'UN_DIA' || type === 'MULTI_DIA') where.type = type;
  if (difficulty === 'FACIL' || difficulty === 'MEDIA' || difficulty === 'DIFICIL') {
    where.difficulty = difficulty;
  }

  const routes = await prisma.route.findMany({
    where,
    include: routeSummaryInclude,
    orderBy: { createdAt: 'desc' },
  });

  const userId = getUserId(req);
  const reactedIds = userId
    ? new Set(
        (
          await prisma.reaction.findMany({
            where: { userId, routeId: { in: routes.map((r) => r.id) } },
            select: { routeId: true },
          })
        ).map((r) => r.routeId),
      )
    : new Set<string>();

  res.json({ routes: routes.map((r) => serializeRouteSummary(r, reactedIds.has(r.id))) });
});

// ---------- crear ruta ----------

router.post('/', requireAuth, async (req, res) => {
  const parsed = createRouteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const authorId = getUserId(req)!;

  const route = await prisma.route.create({
    data: { ...data, geometry: data.geometry as Prisma.InputJsonValue, authorId },
    include: routeSummaryInclude,
  });

  res.status(201).json({ route: serializeRouteSummary(route, false) });
});

// ---------- detalle ----------

router.get<{ id: string }>('/:id', optionalAuth, async (req, res) => {
  const route = await prisma.route.findUnique({
    where: { id: req.params.id },
    include: routeDetailInclude,
  });
  if (!route) throw new HttpError(404, 'Ruta no encontrada');

  const userId = getUserId(req);
  const reactedByMe = userId ? await hasReacted(userId, route.id) : false;

  res.json({ route: serializeRouteDetail(route, reactedByMe) });
});

// ---------- actualizar ----------

router.patch<{ id: string }>('/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req)!;
  await findOwnedRoute(req.params.id, userId);

  const parsed = updateRouteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    return;
  }
  const { geometry, ...rest } = parsed.data;

  const route = await prisma.route.update({
    where: { id: req.params.id },
    data: { ...rest, ...(geometry ? { geometry: geometry as Prisma.InputJsonValue } : {}) },
    include: routeSummaryInclude,
  });

  res.json({ route: serializeRouteSummary(route, await hasReacted(userId, route.id)) });
});

// ---------- borrar ----------

router.delete<{ id: string }>('/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req)!;
  await findOwnedRoute(req.params.id, userId);

  // Nota: esto borra en cascada waypoints/media/reactions en la DB (ver
  // onDelete: Cascade en el schema), pero no borra los archivos ya subidos
  // en storage — limpieza de archivos huérfanos queda para más adelante.
  await prisma.route.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ---------- alta de waypoint ----------

router.post<{ id: string }>('/:id/waypoints', requireAuth, async (req, res) => {
  const userId = getUserId(req)!;
  const route = await findOwnedRoute(req.params.id, userId);

  const parsed = waypointSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const order = data.order ?? (await prisma.waypoint.count({ where: { routeId: route.id } }));

  const waypoint = await prisma.waypoint.create({
    data: {
      routeId: route.id,
      order,
      lat: data.lat,
      lng: data.lng,
      kmMark: data.kmMark ?? null,
      type: data.type,
      title: data.title,
      description: data.description,
      isStageEnd: data.isStageEnd,
    },
  });

  res.status(201).json({ waypoint: { ...waypoint, media: [] as Prisma.MediaGetPayload<{ select: typeof mediaSelect }>[] } });
});

// ---------- subida de media ----------

router.post<{ id: string }>('/:id/media', requireAuth, uploadMedia.single('file'), async (req, res) => {
  const userId = getUserId(req)!;
  const route = await findOwnedRoute(req.params.id, userId);

  const file = req.file;
  if (!file) throw new HttpError(400, 'Falta el archivo ("file")');

  const waypointId =
    typeof req.body.waypointId === 'string' && req.body.waypointId.length > 0
      ? req.body.waypointId
      : null;
  if (waypointId) {
    const waypoint = await prisma.waypoint.findUnique({ where: { id: waypointId } });
    if (!waypoint || waypoint.routeId !== route.id) {
      throw new HttpError(400, 'waypointId inválido para esta ruta');
    }
  }

  const moderation = await moderateMedia(file.buffer, file.mimetype);
  if (moderation.status === ModerationStatus.REJECTED) {
    res.status(422).json({ error: 'Contenido rechazado por moderación', reason: moderation.reason });
    return;
  }

  const ext = MEDIA_EXT_BY_MIME[file.mimetype] ?? 'bin';
  const filename = `${randomUUID()}.${ext}`;
  const saved = await saveMediaFile(file.buffer, filename, file.mimetype);

  const media = await prisma.media.create({
    data: {
      routeId: route.id,
      waypointId,
      url: saved.url,
      type: file.mimetype.startsWith('video/') ? MediaType.VIDEO : MediaType.PHOTO,
      moderationStatus: moderation.status,
      moderationReason: moderation.reason,
    },
  });

  res.status(201).json({ media });
});

// ---------- reacción (toggle) ----------

router.post<{ id: string }>('/:id/react', requireAuth, async (req, res) => {
  const userId = getUserId(req)!;
  const route = await prisma.route.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!route) throw new HttpError(404, 'Ruta no encontrada');

  const existing = await prisma.reaction.findUnique({
    where: { userId_routeId: { userId, routeId: route.id } },
  });

  let reacted: boolean;
  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    reacted = false;
  } else {
    await prisma.reaction.create({ data: { userId, routeId: route.id } });
    reacted = true;
  }

  const count = await prisma.reaction.count({ where: { routeId: route.id } });
  res.json({ reacted, count });
});

export default router;
