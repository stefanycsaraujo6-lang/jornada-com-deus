/**
 * Compatibilidade — perfis agora vivem na tabela `users`.
 * @deprecated Prefira api.users.*
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (!user) return null;
    return {
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      plan: user.status === "OURO" ? "gold" : "basic",
      updatedAt: user.updatedAt,
    };
  },
});

export const upsert = mutation({
  args: {
    email: v.string(),
    displayName: v.string(),
    plan: v.optional(v.union(v.literal("basic"), v.literal("gold"))),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const displayName = args.displayName.trim();
    const status =
      args.plan === "gold" || args.plan === "ouro" ? ("OURO" as const) : ("BASICO" as const);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { displayName, status, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("users", {
      email,
      displayName,
      status,
      accessStatus: "active",
      mustChangePassword: false,
      updatedAt: now,
    });
  },
});
