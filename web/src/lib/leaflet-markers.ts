import L from 'leaflet';
import { WAYPOINT_ICON_PATHS, WAYPOINT_TYPE_COLOR } from './icons';
import type { WaypointType } from './types';

// Los CSS custom properties (--pine, --accent, etc.) están definidos en
// :root en index.css, así que resuelven bien acá aunque el ícono viva
// dentro de un L.DivIcon (sigue siendo parte del mismo documento).
export function createWaypointDivIcon(type: WaypointType): L.DivIcon {
  const { soft, ink } = WAYPOINT_TYPE_COLOR[type];
  const path = WAYPOINT_ICON_PATHS[type];

  return L.divIcon({
    className: 'waypoint-marker',
    html: `
      <div style="width:32px;height:32px;border-radius:999px;background:${soft};border:2px solid var(--surface);box-shadow:0 2px 6px rgba(30,42,31,0.35);display:flex;align-items:center;justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${ink}" stroke-width="2" stroke-linejoin="round"><path d="${path}"/></svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}
