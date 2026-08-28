import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { api, ApiError } from '../lib/api';
import { initials, pluralDias } from '../lib/format';
import { groupWaypointsByDay } from '../lib/route-days';
import type { Media, RouteDetail, Waypoint } from '../lib/types';
import {
  BackIcon,
  DIFFICULTY_COLOR,
  DIFFICULTY_LABEL,
  MountainFilledIcon,
  MountainOutlineIcon,
  PlayIcon,
  WAYPOINT_TYPE_COLOR,
  WAYPOINT_TYPE_LABEL,
  WaypointTypeIcon,
} from '../lib/icons';
import { RouteMapView } from '../components/RouteMapView';

function WaypointDetailCard({ waypoint }: { waypoint: Waypoint }) {
  const colors = WAYPOINT_TYPE_COLOR[waypoint.type];
  const cover = waypoint.media[0];

  return (
    <div className="card waypoint-detail-card">
      {cover ? (
        <img src={cover.url} alt="" className="waypoint-detail-media" />
      ) : (
        <div className="waypoint-detail-media-fallback" style={{ background: colors.soft }}>
          <WaypointTypeIcon type={waypoint.type} size={26} color={colors.ink} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <span className="pill soft" style={{ padding: '3px 9px', fontSize: 10.5 }}>
          {WAYPOINT_TYPE_LABEL[waypoint.type]}
          {waypoint.isStageEnd ? ' · fin de etapa' : ''}
        </span>
        <div style={{ fontWeight: 700, fontSize: 14, marginTop: 5 }}>{waypoint.title}</div>
        {waypoint.description && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4, marginTop: 3 }}>
            {waypoint.description}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaCell({ media }: { media: Media }) {
  if (media.type === 'VIDEO') {
    return (
      <div className="media-grid-video-wrap">
        <video src={media.url} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', borderRadius: 8 }} />
        <div className="media-grid-video-overlay">
          <PlayIcon size={22} color="#fff" />
        </div>
      </div>
    );
  }
  return <img src={media.url} alt="" />;
}

export function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reacted, setReacted] = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [reactPending, setReactPending] = useState(false);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setRoute(null);
    setError(null);

    api
      .getRoute(id, token)
      .then(({ route: result }) => {
        if (cancelled) return;
        setRoute(result);
        setReacted(result.reactedByMe);
        setReactionCount(result.reactionCount);
        setSelectedWaypointId(result.waypoints[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la ruta');
      });

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  async function handleReact() {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!route) return;
    setReactPending(true);
    try {
      const result = await api.react(route.id, token);
      setReacted(result.reacted);
      setReactionCount(result.count);
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err);
    } finally {
      setReactPending(false);
    }
  }

  if (error) {
    return (
      <>
        <div className="topbar">
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <BackIcon size={18} color="var(--ink)" />
          </button>
        </div>
        <div className="error-banner" style={{ margin: 20 }}>
          {error}
        </div>
      </>
    );
  }

  if (!route) {
    return (
      <>
        <div className="topbar">
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <BackIcon size={18} color="var(--ink)" />
          </button>
        </div>
        <div className="loading">Cargando ruta…</div>
      </>
    );
  }

  const dayGroups = route.type === 'MULTI_DIA' ? groupWaypointsByDay(route.waypoints) : null;
  const selectedWaypoint = route.waypoints.find((w) => w.id === selectedWaypointId) ?? null;

  return (
    <>
      <div className="hero-map">
        <RouteMapView geometry={route.geometry} waypoints={route.waypoints} />
        <button className="icon-btn on-image" style={{ top: 16, left: 16 }} onClick={() => navigate(-1)}>
          <BackIcon size={18} color="var(--ink)" />
        </button>
      </div>

      <div style={{ padding: '18px 20px 0 20px' }}>
        {dayGroups && (
          <div className="day-badge-row">
            {dayGroups.map((g, i) => (
              <div key={i} className={`pill ${i === 0 ? 'dark' : 'outline'}`}>
                {g.label}
              </div>
            ))}
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 23, lineHeight: 1.2 }}>
          {route.title}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div className="avatar-initials" style={{ width: 24, height: 24, fontSize: 10.5 }}>
            {initials(route.author.name)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>por {route.author.name}</div>
        </div>

        <div className="stat-grid detail-stat-grid">
          <div className="stat">
            <div className="stat-val">{route.distanceKm} km</div>
            <div className="stat-label">Distancia</div>
          </div>
          <div className="stat">
            <div className="stat-val">+{route.elevationGainM} m</div>
            <div className="stat-label">Desnivel</div>
          </div>
          <div className="stat">
            <div className="stat-val">
              {route.type === 'MULTI_DIA' ? pluralDias(dayGroups?.length ?? route.stageCount) : '1 día'}
            </div>
            <div className="stat-label">Duración</div>
          </div>
          <div className="stat">
            <div className="stat-val" style={{ color: DIFFICULTY_COLOR[route.difficulty] }}>
              {DIFFICULTY_LABEL[route.difficulty]}
            </div>
            <div className="stat-label">Dificultad</div>
          </div>
        </div>

        {route.description && (
          <>
            <div className="section-title" style={{ marginTop: 24 }}>
              Sobre esta ruta
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: '#3E4A3D' }}>{route.description}</div>
          </>
        )}

        {route.waypoints.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 26 }}>
              Paradas del recorrido ({route.waypoints.length})
            </div>
            <div className="chip-row">
              {route.waypoints.map((w) => {
                const colors = WAYPOINT_TYPE_COLOR[w.type];
                const active = w.id === selectedWaypointId;
                return (
                  <button key={w.id} className="chip" onClick={() => setSelectedWaypointId(w.id)}>
                    <div className={`chip-icon${active ? ' active' : ''}`} style={{ background: colors.soft }}>
                      <WaypointTypeIcon type={w.type} size={18} color={colors.ink} />
                    </div>
                    <div className="chip-label">
                      {w.title}
                      {w.kmMark != null ? ` · km ${w.kmMark}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedWaypoint && <WaypointDetailCard waypoint={selectedWaypoint} />}
          </>
        )}

        {route.media.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 26 }}>
              Galería
            </div>
            <div className="media-grid">
              {route.media.map((m) => (
                <MediaCell key={m.id} media={m} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="detail-react-bar">
        <button
          className="detail-react-btn"
          style={{
            background: reacted ? 'var(--accent-soft)' : 'var(--surface-alt)',
            color: reacted ? 'var(--accent-soft-ink)' : 'var(--ink-soft)',
          }}
          onClick={handleReact}
          disabled={reactPending}
        >
          {reacted ? <MountainFilledIcon size={19} color="var(--accent)" /> : <MountainOutlineIcon size={19} color="var(--ink-soft)" />}
          <span>{reactionCount}</span>
        </button>
      </div>
    </>
  );
}
