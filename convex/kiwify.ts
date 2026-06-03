import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  extractPaymentStatus,
  isApprovedPaymentStatus,
  isRefundPaymentStatus,
  normalizeEmail,
  pickCustomerId,
  pickEmail,
  pickName,
  pickProductId,
  resolveStatusByProductId,
  USER_STATUS,
} from "./lib/kiwify";

function generateTempPassword(length = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export const processWebhook = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    payload: v.any(),
    tempPasswordHash: v.optional(v.string()),
    sendWelcome: v.boolean(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as Record<string, unknown>;
    const email = pickEmail(payload);
    if (!email) throw new Error("Webhook sem email do cliente.");

    const paymentStatus = extractPaymentStatus(payload);
    const productId = pickProductId(payload);
    const resolvedStatus = resolveStatusByProductId(productId);
    const now = Date.now();

    if (isRefundPaymentStatus(paymentStatus)) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (!user) return { action: "ignored_refund_missing_user", email };

      await ctx.db.patch(user._id, {
        status: USER_STATUS.BASICO,
        accessStatus: "refunded",
        updatedAt: now,
      });
      return { action: "downgraded_to_basico", email, userId: user._id };
    }

    if (!isApprovedPaymentStatus(paymentStatus)) {
      return { action: "ignored_non_approved", email, paymentStatus };
    }

    if (!resolvedStatus) {
      throw new Error(`Produto Kiwify não mapeado: ${productId || "desconhecido"}`);
    }

    const name = pickName(payload, email);
    const customerId = pickCustomerId(payload) || undefined;

    if (resolvedStatus === USER_STATUS.OURO) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (!user) {
        throw new Error(`Upgrade Ouro: usuário não encontrado para ${email}`);
      }
      await ctx.db.patch(user._id, {
        status: USER_STATUS.OURO,
        accessStatus: "active",
        kiwifyCustomerId: customerId ?? user.kiwifyCustomerId,
        updatedAt: now,
      });
      return { action: "upgraded_to_ouro", email, userId: user._id };
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const isNew = !existing;
    const needsPassword = isNew || !existing?.passwordHash;
    const passwordHash =
      needsPassword && args.tempPasswordHash ? args.tempPasswordHash : undefined;

    let userId = existing?._id;
    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: name,
        status:
          existing.status === USER_STATUS.OURO ? USER_STATUS.OURO : USER_STATUS.BASICO,
        accessStatus: "active",
        passwordHash: passwordHash ?? existing.passwordHash,
        mustChangePassword: passwordHash ? true : existing.mustChangePassword,
        kiwifyCustomerId: customerId ?? existing.kiwifyCustomerId,
        updatedAt: now,
      });
    } else {
      userId = await ctx.db.insert("users", {
        email,
        displayName: name,
        status: USER_STATUS.BASICO,
        accessStatus: "active",
        passwordHash,
        mustChangePassword: Boolean(passwordHash),
        kiwifyCustomerId: customerId,
        updatedAt: now,
      });
    }

    return {
      action: isNew ? "activated_basico_new" : "activated_basico_existing",
      email,
      userId,
      status: USER_STATUS.BASICO,
      created: isNew,
      sendWelcome: args.sendWelcome && needsPassword,
      tempPasswordIssued: needsPassword,
    };
  },
});

export const recordWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    status: v.union(v.literal("processing"), v.literal("processed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_provider_event", (q) =>
        q.eq("provider", "kiwify").eq("eventId", args.eventId)
      )
      .unique();

    if (existing) {
      if (args.status !== "processing") {
        await ctx.db.patch(existing._id, {
          status: args.status,
          processedAt: Date.now(),
        });
      }
      return { duplicate: args.status === "processing", id: existing._id };
    }

    const id = await ctx.db.insert("webhookEvents", {
      provider: "kiwify",
      eventId: args.eventId,
      eventType: args.eventType,
      status: args.status,
      processedAt: args.status !== "processing" ? Date.now() : undefined,
      createdAt: Date.now(),
    });
    return { duplicate: false, id };
  },
});
