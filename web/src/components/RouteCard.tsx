import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { api, ApiError } from '../lib/api';
import type { RouteSummary } from '../lib/types';
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL, MountainFilledIcon, MountainOutlineIcon } from '../lib/icons';
import { initials, pluralDias } from '../lib/format';
import { RouteCoverArt } from './RouteCoverArt';

export function RouteCard({ route, index }: { route: RouteSummary; index: number }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [reacted, setReacted] = useState(route.reactedByMe);
  const [count, setCount] = useState(route.reactionCount);
  const [pending, setPending] = useState(false);

  const badge =
    route.type === 'MULTI_DIA' ? `${pluralDias(route.stageCount)} · ${route.waypointCount} paradas` : null;

  async function handleReact(e: MouseEvent) {
    e.stopPropagation();
    if (!token) {
      navigate('/login');
      return;
    }
    setPending(true);
    try {
      const result = await api.react(route.id, token);
      setReacted(result.reacted);
      setCount(result.count);
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card route-card" onClick={() => navigate(`/rutas/${route.id}`)}>
      <div className="route-card-cover">
        {route.coverUrl ? (
          <img src={route.coverUrl} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
        ) : (
          <RouteCoverArt seed={index} />
        )}
        {badge && <div className="route-card-badge">{badge}</div>}
      </div>
      <div className="route-card-body">
        <div className="route-card-title">{route.title}</div>
        <div className="route-card-author">
          <div className="avatar-initials">{initials(route.author?.name)}</div>
          <div className="route-card-author-name">por {route.author?.name ?? 'alguien'}</div>
        </div>
        <div className="stat-grid" style={{ marginTop: 14 }}>
          <div className="stat">
            <div className="stat-val">{route.distanceKm} km</div>
            <div className="stat-label">Distancia</div>
          </div>
          <div className="stat">
            <div className="stat-val">+{route.elevationGainM} m</div>
            <div className="stat-label">Desnivel</div>
          </div>
          <div className="stat">
            <div className="stat-val">{route.type === 'MULTI_DIA' ? pluralDias(route.stageCount) : '1 día'}</div>
            <div className="stat-label">Duración</div>
          </div>
          <div className="stat" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <div className="difficulty-dot" style={{ background: DIFFICULTY_COLOR[route.difficulty] }} />
            <div className="stat-val">{DIFFICULTY_LABEL[route.difficulty]}</div>
          </div>
        </div>
        <div className="route-card-divider" />
        <div className="route-card-footer">
          <button className="react-btn" onClick={handleReact} disabled={pending}>
            {reacted ? (
              <MountainFilledIcon size={19} color="var(--accent)" />
            ) : (
              <MountainOutlineIcon size={19} color="var(--ink-soft)" />
            )}
            <span className="react-count">{count}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
