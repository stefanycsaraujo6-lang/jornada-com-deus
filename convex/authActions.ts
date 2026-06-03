"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [salt, hashHex] = storedHash.split(":");
  if (!salt || !hashHex) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const a = Buffer.from(hashHex, "hex");
  const b = derived;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function generateTempPassword(length = 12) {
  return crypto.randomBytes(18).toString("base64url").slice(0, length);
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function sendWelcomeEmail(email: string, name: string, tempPassword: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Jornada com Deus <noreply@jornadacomdeus.com.br>";
  const appUrl = process.env.APP_URL || "https://jornadacomdeus.pages.dev";

  if (!apiKey) {
    console.log("[email:welcome]", { email, tempPassword, dryRun: true });
    return;
  }

  const html = `
    <p>Olá, <strong>${name}</strong>!</p>
    <p>Sua compra foi confirmada. Acesse o app com:</p>
    <p><strong>E-mail:</strong> ${email}<br/>
    <strong>Senha temporária:</strong> ${tempPassword}</p>
    <p><a href="${appUrl}">Abrir Jornada com Deus</a></p>
  `;

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
      html,
    }),
  });
}

export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const normalized = email.trim().toLowerCase();
    const user = await ctx.runQuery(internal.users.getByEmailInternal, {
      email: normalized,
    });

    if (!user?.passwordHash) {
      return {
        ok: false as const,
        error:
          "Conta não encontrada ou sem senha. Verifique o e-mail de boas-vindas após a compra na Kiwify.",
      };
    }

    if (user.accessStatus === "refunded" || user.accessStatus === "inactive") {
      return {
        ok: false as const,
        error: "Seu acesso está inativo. Verifique sua assinatura.",
      };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { ok: false as const, error: "E-mail ou senha incorretos." };
    }

    const token = generateSessionToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await ctx.runMutation(internal.users.createSession, {
      userId: user._id,
      token,
      expiresAt,
    });

    return {
      ok: true as const,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.displayName,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
      },
    };
  },
});

