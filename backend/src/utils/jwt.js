import crypto from "node:crypto";

const DEFAULT_TTL_SEC = 60 * 60 * 24 * 7;

function base64urlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64urlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSecret() {
  const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET não configurado.");
  }
  return secret;
}

export function signAuthToken(payload, ttlSec = DEFAULT_TTL_SEC) {
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64urlEncode(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSec
    })
  );
  const signature = crypto.createHmac("sha256", getSecret()).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = crypto.createHmac("sha256", getSecret()).update(`${header}.${body}`).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(base64urlDecode(body));
    if (!payload?.sub || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
