export type RouteType = 'UN_DIA' | 'MULTI_DIA';
export type Difficulty = 'FACIL' | 'MEDIA' | 'DIFICIL';
export type WaypointType = 'REFUGIO' | 'AGUA' | 'MIRADOR' | 'PELIGRO' | 'CAMPAMENTO' | 'TECNICA';
export type MediaType = 'PHOTO' | 'VIDEO';
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface RouteAuthor {
  id: string;
  name: string;
}

export interface RouteSummary {
  id: string;
  title: string;
  description: string;
  type: RouteType;
  difficulty: Difficulty;
  distanceKm: number;
  elevationGainM: number;
  source: string;
  createdAt: string;
  author: RouteAuthor;
  waypointCount: number;
  stageCount: number;
  reactionCount: number;
  reactedByMe: boolean;
  coverUrl: string | null;
}

export interface Media {
  id: string;
  url: string;
  type: MediaType;
  moderationStatus: ModerationStatus;
  createdAt: string;
  waypointId: string | null;
}

export interface Waypoint {
  id: string;
  routeId: string;
  order: number;
  lat: number;
  lng: number;
  kmMark: number | null;
  type: WaypointType;
  title: string;
  description: string;
  isStageEnd: boolean;
  media: Media[];
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RouteDetail extends RouteSummary {
  geometry: GeoPoint[];
  waypoints: Waypoint[];
  media: Media[];
}
