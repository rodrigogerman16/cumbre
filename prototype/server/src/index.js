import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { dispatch, sendJson, HttpError } from "./router.js";
import "./routes/auth.js";
import "./routes/routes.js";

const PORT = Number(process.env.PORT) || 4000;
const PUBLIC_DIR = path.join(import.meta.dirname, "..", "public");
const UPLOADS_DIR = path.join(import.meta.dirname, "..", "uploads");

const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ico": "image/x-icon",
};

function safeJoin(root, requestPath) {
  const resolved = path.normalize(path.join(root, requestPath));
  if (!resolved.startsWith(root)) return null; // path traversal guard
  return resolved;
}

async function serveStatic(root, requestPath, res) {
  let filePath = safeJoin(root, requestPath);
  if (!filePath) return false;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!existsSync(filePath)) return false;
  const ext = path.extname(filePath);
  const contentType = STATIC_TYPES[ext] || "application/octet-stream";
  const data = await readFile(filePath);
  res.writeHead(200, { "Content-Type": contentType, "Content-Length": data.length });
  res.end(data);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname.startsWith("/api/")) {
      const handled = await dispatch(req, res, pathname);
      if (!handled) sendJson(res, 404, { error: "No encontrado" });
      return;
    }

    if (pathname.startsWith("/uploads/")) {
      const served = await serveStatic(UPLOADS_DIR, pathname.replace(/^\/uploads/, ""), res);
      if (!served) sendJson(res, 404, { error: "Archivo no encontrado" });
      return;
    }

    // Frontend static files, with SPA fallback to index.html for client-side routing.
    const served = await serveStatic(PUBLIC_DIR, pathname, res);
    if (!served) await serveStatic(PUBLIC_DIR, "/index.html", res);
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.statusCode, { error: err.message });
    } else if (err && err.statusCode) {
      sendJson(res, err.statusCode, { error: err.message });
    } else {
      console.error(err);
      sendJson(res, 500, { error: "Error interno del servidor" });
    }
  }
});

server.listen(PORT, () => {
  console.log(`Trek app server listening on http://localhost:${PORT}`);
});
