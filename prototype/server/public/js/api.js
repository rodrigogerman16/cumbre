import { getToken, clearSession } from "./state.js";

async function request(method, path, body) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) clearSession();

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status}`);
  }
  return data;
}

export const api = {
  register: (email, password, name) => request("POST", "/api/auth/register", { email, password, name }),
  login: (email, password) => request("POST", "/api/auth/login", { email, password }),
  me: () => request("GET", "/api/me"),

  getRoutes: (filters = {}) => {
    const qs = new URLSearchParams(filters).toString();
    return request("GET", `/api/routes${qs ? `?${qs}` : ""}`);
  },
  getRoute: (id) => request("GET", `/api/routes/${id}`),
  createRoute: (payload) => request("POST", "/api/routes", payload),
  addWaypoint: (routeId, payload) => request("POST", `/api/routes/${routeId}/waypoints`, payload),
  uploadMedia: (routeId, payload) => request("POST", `/api/routes/${routeId}/media`, payload),
  react: (routeId) => request("POST", `/api/routes/${routeId}/react`),
};
