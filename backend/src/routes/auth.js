import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { normalizeUserStatus } from "../config/plans.js";
import { verifyPassword } from "../utils/password.js";
import { signAuthToken } from "../utils/jwt.js";
import { attachUser, requireAuth } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function serializeUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: normalizeUserStatus(row.status),
    mustChangePassword: Boolean(row.must_change_password)
  };
}

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "E-mail ou senha inválidos." });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  try {
    const { rows } = await pool.query(
      `
        select id, email, name, status, access_status, password_hash, must_change_password
        from users
        where email = $1
        limit 1
      `,
      [email]
    );

    const user = rows[0];
    if (!user?.password_hash) {
      return res.status(401).json({
        ok: false,
        code: "INVALID_CREDENTIALS",
        error: "Conta não encontrada ou ainda sem senha. Verifique o e-mail de boas-vindas após a compra."
      });
    }

    if (user.access_status === "refunded" || user.access_status === "inactive") {
      return res.status(403).json({
        ok: false,
        code: "ACCESS_INACTIVE",
        error: "Seu acesso está inativo. Entre em contato com o suporte."
      });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        ok: false,
        code: "INVALID_CREDENTIALS",
        error: "E-mail ou senha incorretos."
      });
    }

    const token = signAuthToken({ sub: user.id, email: user.email });
    return res.status(200).json({
      ok: true,
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    console.error("[auth:login]", err);
    return res.status(500).json({ ok: false, error: "Erro ao autenticar." });
  }
});

router.get("/session", attachUser, requireAuth, (req, res) => {
  res.status(200).json({ ok: true, user: serializeUser(req.user) });
});

export default router;
