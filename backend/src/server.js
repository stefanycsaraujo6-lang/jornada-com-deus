// ── MODIFICAÇÃO: servidor com planos Basic/Gold e webhook Kiwify
// ── DATA: 2026-05-18
import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { z } from "zod";
import { pool, healthcheckDb } from "./db.js";
import apiRouter from "./routes/api.js";
import { createKiwifyWebhookRouter } from "./routes/webhooks.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const appUrl = process.env.APP_URL || "http://localhost:5173";
const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
const cronSecret = process.env.CRON_SECRET;

app.use(helmet());
app.use(cors({ origin: appUrl, credentials: true }));
app.use(express.json({ verify: rawBodySaver }));

function rawBodySaver(req, _res, buf) {
  req.rawBody = buf?.toString("utf8") || "";
}

const campaignSchema = z.object({
  dryRun: z.boolean().optional(),
  heading: z.string().min(3).max(80).optional(),
  message: z.string().min(3).max(240).optional(),
  url: z.string().url().optional()
});

function safeEq(a, b) {
  const aBuf = Buffer.from(a || "");
  const bBuf = Buffer.from(b || "");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function isValidKiwifySignature(req) {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[kiwify:webhook] AVISO: KIWIFY_WEBHOOK_SECRET ausente. Assinatura não validada.");
    return true;
  }

  const signatureHeader =
    req.get("x-kiwify-signature") ||
    req.get("x-signature") ||
    req.get("x-webhook-signature");

  if (!signatureHeader) return false;

  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody || "")
    .digest("hex");

  return safeEq(signatureHeader, expectedHex);
}

function ensureCronAuth(req, res) {
  if (!cronSecret) {
    res.status(500).json({ ok: false, error: "CRON_SECRET is not configured" });
    return false;
  }
  const provided = req.get("x-cron-secret");
  if (!safeEq(provided || "", cronSecret)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return false;
  }
  return true;
}

function ensureOneSignalConfig() {
  if (!oneSignalAppId || !oneSignalApiKey) {
    throw new Error("ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY are required.");
  }
}

async function sendOneSignalCampaign({
  heading,
  message,
  url = appUrl,
  filters,
  dryRun = false
}) {
  ensureOneSignalConfig();

  const payload = {
    app_id: oneSignalAppId,
    target_channel: "push",
    headings: { pt: heading, en: heading },
    contents: { pt: message, en: message },
    filters,
    url
  };

  if (dryRun) {
    return { ok: true, dryRun: true, payload };
  }

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${oneSignalApiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OneSignal error ${response.status}: ${JSON.stringify(data)}`);
  }
  return { ok: true, data };
}

function nowHourTag() {
  return `${String(new Date().getHours()).padStart(2, "0")}:00`;
}

function dailyFilters() {
  return [
    { field: "tag", key: "reminder_daily_enabled", relation: "=", value: "1" },
    { operator: "AND" },
    { field: "tag", key: "reminder_daily_hour", relation: "=", value: nowHourTag() },
    { operator: "AND" },
    { field: "tag", key: "reminder_quiet_hours", relation: "!=", value: "22:00-07:00" }
  ];
}

function streakRiskFilters() {
  return [
    { field: "tag", key: "reminder_streak_enabled", relation: "=", value: "1" },
    { operator: "AND" },
    { field: "tag", key: "reminder_quiet_hours", relation: "!=", value: "22:00-07:00" }
  ];
}

function challengeFilters() {
  return [
    { field: "tag", key: "reminder_challenge_enabled", relation: "=", value: "1" },
    { operator: "AND" },
    { field: "tag", key: "reminder_quiet_hours", relation: "!=", value: "22:00-07:00" }
  ];
}

app.get("/health", async (_req, res) => {
  try {
    const db = await healthcheckDb();
    res.status(200).json({ ok: true, db: db.now });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use("/api", apiRouter);
app.use("/api/webhooks", createKiwifyWebhookRouter({ verifySignature: isValidKiwifySignature }));
app.use("/webhooks", createKiwifyWebhookRouter({ verifySignature: isValidKiwifySignature }));

app.post("/notifications/campaigns/daily", async (req, res) => {
  if (!ensureCronAuth(req, res)) return;
  const parsed = campaignSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ ok: false, error: "invalid payload" });

  try {
    const out = await sendOneSignalCampaign({
      heading: parsed.data.heading || "Seu devocional te espera",
      message: parsed.data.message || "Reserve alguns minutos com Deus agora ✨",
      url: parsed.data.url || appUrl,
      filters: dailyFilters(),
      dryRun: !!parsed.data.dryRun
    });
    return res.status(200).json(out);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/notifications/campaigns/streak-risk", async (req, res) => {
  if (!ensureCronAuth(req, res)) return;
  const parsed = campaignSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ ok: false, error: "invalid payload" });

  try {
    const out = await sendOneSignalCampaign({
      heading: parsed.data.heading || "Não perca seu streak hoje",
      message: parsed.data.message || "Ainda dá tempo de concluir seu devocional e manter a sequência 🙏",
      url: parsed.data.url || appUrl,
      filters: streakRiskFilters(),
      dryRun: !!parsed.data.dryRun
    });
    return res.status(200).json(out);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/notifications/campaigns/challenge-weekly", async (req, res) => {
  if (!ensureCronAuth(req, res)) return;
  const parsed = campaignSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ ok: false, error: "invalid payload" });

  try {
    const out = await sendOneSignalCampaign({
      heading: parsed.data.heading || "Novo passo do seu desafio semanal",
      message: parsed.data.message || "Abra o app e continue sua jornada de 7 dias com Deus 🏆",
      url: parsed.data.url || appUrl,
      filters: challengeFilters(),
      dryRun: !!parsed.data.dryRun
    });
    return res.status(200).json(out);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`[backend] running on http://localhost:${port}`);
});
