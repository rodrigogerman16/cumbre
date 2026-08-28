import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { api, ApiError } from '../lib/api';
import type { RouteSummary } from '../lib/types';
import { MountainOutlineIcon, SearchIcon } from '../lib/icons';
import { RouteCard } from '../components/RouteCard';

interface FilterOption {
  key: string;
  label: string;
  params: { type?: string; difficulty?: string };
}

const FILTERS: FilterOption[] = [
  { key: 'all', label: 'Todos', params: {} },
  { key: 'multi', label: 'Multi-día', params: { type: 'MULTI_DIA' } },
  { key: 'un_dia', label: '1 día', params: { type: 'UN_DIA' } },
  { key: 'facil', label: 'Fácil', params: { difficulty: 'FACIL' } },
  { key: 'media', label: 'Media', params: { difficulty: 'MEDIA' } },
  { key: 'dificil', label: 'Difícil', params: { difficulty: 'DIFICIL' } },
];

export function FeedPage() {
  const { token } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [routes, setRoutes] = useState<RouteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const filter = FILTERS.find((f) => f.key === activeFilter) ?? FILTERS[0];

    setRoutes(null);
    setError(null);
    api
      .getRoutes(filter.params, token)
      .then(({ routes: result }) => {
        if (!cancelled) setRoutes(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las rutas');
      });

    return () => {
      cancelled = true;
    };
  }, [activeFilter, token]);

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <MountainOutlineIcon size={24} color="var(--accent)" />
          Cumbre
        </div>
        <button className="icon-btn">
          <SearchIcon size={18} color="var(--ink)" />
        </button>
      </div>
      <div className="filter-chips">
        {FILTERS.map((f) => (
          <div
            key={f.key}
            className={`pill filter-chip ${f.key === activeFilter ? 'dark' : 'outline'}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </div>
        ))}
      </div>
      <div className="feed-list">
        {error && <div className="error-banner">{error}</div>}
        {!error && routes === null && <div className="loading">Cargando rutas…</div>}
        {!error && routes !== null && routes.length === 0 && (
          <div className="empty-state">
            Todavía no hay rutas acá.
            <br />
            ¡Sé el primero en trazar una!
          </div>
        )}
        {!error && routes?.map((route, i) => <RouteCard key={route.id} route={route} index={i} />)}
      </div>
    </>
  );
}
