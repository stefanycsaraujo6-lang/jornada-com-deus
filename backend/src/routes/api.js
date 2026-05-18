// ── MODIFICAÇÃO: rotas API com proteção Basic/Gold
// ── DATA: 2026-05-18
import { Router } from "express";
import { attachUser, requireAuth, requireGold } from "../middleware/auth.js";

const router = Router();

router.use(attachUser);

router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({
    ok: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      plan: req.user.plan,
      is_gold: req.user.is_gold
    }
  });
});

router.get("/devotional/today", requireAuth, (_req, res) => {
  res.status(200).json({
    ok: true,
    access: "basic",
    message: "Devocional diário disponível para usuários logados."
  });
});

router.post("/premium/journeys", requireAuth, requireGold, (_req, res) => {
  res.status(200).json({ ok: true, module: "journeys" });
});

router.post("/premium/fasting", requireAuth, requireGold, (_req, res) => {
  res.status(200).json({ ok: true, module: "fasting" });
});

router.post("/premium/purposes", requireAuth, requireGold, (_req, res) => {
  res.status(200).json({ ok: true, module: "purposes" });
});

export default router;
