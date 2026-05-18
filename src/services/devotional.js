// ── MODIFICAÇÃO: regeneração inédita com fallbacks variados e anti-repetição
// ── DATA: 2026-05-18
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { getGenerationConfig } from "./aiGeneration.js";
import { requestGemini } from "./gemini.js";
import { getStyleLibrary, pickDailyDevotionalStyle } from "./styleLibrary.js";

const AI_VISION_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

const FALLBACK_DEVOTIONALS = [
  {
    theme: "Confiança em Deus",
    verse: "Provérbios 3:5-6",
    verseText: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento."
  },
  {
    theme: "Paz no meio da tempestade",
    verse: "João 14:27",
    verseText: "Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá."
  },
  {
    theme: "Força renovada",
    verse: "Isaías 40:31",
    verseText: "Os que esperam no Senhor renovarão as suas forças e subirão com asas de águias."
  },
  {
    theme: "Presença que sustenta",
    verse: "Salmo 46:1",
    verseText: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia."
  },
  {
    theme: "Esperança viva",
    verse: "Romanos 15:13",
    verseText: "O Deus da esperança vos encha de toda alegria e paz na fé."
  }
];

export function isSameDevotional(a, b) {
  if (!a || !b) return false;
  const verseA = String(a.verse || "").trim().toLowerCase();
  const verseB = String(b.verse || "").trim().toLowerCase();
  const themeA = String(a.theme || "").trim().toLowerCase();
  const themeB = String(b.theme || "").trim().toLowerCase();
  return Boolean(verseA && verseB && verseA === verseB && themeA === themeB);
}

function fallbackDevocional(plan, userName, theme, variant = 0) {
  const base = FALLBACK_DEVOTIONALS[Math.abs(Number(variant) || 0) % FALLBACK_DEVOTIONALS.length];
  const selectedTheme = theme || base.theme;
  const isGoldPlan = plan === "gold" || plan === "ouro";
  const reflection = isGoldPlan
    ? [
        `Hoje, ${userName ? `${userName}, ` : ""}Deus convida você a descansar em ${base.verse}, sem exigir que você entenda tudo agora.`,
        "A paz de Cristo não nega a dor; ela caminha com você quando as respostas demoram a chegar.",
        "Confiar é abrir as mãos sobre o que você tenta controlar e receber o cuidado do Pai no presente.",
        "Quando você lembra da fidelidade de Deus no passado, ganha coragem para obedecer no agora.",
        "Esta palavra é um convite gentil: permaneça perto dEle, um passo de fé de cada vez."
      ]
    : [
        "Deus vê sua luta de hoje e não minimiza sua dor.",
        "Ele permanece perto de você no processo, mesmo quando tudo parece lento.",
        "Um passo de fé hoje vale mais do que promessas vazias para amanhã.",
        "Ore com sinceridade e entregue a Cristo o que está pesando no seu coração."
      ];

  return {
    theme: selectedTheme,
    verse: base.verse,
    verseText: base.verseText,
    reflection,
    application: "Separe 5 minutos hoje para orar com este versículo. Anote uma decisão prática de fé e viva esse passo ainda hoje."
  };
}

async function callAI(prompt, generationConfig) {
  const data = await requestGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig
  });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export async function genDevocional(plan, userName, theme, options = {}) {
  const todayKey = options.todayKey || new Date().toISOString().slice(0, 10);
  const variant = Number.isFinite(options.variant) ? options.variant : 0;
  const nonce = options.nonce || Math.random().toString(36).slice(2, 10);
  const history = Array.isArray(options.history) ? options.history.slice(-6) : [];
  const style = pickDailyDevotionalStyle({ todayKey, userName, theme, plan, variant, nonce });
  const styleCatalog = getStyleLibrary()
    .map((s) => `${s.id}: ${s.identity}`)
    .join(" | ");
  const themeClause = theme ? `O tema obrigatório é: "${theme}".` : "Escolha um tema bíblico relevante e inesperado para hoje (evite repetir temas batidos).";
  const personClause = userName ? `Personalize sutilmente para ${userName}.` : "";
  const depth = isGoldPlan
    ? "5 parágrafos densos, humanos e teologicamente profundos"
    : "4 parágrafos curtos, claros e emocionalmente reais";
  const historyBlock = history.length
    ? `\nHISTORICO RECENTE (NAO REPITA esses versiculos, temas nem frases-chave):\n${history.map((h, i) => `- ${i + 1}. tema="${h.theme || ""}", verso="${h.verse || ""}"`).join("\n")}`
    : "";
  const previousBlock = options.previousDevotional
    ? `\nDEVOCIONAL ANTERIOR (PROIBIDO repetir tema, versiculo, texto biblico, estrutura e frases centrais):\n${JSON.stringify({
        theme: options.previousDevotional.theme,
        verse: options.previousDevotional.verse,
        verseText: options.previousDevotional.verseText,
        styleLabel: options.previousDevotional.styleLabel
      })}`
    : "";
  const generationConfig = getGenerationConfig(options.forceNew);

  try {
    const parsed = await callAI(`Você é um escritor devocional cristão brasileiro, biblicamente fiel, pastoral e humano.
Objetivo: gerar UM devocional inédito (ID unico: ${todayKey}-${variant}-${nonce}), com profundidade espiritual, aplicação concreta e linguagem natural.

REGRAS DE QUALIDADE (obrigatórias):
1) Nada genérico, nada de frases prontas vazias, nada de "religiosês".
2) Tom conversacional, acolhedor, verdadeiro, com empatia para dores reais (ansiedade, culpa, cansaço, perdas, recomeços).
3) Fundamente na Escritura: o texto bíblico deve guiar a reflexão, não o contrário.
4) Traga esperança realista: sem triunfalismo, sem promessas fáceis.
5) Use imagens e linguagem vivas, com criatividade e inteligência pastoral.
6) Escreva para hoje (devocional diário), sem repetir estrutura engessada.
7) Traga um versiculo DIFERENTE dos ultimos usados. Evite classicos repetidos (ex.: Jeremias 29:11, Filipenses 4:13, Provérbios 3:5-6) se eles aparecerem no historico.
8) Varie o livro biblico (Antigo e Novo Testamento), tom e metaforas a cada geracao.

BIBLIOTECA DE ESTILOS DISPONIVEIS:
${styleCatalog}

ESTILO OBRIGATORIO DE HOJE:
- id: ${style.id}
- nome: ${style.label}
- identidade: ${style.identity}
- diretriz de escrita: ${style.devotionalGuide}
${historyBlock}
${previousBlock}

${themeClause}
${personClause}
Reflexão com ${depth}.

Responda APENAS com JSON válido, sem markdown, neste formato:
{"theme":"título curto e marcante","verse":"Livro cap:v","verseText":"texto bíblico em português","reflection":["p1","p2","p3","p4"],"application":"passos práticos para hoje em 2-3 frases, específicos e executáveis","styleId":"${style.id}","styleLabel":"${style.label}"}`, generationConfig);
    return parsed;
  } catch {
    return {
      ...fallbackDevocional(plan, userName, theme, variant),
      styleId: style.id,
      styleLabel: style.label,
      fromFallback: true
    };
  }
}

