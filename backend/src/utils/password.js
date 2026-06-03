import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);

export function generateTempPassword(length = 12) {
  const raw = crypto.randomBytes(24).toString("base64url");
  return raw.slice(0, length);
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(String(password), salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !String(password)) return false;
  const [salt, hashHex] = String(storedHash).split(":");
  if (!salt || !hashHex) return false;
  const derived = await scrypt(String(password), salt, 64);
  const a = Buffer.from(hashHex, "hex");
  const b = Buffer.from(derived);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
