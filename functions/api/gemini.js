const MAX_BODY_BYTES = 120_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_IP = 30;
const rateMap = new Map();

function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_MAX_PER_IP) return true;
  return false;
}

async function validateSession(token, convexSiteUrl) {
  if (!token || !convexSiteUrl) return false;
  try {
    const res = await fetch(`${convexSiteUrl}/session/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

async function callGemini(key, version, model, payload) {
  const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(payload),
  });
}

function extractPromptText(payload) {
  const parts = payload?.contents?.[0]?.parts || [];
  for (const p of parts) {
    if (p.text) return p.text;
  }
  return "";
}

function workersAIResponseToGeminiFormat(text) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
          role: "model",
        },
        finishReason: "STOP",
      },
    ],
  };
}

async function callWorkersAI(ai, promptText) {
  const result = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      {
        role: "system",
        content: `Você é um pastor cristão brasileiro. Responda em português do Brasil. Quando solicitado JSON, responda APENAS com JSON válido, sem markdown.`,
      },
      { role: "user", content: promptText },
    ],
    max_tokens: 2048,
    temperature: 0.85,
  });
  return result?.response || result?.result || "";
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const ip = clientIp(request);

  if (isRateLimited(ip)) {
    return Response.json({ error: "Muitas requisições. Aguarde um minuto." }, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload muito grande." }, { status: 413 });
  }

  const sessionToken = request.headers.get("x-session-token") || "";
  let convexSite = String(env.CONVEX_SITE_URL || "").replace(/\/$/, "");
  if (!convexSite && env.VITE_CONVEX_URL) {
    convexSite = String(env.VITE_CONVEX_URL).replace(".convex.cloud", ".convex.site").replace(/\/$/, "");
  }
  const requireAuth = env.REQUIRE_AI_AUTH !== "false";

  if (requireAuth) {
    const ok = await validateSession(sessionToken, convexSite);
    if (!ok) {
      return Response.json({ error: "Não autorizado. Faça login no app." }, { status: 401 });
    }
  }

  const geminiKey = env.GEMINI_KEY;

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return Response.json({ error: "Payload muito grande." }, { status: 413 });
    }

    const { model, payload } = JSON.parse(raw);

    if (geminiKey) {
      const modelName = model || "gemini-2.0-flash";
      let upstream = await callGemini(geminiKey, "v1beta", modelName, payload);
      if (upstream.status === 404) {
        upstream = await callGemini(geminiKey, "v1", modelName, payload);
      }
      if (upstream.ok) {
        const body = await upstream.text();
        return new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (env.AI) {
      const promptText = extractPromptText(payload);
      if (promptText) {
        const aiResponse = await callWorkersAI(env.AI, promptText);
        return Response.json(workersAIResponseToGeminiFormat(aiResponse), { status: 200 });
      }
    }

    return Response.json({ error: "Serviço de IA indisponível." }, { status: 503 });
  } catch (e) {
    return Response.json({ error: e?.message || "Erro no proxy de IA." }, { status: 500 });
  }
}
