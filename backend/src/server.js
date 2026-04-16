import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { z } from "zod";
import { pool, healthcheckDb } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const appUrl = process.env.APP_URL || "http://localhost:5173";

app.use(helmet());
app.use(cors({ origin: appUrl, credentials: true }));
app.use(express.json({ verify: rawBodySaver }));

function rawBodySaver(req, _res, buf) {
  req.rawBody = buf?.toString("utf8") || "";
}

const webhookSchema = z.object({
  event: z.string().min(2).optional(),
  event_type: z.string().min(2).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  event_id: z.union([z.string(), z.number()]).optional(),
  data: z.record(z.any()).optional(),
  customer: z.record(z.any()).optional(),
  subscription: z.record(z.any()).optional()
});

function safeEq(a, b) {
  const aBuf = Buffer.from(a || "");
  const bBuf = Buffer.from(b || "");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function isValidKiwifySignature(req) {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET;
  if (!secret) return true;

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

function mapPlan(value) {
  const v = String(value || "").toLowerCase();
  if (v.includes("ouro") || v.includes("gold")) return "ouro";
  if (v.includes("prata") || v.includes("silver")) return "prata";
  return "bronze";
}

function mapStatus(eventType) {
  const e = String(eventType || "").toLowerCase();
  if (e.includes("chargeback") || e.includes("refund")) return "chargeback";
  if (e.includes("cancel")) return "canceled";
  if (e.includes("past_due") || e.includes("overdue")) return "past_due";
  return "active";
}

async function upsertUser(client, payload) {
  const email =
    payload?.data?.customer?.email ||
    payload?.customer?.email ||
    payload?.data?.email;
  const name =
    payload?.data?.customer?.name ||
    payload?.customer?.name ||
    payload?.data?.name ||
    "Usuário";

  if (!email) {
    throw new Error("Webhook sem email do cliente.");
  }

  const userRes = await client.query(
    `
      insert into users (email, name)
      values ($1, $2)
      on conflict (email)
      do update set name = excluded.name
      returning id
    `,
    [email, name]
  );

  return userRes.rows[0].id;
}

async function upsertSubscription(client, userId, payload, eventType) {
  const providerCustomerId =
    String(payload?.data?.customer?.id || payload?.customer?.id || "");
  const providerSubscriptionId =
    String(payload?.data?.subscription?.id || payload?.subscription?.id || "");
  const planName =
    payload?.data?.product?.name ||
    payload?.data?.subscription?.plan_name ||
    payload?.subscription?.plan_name ||
    "bronze";
  const status = mapStatus(eventType);

  await client.query(
    `
      insert into subscriptions (
        user_id,
        provider,
        provider_customer_id,
        provider_subscription_id,
        plan,
        status
      )
      values ($1, 'kiwify', $2, $3, $4, $5)
      on conflict (provider, provider_subscription_id)
      do update set
        plan = excluded.plan,
        status = excluded.status,
        updated_at = now()
    `,
    [userId, providerCustomerId || null, providerSubscriptionId || null, mapPlan(planName), status]
  );
}

app.get("/health", async (_req, res) => {
  try {
    const db = await healthcheckDb();
    res.status(200).json({ ok: true, db: db.now });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/webhooks/kiwify", async (req, res) => {
  if (!isValidKiwifySignature(req)) {
    return res.status(401).json({ ok: false, error: "invalid webhook signature" });
  }

  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "invalid payload" });
  }

  const payload = parsed.data;
  const eventType = payload.event_type || payload.event || "unknown";
  const eventId = String(payload.event_id || payload.id || `${eventType}:${Date.now()}`);

  const client = await pool.connect();
  try {
    await client.query("begin");
    const evtInsert = await client.query(
      `
        insert into webhook_events (provider, event_id, event_type, payload_json, status)
        values ('kiwify', $1, $2, $3::jsonb, 'processing')
        on conflict (provider, event_id)
        do nothing
        returning id
      `,
      [eventId, eventType, JSON.stringify(payload)]
    );

    if (evtInsert.rowCount === 0) {
      await client.query("rollback");
      return res.status(200).json({ ok: true, duplicate: true });
    }

    const userId = await upsertUser(client, payload);
    await upsertSubscription(client, userId, payload, eventType);

    await client.query(
      `
        update webhook_events
        set status = 'processed', processed_at = now()
        where provider = 'kiwify' and event_id = $1
      `,
      [eventId]
    );

    await client.query("commit");
    return res.status(200).json({ ok: true });
  } catch (err) {
    await client.query("rollback");
    try {
      await client.query(
        `
          update webhook_events
          set status = 'failed', processed_at = now()
          where provider = 'kiwify' and event_id = $1
        `,
        [eventId]
      );
    } catch {
      // no-op
    }
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`[backend] running on http://localhost:${port}`);
});
