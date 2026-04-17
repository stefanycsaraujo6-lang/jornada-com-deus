// ── MODIFICAÇÃO: extração de domínio de devocional
// ── DATA: 2026-04-17
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { requestGemini } from "./gemini.js";

const AI_VISION_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

function fallbackDevocional(plan, userName, theme) {
  const selectedTheme = theme || "Confiança em Deus";
  const isOuro = plan === "ouro";
  const reflection = isOuro
    ? [
        "Mesmo quando o futuro parece incerto, Deus continua no controle e sustentando cada detalhe da sua caminhada.",
        "A paz de Cristo nao depende da ausencia de lutas, mas da certeza de que Ele caminha com voce em meio a elas.",
        "Confiar em Deus e entregar hoje o que voce nao consegue resolver sozinho, sabendo que Ele cuida melhor do que nos.",
        "A fidelidade do Senhor no passado fortalece nossa fe para o presente e renova nossa esperanca para o amanha.",
        `${userName ? `${userName}, ` : ""}permaneça firme: Deus nao perdeu nenhum capitulo da sua historia.`
      ]
    : [
        "Deus conhece seus medos e suas lutas de hoje.",
        "Ele nao te abandona no meio do processo.",
        "Confie: cada passo em fe aproxima voce da paz de Cristo.",
        "Ore com sinceridade e entregue a Ele tudo o que pesa no seu coracao."
      ];

  return {
    theme: selectedTheme,
    verse: "Provérbios 3:5-6",
    verseText: "Confia no Senhor de todo o teu coracao e nao te estribes no teu proprio entendimento.",
    reflection,
    application: "Separe 5 minutos hoje para orar e entregar suas preocupacoes a Deus. Anote uma decisao pratica de fe e viva esse passo ainda hoje."
  };
}

async function callAI(prompt) {
  const data = await requestGemini({
    contents: [{ parts: [{ text: prompt }] }]
  });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export async function genDevocional(plan, userName, theme) {
  const themeClause = theme ? `O tema obrigatório é: "${theme}".` : "Escolha um tema bíblico relevante para hoje.";
  const personClause = plan !== "bronze" && userName ? `Personalize sutilmente para ${userName}.` : "";
  const depth = plan === "ouro" ? "5 parágrafos ricos e teologicamente profundos" : "4 parágrafos curtos e acessíveis";
  try {
    return await callAI(`Você é um pastor evangélico brasileiro, acolhedor e profundo, para cristãos de todas as idades. Responda APENAS com JSON válido, sem markdown. ${themeClause} ${personClause} Reflexão com ${depth}.\n{"theme":"título curto","verse":"Livro cap:v","verseText":"texto completo em português","reflection":["p1","p2","p3","p4"],"application":"ação prática hoje em 2-3 frases"}`);
  } catch {
    return fallbackDevocional(plan, userName, theme);
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
