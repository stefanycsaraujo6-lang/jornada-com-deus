const AI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
const RETRYABLE_AI_STATUS = new Set([404, 429, 503]);
const AI_COOLDOWN_MS = 10 * 60 * 1000;
let aiBlockedUntil = 0;

function buildAIError(status, apiMsg, model) {
  const err = new Error(`API error ${status}: ${apiMsg}`);
  err.status = status;
  err.apiMsg = String(apiMsg || "");
  err.model = model;
  return err;
}

export function getFriendlyAIErrorMessage(err, fallback) {
  const msg = `${err?.apiMsg || err?.message || ""}`.toLowerCase();
  if (err?.status === 429 || msg.includes("quota") || msg.includes("rate limit")) {
    return "Limite de uso da IA atingido no momento. Tente novamente em alguns minutos.";
  }
  if (err?.status === 404 || msg.includes("not found for api version")) {
    return "Modelo de IA indisponível agora. Tente novamente em instantes.";
  }
  return fallback;
}

export async function requestGemini(payload, models = AI_MODELS, tag = "callAI") {
  if (Date.now() < aiBlockedUntil) {
    throw buildAIError(429, "Quota em cooldown temporário. Usando fallback local.", "cooldown");
  }

  let lastError = null;
  let quotaError = null;

  for (let attempt = 0; attempt < models.length; attempt++) {
    const model = models[attempt];
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, payload })
    });
    const data = await res.json().catch(() => ({ error: "Resposta inválida do proxy Gemini." }));
    if (res.ok) return data;

    const apiMsg = data?.error?.message || data?.error || JSON.stringify(data);
    console.warn(`[${tag}] ${model} — ${res.status}: ${apiMsg}`);
    lastError = buildAIError(res.status, apiMsg, model);
    if (res.status === 429) {
      quotaError = lastError;
      aiBlockedUntil = Date.now() + AI_COOLDOWN_MS;
      break;
    }

    const canRetry = RETRYABLE_AI_STATUS.has(res.status) && attempt < models.length - 1;
    if (canRetry) {
      const wait = 1200 * (attempt + 1);
      console.log(`[${tag}] Tentando novamente em ${wait}ms (modelo alternativo)...`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    throw quotaError || lastError;
  }

  throw quotaError || lastError || new Error("Falha ao chamar a API Gemini.");
}
