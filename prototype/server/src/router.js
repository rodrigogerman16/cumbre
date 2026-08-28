// Tiny dependency-free router (stands in for Express).

const routes = []; // { method, regex, keys, handler }

function toRegex(pattern) {
  const keys = [];
  const regex = pattern
    .replace(/\/:([A-Za-z0-9_]+)/g, (_, key) => {
      keys.push(key);
      return "/([^/]+)";
    })
    .replace(/\//g, "\\/");
  return { regex: new RegExp(`^${regex}$`), keys };
}

export function route(method, pattern, handler) {
  const { regex, keys } = toRegex(pattern);
  routes.push({ method, regex, keys, handler });
}

export const get = (p, h) => route("GET", p, h);
export const post = (p, h) => route("POST", p, h);
export const del = (p, h) => route("DELETE", p, h);

export async function dispatch(req, res, pathname) {
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const match = r.regex.exec(pathname);
    if (!match) continue;
    const params = {};
    r.keys.forEach((key, i) => (params[key] = decodeURIComponent(match[i + 1])));
    req.params = params;
    await r.handler(req, res);
    return true;
  }
  return false;
}

export function readJsonBody(req, limitBytes = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(Object.assign(new Error("Payload too large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
      } catch {
        reject(Object.assign(new Error("Invalid JSON body"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

export function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
