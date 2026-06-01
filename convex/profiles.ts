import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = normalizeEmail(email);
    if (!normalized.includes("@")) return null;

    return await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    email: v.string(),
    displayName: v.string(),
    plan: v.optional(v.union(v.literal("basic"), v.literal("gold"))),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const displayName = args.displayName.trim();
    if (!email.includes("@") || !displayName) {
      throw new Error("INVALID_PROFILE");
    }

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const now = Date.now();
    const plan = args.plan ?? existing?.plan ?? "basic";

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName,
        plan,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      email,
      displayName,
      plan,
      updatedAt: now,
    });
  },
});
