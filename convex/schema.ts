import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Stack oficial: Convex (dados + auth + webhook) | Cloudflare (host) | Kiwify (pagamento) */
export default defineSchema({
  users: defineTable({
    email: v.string(),
    displayName: v.string(),
    status: v.union(v.literal("BASICO"), v.literal("OURO")),
    accessStatus: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("refunded")
    ),
    passwordHash: v.optional(v.string()),
    mustChangePassword: v.boolean(),
    kiwifyCustomerId: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  userProgress: defineTable({
    userId: v.id("users"),
    history: v.any(),
    pointsWeek: v.number(),
    pointsTotal: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  webhookEvents: defineTable({
    provider: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    status: v.union(
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed")
    ),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_provider_event", ["provider", "eventId"]),
});
