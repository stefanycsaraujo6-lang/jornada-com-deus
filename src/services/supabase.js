import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasValidUrl = /^https?:\/\//i.test((supabaseUrl || "").trim());

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] Variaveis ausentes. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local."
  );
} else if (!hasValidUrl) {
  console.warn("[supabase] VITE_SUPABASE_URL invalida. Use URL HTTP/HTTPS do projeto.");
}

let supabase = null;
if (supabaseUrl && supabaseAnonKey && hasValidUrl) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn(`[supabase] Falha ao inicializar cliente: ${error?.message || "erro desconhecido"}`);
  }
}

export { supabase };

export async function runSupabaseHealthcheck() {
  const startedAt = performance.now();
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - startedAt),
        message: "Variaveis do Supabase ausentes no ambiente local."
      };
    }
    if (!hasValidUrl) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - startedAt),
        message: "VITE_SUPABASE_URL invalida. Use a URL HTTPS do projeto Supabase."
      };
    }
    if (!supabase) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - startedAt),
        message: "Cliente Supabase nao inicializado."
      };
    }

    // A leitura de sessao eh segura e serve como ping leve de conectividade com o projeto.
    const { error } = await supabase.auth.getSession();
    if (error) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - startedAt),
        message: `Falha no Supabase: ${error.message}`
      };
    }

    return {
      ok: true,
      latencyMs: Math.round(performance.now() - startedAt),
      message: "Conexao com Supabase OK."
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - startedAt),
      message: `Erro inesperado no healthcheck: ${error?.message || "desconhecido"}`
    };
  }
}
