// ── MODIFICAÇÃO: middleware de autenticação e plano Gold
// ── DATA: 2026-05-18
import { pool } from "../db.js";

const GOLD_REQUIRED_MESSAGE = "Disponível apenas no Plano Ouro";

export async function attachUser(req, _res, next) {
  try {
    const email = String(req.get("x-user-email") || req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      req.user = null;
      return next();
    }

    const { rows } = await pool.query(
      `
        select id, email, name, plan, is_gold, access_status
        from users
        where email = $1
        limit 1
      `,
      [email]
    );

    req.user = rows[0] || null;
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
      error: "Usuário não autenticado."
    });
  }

  if (req.user.access_status === "refunded" || req.user.access_status === "inactive") {
    return res.status(403).json({
      ok: false,
      code: "ACCESS_INACTIVE",
      error: "Seu acesso está inativo. Verifique sua assinatura."
    });
  }

  return next();
}

export function requireGold(req, res, next) {
  if (!req.user?.is_gold) {
    return res.status(403).json({
      ok: false,
      code: "GOLD_REQUIRED",
      error: GOLD_REQUIRED_MESSAGE
    });
  }

  return next();
}
