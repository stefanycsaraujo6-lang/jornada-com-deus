// ── MODIFICAÇÃO: regeneração inédita com fallbacks variados e anti-repetição
// ── DATA: 2026-05-18
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { getGenerationConfig } from "./aiGeneration.js";
import { requestGemini } from "./gemini.js";
import { getStyleLibrary, pickDailyDevotionalStyle } from "./styleLibrary.js";

const AI_VISION_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

const FALLBACK_DEVOTIONALS = [
  {
    theme: "O Deus que não tem pressa",
    verse: "Salmo 130:5-6",
    verseText: "Aguardo o Senhor; a minha alma o aguarda, e espero na sua palavra. A minha alma anseia pelo Senhor, mais do que os guardas pelo romper da manhã."
  },
  {
    theme: "Quando a fé pesa",
    verse: "Marcos 9:24",
    verseText: "Imediatamente o pai do menino exclamou: Eu creio! Ajuda-me na minha falta de fé!"
  },
  {
    theme: "Força que vem da fraqueza",
    verse: "2 Coríntios 12:9",
    verseText: "A minha graça te basta, porque o meu poder se aperfeiçoa na fraqueza."
  },
  {
    theme: "O chão debaixo dos pés",
    verse: "Salmo 40:1-2",
    verseText: "Esperei com paciência no Senhor, e ele se inclinou para mim, e ouviu o meu clamor. Tirou-me de um lago horrível, do charco de lodo; pôs os meus pés sobre uma rocha e firmou os meus passos."
  },
  {
    theme: "Deus nas coisas pequenas",
    verse: "Zacarias 4:10",
    verseText: "Pois quem despreza o dia das coisas pequenas?"
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
        `${userName ? `${userName}, ` : ""}existe um tipo de coragem que o mundo não reconhece: a coragem de quem continua orando quando o céu parece mudo. ${base.verse} foi escrito por alguém que conhecia essa espera — não de longe, mas de dentro.`,
        "A Bíblia não disfarça o cansaço dos que creem. Davi gritou, Jeremias chorou, Elias quis desistir. Nenhum deles perdeu a fé por sentir o peso da vida — e Deus não os amou menos por serem honestos.",
        "Talvez você esteja num daqueles dias em que a fé não vem como certeza, mas como decisão. Uma decisão quieta de não soltar a mão, mesmo sem enxergar o caminho. Isso não é fé fraca — é fé madura.",
        "Deus não espera que você chegue inteiro diante dEle. Ele conhece o cansaço que você não posta, a dúvida que você não confessa, o medo que aparece às 3 da manhã. E mesmo assim, Ele se inclina para ouvir.",
        "Hoje não precisa ser o dia da grande virada. Pode ser apenas o dia em que você respira fundo e diz: 'Ainda estou aqui, Senhor.' E isso já é o suficiente."
      ]
    : [
        `${userName ? `${userName}, ` : ""}este versículo não é decoração de parede — é palavra de alguém que já passou pelo vale e encontrou Deus lá dentro, não sobrevoando de longe.`,
        "Você não precisa fingir que está forte para Deus ouvir sua oração. Ele já sabe o que pesa. O que Ele espera é honestidade, não performance.",
        "A fé cristã não é sobre nunca cair — é sobre saber a quem chamar quando o chão some. E Ele sempre atende, mesmo quando a resposta vem diferente do esperado.",
        "Hoje, faça uma coisa simples: pare por dois minutos, respire, e diga ao Pai o que você realmente precisa. Sem filtro, sem clichê. Só verdade."
      ];

  return {
    theme: selectedTheme,
    verse: base.verse,
    verseText: base.verseText,
    reflection,
    application: "Antes de dormir hoje, escreva uma frase honesta para Deus — não o que você acha que deveria sentir, mas o que realmente sente. Depois releia o versículo em voz baixa e fique em silêncio por 60 segundos. Só isso."
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
  const goldPlan = plan === "gold" || plan === "ouro";
  const depth = goldPlan
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
    const parsed = await callAI(`Você é um pastor cristão brasileiro com 30 anos de ministério — alguém que já orou no hospital de madrugada, aconselhou casais à beira do divórcio, celebrou batismos em rios e consolou famílias no velório. Você não escreve "conteúdo religioso"; você pastoreia pessoas reais com palavras que vêm de quem já viveu o que fala.

TAREFA: escrever UM devocional diário inédito (ID: ${todayKey}-${variant}-${nonce}).

QUEM VAI LER: brasileiros comuns — gente que acorda cansada, lida com boleto, cria filho sozinha, enfrenta ansiedade, duvida de si mesma, quer acreditar em Deus mas às vezes não sente nada. Escreva para essa pessoa, não para um seminário.

PRINCÍPIOS INEGOCIÁVEIS:
1) AUTENTICIDADE RADICAL: escreva como quem conversa no gabinete pastoral, não como quem posta devocional de Instagram. Frases que um pastor real diria olhando nos olhos — sem jargão evangélico vazio ("derramar bençãos", "nova estação", "tomar posse"), sem positivismo tóxico, sem fórmulas mágicas de fé.
2) A ESCRITURA CONDUZ: parta do texto bíblico. Leia-o no contexto original — quem escreveu, para quem, em que circunstância — e só então aplique. Nunca use a Bíblia como pretexto para uma moral que você já decidiu pregar.
3) TENSÃO HONESTA: a vida cristã tem paradoxos (fé e dúvida, alegria e lamento, força e fraqueza). Habite essa tensão em vez de resolvê-la com clichês. Deus não precisa de advogado de defesa — Ele sustenta a honestidade.
4) LINGUAGEM VIVA: use imagens do cotidiano brasileiro (o café da manhã, o ônibus lotado, a louça na pia, o cheiro de terra molhada), metáforas que grudam na memória, ritmo de conversa — não de artigo teológico.
5) ESPERANÇA COM CICATRIZ: a esperança cristã não ignora a dor — ela a atravessa. Como Paulo que tinha o espinho, como Davi que chorou pelo filho, como Jesus que suou sangue no Getsêmani. Nunca prometa que "vai ficar tudo bem" — prometa que Deus não solta a mão.
6) APLICAÇÃO QUE CUSTA: a ação prática deve ser específica, executável em minutos, e exigir algo real do leitor (vulnerabilidade, perdão, conversa difícil, renúncia, presença) — não apenas "ore mais" ou "confie em Deus".

VARIEDADE OBRIGATÓRIA:
- Escolha um versículo DIFERENTE dos anteriores. Mergulhe em livros menos explorados: Rute, Eclesiastes, Habacuque, Oséias, Filemom, 2 Coríntios, Marcos, Tiago, Lamentações.
- Varie o ângulo: nem sempre comece pela dor; às vezes comece pela beleza, pelo espanto, pelo humor de Deus, pela pergunta incômoda.
- Alterne entre Antigo e Novo Testamento a cada geração.

VOZ ESTILÍSTICA DE HOJE:
- estilo: ${style.label}
- identidade: ${style.identity}
- diretriz: ${style.devotionalGuide}

ESTILOS DISPONÍVEIS NO SISTEMA: ${styleCatalog}
${historyBlock}
${previousBlock}

${themeClause}
${personClause}
Reflexão com ${depth}.

Responda APENAS com JSON válido, sem markdown:
{"theme":"título curto e marcante (que provoque curiosidade, não que resuma)","verse":"Livro cap:v","verseText":"texto bíblico completo em português","reflection":["parágrafo 1 — ancoragem no texto bíblico com contexto vivo","parágrafo 2 — tensão honesta com a vida real do leitor","parágrafo 3 — desenvolvimento teológico-pastoral acessível","parágrafo 4 — síntese com esperança enraizada"],"application":"ação concreta, específica e executável para hoje — algo que envolva outra pessoa, um gesto real ou uma decisão que custe algo","styleId":"${style.id}","styleLabel":"${style.label}"}`, generationConfig);
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
