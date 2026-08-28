import { gpx } from '@tmcw/togeojson';
import type { GeoPoint } from './types';

export class GpxParseError extends Error {}

// GPX -> GeoJSON (via @tmcw/togeojson) -> lat/lng. Un track real puede traer
// cientos o miles de puntos; los devolvemos todos acá y quien llame decide
// si simplificarlos (ver decimatePoints) para que el trazado siga siendo
// editable a mano en el mapa.
export function parseGpxToLatLngs(gpxText: string): GeoPoint[] {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(gpxText, 'text/xml');
  } catch {
    throw new GpxParseError('No se pudo leer el archivo como XML');
  }
  if (doc.querySelector('parsererror')) {
    throw new GpxParseError('El archivo no es un GPX válido');
  }

  const geojson = gpx(doc);
  const points: GeoPoint[] = [];

  for (const feature of geojson.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === 'LineString') {
      for (const [lng, lat] of geometry.coordinates) points.push({ lat, lng });
    } else if (geometry.type === 'MultiLineString') {
      for (const line of geometry.coordinates) {
        for (const [lng, lat] of line) points.push({ lat, lng });
      }
    }
  }

  if (points.length < 2) {
    throw new GpxParseError('No se encontraron puntos de trazado (trkpt) en ese archivo');
  }
  return points;
}

// Reduce a maxPoints tomando índices equiespaciados (siempre incluye el
// primer y el último punto) para que el trazado importado no quede
// imposible de editar a mano.
export function decimatePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}
