// Minimal JSON-file-backed data store.
//
// This stands in for a real database (Postgres via Prisma is the intended
// production setup — see schema.md in this same folder for the equivalent
// Prisma schema). It's intentionally dependency-free because this sandbox
// has no network access to install packages. Swapping this module for a
// real Prisma client later does not require touching the route handlers,
// as long as the exported function signatures stay the same.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.join(import.meta.dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY_DB = {
  users: [],
  routes: [],
  waypoints: [],
  media: [],
  reactions: [],
};

let cache = null;
let writeQueue = Promise.resolve();

async function load() {
  if (cache) return cache;
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) {
    cache = structuredClone(EMPTY_DB);
    await persist();
    return cache;
  }
  const raw = await readFile(DB_FILE, "utf-8");
  cache = JSON.parse(raw);
  return cache;
}

function persist() {
  // Serialize writes so concurrent requests can't interleave and corrupt the file.
  writeQueue = writeQueue.then(() =>
    writeFile(DB_FILE, JSON.stringify(cache, null, 2), "utf-8")
  );
  return writeQueue;
}

export function newId() {
  return crypto.randomUUID();
}

export async function getDb() {
  return load();
}

export async function saveDb() {
  return persist();
}
