import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createWaypointDivIcon } from '../lib/leaflet-markers';
import type { GeoPoint, WaypointType } from '../lib/types';

export interface MapWaypointMarker {
  id: string;
  lat: number;
  lng: number;
  type: WaypointType;
}

export interface RouteMapEditorHandle {
  /**
   * Dibuja el trazado importado de un GPX como referencia visual fija (no
   * editable, sin vértices). El usuario traza su propia línea encima con
   * startDrawingLine(); esa línea manual —no la referencia— es la que se
   * publica.
   */
  showReferenceLine: (points: GeoPoint[]) => void;
  /** Saca la línea de referencia del GPX, si había una. */
  clearReferenceLine: () => void;
  /** Inicia el modo "dibujar línea" de Geoman (clic para agregar puntos, doble clic para terminar). */
  startDrawingLine: () => void;
}

interface RouteMapEditorProps {
  waypoints: MapWaypointMarker[];
  pinMode: boolean;
  onGeometryChange: (points: GeoPoint[]) => void;
  onMapClickForWaypoint: (point: GeoPoint) => void;
  onWaypointDrag: (id: string, point: GeoPoint) => void;
  height?: number;
}

const DEFAULT_CENTER: L.LatLngExpression = [-41.15, -71.3];
const DEFAULT_ZOOM = 12;
const LINE_COLOR = '#C1592B';

function latLngsToPoints(latlngs: L.LatLng[]): GeoPoint[] {
  return latlngs.map((ll) => ({ lat: ll.lat, lng: ll.lng }));
}

export const RouteMapEditor = forwardRef<RouteMapEditorHandle, RouteMapEditorProps>(
  function RouteMapEditor(
    { waypoints, pinMode, onGeometryChange, onMapClickForWaypoint, onWaypointDrag, height = 340 },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const lineRef = useRef<L.Polyline | null>(null);
    const referenceLineRef = useRef<L.Polyline | null>(null);
    const markersRef = useRef<Map<string, L.Marker>>(new Map());
    const pinModeRef = useRef(pinMode);
    const onMapClickForWaypointRef = useRef(onMapClickForWaypoint);
    const onGeometryChangeRef = useRef(onGeometryChange);
    const onWaypointDragRef = useRef(onWaypointDrag);

    pinModeRef.current = pinMode;
    onMapClickForWaypointRef.current = onMapClickForWaypoint;
    onGeometryChangeRef.current = onGeometryChange;
    onWaypointDragRef.current = onWaypointDrag;

    function attachLineEditing(line: L.Polyline) {
      line.setStyle({ color: LINE_COLOR, weight: 4 });
      line.pm.enable({ allowSelfIntersection: true });
      const syncGeometry = () => {
        onGeometryChangeRef.current(latLngsToPoints(line.getLatLngs() as L.LatLng[]));
      };
      line.on('pm:edit pm:markerdragend pm:vertexadded pm:vertexremoved', syncGeometry);
    }

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      map.pm.setGlobalOptions({ finishOn: 'dblclick', finishOnEnter: true });

      map.on('pm:create', (e) => {
        if (lineRef.current) map.removeLayer(lineRef.current);
        const line = e.layer as L.Polyline;
        lineRef.current = line;
        attachLineEditing(line);
        onGeometryChangeRef.current(latLngsToPoints(line.getLatLngs() as L.LatLng[]));
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (!pinModeRef.current) return;
        onMapClickForWaypointRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, []);

    // Bloquea la edición de la línea mientras se están agregando paradas,
    // para que un clic cerca del trazado no inserte un vértice sin querer.
    useEffect(() => {
      const line = lineRef.current;
      if (!line) return;
      if (pinMode) line.pm.disable();
      else line.pm.enable({ allowSelfIntersection: true });
    }, [pinMode]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      const existing = markersRef.current;
      const seen = new Set<string>();

      for (const wp of waypoints) {
        seen.add(wp.id);
        let marker = existing.get(wp.id);
        if (!marker) {
          marker = L.marker([wp.lat, wp.lng], {
            icon: createWaypointDivIcon(wp.type),
            draggable: true,
          }).addTo(map);
          marker.on('dragend', () => {
            const pos = marker!.getLatLng();
            onWaypointDragRef.current(wp.id, { lat: pos.lat, lng: pos.lng });
          });
          existing.set(wp.id, marker);
        } else {
          marker.setLatLng([wp.lat, wp.lng]);
          marker.setIcon(createWaypointDivIcon(wp.type));
        }
      }

      for (const [id, marker] of existing) {
        if (!seen.has(id)) {
          map.removeLayer(marker);
          existing.delete(id);
        }
      }
    }, [waypoints]);

    useImperativeHandle(ref, () => ({
      showReferenceLine(points: GeoPoint[]) {
        const map = mapRef.current;
        if (!map) return;
        if (referenceLineRef.current) map.removeLayer(referenceLineRef.current);

        const latlngs = points.map((p) => L.latLng(p.lat, p.lng));
        const reference = L.polyline(latlngs, {
          color: '#7C8A79',
          weight: 3,
          dashArray: [2, 8],
          lineCap: 'round',
          interactive: false,
          pmIgnore: true,
        }).addTo(map);
        referenceLineRef.current = reference;
        map.fitBounds(reference.getBounds(), { padding: [24, 24] });
      },
      clearReferenceLine() {
        const map = mapRef.current;
        if (map && referenceLineRef.current) map.removeLayer(referenceLineRef.current);
        referenceLineRef.current = null;
      },
      startDrawingLine() {
        const map = mapRef.current;
        if (!map) return;
        if (lineRef.current) {
          map.removeLayer(lineRef.current);
          lineRef.current = null;
          onGeometryChangeRef.current([]);
        }
        map.pm.enableDraw('Line', {
          templineStyle: { color: LINE_COLOR },
          hintlineStyle: { color: LINE_COLOR, dashArray: [6, 6] },
          pathOptions: { color: LINE_COLOR, weight: 4 },
        });
      },
    }));

    return <div ref={containerRef} style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden' }} />;
  },
);
