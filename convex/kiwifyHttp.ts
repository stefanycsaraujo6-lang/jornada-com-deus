"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import crypto from "node:crypto";
import { promisify } from "node:util";
import {
  extractPaymentStatus,
  isApprovedPaymentStatus,
  pickEmail,
  pickName,
  pickOrderId,
  pickProductId,
  resolveStatusByProductId,
  USER_STATUS,
} from "./lib/kiwify";

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

function generateTempPassword(length = 12) {
  return crypto.randomBytes(18).toString("base64url").slice(0, length);
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a || "");
  const bBuf = Buffer.from(b || "");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function normalizeWebhookSignature(signature: string | null) {
  const raw = String(signature || "").trim();
  if (!raw) return "";
  if (raw.startsWith("sha256=")) return raw.slice(7);
  return raw;
}

async function sendWelcomeEmail(email: string, name: string, tempPassword: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Jornada com Deus <noreply@jornadacomdeus.com.br>";
  const appUrl = process.env.APP_URL || "https://jornadacomdeus.pages.dev";

  if (!apiKey) {
    console.log("[email:welcome]", { email, tempPassword, dryRun: true });
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Bem-vinda — seu acesso Jornada com Deus",
      html: `<p>Olá, <strong>${name}</strong>!</p>
        <p>E-mail: ${email}<br/>Senha temporária: <strong>${tempPassword}</strong></p>
        <p><a href="${appUrl}">Acessar o app</a></p>`,
    }),
  });
}

export const handleWebhook = internalAction({
  args: {
    rawBody: v.string(),
    signature: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const secret = process.env.KIWIFY_WEBHOOK_SECRET?.trim();
    if (!secret) {
      console.error("[kiwify:webhook] KIWIFY_WEBHOOK_SECRET ausente — rejeitando requisição.");
      return { status: 503, body: { ok: false, error: "webhook not configured" } };
    }

    const received = normalizeWebhookSignature(args.signature);
    if (!received) {
      return { status: 401, body: { ok: false, error: "missing signature" } };
    }

    const expected = crypto.createHmac("sha256", secret).update(args.rawBody).digest("hex");
    if (!timingSafeEqual(received, expected)) {
      return { status: 401, body: { ok: false, error: "invalid signature" } };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(args.rawBody) as Record<string, unknown>;
    } catch {
      return { status: 400, body: { ok: false, error: "invalid json" } };
    }

    const eventType = String(payload.event_type || payload.event || "unknown");
    const eventId = String(payload.event_id || payload.id || `${eventType}:${Date.now()}`);

    const recorded = await ctx.runMutation(internal.kiwify.recordWebhookEvent, {
      eventId,
      eventType,
      status: "processing",
    });

    if (recorded.duplicate) {
      return { status: 200, body: { ok: true, duplicate: true } };
    }

    try {
      const email = pickEmail(payload);
      const paymentStatus = extractPaymentStatus(payload);
      const productId = pickProductId(payload);
      const resolvedStatus = resolveStatusByProductId(productId);

      let tempPasswordHash: string | undefined;
      let tempPassword: string | undefined;

      if (isApprovedPaymentStatus(paymentStatus) && resolvedStatus === USER_STATUS.BASICO) {
        const existing = email
          ? await ctx.runQuery(internal.users.getByEmailInternal, { email })
          : null;
        const needsPassword = !existing || !existing.passwordHash;
        if (needsPassword) {
          tempPassword = generateTempPassword(12);
          tempPasswordHash = await hashPassword(tempPassword);
        }
      }

      const result = await ctx.runMutation(internal.kiwify.processWebhook, {
        eventId,
        eventType,
        payload,
        tempPasswordHash,
        sendWelcome: false,
      });

      if (result.sendWelcome && tempPassword && email) {
        await sendWelcomeEmail(email, pickName(payload, email), tempPassword);
      }

      if (result.action === "activated_basico_new" && email) {
        const customerEmail = email;
        const orderId = pickOrderId(payload) || eventId;
        await ctx.runAction(internal.metaConversions.trackPurchase, {
          email: customerEmail,
          value: 67.0,
          transactionId: orderId,
          productName: "Jornada com Deus Básico",
        });
      }

      await ctx.runMutation(internal.kiwify.recordWebhookEvent, {
        eventId,
        eventType,
        status: "processed",
      });

      return { status: 200, body: { ok: true, result } };
    } catch (err) {
      await ctx.runMutation(internal.kiwify.recordWebhookEvent, {
        eventId,
        eventType,
        status: "failed",
      });
      return {
        status: 500,
        body: { ok: false, error: err instanceof Error ? err.message : "error" },
      };
    }
  },
});
