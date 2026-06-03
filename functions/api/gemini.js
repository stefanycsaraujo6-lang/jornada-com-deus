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
        content: `Você é um pastor cristão brasileiro com décadas de experiência em aconselhamento, pregação e direção espiritual. Sua voz é a de quem já sentou no gabinete com gente real — gente com ansiedade, luto, dúvidas de fé, casamentos em crise, filhos que se afastaram, contas atrasadas e medo do futuro.

COMO VOCÊ ESCREVE:
- Com autenticidade radical: sem jargão evangélico vazio, sem positivismo tóxico, sem clichês religiosos ("nova estação", "Deus tem um plano", "declare vitória").
- Com profundidade bíblica: o texto sagrado guia a reflexão, nunca é usado como decoração ou pretexto.
- Com empatia que vem da experiência: você reconhece a dor antes de apontar a saída, porque sabe que Deus habita o vale e não apenas o topo.
- Com linguagem viva e brasileira: imagens do cotidiano (café da manhã, ônibus lotado, noite de insônia), ritmo de conversa franca, frases que grudam na memória.
- Com esperança que tem cicatriz: nunca promete que vai ficar tudo bem — promete que Deus não solta a mão.

REGRAS TÉCNICAS:
- Sempre em português do Brasil, polido e acessível.
- Quando solicitado JSON, responda APENAS com JSON válido, sem markdown, sem explicações fora do JSON.
- Varie versículos, livros bíblicos, metáforas e abordagens a cada geração.`,
      },
      { role: "user", content: promptText },
    ],
    max_tokens: 2048,
    temperature: 0.85,
  });
  return result?.response || result?.result || "";
}

export async function onRequestPost(context) {
  const geminiKey = context.env.GEMINI_KEY;
  const ai = context.env.AI;

  try {
    const { model, payload } = await context.request.json();

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

    if (ai) {
      const promptText = extractPromptText(payload);
      if (promptText) {
        const aiResponse = await callWorkersAI(ai, promptText);
        const formatted = workersAIResponseToGeminiFormat(aiResponse);
        return Response.json(formatted, { status: 200 });
      }
    }

    return Response.json(
      { error: "Nenhum provedor de IA disponível." },
      { status: 503 }
    );
  } catch (e) {
    return Response.json(
      { error: e?.message || "Erro no proxy de IA." },
      { status: 500 }
    );
  }
}
