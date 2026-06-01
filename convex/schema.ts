import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Schema inicial — perfil do usuario (migracao futura a partir de jcd_user / localStorage).
 * Plano de assinatura continua no backend PostgreSQL + Kiwify ate integracao unificada.
 */
export default defineSchema({
  profiles: defineTable({
    email: v.string(),
    displayName: v.string(),
    plan: v.optional(v.union(v.literal("basic"), v.literal("gold"))),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),
});
