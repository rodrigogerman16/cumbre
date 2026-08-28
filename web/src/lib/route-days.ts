import type { Waypoint } from './types';

export interface DayGroup {
  label: string;
  waypoints: Waypoint[];
}

// Una travesía multi-día es una sola ruta: los waypoints con isStageEnd
// marcan dónde termina cada día (típicamente un refugio). La cantidad de
// días es waypoints.filter(isStageEnd).length + 1, y cada día (salvo el
// primero) se etiqueta con el nombre del waypoint de fin de etapa anterior
// — el lugar donde se durmió antes de arrancar ese día.
export function groupWaypointsByDay(waypoints: Waypoint[]): DayGroup[] {
  const sorted = [...waypoints].sort((a, b) => a.order - b.order);
  const groups: DayGroup[] = [];
  let current: Waypoint[] = [];
  let dayNumber = 1;

  for (const wp of sorted) {
    current.push(wp);
    if (wp.isStageEnd) {
      groups.push({ label: `Día ${dayNumber}`, waypoints: current });
      dayNumber += 1;
      current = [];
    }
  }
  groups.push({ label: `Día ${dayNumber}`, waypoints: current });

  // Renombrar cada día (salvo el primero) con el waypoint de fin de etapa
  // que lo precede.
  for (let i = 1; i < groups.length; i++) {
    const previousStageEnd = groups[i - 1].waypoints.at(-1);
    if (previousStageEnd) {
      groups[i].label = `${groups[i].label} · ${previousStageEnd.title}`;
    }
  }

  // No filtramos grupos vacíos: un día sin paradas propias (todavía) sigue
  // siendo un día real de la travesía y merece su badge.
  return groups;
}
