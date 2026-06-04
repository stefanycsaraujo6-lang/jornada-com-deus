import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { isValidEmail, normalizeEmail } from "./lib/validation";

export const checkRegistration = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      return { ok: false as const, reason: "invalid_email" as const };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();

    if (!user) {
      return { ok: false as const, reason: "not_registered" as const };
    }

    if (!user.passwordHash) {
      return { ok: false as const, reason: "pending_activation" as const };
    }

    if (user.accessStatus === "refunded" || user.accessStatus === "inactive") {
      return { ok: false as const, reason: "inactive" as const };
    }

    return { ok: true as const };
  },
});

export const getByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = normalizeEmail(email);
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = normalizeEmail(email);
    if (!normalized.includes("@")) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (!user) return null;
    return {
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      accessStatus: user.accessStatus,
      updatedAt: user.updatedAt,
    };
  },
});

export const getSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    if (user.accessStatus === "refunded" || user.accessStatus === "inactive") {
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      name: user.displayName,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    };
  },
});

export const createSession = internalMutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const old = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of old) {
      await ctx.db.delete(s._id);
    }
    return await ctx.db.insert("sessions", {
      token: args.token,
      userId: args.userId,
      expiresAt: args.expiresAt,
    });
  },
});

export const upsertProfile = internalMutation({
  args: {
    email: v.string(),
    displayName: v.string(),
    status: v.optional(v.union(v.literal("BASICO"), v.literal("OURO"))),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const displayName = args.displayName.trim();
    if (!email.includes("@") || !displayName) throw new Error("INVALID_PROFILE");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const now = Date.now();
    const status = args.status ?? existing?.status ?? "BASICO";

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
