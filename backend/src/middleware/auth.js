import { pool } from "../db.js";
import { USER_STATUS, normalizeUserStatus } from "../config/plans.js";
import { verifyAuthToken } from "../utils/jwt.js";

export const OURO_REQUIRED_MESSAGE =
  "Disponível apenas no Nível Ouro. Ative por mais R$ 33,00 na Kiwify.";

export async function attachUser(req, _res, next) {
  try {
    const authHeader = String(req.get("authorization") || "");
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const legacyEmail = String(req.get("x-user-email") || "").trim().toLowerCase();

    if (bearer) {
      const payload = verifyAuthToken(bearer);
      if (payload?.sub) {
        const { rows } = await pool.query(
          `
            select id, email, name, status, access_status, must_change_password
            from users
            where id = $1
            limit 1
          `,
          [payload.sub]
        );
        req.user = rows[0] || null;
        req.authToken = bearer;
        return next();
      }
    }

    if (legacyEmail) {
      const { rows } = await pool.query(
        `
          select id, email, name, status, access_status, must_change_password
          from users
          where email = $1
          limit 1
        `,
        [legacyEmail]
      );
      req.user = rows[0] || null;
      return next();
    }

    req.user = null;
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      code: "AUTH_REQUIRED",
      error: "Faça login com e-mail e senha para continuar."
    });
  }

  if (req.user.access_status === "refunded" || req.user.access_status === "inactive") {
    return res.status(403).json({
      ok: false,
      code: "ACCESS_INACTIVE",
      error: "Seu acesso está inativo. Verifique sua assinatura na Kiwify."
    });
  }

  return next();
}

export function requireOuro(req, res, next) {
  const status = normalizeUserStatus(req.user?.status);
  if (status !== USER_STATUS.OURO) {
    return res.status(403).json({
      ok: false,
      code: "OURO_REQUIRED",
      error: OURO_REQUIRED_MESSAGE
    });
  }
  return next();
}

/** @deprecated use requireOuro */
export const requireGold = requireOuro;
