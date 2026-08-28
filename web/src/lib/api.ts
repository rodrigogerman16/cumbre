import type { AuthUser, GeoPoint, Media, RouteSummary, Waypoint } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  token?: string | null;
  body?: unknown;
  formData?: FormData;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    // No seteamos Content-Type a propósito: el navegador arma el boundary
    // multipart correcto solo si lo dejamos hacerlo.
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body });

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? `Error ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export interface CreateRoutePayload {
  title: string;
  description: string;
  type: string;
  difficulty: string;
  distanceKm: number;
  elevationGainM: number;
  geometry: GeoPoint[];
  source: 'manual' | 'gpx';
}

export interface AddWaypointPayload {
  order: number;
  lat: number;
  lng: number;
  type: string;
  title: string;
  description: string;
  isStageEnd: boolean;
}

export const api = {
  register: (data: { email: string; password: string; name: string }) =>
    request<{ token: string; user: AuthUser }>('POST', '/auth/register', { body: data }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('POST', '/auth/login', { body: data }),

  me: (token: string) => request<{ user: AuthUser }>('GET', '/auth/me', { token }),

  getRoutes: (filters: { type?: string; difficulty?: string } = {}, token?: string | null) => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString();
    return request<{ routes: RouteSummary[] }>('GET', `/routes${qs ? `?${qs}` : ''}`, { token });
  },

  react: (routeId: string, token: string) =>
    request<{ reacted: boolean; count: number }>('POST', `/routes/${routeId}/react`, { token }),

  createRoute: (payload: CreateRoutePayload, token: string) =>
    request<{ route: RouteSummary }>('POST', '/routes', { body: payload, token }),

  addWaypoint: (routeId: string, payload: AddWaypointPayload, token: string) =>
    request<{ waypoint: Waypoint }>('POST', `/routes/${routeId}/waypoints`, { body: payload, token }),

  uploadMedia: (routeId: string, file: File, token: string, waypointId?: string) => {
    const formData = new FormData();
    formData.set('file', file);
    if (waypointId) formData.set('waypointId', waypointId);
    return request<{ media: Media }>('POST', `/routes/${routeId}/media`, { formData, token });
  },
};
