import { get, post, readJsonBody, sendJson, HttpError } from "../router.js";
import { getDb, saveDb, newId } from "../db.js";
import { hashPassword, verifyPassword, signToken, verifyToken, getBearerToken } from "../auth.js";

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
}

export async function requireAuth(req) {
  const token = getBearerToken(req);
  const payload = verifyToken(token);
  if (!payload) throw new HttpError(401, "No autenticado");
  const db = await getDb();
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user) throw new HttpError(401, "No autenticado");
  return user;
}

export async function optionalAuth(req) {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}

post("/api/auth/register", async (req, res) => {
  const body = await readJsonBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();

  if (!email || !email.includes("@")) throw new HttpError(400, "Email inválido");
  if (password.length < 6) throw new HttpError(400, "La contraseña debe tener al menos 6 caracteres");
  if (!name) throw new HttpError(400, "El nombre es requerido");

  const db = await getDb();
  if (db.users.some((u) => u.email === email)) {
    throw new HttpError(409, "Ya existe una cuenta con ese email");
  }

  const user = {
    id: newId(),
    email,
    name,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await saveDb();

  const token = signToken({ sub: user.id });
  sendJson(res, 201, { token, user: publicUser(user) });
});

post("/api/auth/login", async (req, res) => {
  const body = await readJsonBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  const db = await getDb();
  const user = db.users.find((u) => u.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, "Email o contraseña incorrectos");
  }

  const token = signToken({ sub: user.id });
  sendJson(res, 200, { token, user: publicUser(user) });
});

get("/api/me", async (req, res) => {
  const user = await requireAuth(req);
  sendJson(res, 200, { user: publicUser(user) });
});

export { publicUser };
