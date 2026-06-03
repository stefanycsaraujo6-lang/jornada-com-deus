import { Router } from "express";
import { attachUser, requireAuth, requireOuro } from "../middleware/auth.js";
import { normalizeUserStatus } from "../config/plans.js";

const router = Router();

router.use(attachUser);

router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({
    ok: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      status: normalizeUserStatus(req.user.status),
      mustChangePassword: Boolean(req.user.must_change_password)
    }
  });
});

router.get("/devotional/today", requireAuth, (_req, res) => {
  res.status(200).json({
    ok: true,
    access: "devotional",
    message: "Devocional diário disponível para usuários autenticados."
  });
});

router.post("/premium/journeys", requireAuth, requireOuro, (_req, res) => {
  res.status(200).json({ ok: true, module: "journeys" });
});

router.post("/premium/fasting", requireAuth, requireOuro, (_req, res) => {
  res.status(200).json({ ok: true, module: "fasting" });
});

router.post("/premium/purposes", requireAuth, requireOuro, (_req, res) => {
  res.status(200).json({ ok: true, module: "purposes" });
});

export default router;
