import { ConvexHttpClient } from "convex/browser";
import { api } from "./convexApi.js";
import { convexUrl } from "./convexClient.js";
import { normalizeStatus } from "./planAccess.js";

const TOKEN_KEY = "jcd_auth_token";
const USER_KEY = "jcd_user";

function getClient() {
  if (!convexUrl) return null;
  return new ConvexHttpClient(convexUrl);
}

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistSession({ token, user }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        status: normalizeStatus(user.status),
      })
    );
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("jcd_status");
    localStorage.removeItem("jcd_plan");
  } catch {
    // ignore
  }
}

export async function checkRegistrationStatus(email) {
  const client = getClient();
  if (!client) return { ok: false, reason: "invalid_email" };

  try {
    return await client.query(api.users.checkRegistration, {
      email: String(email || "").trim().toLowerCase(),
    });
  } catch {
    return { ok: false, reason: "invalid_email" };
  }
}

export async function loginWithPassword(email, password) {
  const client = getClient();
  if (!client) {
    return {
      ok: false,
      error: "Convex não configurado. Defina VITE_CONVEX_URL_DEV no .env.local e rode npx convex dev.",
    };
  }

  try {
    const reg = await client.query(api.users.checkRegistration, {
      email: email.trim().toLowerCase(),
    });
    if (!reg?.ok) {
      const messages = {
        invalid_email: "Informe um e-mail válido.",
        not_registered:
          "Este e-mail não está cadastrado. Faça sua compra na Kiwify para receber o acesso.",
        pending_activation:
          "Acesso ainda não liberado. Aguarde o e-mail de boas-vindas após a compra.",
        inactive: "Seu acesso está inativo. Verifique sua assinatura na Kiwify.",
      };
      return {
        ok: false,
        error: messages[reg?.reason] || "Não foi possível validar o acesso.",
      };
    }

    const data = await client.action(api.authActions.login, {
      email: email.trim().toLowerCase(),
      password,
    });

    if (!data?.ok) {
      return { ok: false, error: data?.error || "Não foi possível entrar." };
    }

    persistSession({ token: data.token, user: data.user });
    return { ok: true, token: data.token, user: data.user };
  } catch (err) {
    return { ok: false, error: err?.message || "Erro de conexão com Convex." };
  }
}

export async function fetchSessionUser() {
  const token = getStoredToken();
  const client = getClient();
  if (!token || !client) return null;

  try {
    const user = await client.query(api.users.getSession, { token });
    if (!user) {
      clearSession();
      return null;
    }
    const normalized = {
      id: user.id,
      email: user.email,
      name: user.name,
      status: normalizeStatus(user.status),
    };
    persistSession({ token, user: normalized });
    return normalized;
  } catch {
    return null;
  }
}

export function authHeaders() {
  const token = getStoredToken();
  if (!token) return {};
  return { "X-Session-Token": token };
}
