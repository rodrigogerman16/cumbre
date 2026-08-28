import type { AuthUser, RouteSummary } from './types';

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
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? `Error ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
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
};
