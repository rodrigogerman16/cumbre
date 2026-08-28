import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { api, ApiError } from '../lib/api';
import { decimatePoints, GpxParseError, parseGpxToLatLngs } from '../lib/gpx';
import { BackIcon, CloseIcon, FileIcon, PencilIcon, PinIcon, WAYPOINT_TYPE_COLOR, WaypointTypeIcon } from '../lib/icons';
import type { Difficulty, GeoPoint, RouteType } from '../lib/types';
import { RouteMapEditor, type RouteMapEditorHandle } from '../components/RouteMapEditor';
import { MediaUploadRow } from '../components/MediaUploadRow';
import { WaypointSheet, type WaypointDraft } from '../components/WaypointSheet';

// La referencia es solo visual (ya no se convierte en vértices editables),
// así que puede tener más resolución que un trazo manual sin problema.
const MAX_REFERENCE_POINTS = 500;

interface WaypointFormItem extends WaypointDraft {
  id: string;
  lat: number;
  lng: number;
}

export function CreateRoutePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const mapEditorRef = useRef<RouteMapEditorHandle>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<'manual' | 'gpx'>('manual');
  const [geometry, setGeometry] = useState<GeoPoint[]>([]);
  const [gpxStatus, setGpxStatus] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<GeoPoint | null>(null);
  const [waypoints, setWaypoints] = useState<WaypointFormItem[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [routeType, setRouteType] = useState<RouteType>('UN_DIA');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIA');
  const [distanceKm, setDistanceKm] = useState('');
  const [elevationGainM, setElevationGainM] = useState('');
  const [routeMediaFiles, setRouteMediaFiles] = useState<File[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  async function handleGpxFile(file: File) {
    setGpxStatus(null);
    try {
      const text = await file.text();
      const points = parseGpxToLatLngs(text);
      const reference = decimatePoints(points, MAX_REFERENCE_POINTS);
      mapEditorRef.current?.showReferenceLine(reference);
      setGpxStatus(
        'GPX importado como referencia (línea punteada). Tocá el lápiz y marcá tus propios puntos sobre el mapa.',
      );
    } catch (err) {
      setGpxStatus(err instanceof GpxParseError ? err.message : 'No se pudo leer el archivo GPX');
    }
  }

  function handleMapClickForWaypoint(point: GeoPoint) {
    setPendingPin(point);
  }

  function handleWaypointDrag(id: string, point: GeoPoint) {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...point } : w)));
  }

  function handleSaveWaypoint(draft: WaypointDraft) {
    if (!pendingPin) return;
    setWaypoints((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...pendingPin, ...draft },
    ]);
    setPendingPin(null);
  }

  function removeWaypoint(id: string) {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  }

  async function handlePublish() {
    setError(null);

    const trimmedTitle = title.trim();
    const distance = parseFloat(distanceKm);
    const elevation = parseInt(elevationGainM, 10);

    if (!trimmedTitle) {
      setError('Ponele un título a la ruta');
      return;
    }
    if (geometry.length < 2) {
      setError('Trazá al menos 2 puntos en el mapa (o importá un GPX)');
      return;
    }
    if (!Number.isFinite(distance) || distance <= 0) {
      setError('Ingresá la distancia de la ruta en km');
      return;
    }
    if (!token) {
      navigate('/login');
      return;
    }

    setPublishing(true);
    let createdRouteId: string | null = null;
    try {
      const { route } = await api.createRoute(
        {
          title: trimmedTitle,
          description: description.trim(),
          type: routeType,
          difficulty,
          distanceKm: distance,
          elevationGainM: Number.isFinite(elevation) ? elevation : 0,
          geometry,
          source,
        },
        token,
      );
      createdRouteId = route.id;

      for (let i = 0; i < waypoints.length; i++) {
        const w = waypoints[i];
        const { waypoint } = await api.addWaypoint(
          route.id,
          {
            order: i,
            lat: w.lat,
            lng: w.lng,
            type: w.type,
            title: w.title,
            description: w.description,
            isStageEnd: w.isStageEnd,
          },
          token,
        );
        for (const file of w.mediaFiles) {
          await api.uploadMedia(route.id, file, token, waypoint.id);
        }
      }

      for (const file of routeMediaFiles) {
        await api.uploadMedia(route.id, file, token);
      }

      navigate(`/rutas/${route.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo publicar la ruta';
      // La ruta ya se creó en el servidor antes de que fallara un waypoint o
      // una foto: avisamos en vez de dejar creer que no se guardó nada (lo
      // que llevaría a publicarla de nuevo, duplicada).
      setError(
        createdRouteId
          ? `${message}. La ruta ya se creó (algunas paradas o fotos pueden faltar) — podés verla y reintentar la subida más tarde.`
          : message,
      );
      setPublishing(false);
    }
  }

  const mapWaypoints = waypoints.map((w) => ({ id: w.id, lat: w.lat, lng: w.lng, type: w.type }));

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <BackIcon size={18} color="var(--ink)" />
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Nueva ruta</div>
        <button className="topbar-accent-btn" onClick={handlePublish} disabled={publishing}>
          {publishing ? 'Publicando…' : 'Publicar'}
        </button>
      </div>

      <div style={{ padding: '0 20px 16px 20px' }}>
        <div className="segmented">
          <div
            className={`seg-opt${source === 'manual' ? ' active' : ''}`}
            onClick={() => {
              setSource('manual');
              setGpxStatus(null);
              mapEditorRef.current?.clearReferenceLine();
            }}
          >
            Dibujar en el mapa
          </div>
          <div className={`seg-opt${source === 'gpx' ? ' active' : ''}`} onClick={() => setSource('gpx')}>
            Importar GPX
          </div>
        </div>
      </div>

      <div style={{ margin: '0 20px' }} className="map-wrap">
        <RouteMapEditor
          ref={mapEditorRef}
          waypoints={mapWaypoints}
          pinMode={pinMode}
          onGeometryChange={setGeometry}
          onMapClickForWaypoint={handleMapClickForWaypoint}
          onWaypointDrag={handleWaypointDrag}
        />
        <div className="map-toolbar">
          <button className="map-tool-btn" onClick={() => mapEditorRef.current?.startDrawingLine()}>
            <PencilIcon size={18} />
          </button>
          <button
            className={`map-tool-btn${pinMode ? ' active' : ''}`}
            onClick={() => setPinMode((v) => !v)}
          >
            <PinIcon size={17} />
          </button>
        </div>
        <div className="map-hint">
          {pinMode
            ? 'Tocá el mapa donde querés agregar una parada'
            : source === 'manual'
              ? 'Tocá el lápiz para trazar la línea · doble clic para terminarla'
              : 'Tocá el lápiz y marcá tus puntos sobre la línea de referencia · doble clic para terminar'}
        </div>
      </div>

      {source === 'gpx' && (
        <div style={{ margin: '14px 20px 0 20px' }}>
          <label className="btn btn-outline" style={{ display: 'flex', cursor: 'pointer' }}>
            <FileIcon size={17} color="var(--ink)" />
            Elegir archivo .gpx
            <input
              ref={gpxInputRef}
              type="file"
              accept=".gpx"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleGpxFile(file);
              }}
            />
          </label>
          {gpxStatus && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 8 }}>{gpxStatus}</div>}
        </div>
      )}

      <div style={{ padding: '24px 20px 28px 20px' }}>
        <div className="field">
          <label className="field-label">Título de la ruta</label>
          <input
            type="text"
            placeholder="Ej: Travesía Frey a Jakob"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">Tipo de recorrido</label>
          <div className="segmented">
            <div className={`seg-opt${routeType === 'UN_DIA' ? ' active' : ''}`} onClick={() => setRouteType('UN_DIA')}>
              1 día
            </div>
            <div
              className={`seg-opt${routeType === 'MULTI_DIA' ? ' active' : ''}`}
              onClick={() => setRouteType('MULTI_DIA')}
            >
              Multi-día (refugios)
            </div>
          </div>
        </div>

        <div className="field">
          <label className="field-label">Dificultad</label>
          <div className="segmented">
            {(['FACIL', 'MEDIA', 'DIFICIL'] as Difficulty[]).map((d) => (
              <div key={d} className={`seg-opt${difficulty === d ? ' active' : ''}`} onClick={() => setDifficulty(d)}>
                {d === 'FACIL' ? 'Fácil' : d === 'MEDIA' ? 'Media' : 'Difícil'}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label">Distancia (km)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="42"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label">Desnivel (m)</label>
            <input
              type="number"
              min="0"
              step="10"
              placeholder="2100"
              value={elevationGainM}
              onChange={(e) => setElevationGainM(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Descripción</label>
          <textarea
            placeholder="Contales a otros trekkers qué encontrarán en el camino..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">Fotos generales de la ruta</label>
          <MediaUploadRow files={routeMediaFiles} onChange={setRouteMediaFiles} />
        </div>

        {waypoints.length > 0 && (
          <div className="field">
            <label className="field-label">Paradas agregadas ({waypoints.length})</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {waypoints.map((w) => {
                const colors = WAYPOINT_TYPE_COLOR[w.type];
                return (
                  <div key={w.id} className="waypoint-summary-item">
                    <div className="type-icon" style={{ width: 32, height: 32, background: colors.soft }}>
                      <WaypointTypeIcon type={w.type} size={15} color={colors.ink} />
                    </div>
                    <div className="waypoint-summary-title">
                      {w.title}
                      {w.isStageEnd ? ' · fin de etapa' : ''}
                    </div>
                    <button className="waypoint-summary-remove" onClick={() => removeWaypoint(w.id)}>
                      <CloseIcon size={14} color="var(--ink-faint)" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}
      </div>

      {pendingPin && (
        <WaypointSheet onClose={() => setPendingPin(null)} onSave={handleSaveWaypoint} />
      )}
    </>
  );
}
