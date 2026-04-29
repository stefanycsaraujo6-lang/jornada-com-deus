import { supabase } from "./supabase.js";

function parseEnvFlag(value) {
  if (value == null || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

/** Magic link desligado por padrao; ligue com VITE_FEATURE_MAGIC_LINK=true */
export function isMagicLinkFeatureEnabled() {
  return parseEnvFlag(import.meta.env.VITE_FEATURE_MAGIC_LINK) === true;
}

export async function sendMagicLinkOtp(email) {
  const trimmed = String(email || "").trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, message: "Informe um e-mail valido." };
  }
  if (!supabase) {
    return { ok: false, message: "Conexao indisponivel. Tente o login local." };
  }
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: origin ? `${origin}/` : undefined
      }
    });
    if (error) {
      return { ok: false, message: error.message || "Nao foi possivel enviar o link." };
    }
    return { ok: true, message: null };
  } catch (e) {
    return { ok: false, message: e?.message || "Erro inesperado ao enviar o link." };
  }
}

export async function getSupabaseSessionSnapshot() {
  try {
    if (!supabase) {
      return { ok: false, session: null, message: "Cliente Supabase indisponivel." };
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { ok: false, session: null, message: error.message };
    }
    return { ok: true, session: data?.session || null, message: null };
  } catch (error) {
    return {
      ok: false,
      session: null,
      message: error?.message || "Falha inesperada ao consultar sessao Supabase."
    };
  }
}

export function watchSupabaseAuthChanges(onChange) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    try {
      onChange?.(session);
    } catch {
      // Callback de observacao nao pode quebrar o app.
    }
  });
  return () => data?.subscription?.unsubscribe?.();
}
