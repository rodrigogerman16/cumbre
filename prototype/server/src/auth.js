// Password hashing (scrypt) and signed session tokens, using only Node's
// built-in crypto module — stands in for bcryptjs + jsonwebtoken, which
// aren't installable in this sandbox. Both are one-line swaps later:
//   hashPassword/verifyPassword -> bcrypt.hash/bcrypt.compare
//   signToken/verifyToken       -> jsonwebtoken's sign/verify

import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-in-production";
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function signToken(payload) {
  const body = { ...payload, exp: Date.now() + TOKEN_TTL_MS };
  const encoded = base64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
  if (payload.exp < Date.now()) return null;
  return payload;
}

export function getBearerToken(req) {
  const header = req.headers["authorization"] || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}
