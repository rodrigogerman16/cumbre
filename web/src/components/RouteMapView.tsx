import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { createWaypointDivIcon } from '../lib/leaflet-markers';
import type { GeoPoint, Waypoint } from '../lib/types';

interface RouteMapViewProps {
  geometry: GeoPoint[];
  waypoints: Pick<Waypoint, 'id' | 'lat' | 'lng' | 'type' | 'title'>[];
  height?: number;
}

const LINE_COLOR = '#C1592B';

// Vista de solo lectura: línea + paradas de una ruta ya publicada. A
// diferencia de RouteMapEditor, no carga Geoman (no hace falta editar acá).
export function RouteMapView({ geometry, waypoints, height = 280 }: RouteMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Sin control de zoom: es un mapa de solo lectura embebido (el usuario
    // puede seguir haciendo pinch/scroll/doble clic para acercar), y así el
    // botón de volver no compite por la esquina superior izquierda.
    const map = L.map(containerRef.current, { zoomControl: false }).setView([-41.15, -71.3], 12);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || geometry.length === 0) return;

    const line = L.polyline(
      geometry.map((p) => L.latLng(p.lat, p.lng)),
      { color: LINE_COLOR, weight: 4 },
    ).addTo(map);

    const markers = waypoints.map((wp) =>
      L.marker([wp.lat, wp.lng], { icon: createWaypointDivIcon(wp.type) })
        .bindTooltip(wp.title, { direction: 'top', offset: [0, -16] })
        .addTo(map),
    );

    map.fitBounds(line.getBounds(), { padding: [24, 24] });

    return () => {
      map.removeLayer(line);
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [geometry, waypoints]);

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
}