export function genVerseImage(verseText, verseRef, theme, dark) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1080;
  const ctx = c.getContext("2d");
  const bg = ctx.createRadialGradient(540, 380, 0, 540, 540, 900);
  if (dark) {
    bg.addColorStop(0, "#1a1f3c");
    bg.addColorStop(0.6, "#0d1025");
    bg.addColorStop(1, "#06080f");
  } else {
    bg.addColorStop(0, "#fdf8f0");
    bg.addColorStop(0.6, "#f5ede0");
    bg.addColorStop(1, "#e8d8c0");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);
  for (let i = 0; i < 100; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 1080, Math.random() * 1080, Math.random() * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = dark ? `rgba(255,255,255,${0.05 + Math.random() * 0.3})` : `rgba(160,120,64,${0.05 + Math.random() * 0.15})`;
    ctx.fill();
  }
  const lg = ctx.createLinearGradient(240, 0, 840, 0);
  lg.addColorStop(0, "transparent");
  lg.addColorStop(0.5, "#c9a96e");
  lg.addColorStop(1, "transparent");
  ctx.strokeStyle = lg;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(240, 265);
  ctx.lineTo(840, 265);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(240, 815);
  ctx.lineTo(840, 815);
  ctx.stroke();
  ctx.fillStyle = "rgba(201,169,110,0.55)";
  ctx.fillRect(530, 155, 20, 88);
  ctx.fillRect(505, 188, 70, 22);
  ctx.fillStyle = "#c9a96e";
  ctx.font = "500 26px Georgia,serif";
  ctx.textAlign = "center";
  ctx.fillText(theme.toUpperCase(), 540, 325);
  ctx.fillStyle = dark ? "#ede8dc" : "#2c1a0e";
  ctx.font = "italic 44px Georgia,serif";
  const words = `"${verseText}"`.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur + (cur ? " " : "") + w;
    if (ctx.measureText(t).width > 760 && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  const sy = 540 - (lines.length * 64) / 2 + 30;
  lines.forEach((l, i) => ctx.fillText(l, 540, sy + i * 64));
  ctx.fillStyle = "#c9a96e";
  ctx.font = "500 34px Georgia,serif";
  ctx.fillText(`— ${verseRef}`, 540, sy + lines.length * 64 + 48);
  ctx.fillStyle = dark ? "rgba(237,232,220,0.4)" : "rgba(100,70,40,0.5)";
  ctx.font = "italic 28px Georgia,serif";
  ctx.fillText("✦ Jornada com Deus", 540, 878);
  return c.toDataURL("image/png");
}

function dataUrlToFile(dataUrl, filename) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta?.match(/data:(.*?);base64/)?.[1] || "image/png";
  const bytes = atob(b64 || "");
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

export async function shareVerseImage(imgUrl, todayKey) {
  const file = dataUrlToFile(imgUrl, `versiculo-${todayKey}.png`);
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Versículo do dia",
      text: "Compartilhando meu versículo do dia ✨",
      files: [file]
    });
    return "shared";
  }

  const a = document.createElement("a");
  a.href = imgUrl;
  a.download = `versiculo-${todayKey}.png`;
  a.click();
  return "downloaded";
}

export function buildShareText(dev) {
  if (!dev) return "";
  return `📖 Versículo do dia:\n\n"${dev.verseText}" – ${dev.verse}\n\n🙏 Hoje decidi confiar mais em Deus.\n\n✨ Estou fazendo a Jornada com Deus.`;
}

export async function validatePhotoWithAI(file, type) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target.result.split(",")[1];
      const questionText = type === "culto"
        ? "Esta imagem mostra um ambiente de culto, igreja, celebração religiosa cristã ou pessoas adorando? Responda apenas: SIM ou NAO"
        : "Esta imagem mostra uma Bíblia aberta ou fechada, livro sagrado cristão? Responda apenas: SIM ou NAO";
      try {
        const data = await requestGemini({
          contents: [{
            parts: [
              { inlineData: { mimeType: file.type, data: b64 } },
              { text: questionText }
            ]
          }]
        }, AI_VISION_MODELS, "photo-check");
        const answer = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").toUpperCase().trim();
        resolve(answer.includes("SIM"));
      } catch {
        resolve(false);
      }
    };
    reader.readAsDataURL(file);
  });
}
