// ── MODIFICAÇÃO: rota webhook Kiwify
// ── DATA: 2026-05-18
import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { processKiwifyWebhook } from "../services/kiwifyWebhook.js";

const router = Router();

const webhookSchema = z.object({
  event: z.string().optional(),
  event_type: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  event_id: z.union([z.string(), z.number()]).optional(),
  order_status: z.string().optional(),
  status: z.string().optional(),
  data: z.record(z.any()).optional(),
  customer: z.record(z.any()).optional(),
  Customer: z.record(z.any()).optional(),
  subscription: z.record(z.any()).optional(),
  product: z.record(z.any()).optional(),
  Product: z.record(z.any()).optional()
});

export function createKiwifyWebhookRouter({ verifySignature }) {
  async function handleWebhook(req, res) {
    // AVISO DE SEGURANÇA:
    // Em produção, configure KIWIFY_WEBHOOK_SECRET e valide assinatura HMAC em TODA requisição.
    if (!verifySignature(req)) {
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

      const result = await processKiwifyWebhook(client, payload);

      await client.query(
        `
          update webhook_events
          set status = 'processed', processed_at = now()
          where provider = 'kiwify' and event_id = $1
        `,
        [eventId]
      );

      await client.query("commit");
      return res.status(200).json({ ok: true, result });
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
        // ignore
      }
      console.error("[kiwify:webhook] erro", err);
      return res.status(500).json({ ok: false, error: err.message });
    } finally {
      client.release();
    }
  }

  router.post("/kiwify", handleWebhook);
  return router;
}

export default router;
