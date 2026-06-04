import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

async function userFromToken(ctx: QueryCtx | MutationCtx, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  if (!session || session.expiresAt < Date.now()) return null;

  const user = await ctx.db.get(session.userId);
  if (!user) return null;
  if (user.accessStatus === "refunded" || user.accessStatus === "inactive") return null;

  return user;
}

export const getForSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await userFromToken(ctx, token);
    if (!user) return null;

    const row = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!row) return { history: {}, pointsWeek: 0, pointsTotal: 0 };

    return {
      history: row.history ?? {},
      pointsWeek: row.pointsWeek ?? 0,
      pointsTotal: row.pointsTotal ?? 0,
    };
  },
});

export const saveForSession = mutation({
  args: {
    token: v.string(),
    history: v.any(),
    pointsWeek: v.optional(v.number()),
    pointsTotal: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await userFromToken(ctx, args.token);
    if (!user) throw new Error("UNAUTHORIZED");

    const history =
      args.history && typeof args.history === "object" && !Array.isArray(args.history)
        ? args.history
        : {};

    const now = Date.now();
    const existing = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const patch = {
      history,
      pointsWeek: args.pointsWeek ?? existing?.pointsWeek ?? 0,
      pointsTotal: args.pointsTotal ?? existing?.pointsTotal ?? 0,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("userProgress", {
      userId: user._id,
      ...patch,
    });
  },
});
