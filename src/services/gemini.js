const AI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
const RETRYABLE_AI_STATUS = new Set([404, 429, 503]);
const AI_COOLDOWN_MS = 45 * 1000;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
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

async function callGeminiDirect(model, payload) {
  const versions = ["v1beta", "v1"];
  let lastError = null;

  for (const version of versions) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_KEY
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({ error: "Resposta inválida da API Gemini." }));
    if (res.ok) return data;

    const apiMsg = data?.error?.message || data?.error || JSON.stringify(data);
    lastError = buildAIError(res.status, apiMsg, model);
    if (res.status === 404) continue;
    throw lastError;
  }

  throw lastError || new Error("Modelo Gemini indisponível.");
}

async function callGeminiProxy(model, payload) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, payload })
  });
  const data = await res.json().catch(() => ({ error: "Resposta inválida do proxy Gemini." }));
  if (res.ok) return data;

  const apiMsg = data?.error?.message || data?.error || JSON.stringify(data);
  throw buildAIError(res.status, apiMsg, model);
}

async function callGeminiOnce(model, payload) {
  if (GEMINI_KEY) {
    try {
      return await callGeminiDirect(model, payload);
    } catch (directErr) {
      if (!import.meta.env.DEV) throw directErr;
      console.warn("[gemini] Direct falhou em dev, tentando proxy local...", directErr?.message);
    }
  }
  return callGeminiProxy(model, payload);
}

export async function requestGemini(payload, models = AI_MODELS, tag = "callAI") {
  if (Date.now() < aiBlockedUntil) {
    throw buildAIError(429, "Quota em cooldown temporário. Usando fallback local.", "cooldown");
  }

  let lastError = null;
  let quotaError = null;

  const enrichedPayload = {
    ...payload,
    generationConfig: {
      temperature: 1.0,
      topP: 0.95,
      topK: 64,
      ...(payload?.generationConfig || {})
    }
  };

  for (let attempt = 0; attempt < models.length; attempt++) {
    const model = models[attempt];
    try {
      return await callGeminiOnce(model, enrichedPayload);
    } catch (err) {
      const status = err?.status;
      const apiMsg = err?.apiMsg || err?.message || "";
      console.warn(`[${tag}] ${model} — ${status || "?"}: ${apiMsg}`);
      lastError = err;

      if (status === 429) {
        quotaError = err;
        aiBlockedUntil = Date.now() + AI_COOLDOWN_MS;
        break;
      }

      const canRetry = RETRYABLE_AI_STATUS.has(status) && attempt < models.length - 1;
      if (canRetry) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      throw quotaError || lastError;
    }
  }

  throw quotaError || lastError || new Error("Falha ao chamar a API Gemini.");
}
