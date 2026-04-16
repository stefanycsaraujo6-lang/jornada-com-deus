// ── MODIFICAÇÃO: ajustes de chamadas à Claude API com chave em env e headers seguros
// ── DATA: 2026-04-16
// ── TASK: TASK-09 (variável de ambiente da API) + regras Safe-Call/.cursorrules
import { useState, useEffect } from "react";
import { Stars } from "./components/Stars.jsx";

const todayStr = () => new Date().toISOString().split("T")[0];
const greet = () => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; };
const ls = {
  get: (k, fb = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const getStreak = (hist) => {
  let s = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (hist[d.toISOString().split("T")[0]]) s++; else if (i > 0) break;
  }
  return s;
};
const last7 = () => [...Array(7)].map((_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (6 - i));
  return { key: d.toISOString().split("T")[0], lbl: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").slice(0, 3), isToday: i === 6 };
});

const PLANS = {
  bronze: { id: "bronze", name: "Bronze", emoji: "🥉", price: "R$ 9,90", features: ["Devocional diário para todos", "Versículo + reflexão + aplicação", "Marcar dia concluído", "Streak de dias", "Compartilhar versículo"] },
  prata:  { id: "prata",  name: "Prata",  emoji: "🥈", price: "R$ 19,90", popular: true, features: ["Tudo do Bronze", "Devocional personalizado por IA", "Histórico de progresso", "Anotações salvas por dia", "Desafios semanais por IA", "Sequências 21 e 30 dias", "Gerar imagem do versículo"] },
  ouro:   { id: "ouro",   name: "Ouro",   emoji: "🥇", price: "R$ 39,90", features: ["Tudo do Prata", "Tema do devocional você escolhe", "Jornadas especiais exclusivas", "Devocionais avançados e profundos", "Desbloqueios progressivos", "Materiais e conteúdos exclusivos"] }
};

const THEMES_OURO = [
  "Ansiedade e Paz","Família e Relacionamentos","Fé e Confiança",
  "Propósito de Vida","Perdão e Cura","Gratidão",
  "Mulheres da Bíblia","Promessas de Deus","Força nos Momentos Difíceis","Identidade em Cristo"
];
const JOURNEYS = ["21 Dias de Fé","30 Dias com Deus","Mulheres da Bíblia","Promessas Divinas","Renovação Interior"];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { id:1, name:"Ana Beatriz",    avatar:"AB", pts_week:87, pts_total:1240, streak:14 },
  { id:2, name:"Carlos Eduardo", avatar:"CE", pts_week:74, pts_total:980,  streak:9  },
  { id:3, name:"Mariana Silva",  avatar:"MS", pts_week:61, pts_total:870,  streak:7  },
  { id:4, name:"Pedro Alves",    avatar:"PA", pts_week:55, pts_total:740,  streak:5  },
  { id:5, name:"Júlia Ferreira", avatar:"JF", pts_week:48, pts_total:620,  streak:4  },
  { id:6, name:"Rafael Costa",   avatar:"RC", pts_week:40, pts_total:510,  streak:3  },
  { id:7, name:"Larissa Melo",   avatar:"LM", pts_week:32, pts_total:430,  streak:2  },
];
const MOCK_GROUP = [
  { id:1, name:"Ana Beatriz",  avatar:"AB", pts_week:87, pts_total:1240, streak:14 },
  { id:3, name:"Mariana Silva",avatar:"MS", pts_week:61, pts_total:870,  streak:7  },
  { id:5, name:"Júlia Ferreira",avatar:"JF",pts_week:48, pts_total:620,  streak:4  },
];
const MOCK_PURPOSES = [
  { id:1, code:"JCD-7F3A", name:"Cura da Dona Maria", desc:"Orando pela recuperação da nossa irmã após a cirurgia.", members:[{name:"Ana Beatriz",avatar:"AB",days:12},{name:"Carlos",avatar:"CE",days:10},{name:"Mariana",avatar:"MS",days:8}], days_active:12, deadline:"2026-05-01", has_deadline:true },
  { id:2, code:"JCD-2B9C", name:"Jejum de Daniel — 21 dias", desc:"Campanha coletiva de oração e jejum para nossa família.", members:[{name:"Pedro",avatar:"PA",days:5},{name:"Júlia",avatar:"JF",days:5}], days_active:5, deadline:null, has_deadline:false },
];
const POINTS = { culto:10, biblia:5, devocional:3 };

const AI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
const AI_VISION_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
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

function getFriendlyAIErrorMessage(err, fallback) {
  const msg = `${err?.apiMsg || err?.message || ""}`.toLowerCase();
  if (err?.status === 429 || msg.includes("quota") || msg.includes("rate limit")) {
    return "Limite de uso da IA atingido no momento. Tente novamente em alguns minutos.";
  }
  if (err?.status === 404 || msg.includes("not found for api version")) {
    return "Modelo de IA indisponível agora. Tente novamente em instantes.";
  }
  return fallback;
}

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

function fallbackChallenge(userName) {
  const name = userName || "você";
  return {
    title: "7 Dias de Proximidade com Deus",
    description: `Um plano simples e profundo para fortalecer sua caminhada com Deus nesta semana, ${name}.`,
    days: [
      { day: 1, task: "Leia Salmo 23 e agradeca a Deus por 3 cuidados que voce ja recebeu." },
      { day: 2, task: "Separe 10 minutos de oração em silencio, apresentando suas maiores preocupacoes." },
      { day: 3, task: "Leia Filipenses 4:6-7 e entregue a Deus algo que tem tirado sua paz." },
      { day: 4, task: "Compartilhe um versiculo com alguem e ore por essa pessoa." },
      { day: 5, task: "Leia Mateus 6:33 e anote uma prioridade espiritual para esta semana." },
      { day: 6, task: "Faça um ato de bondade intencional e dedique isso ao Senhor." },
      { day: 7, task: "Relembre a semana, agradeca a Deus e escreva um testemunho curto." }
    ]
  };
}

function fallbackJourney(name) {
  return {
    title: name,
    description: "Uma jornada em 5 etapas para aprofundar sua fe de forma pratica, constante e transformadora.",
    steps: [
      { step: 1, title: "Comeco com Intencao", preview: "Defina um horario diario de encontro com Deus." },
      { step: 2, title: "Raizes na Palavra", preview: "Leia e medite em textos biblicos curtos todos os dias." },
      { step: 3, title: "Vida de Oracao", preview: "Transforme pedidos e gratidao em um habito espiritual." },
      { step: 4, title: "Fe em Acao", preview: "Pratique pequenos atos de obediencia e amor ao proximo." },
      { step: 5, title: "Perseveranca", preview: "Revise aprendizados e mantenha constancia para os proximos dias." }
    ]
  };
}

async function requestGemini(payload, models = AI_MODELS, tag = "callAI") {
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

async function callAI(prompt) {
  const data = await requestGemini({
    contents: [{ parts: [{ text: prompt }] }]
  });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function genDevocional(plan, userName, theme) {
  const themeClause = theme ? `O tema obrigatório é: "${theme}".` : "Escolha um tema bíblico relevante para hoje.";
  const personClause = plan !== "bronze" && userName ? `Personalize sutilmente para ${userName}.` : "";
  const depth = plan === "ouro" ? "5 parágrafos ricos e teologicamente profundos" : "4 parágrafos curtos e acessíveis";
  try {
    return await callAI(`Você é um pastor evangélico brasileiro, acolhedor e profundo, para cristãos de todas as idades. Responda APENAS com JSON válido, sem markdown. ${themeClause} ${personClause} Reflexão com ${depth}.\n{"theme":"título curto","verse":"Livro cap:v","verseText":"texto completo em português","reflection":["p1","p2","p3","p4"],"application":"ação prática hoje em 2-3 frases"}`);
  } catch {
    return fallbackDevocional(plan, userName, theme);
  }
}

async function genChallenge(userName) {
  try {
    return await callAI(`Crie um desafio espiritual semanal para ${userName || "um cristão"}. Responda APENAS com JSON válido:\n{"title":"título motivador","description":"2 frases","days":[{"day":1,"task":"tarefa"},{"day":2,"task":"tarefa"},{"day":3,"task":"tarefa"},{"day":4,"task":"tarefa"},{"day":5,"task":"tarefa"},{"day":6,"task":"tarefa"},{"day":7,"task":"tarefa"}]}`);
  } catch {
    return fallbackChallenge(userName);
  }
}

async function genJourney(name, userName) {
  try {
    return await callAI(`Crie a jornada espiritual "${name}" para ${userName || "um cristão"} com 5 etapas progressivas. Responda APENAS com JSON válido:\n{"title":"${name}","description":"2-3 frases","steps":[{"step":1,"title":"título","preview":"descrição"},{"step":2,"title":"título","preview":"descrição"},{"step":3,"title":"título","preview":"descrição"},{"step":4,"title":"título","preview":"descrição"},{"step":5,"title":"título","preview":"descrição"}]}`);
  } catch {
    return fallbackJourney(name);
  }
}

function genVerseImage(verseText, verseRef, theme, dark) {
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1080;
  const ctx = c.getContext("2d");
  const bg = ctx.createRadialGradient(540,380,0,540,540,900);
  if (dark) { bg.addColorStop(0,"#1a1f3c"); bg.addColorStop(0.6,"#0d1025"); bg.addColorStop(1,"#06080f"); }
  else { bg.addColorStop(0,"#fdf8f0"); bg.addColorStop(0.6,"#f5ede0"); bg.addColorStop(1,"#e8d8c0"); }
  ctx.fillStyle = bg; ctx.fillRect(0,0,1080,1080);
  for (let i = 0; i < 100; i++) {
    ctx.beginPath(); ctx.arc(Math.random()*1080,Math.random()*1080,Math.random()*1.8,0,Math.PI*2);
    ctx.fillStyle = dark ? `rgba(255,255,255,${.05+Math.random()*.3})` : `rgba(160,120,64,${.05+Math.random()*.15})`; ctx.fill();
  }
  const lg = ctx.createLinearGradient(240,0,840,0); lg.addColorStop(0,"transparent"); lg.addColorStop(0.5,"#c9a96e"); lg.addColorStop(1,"transparent");
  ctx.strokeStyle = lg; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(240,265); ctx.lineTo(840,265); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(240,815); ctx.lineTo(840,815); ctx.stroke();
  ctx.fillStyle = "rgba(201,169,110,0.55)"; ctx.fillRect(530,155,20,88); ctx.fillRect(505,188,70,22);
  ctx.fillStyle = "#c9a96e"; ctx.font = "500 26px Georgia,serif"; ctx.textAlign = "center";
  ctx.fillText(theme.toUpperCase(), 540, 325);
  ctx.fillStyle = dark ? "#ede8dc" : "#2c1a0e"; ctx.font = "italic 44px Georgia,serif";
  const words = `"${verseText}"`.split(" "); const lines = []; let cur = "";
  for (const w of words) { const t = cur+(cur?" ":"")+w; if (ctx.measureText(t).width>760&&cur) { lines.push(cur); cur=w; } else cur=t; }
  if (cur) lines.push(cur);
  const sy = 540-(lines.length*64)/2+30;
  lines.forEach((l,i) => ctx.fillText(l,540,sy+i*64));
  ctx.fillStyle="#c9a96e"; ctx.font="500 34px Georgia,serif";
  ctx.fillText(`— ${verseRef}`,540,sy+lines.length*64+48);
  ctx.fillStyle = dark?"rgba(237,232,220,0.4)":"rgba(100,70,40,0.5)"; ctx.font="italic 28px Georgia,serif";
  ctx.fillText("✦ Jornada com Deus",540,878);
  return c.toDataURL("image/png");
}

const makeCSS = (dark) => {
  const d = dark;
  return `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Lato:wght@300;400;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:${d?"#080b18":"#f7f2eb"};
  --surf:${d?"#0d1025":"#fffdf9"};
  --card:${d?"#121629":"#ffffff"};
  --card2:${d?"#161c30":"#fdf8f2"};
  --bdr:${d?"rgba(255,255,255,0.07)":"rgba(100,70,30,0.1)"};
  --bdr2:${d?"rgba(201,169,110,0.22)":"rgba(160,120,64,0.3)"};
  --gold:${d?"#c9a96e":"#a07840"};
  --goldl:${d?"#e8c98a":"#8a6430"};
  --goldd:${d?"rgba(201,169,110,0.12)":"rgba(160,120,64,0.08)"};
  --txt:${d?"#ede8dc":"#2c1a0e"};
  --muted:${d?"rgba(237,232,220,0.45)":"rgba(44,26,14,0.45)"};
  --acc:${d?"#7b9ed9":"#3a6aaa"};
  --grn:${d?"#5aab7c":"#2e7d50"};
  --shad:${d?"rgba(0,0,0,0.5)":"rgba(100,70,30,0.12)"};
}
html,body,#root{height:100%;background:var(--bg)}
body{font-family:'Lato',sans-serif;color:var(--txt);overflow-x:hidden;transition:background .3s,color .3s}
.app{min-height:100vh;max-width:430px;margin:0 auto;position:relative}
.stars{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.star{position:absolute;border-radius:50%;background:#fff;animation:twinkle ease-in-out infinite}
@keyframes twinkle{0%,100%{opacity:.06;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
.orb{position:fixed;border-radius:50%;pointer-events:none;z-index:0}
.orb1{width:500px;height:500px;top:-140px;left:-100px;background:radial-gradient(circle,${d?"rgba(201,169,110,.05)":"rgba(201,169,110,.08)"} 0%,transparent 65%)}
.orb2{width:400px;height:400px;bottom:-80px;right:-80px;background:radial-gradient(circle,${d?"rgba(123,158,217,.04)":"rgba(100,150,220,.05)"} 0%,transparent 65%)}
.page{position:relative;z-index:1;padding:0 20px 100px;animation:fadeUp .45s ease both}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.hdr{padding:50px 0 20px;display:flex;align-items:flex-start;justify-content:space-between}
.hdr-greet{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:3px}
.hdr-name{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:300;font-style:italic;line-height:1.1}
.hdr-actions{display:flex;align-items:center;gap:10px}
.plan-badge{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border-radius:20px;font-weight:700;border:1px solid var(--bdr2);background:var(--goldd);color:var(--gold)}
.icon-btn{background:none;border:1px solid var(--bdr);border-radius:10px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:16px;transition:all .2s}
.icon-btn:hover{color:var(--txt);border-color:var(--bdr2)}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.stat{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:16px;position:relative;overflow:hidden}
.stat::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.3}
.stat-n{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:600;color:var(--goldl);line-height:1}
.stat-l{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-top:2px}
.week{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:14px 16px;margin-bottom:18px;display:flex;justify-content:space-between}
.wd{display:flex;flex-direction:column;align-items:center;gap:5px}
.wd-l{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}
.wd-dot{width:26px;height:26px;border-radius:50%;border:1.5px solid var(--bdr);transition:all .3s}
.wd-dot.done{background:var(--gold);border-color:var(--gold);box-shadow:0 0 8px rgba(201,169,110,.35)}
.wd-dot.today-ring{border-color:var(--acc)}
.cta{background:var(--card);border:1px solid var(--bdr2);border-radius:20px;padding:24px 20px;cursor:pointer;transition:all .3s;position:relative;overflow:hidden;margin-bottom:10px}
.cta:hover{transform:translateY(-2px);box-shadow:0 12px 40px var(--shad)}
.cta-eye{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);margin-bottom:6px;font-weight:700}
.cta-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:400;font-style:italic;margin-bottom:4px}
.cta-ref{font-size:12px;color:var(--muted)}
.cta-arr{position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:22px;color:var(--gold);opacity:.6}
.cta-done{display:inline-flex;align-items:center;gap:6px;background:rgba(90,171,124,.1);border:1px solid rgba(90,171,124,.3);border-radius:20px;padding:5px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--grn);margin-top:10px}
.feat-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.feat{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:16px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden}
.feat:hover{border-color:var(--bdr2);transform:translateY(-1px)}
.feat-icon{font-size:22px;margin-bottom:8px}
.feat-title{font-size:13px;font-weight:700;margin-bottom:2px}
.feat-sub{font-size:11px;color:var(--muted);line-height:1.4}
.lock-ov{position:absolute;inset:0;background:${d?"rgba(8,11,24,.65)":"rgba(247,242,235,.7)"};display:flex;align-items:center;justify-content:center;font-size:18px;border-radius:16px}
.upgrade{background:var(--goldd);border:1px solid var(--bdr2);border-radius:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.upgrade-txt strong{display:block;font-size:13px;color:var(--goldl);margin-bottom:2px}
.upgrade-txt span{font-size:12px;color:var(--muted)}
.upgrade-btn{background:linear-gradient(135deg,#c9a96e,#a07840);color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
.back{display:flex;align-items:center;gap:6px;background:none;border:none;color:var(--muted);font-family:'Lato',sans-serif;font-size:13px;cursor:pointer;padding:0;margin-bottom:26px;transition:color .2s}
.back:hover{color:var(--txt)}
.dev-eye{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:6px;font-weight:700}
.dev-title{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:300;font-style:italic;line-height:1.15;margin-bottom:26px}
.sec{background:var(--card);border:1px solid var(--bdr);border-radius:18px;padding:20px 18px;margin-bottom:14px;position:relative;overflow:hidden}
.sec::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.2}
.sec-lbl{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);margin-bottom:12px;font-weight:700}
.verse-main{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:300;font-style:italic;line-height:1.6}
.verse-ref{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-top:8px}
.refl-p{font-size:15px;line-height:1.8;color:var(--txt);opacity:.82;margin-bottom:12px;font-weight:300}
.refl-p:last-child{margin-bottom:0}
.appl-txt{font-size:15px;line-height:1.75;color:var(--txt);border-left:2px solid var(--gold);padding-left:14px;font-weight:300}
.share-row{display:flex;gap:8px;margin-bottom:8px}
.sh-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:12px;padding:11px 4px;font-size:12px;font-weight:700;cursor:pointer;color:#fff;transition:all .2s}
.sh-btn:hover{filter:brightness(1.1);transform:translateY(-1px)}
.sw{background:#25d366}.sf{background:#1877f2}.si{background:linear-gradient(135deg,#f09433,#dc2743,#bc1888)}
.gen-img{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--goldd);border:1px solid var(--bdr2);border-radius:12px;padding:12px;color:var(--goldl);font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;margin-top:6px}
.gen-img:hover{opacity:.85}
.gen-img:disabled{opacity:.5;cursor:not-allowed}
.img-preview{width:100%;border-radius:12px;margin-top:10px;border:1px solid var(--bdr2)}
.dl-btn{width:100%;margin-top:8px;background:var(--card2);border:1px solid var(--bdr);border-radius:10px;padding:10px;color:var(--txt);font-size:13px;cursor:pointer;text-decoration:none;display:block;text-align:center}
.notes-ta{width:100%;background:${d?"rgba(255,255,255,.03)":"rgba(100,70,30,.04)"};border:1px solid var(--bdr);border-radius:10px;padding:12px;color:var(--txt);font-family:'Lato',sans-serif;font-size:14px;line-height:1.65;resize:none;height:100px;outline:none;transition:border-color .2s;font-weight:300}
.notes-ta:focus{border-color:var(--bdr2)}
.notes-ta::placeholder{color:var(--muted)}
.save-note{width:100%;margin-top:8px;background:var(--card2);border:1px solid var(--bdr);border-radius:10px;padding:10px;color:var(--muted);font-size:12px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;transition:all .2s}
.save-note:hover{color:var(--txt)}
.saved-ok{text-align:center;color:var(--grn);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-top:6px}
.done-btn{width:100%;padding:17px;border-radius:16px;border:none;font-family:'Lato',sans-serif;font-size:15px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all .3s;margin-top:6px}
.done-active{background:linear-gradient(135deg,#c9a96e,#a07840);color:#fff;box-shadow:0 6px 28px rgba(201,169,110,.3)}
.done-active:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(201,169,110,.4)}
.done-done{background:rgba(90,171,124,.1);border:1px solid rgba(90,171,124,.3)!important;color:var(--grn)}
.theme-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.theme-opt{background:var(--card2);border:1px solid var(--bdr);border-radius:10px;padding:10px 12px;font-size:13px;cursor:pointer;transition:all .2s;text-align:left;color:var(--txt)}
.theme-opt:hover,.theme-opt.sel{border-color:var(--bdr2);background:var(--goldd);color:var(--goldl)}
.loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:260px;gap:14px}
.spinner{width:38px;height:38px;border:2px solid rgba(201,169,110,.15);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-txt{font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:var(--muted)}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--card2);border:1px solid var(--bdr2);border-radius:12px;padding:12px 20px;font-size:13px;color:var(--txt);z-index:999;animation:toastIn .3s ease;white-space:nowrap;box-shadow:0 8px 24px var(--shad)}
@keyframes toastIn{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
.login-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;position:relative;z-index:1}
.login-sym{font-family:'Cormorant Garamond',serif;font-size:52px;color:var(--gold);opacity:.75;margin-bottom:14px;font-weight:300}
.login-title{font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:300;font-style:italic;text-align:center;margin-bottom:4px}
.login-sub{font-size:13px;color:var(--muted);text-align:center;margin-bottom:36px;line-height:1.65;max-width:280px}
.inp-grp{width:100%;max-width:320px;margin-bottom:12px}
.inp-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:6px;display:block}
.inp{width:100%;background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:14px 16px;color:var(--txt);font-family:'Lato',sans-serif;font-size:15px;outline:none;transition:border-color .2s}
.inp:focus{border-color:var(--bdr2)}
.inp::placeholder{color:var(--muted)}
.login-btn{width:100%;max-width:320px;padding:15px;background:linear-gradient(135deg,#c9a96e,#a07840);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;letter-spacing:.5px;cursor:pointer;margin-top:8px;transition:all .3s}
.login-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 28px rgba(201,169,110,.3)}
.login-btn:disabled{opacity:.45;cursor:not-allowed}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:100;display:flex;align-items:flex-end}
.modal{background:var(--surf);border:1px solid var(--bdr2);border-radius:24px 24px 0 0;padding:28px 22px 48px;width:100%;max-width:430px;margin:0 auto;animation:slideUp .3s ease;max-height:90vh;overflow-y:auto}
@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;font-style:italic;margin-bottom:4px}
.modal-sub{font-size:13px;color:var(--muted);margin-bottom:22px;line-height:1.55}
.plan-card{background:var(--card);border:2px solid var(--bdr);border-radius:16px;padding:18px;margin-bottom:10px;cursor:pointer;transition:all .25s;position:relative}
.plan-card:hover,.plan-card.sel{border-color:var(--bdr2)}
.plan-popular{position:absolute;top:-1px;right:16px;background:linear-gradient(135deg,#c9a96e,#a07840);color:#fff;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border-radius:0 0 8px 8px}
.plan-name{font-weight:700;font-size:15px;margin-bottom:4px}
.plan-price{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:var(--goldl);line-height:1}
.plan-period{font-size:13px;color:var(--muted);font-family:'Lato',sans-serif;font-weight:300}
.plan-feats{font-size:12px;color:var(--muted);line-height:1.75;margin-top:8px}
.plan-cta{width:100%;padding:15px;background:linear-gradient(135deg,#c9a96e,#a07840);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;letter-spacing:.5px;cursor:pointer;margin-top:14px}
.modal-close{width:100%;padding:12px;background:none;border:1px solid var(--bdr);border-radius:12px;color:var(--muted);font-size:13px;cursor:pointer;margin-top:8px}
.modal-close:hover{color:var(--txt)}
.challenge-day{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--bdr)}
.challenge-day:last-child{border-bottom:none}
.cd-num{min-width:28px;height:28px;border-radius:50%;background:var(--goldd);border:1px solid var(--bdr2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--gold)}
.cd-task{font-size:14px;line-height:1.55;color:var(--txt);font-weight:300;padding-top:4px}
.journey-step{display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid var(--bdr)}
.journey-step:last-child{border-bottom:none}
.js-num{min-width:36px;height:36px;border-radius:50%;background:var(--goldd);border:1px solid var(--bdr2);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--gold)}
.js-title{font-weight:700;font-size:14px;margin-bottom:2px}
.js-prev{font-size:13px;color:var(--muted);font-weight:300}
.hist-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.hist-cell{aspect-ratio:1;border-radius:4px;border:1px solid var(--bdr)}
.hist-cell.done{background:var(--gold);border-color:var(--gold)}
.nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--surf);border-top:1px solid var(--bdr);display:flex;z-index:50;padding-bottom:env(safe-area-inset-bottom,0)}
.nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 4px 8px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:9px;letter-spacing:1px;text-transform:uppercase;gap:4px;transition:color .2s}
.nav-btn.active{color:var(--gold)}
.nav-ico{font-size:20px}
.section-hdr{padding-top:50px;margin-bottom:24px}
.section-hdr-eye{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:6px}
.section-hdr-title{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:300;font-style:italic}
.regen-btn{width:100%;margin-top:16px;background:none;border:1px solid var(--bdr2);border-radius:12px;padding:11px;color:var(--gold);font-size:13px;cursor:pointer;transition:all .2s}
.regen-btn:hover{background:var(--goldd)}
.comm-tabs{display:flex;gap:8px;margin-bottom:18px}
.comm-tab{flex:1;padding:9px;background:var(--card);border:1px solid var(--bdr);border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;color:var(--muted);letter-spacing:.5px;transition:all .2s}
.comm-tab.active{background:var(--goldd);border-color:var(--bdr2);color:var(--goldl)}
.rank-toggle{display:flex;background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:4px;margin-bottom:16px;gap:4px}
.rank-tog-btn{flex:1;padding:7px;border-radius:9px;border:none;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:.5px;transition:all .2s;background:none;color:var(--muted)}
.rank-tog-btn.active{background:var(--goldd);color:var(--goldl)}
.rank-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bdr)}
.rank-row:last-child{border-bottom:none}
.rank-pos{min-width:24px;font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:var(--muted);text-align:center}
.rank-pos.top{color:var(--goldl)}
.rank-avatar{width:38px;height:38px;border-radius:50%;background:var(--goldd);border:1px solid var(--bdr2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--gold);flex-shrink:0}
.rank-avatar.me{border-color:var(--acc);background:rgba(123,158,217,.15)}
.rank-info{flex:1}
.rank-name{font-size:14px;font-weight:700;margin-bottom:2px}
.rank-meta{font-size:11px;color:var(--muted)}
.rank-pts{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--goldl)}
.rank-pts-lbl{font-size:9px;color:var(--muted);letter-spacing:1px;text-transform:uppercase}
.my-rank-banner{background:var(--goldd);border:1px solid var(--bdr2);border-radius:14px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.checkin-row{display:flex;gap:8px;margin-bottom:8px}
.checkin-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;background:var(--card);border:1px solid var(--bdr);border-radius:14px;padding:14px 8px;cursor:pointer;transition:all .25s}
.checkin-btn:hover{border-color:var(--bdr2);transform:translateY(-1px)}
.checkin-btn.done{background:var(--goldd);border-color:var(--bdr2)}
.checkin-ico{font-size:24px}
.checkin-lbl{font-size:11px;font-weight:700;letter-spacing:.5px}
.checkin-pts{font-size:10px;color:var(--gold)}
.photo-modal{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
.photo-modal-card{background:var(--surf);border:1px solid var(--bdr2);border-radius:20px;padding:24px;width:100%;max-width:380px}
.photo-drop{width:100%;height:160px;border:2px dashed var(--bdr2);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;margin:14px 0;color:var(--muted);font-size:13px;transition:all .2s}
.photo-drop:hover{border-color:var(--gold);color:var(--gold)}
.photo-drop input{display:none}
.validating{display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 0;color:var(--muted);font-size:13px}
.purpose-card{background:var(--card);border:1px solid var(--bdr);border-radius:18px;padding:18px;margin-bottom:12px;cursor:pointer;transition:all .25s}
.purpose-card:hover{border-color:var(--bdr2);transform:translateY(-1px)}
.purpose-name{font-family:'Cormorant Garamond',serif;font-size:20px;font-style:italic;margin-bottom:4px}
.purpose-desc{font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.5}
.purpose-members{display:flex;align-items:center;gap:-4px;margin-bottom:8px}
.pmember{width:28px;height:28px;border-radius:50%;background:var(--goldd);border:2px solid var(--card);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--gold);margin-left:-6px}
.pmember:first-child{margin-left:0}
.purpose-meta{display:flex;gap:12px;font-size:11px;color:var(--muted)}
.purpose-meta span{display:flex;align-items:center;gap:4px}
.new-purpose-form{background:var(--card);border:1px solid var(--bdr2);border-radius:18px;padding:18px;margin-bottom:14px}
.form-row{margin-bottom:12px}
.form-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:6px;display:block}
.form-inp{width:100%;background:var(--card2);border:1px solid var(--bdr);border-radius:10px;padding:11px 14px;color:var(--txt);font-family:'Lato',sans-serif;font-size:14px;outline:none;transition:border-color .2s}
.form-inp:focus{border-color:var(--bdr2)}
.form-inp::placeholder{color:var(--muted)}
.form-submit{width:100%;padding:13px;background:linear-gradient(135deg,#c9a96e,#a07840);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-top:4px}
.invite-code{background:var(--goldd);border:1px solid var(--bdr2);border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-top:10px}
.invite-code-txt{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--goldl);letter-spacing:3px}
.copy-btn{background:none;border:1px solid var(--bdr2);border-radius:8px;padding:6px 12px;color:var(--gold);font-size:11px;cursor:pointer;font-weight:700}
.purpose-detail-member{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bdr)}
.purpose-detail-member:last-child{border-bottom:none}
.pdm-av{width:34px;height:34px;border-radius:50%;background:var(--goldd);border:1px solid var(--bdr2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gold)}
.pdm-name{flex:1;font-size:14px;font-weight:700}
.pdm-days{font-size:12px;color:var(--muted)}
.prog-bar-wrap{background:var(--card2);border-radius:20px;height:6px;margin-top:8px;overflow:hidden}
.prog-bar{height:6px;border-radius:20px;background:linear-gradient(90deg,#c9a96e,#e8c98a);transition:width .5s ease}
`;
};

export default function App() {
  const [dark, setDark] = useState(() => ls.get("jcd_dark", true));
  const [screen, setScreen] = useState("login");
  const [tab, setTab] = useState("home");
  const [user, setUser] = useState(() => ls.get("jcd_user"));
  const [plan, setPlan] = useState(() => ls.get("jcd_plan", "bronze"));
  const [loginForm, setLoginForm] = useState({ name: "", email: "" });
  const [history, setHistory] = useState(() => ls.get("jcd_history", {}));
  const [notes, setNotes] = useState(() => ls.get("jcd_notes", {}));
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [dev, setDev] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("Preparando seu devocional...");
  const [imgUrl, setImgUrl] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPlans, setShowPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(plan);
  const [chosenTheme, setChosenTheme] = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [journey, setJourney] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);

  // Community state
  const [commTab, setCommTab] = useState("ranking");
  const [rankScope, setRankScope] = useState("global"); // global | group
  const [rankPeriod, setRankPeriod] = useState("week"); // week | total
  const [myPts, setMyPts] = useState(() => ls.get("jcd_pts", { week:0, total:0 }));
  const [todayCheckins, setTodayCheckins] = useState(() => ls.get("jcd_checkins_"+todayStr(), {}));
  const [showPhotoModal, setShowPhotoModal] = useState(null); // null | "culto" | "biblia"
  const [photoValidating, setPhotoValidating] = useState(false);
  const [photoResult, setPhotoResult] = useState(null);
  const [purposes, setPurposes] = useState(() => ls.get("jcd_purposes", MOCK_PURPOSES));
  const [activePurpose, setActivePurpose] = useState(null);
  const [showNewPurpose, setShowNewPurpose] = useState(false);
  const [newPurposeForm, setNewPurposeForm] = useState({ name:"", desc:"", deadline:"", has_deadline:false });
  const [joinCode, setJoinCode] = useState("");

  const todayKey = todayStr();
  const streak = getStreak(history);
  const totalDone = Object.values(history).filter(Boolean).length;
  const isToday = !!history[todayKey];
  const days7 = last7();

  useEffect(() => { if (user) setScreen("dashboard"); }, []);
  useEffect(() => { document.body.style.background = dark ? "#080b18" : "#f7f2eb"; }, [dark]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const handleLogin = () => {
    if (!loginForm.name.trim() || !loginForm.email.trim()) return;
    const u = { name: loginForm.name.trim(), email: loginForm.email.trim() };
    ls.set("jcd_user", u); setUser(u); setScreen("dashboard");
  };

  const openDevocional = async (theme = null) => {
    setNoteText(notes[todayKey] || ""); setImgUrl(null);
    const cacheKey = `jcd_dev_${todayKey}_${plan}${theme ? "_"+theme.slice(0,10) : ""}`;
    const cached = ls.get(cacheKey);
    if (cached) { setDev(cached); setScreen("devotional"); return; }
    setLoading(true); setScreen("devotional");
    const msgs = ["✨ Preparando seu devocional...", "📖 Buscando a Palavra...", "🙏 Quase pronto..."];
    let mi = 0; setLoadMsg(msgs[0]);
    const iv = setInterval(() => { mi = (mi+1)%msgs.length; setLoadMsg(msgs[mi]); }, 2000);
    try {
      const data = await genDevocional(plan, user?.name, theme);
      setDev(data); ls.set(cacheKey, data);
    } catch(e) {
      showToast(getFriendlyAIErrorMessage(e, "Erro ao gerar devocional. Tente novamente."));
      setScreen("dashboard");
    } finally { clearInterval(iv); setLoading(false); }
  };

  const markDone = () => {
    const h = { ...history, [todayKey]: true };
    setHistory(h); ls.set("jcd_history", h);
    showToast("🙏 Dia concluído! Que Deus abençoe você.");
  };

  const saveNote = () => {
    const n = { ...notes, [todayKey]: noteText };
    setNotes(n); ls.set("jcd_notes", n);
    setNoteSaved(true); setTimeout(() => setNoteSaved(false), 2000);
  };

  const handleGenImg = () => {
    if (!dev) return; setImgLoading(true);
    setTimeout(() => { setImgUrl(genVerseImage(dev.verseText, dev.verse, dev.theme, dark)); setImgLoading(false); }, 700);
  };

  const shareText = dev ? `📖 Versículo do dia:\n\n"${dev.verseText}" – ${dev.verse}\n\n🙏 Hoje decidi confiar mais em Deus.\n\n✨ Estou fazendo a Jornada com Deus.` : "";
  const shareWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  const shareFB = () => window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`, "_blank");
  const shareIG = () => { navigator.clipboard?.writeText(shareText); showToast("Texto copiado! Cole no Instagram."); };

  const confirmPlan = () => {
    setPlan(selectedPlan); ls.set("jcd_plan", selectedPlan);
    setShowPlans(false);
    showToast(`${PLANS[selectedPlan].emoji} Plano ${PLANS[selectedPlan].name} ativado!`);
  };

  const loadChallenge = async () => {
    if (challengeLoading) return;
    setChallengeLoading(true);
    setChallenge(null);
    try {
      const c = await genChallenge(user?.name);
      if (!c?.days) throw new Error("Resposta inválida");
      setChallenge(c);
    } catch(e) {
      showToast(getFriendlyAIErrorMessage(e, "Erro ao gerar desafio. Verifique sua conexão."));
      console.error("[loadChallenge] Falha ao chamar Gemini:", {
        message: e?.message,
        stack: e?.stack
      });
    } finally { setChallengeLoading(false); }
  };

  const loadJourney = async (name) => {
    setJourneyLoading(true);
    try {
      const j = await genJourney(name, user?.name);
      if (!j?.steps) throw new Error("Resposta inválida");
      setJourney(j); setTab("journey-detail");
    } catch(e) {
      showToast(getFriendlyAIErrorMessage(e, "Erro ao gerar jornada. Verifique sua conexão."));
      console.error("[loadJourney] Falha ao chamar Gemini:", {
        message: e?.message,
        stack: e?.stack
      });
    } finally { setJourneyLoading(false); }
  };

  // ── COMMUNITY FUNCTIONS ──────────────────────────────────────────────────
  const addPoints = (type) => {
    const pts = POINTS[type] || 0;
    const streakBonus = Math.floor(streak / 7);
    const total = pts + streakBonus;
    const updated = { week: myPts.week + total, total: myPts.total + total };
    setMyPts(updated); ls.set("jcd_pts", updated);
    const ci = { ...todayCheckins, [type]: true };
    setTodayCheckins(ci); ls.set("jcd_checkins_"+todayStr(), ci);
    return total;
  };

  const validatePhotoWithAI = async (file, type) => {
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
        } catch (err) {
          console.warn("[photo-check] Erro ao validar imagem:", err?.message);
          resolve(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSubmit = async (file, type) => {
    setPhotoValidating(true); setPhotoResult(null);
    const valid = await validatePhotoWithAI(file, type);
    if (valid) {
      const earned = addPoints(type);
      setPhotoResult({ ok:true, msg:`✓ Validado! +${earned} pontos creditados.` });
    } else {
      setPhotoResult({ ok:false, msg:`Não foi possível confirmar. Envie uma foto mais clara.` });
    }
    setPhotoValidating(false);
  };

  const createPurpose = () => {
    if (!newPurposeForm.name.trim()) return;
    const code = "JCD-"+Math.random().toString(36).slice(2,6).toUpperCase();
    const p = {
      id: Date.now(), code,
      name: newPurposeForm.name,
      desc: newPurposeForm.desc,
      members: [{ name: user?.name?.split(" ")[0]||"Você", avatar:(user?.name||"EU").slice(0,2).toUpperCase(), days:1 }],
      days_active:1,
      deadline: newPurposeForm.has_deadline ? newPurposeForm.deadline : null,
      has_deadline: newPurposeForm.has_deadline
    };
    const updated = [p, ...purposes];
    setPurposes(updated); ls.set("jcd_purposes", updated);
    setShowNewPurpose(false); setNewPurposeForm({ name:"", desc:"", deadline:"", has_deadline:false });
    showToast(`🕊️ Propósito criado! Código: ${code}`);
  };

  const joinPurpose = () => {
    const found = purposes.find(p => p.code === joinCode.toUpperCase().trim());
    if (!found) { showToast("Código não encontrado."); return; }
    const me = { name: user?.name?.split(" ")[0]||"Você", avatar:(user?.name||"EU").slice(0,2).toUpperCase(), days:0 };
    const updated = purposes.map(p => p.id===found.id ? { ...p, members:[...p.members, me] } : p);
    setPurposes(updated); ls.set("jcd_purposes", updated);
    setJoinCode(""); showToast("🙏 Você entrou no propósito!");
  };

  const histDays = () => {
    const cells = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      cells.push({ k: d.toISOString().split("T")[0] });
    }
    return cells;
  };

  const CSS = makeCSS(dark);

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (screen === "login") return (
    <>
      <style>{CSS}</style>
      <Stars dark={dark} />
      <div className="app">
        <div className="login-wrap">
          <div className="login-sym">✦</div>
          <h1 className="login-title">Jornada<br/>com Deus</h1>
          <p className="login-sub">Seu devocional diário.<br/>Consistência que transforma.</p>
          <div className="inp-grp">
            <label className="inp-lbl">Seu nome</label>
            <input className="inp" placeholder="Como você se chama?" value={loginForm.name} onChange={e => setLoginForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div className="inp-grp">
            <label className="inp-lbl">E-mail</label>
            <input className="inp" type="email" placeholder="seu@email.com" value={loginForm.email}
              onChange={e => setLoginForm(f=>({...f,email:e.target.value}))}
              onKeyDown={e => e.key==="Enter" && handleLogin()} />
          </div>
          <button className="login-btn" onClick={handleLogin} disabled={!loginForm.name.trim()||!loginForm.email.trim()}>
            Começar minha jornada →
          </button>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );

  // ── DEVOTIONAL ─────────────────────────────────────────────────────────────
  if (screen === "devotional") return (
    <>
      <style>{CSS}</style>
      <Stars dark={dark} />
      <div className="app">
        <div className="page">
          <button className="back" onClick={() => setScreen("dashboard")}>← Voltar</button>
          {loading ? (
            <div className="loading">
              <div className="spinner"/>
              <p className="loading-txt">{loadMsg}</p>
            </div>
          ) : dev ? (
            <>
              <div className="dev-eye">Devocional de hoje</div>
              <h2 className="dev-title">{dev.theme}</h2>

              <div className="sec">
                <div className="sec-lbl">📖 Versículo</div>
                <p className="verse-main">"{dev.verseText}"</p>
                <p className="verse-ref">{dev.verse}</p>
              </div>

              <div className="sec">
                <div className="sec-lbl">✍️ Reflexão</div>
                {(dev.reflection || []).map((p,i) => <p key={i} className="refl-p">{p}</p>)}
              </div>

              <div className="sec">
                <div className="sec-lbl">🙏 Aplicação prática</div>
                <p className="appl-txt">{dev.application}</p>
              </div>

              {plan !== "bronze" && (
                <div className="sec">
                  <div className="sec-lbl">💬 Anotações</div>
                  <textarea className="notes-ta" placeholder="Escreva o que Deus falou com você hoje..."
                    value={noteText} onChange={e => setNoteText(e.target.value)} />
                  <button className="save-note" onClick={saveNote}>Salvar anotação</button>
                  {noteSaved && <p className="saved-ok">✓ Salvo!</p>}
                </div>
              )}

              <div className="sec">
                <div className="sec-lbl">🔗 Compartilhar</div>
                <div className="share-row">
                  <button className="sh-btn sw" onClick={shareWA}>WhatsApp</button>
                  <button className="sh-btn sf" onClick={shareFB}>Facebook</button>
                  <button className="sh-btn si" onClick={shareIG}>Instagram</button>
                </div>
                {plan !== "bronze" ? (
                  <>
                    <button className="gen-img" onClick={handleGenImg} disabled={imgLoading}>
                      {imgLoading ? "Gerando imagem..." : "✨ Gerar imagem do versículo"}
                    </button>
                    {imgUrl && (
                      <>
                        <img src={imgUrl} className="img-preview" alt="Versículo"/>
                        <a className="dl-btn" href={imgUrl} download="versiculo-do-dia.png">⬇ Baixar imagem</a>
                      </>
                    )}
                  </>
                ) : (
                  <p style={{fontSize:11,color:"var(--muted)",textAlign:"center",marginTop:8}}>
                    🔒 Imagem disponível no Plano Prata e Ouro
                  </p>
                )}
              </div>

              <button className={`done-btn ${isToday ? "done-done" : "done-active"}`}
                onClick={isToday ? undefined : markDone}>
                {isToday ? "✓ Dia concluído!" : "Marcar como concluído"}
              </button>
            </>
          ) : null}
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  const renderHome = () => (
    <>
      <div className="hdr">
        <div>
          <div className="hdr-greet">{greet()}</div>
          <div className="hdr-name">{user?.name?.split(" ")[0]}</div>
        </div>
        <div className="hdr-actions">
          <span className="plan-badge">{PLANS[plan].emoji} {PLANS[plan].name}</span>
          <button className="icon-btn" onClick={() => { setDark(d => !d); ls.set("jcd_dark", !dark); }} title="Alternar tema">
            {dark ? "☀️" : "🌙"}
          </button>
          <button className="icon-btn" onClick={() => { setSelectedPlan(plan); setShowPlans(true); }} title="Planos">⚙️</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-n">{streak}</div><div className="stat-l">🔥 dias seguidos</div></div>
        <div className="stat"><div className="stat-n">{totalDone}</div><div className="stat-l">📖 concluídos</div></div>
      </div>

      <div className="week">
        {days7.map(d => (
          <div key={d.key} className="wd">
            <span className="wd-l">{d.lbl}</span>
            <div className={`wd-dot${history[d.key]?" done":""}${d.isToday?" today-ring":""}`}/>
          </div>
        ))}
      </div>

      {plan === "ouro" && (
        <div className="sec" style={{marginBottom:14}}>
          <div className="sec-lbl">🎯 Tema do devocional</div>
          <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>Escolha o tema de hoje ou deixe a IA decidir.</p>
          {showThemePicker ? (
            <>
              <div className="theme-grid">
                {THEMES_OURO.map(t => (
                  <button key={t} className={`theme-opt${chosenTheme===t?" sel":""}`}
                    onClick={() => { setChosenTheme(t); setShowThemePicker(false); }}>{t}
                  </button>
                ))}
              </div>
              <button style={{width:"100%",marginTop:8,background:"none",border:"1px solid var(--bdr)",borderRadius:10,padding:10,color:"var(--muted)",fontSize:12,cursor:"pointer"}}
                onClick={() => { setChosenTheme(null); setShowThemePicker(false); }}>
                Deixar a IA escolher
              </button>
            </>
          ) : (
            <button className="theme-opt sel" style={{width:"100%"}} onClick={() => setShowThemePicker(true)}>
              {chosenTheme || "IA vai escolher"} ✏️
            </button>
          )}
        </div>
      )}

      <div className="cta" onClick={() => openDevocional(chosenTheme)}>
        <div className="cta-eye">Devocional de hoje</div>
        <div className="cta-title">{dev?.theme || "Abrir devocional"}</div>
        {dev && <div className="cta-ref">{dev.verse}</div>}
        {isToday && <div className="cta-done">✓ Concluído hoje</div>}
        <span className="cta-arr">→</span>
      </div>

      <div className="feat-row">
        <div className="feat" onClick={() => plan !== "bronze" ? (setTab("challenge"), loadChallenge()) : setShowPlans(true)}>
          <div className="feat-icon">🏆</div>
          <div className="feat-title">Desafio semanal</div>
          <div className="feat-sub">7 dias de crescimento</div>
          {plan === "bronze" && <div className="lock-ov">🔒</div>}
        </div>
        <div className="feat" onClick={() => plan === "ouro" ? setTab("journeys") : setShowPlans(true)}>
          <div className="feat-icon">🗺️</div>
          <div className="feat-title">Jornadas especiais</div>
          <div className="feat-sub">Trilhas exclusivas Ouro</div>
          {plan !== "ouro" && <div className="lock-ov">🔒</div>}
        </div>
      </div>

      {plan === "bronze" && (
        <div className="upgrade">
          <div className="upgrade-txt">
            <strong>✨ Desbloqueie mais recursos</strong>
            <span>Personalize sua jornada espiritual</span>
          </div>
          <button className="upgrade-btn" onClick={() => { setSelectedPlan("prata"); setShowPlans(true); }}>Ver planos</button>
        </div>
      )}
    </>
  );

  const renderHistory = () => (
    <>
      <div className="section-hdr">
        <div className="section-hdr-eye">Seu progresso</div>
        <div className="section-hdr-title">Histórico</div>
      </div>
      <div className="sec">
        <div className="sec-lbl">📅 Últimas 5 semanas</div>
        <div className="hist-grid">
          {histDays().map((c,i) => <div key={i} className={`hist-cell${history[c.k]?" done":""}`} title={c.k}/>)}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:12,fontSize:11,color:"var(--muted)"}}>
          <span>35 dias atrás</span><span>Hoje</span>
        </div>
      </div>
      {Object.entries(notes).filter(([,v])=>v).reverse().slice(0,5).map(([k,v]) => (
        <div key={k} className="sec">
          <div className="sec-lbl">📝 {new Date(k+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"long"})}</div>
          <p style={{fontSize:14,color:"var(--txt)",fontWeight:300,lineHeight:1.65}}>{v}</p>
        </div>
      ))}
      {plan === "bronze" && (
        <div className="upgrade">
          <div className="upgrade-txt"><strong>📝 Anotações salvas</strong><span>Disponível no Plano Prata e Ouro</span></div>
          <button className="upgrade-btn" onClick={() => { setSelectedPlan("prata"); setShowPlans(true); }}>Upgrade</button>
        </div>
      )}
    </>
  );

  const renderChallenge = () => (
      <>
        <div className="section-hdr">
          <div className="section-hdr-eye">Prata & Ouro</div>
          <div className="section-hdr-title">Desafio Semanal</div>
        </div>
        {plan === "bronze" ? (
          <div className="upgrade">
            <div className="upgrade-txt"><strong>🏆 Desafios semanais</strong><span>Disponível no Plano Prata e Ouro</span></div>
            <button className="upgrade-btn" onClick={() => { setSelectedPlan("prata"); setShowPlans(true); }}>Upgrade</button>
          </div>
        ) : challengeLoading ? (
          <div className="loading"><div className="spinner"/><p className="loading-txt">Criando seu desafio...</p></div>
        ) : challenge ? (
          <div className="sec">
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontStyle:"italic",marginBottom:6}}>{challenge.title}</div>
            <p style={{fontSize:13,color:"var(--muted)",marginBottom:16,lineHeight:1.6}}>{challenge.description}</p>
            {(challenge.days||[]).map(d => (
              <div key={d.day} className="challenge-day">
                <div className="cd-num">{d.day}</div>
                <div className="cd-task">{d.task}</div>
              </div>
            ))}
            <button className="regen-btn" onClick={() => { setChallenge(null); loadChallenge(); }}>
              🔄 Gerar novo desafio
            </button>
          </div>
        ) : null}
      </>
  );

  const renderJourneys = () => (
    <>
      <div className="section-hdr">
        <div className="section-hdr-eye">Exclusivo Ouro</div>
        <div className="section-hdr-title">Jornadas Especiais</div>
      </div>
      {plan !== "ouro" ? (
        <div className="upgrade">
          <div className="upgrade-txt"><strong>🗺️ Jornadas Especiais</strong><span>Disponível apenas no Plano Ouro</span></div>
          <button className="upgrade-btn" onClick={() => { setSelectedPlan("ouro"); setShowPlans(true); }}>Upgrade para Ouro</button>
        </div>
      ) : (
        JOURNEYS.map(j => (
          <div key={j} className="cta" onClick={() => loadJourney(j)} style={{marginBottom:10}}>
            <div className="cta-eye">Jornada Especial</div>
            <div className="cta-title">{j}</div>
            <span className="cta-arr">→</span>
          </div>
        ))
      )}
    </>
  );

  const renderJourneyDetail = () => (
    <>
      <button className="back" style={{marginTop:50}} onClick={() => setTab("journeys")}>← Jornadas</button>
      {journeyLoading ? (
        <div className="loading"><div className="spinner"/><p className="loading-txt">Criando sua jornada...</p></div>
      ) : journey ? (
        <>
          <div className="dev-eye">Jornada Especial</div>
          <h2 className="dev-title">{journey.title}</h2>
          <div className="sec">
            <p style={{fontSize:15,color:"var(--txt)",fontWeight:300,lineHeight:1.7}}>{journey.description}</p>
          </div>
          <div className="sec">
            <div className="sec-lbl">🗺️ Etapas da Jornada</div>
            {(journey.steps||[]).map(s => (
              <div key={s.step} className="journey-step">
                <div className="js-num">{s.step}</div>
                <div>
                  <div className="js-title">{s.title}</div>
                  <div className="js-prev">{s.preview}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );

  // ── RENDER COMMUNITY ────────────────────────────────────────────────────
  const renderCommunity = () => {
    const allUsers = [...MOCK_USERS, { id:99, name:user?.name||"Você", avatar:(user?.name||"EU").slice(0,2).toUpperCase(), pts_week:myPts.week, pts_total:myPts.total, streak, isMe:true }]
      .sort((a,b) => rankPeriod==="week" ? b.pts_week-a.pts_week : b.pts_total-a.pts_total);
    const groupUsers = [...MOCK_GROUP, { id:99, name:user?.name||"Você", avatar:(user?.name||"EU").slice(0,2).toUpperCase(), pts_week:myPts.week, pts_total:myPts.total, streak, isMe:true }]
      .sort((a,b) => rankPeriod==="week" ? b.pts_week-a.pts_week : b.pts_total-a.pts_total);
    const displayUsers = rankScope==="global" ? allUsers : groupUsers;
    const myRank = displayUsers.findIndex(u=>u.isMe)+1;

    return (
      <>
        <div className="hdr">
          <div>
            <div className="hdr-greet">Plano Prata & Ouro</div>
            <div className="hdr-name">Comunidade</div>
          </div>
          <div className="hdr-actions">
            <span className="plan-badge">{PLANS[plan].emoji} {PLANS[plan].name}</span>
          </div>
        </div>

        <div className="comm-tabs">
          <button className={`comm-tab${commTab==="ranking"?" active":""}`} onClick={() => setCommTab("ranking")}>🏆 Ranking</button>
          <button className={`comm-tab${commTab==="purposes"?" active":""}`} onClick={() => setCommTab("purposes")}>🕊️ Propósitos</button>
        </div>

        {commTab === "ranking" && (
          <>
            <div className="sec" style={{marginBottom:14}}>
              <div className="sec-lbl">📸 Registrar atividade</div>
              <div className="checkin-row">
                <div className={`checkin-btn${todayCheckins.culto?" done":""}`} onClick={() => !todayCheckins.culto && setShowPhotoModal("culto")}>
                  <span className="checkin-ico">✝️</span>
                  <span className="checkin-lbl">Culto</span>
                  <span className="checkin-pts">{todayCheckins.culto ? "✓ +10pts" : "+10pts"}</span>
                </div>
                <div className={`checkin-btn${todayCheckins.biblia?" done":""}`} onClick={() => !todayCheckins.biblia && setShowPhotoModal("biblia")}>
                  <span className="checkin-ico">📖</span>
                  <span className="checkin-lbl">Bíblia</span>
                  <span className="checkin-pts">{todayCheckins.biblia ? "✓ +5pts" : "+5pts"}</span>
                </div>
                <div className={`checkin-btn${isToday?" done":""}`} onClick={() => !isToday && (setScreen("devotional"),openDevocional(chosenTheme))}>
                  <span className="checkin-ico">🙏</span>
                  <span className="checkin-lbl">Devocional</span>
                  <span className="checkin-pts">{isToday ? "✓ +3pts" : "+3pts"}</span>
                </div>
              </div>
              <p style={{fontSize:11,color:"var(--muted)",textAlign:"center",marginTop:6}}>🔥 Streak bônus: +{Math.floor(streak/7)}pts por ação</p>
            </div>

            <div className="my-rank-banner">
              <div>
                <div style={{fontSize:11,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Sua posição</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:600,color:"var(--goldl)"}}>#{myRank}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:"var(--muted)",marginBottom:2}}>Pontos {rankPeriod==="week"?"semana":"total"}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:600,color:"var(--goldl)"}}>{rankPeriod==="week"?myPts.week:myPts.total}</div>
              </div>
            </div>

            <div className="rank-toggle">
              <button className={`rank-tog-btn${rankScope==="global"?" active":""}`} onClick={() => setRankScope("global")}>🌎 Global</button>
              <button className={`rank-tog-btn${rankScope==="group"?" active":""}`} onClick={() => setRankScope("group")}>👥 Meu grupo</button>
            </div>
            <div className="rank-toggle" style={{marginTop:6}}>
              <button className={`rank-tog-btn${rankPeriod==="week"?" active":""}`} onClick={() => setRankPeriod("week")}>Semanal</button>
              <button className={`rank-tog-btn${rankPeriod==="total"?" active":""}`} onClick={() => setRankPeriod("total")}>Histórico</button>
            </div>

            <div className="sec" style={{marginTop:14}}>
              {displayUsers.slice(0,10).map((u,i) => (
                <div key={u.id} className="rank-row">
                  <div className={`rank-pos${i<3?" top":""}`}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
                  <div className={`rank-avatar${u.isMe?" me":""}`}>{u.avatar}</div>
                  <div className="rank-info">
                    <div className="rank-name">{u.name}{u.isMe?" (você)":""}</div>
                    <div className="rank-meta">🔥 {u.streak} dias seguidos</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div className="rank-pts">{rankPeriod==="week"?u.pts_week:u.pts_total}</div>
                    <div className="rank-pts-lbl">pts</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {commTab === "purposes" && (
          <>
            <div className="sec" style={{marginBottom:14}}>
              <div className="sec-lbl">🔗 Entrar em um propósito</div>
              <div style={{display:"flex",gap:8}}>
                <input className="form-inp" placeholder="Código ex: JCD-7F3A" value={joinCode} onChange={e=>setJoinCode(e.target.value)} style={{flex:1}} />
                <button onClick={joinPurpose} style={{background:"linear-gradient(135deg,#c9a96e,#a07840)",border:"none",borderRadius:10,padding:"0 16px",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>Entrar</button>
              </div>
            </div>

            {plan === "ouro" ? (
              showNewPurpose ? (
                <div className="new-purpose-form">
                  <div className="sec-lbl">🕊️ Novo propósito</div>
                  <div className="form-row">
                    <label className="form-lbl">Nome</label>
                    <input className="form-inp" placeholder="Ex: Cura da Dona Maria" value={newPurposeForm.name} onChange={e=>setNewPurposeForm(f=>({...f,name:e.target.value}))} />
                  </div>
                  <div className="form-row">
                    <label className="form-lbl">Objetivo</label>
                    <input className="form-inp" placeholder="Breve descrição..." value={newPurposeForm.desc} onChange={e=>setNewPurposeForm(f=>({...f,desc:e.target.value}))} />
                  </div>
                  <div className="form-row" style={{display:"flex",alignItems:"center",gap:10}}>
                    <input type="checkbox" id="has_dl" checked={newPurposeForm.has_deadline} onChange={e=>setNewPurposeForm(f=>({...f,has_deadline:e.target.checked}))} />
                    <label htmlFor="has_dl" style={{fontSize:13,color:"var(--muted)"}}>Tem prazo?</label>
                    {newPurposeForm.has_deadline && <input type="date" className="form-inp" style={{flex:1}} value={newPurposeForm.deadline} onChange={e=>setNewPurposeForm(f=>({...f,deadline:e.target.value}))} />}
                  </div>
                  <button className="form-submit" onClick={createPurpose}>Criar propósito</button>
                  <button className="modal-close" style={{marginTop:8}} onClick={()=>setShowNewPurpose(false)}>Cancelar</button>
                </div>
              ) : (
                <div className="cta" style={{marginBottom:14}} onClick={()=>setShowNewPurpose(true)}>
                  <div className="cta-eye">Exclusivo Ouro</div>
                  <div className="cta-title">+ Criar novo propósito</div>
                  <span className="cta-arr">→</span>
                </div>
              )
            ) : (
              <div className="upgrade" style={{marginBottom:14}}>
                <div className="upgrade-txt"><strong>🕊️ Criar propósitos</strong><span>Disponível no Plano Ouro</span></div>
                <button className="upgrade-btn" onClick={() => { setSelectedPlan("ouro"); setShowPlans(true); }}>Upgrade</button>
              </div>
            )}

            {purposes.map(p => (
              <div key={p.id} className="purpose-card" onClick={() => setActivePurpose(p)}>
                <div className="purpose-name">{p.name}</div>
                <div className="purpose-desc">{p.desc}</div>
                <div className="purpose-members">
                  {p.members.slice(0,5).map((m,i) => <div key={i} className="pmember">{m.avatar}</div>)}
                  {p.members.length>5 && <div className="pmember" style={{fontSize:9}}>+{p.members.length-5}</div>}
                </div>
                <div className="purpose-meta">
                  <span>👥 {p.members.length} membros</span>
                  <span>📅 {p.days_active} dias ativos</span>
                  {p.has_deadline && p.deadline && <span>⏳ até {new Date(p.deadline+"T12:00:00").toLocaleDateString("pt-BR")}</span>}
                </div>
                <div style={{marginTop:10}}>
                  <div className="prog-bar-wrap">
                    <div className="prog-bar" style={{width:`${Math.min(100,p.days_active*3)}%`}}/>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </>
    );
  };

  // ── PURPOSE DETAIL MODAL ─────────────────────────────────────────────────
  const renderPurposeDetail = () => {
    if (!activePurpose) return null;
    const p = activePurpose;
    return (
      <div className="overlay" onClick={() => setActivePurpose(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-title">{p.name}</div>
          <p className="modal-sub">{p.desc}</p>
          <div className="invite-code">
            <div>
              <div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Código de convite</div>
              <div className="invite-code-txt">{p.code}</div>
            </div>
            <button className="copy-btn" onClick={() => { navigator.clipboard?.writeText(p.code); showToast("Código copiado!"); }}>Copiar</button>
          </div>
          <div style={{marginTop:16}}>
            <div className="sec-lbl">👥 Membros ({p.members.length})</div>
            {p.members.map((m,i) => (
              <div key={i} className="purpose-detail-member">
                <div className="pdm-av">{m.avatar}</div>
                <div className="pdm-name">{m.name}</div>
                <div className="pdm-days">🗓 {m.days} dias</div>
              </div>
            ))}
          </div>
          {p.has_deadline && p.deadline && (
            <div style={{marginTop:14,padding:"12px 0",borderTop:"1px solid var(--bdr)"}}>
              <div style={{fontSize:12,color:"var(--muted)"}}>⏳ Prazo: {new Date(p.deadline+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}</div>
            </div>
          )}
          <button className="modal-close" style={{marginTop:14}} onClick={() => setActivePurpose(null)}>Fechar</button>
        </div>
      </div>
    );
  };

  // ── PHOTO MODAL ──────────────────────────────────────────────────────────
  const renderPhotoModal = () => {
    if (!showPhotoModal) return null;
    const type = showPhotoModal;
    const label = type==="culto" ? "do culto" : "da Bíblia";
    return (
      <div className="photo-modal" onClick={() => { setShowPhotoModal(null); setPhotoResult(null); }}>
        <div className="photo-modal-card" onClick={e=>e.stopPropagation()}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontStyle:"italic",marginBottom:4}}>
            {type==="culto" ? "✝️ Registrar culto" : "📖 Registrar leitura"}
          </div>
          <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.55}}>
            Tire uma foto {label}. A IA vai verificar automaticamente.
          </p>
          {photoValidating ? (
            <div className="validating">
              <div className="spinner"/>
              <span>Analisando imagem...</span>
            </div>
          ) : photoResult ? (
            <div style={{padding:"16px 0",textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:8}}>{photoResult.ok?"✅":"❌"}</div>
              <p style={{fontSize:14,color:photoResult.ok?"var(--grn)":"var(--red)",fontWeight:700}}>{photoResult.msg}</p>
              <button className="form-submit" style={{marginTop:14}} onClick={() => { setShowPhotoModal(null); setPhotoResult(null); }}>
                {photoResult.ok ? "Ótimo! Fechar" : "Tentar novamente"}
              </button>
            </div>
          ) : (
            <label className="photo-drop">
              <input type="file" accept="image/*" capture="environment" onChange={e => { if(e.target.files[0]) handlePhotoSubmit(e.target.files[0], type); }} />
              <span style={{fontSize:32}}>📷</span>
              <span>Toque para tirar foto</span>
              <span style={{fontSize:11}}>ou escolher da galeria</span>
            </label>
          )}
          {!photoResult && !photoValidating && (
            <button className="modal-close" onClick={() => { setShowPhotoModal(null); setPhotoResult(null); }}>Cancelar</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <Stars dark={dark} />
      <div className="app">
        <div className="page">
          {tab === "home"           && renderHome()}
          {tab === "history"        && renderHistory()}
          {tab === "challenge"      && renderChallenge()}
          {tab === "journeys"       && renderJourneys()}
          {tab === "journey-detail" && renderJourneyDetail()}
          {tab === "community"      && renderCommunity()}
        </div>

        <nav className="nav">
          {[["home","🏠","Início"],["history","📅","Histórico"],["challenge","🏆","Desafio"],["community","👥","Comunidade"],["journeys","🗺️","Jornadas"]].map(([id,ico,lbl]) => (
            <button key={id}
              className={`nav-btn${(tab===id||(tab==="journey-detail"&&id==="journeys"))?" active":""}`}
              onClick={() => {
                setTab(id);
                if (id==="challenge" && plan!=="bronze" && !challenge) loadChallenge();
              }}>
              <span className="nav-ico">{ico}</span>{lbl}
            </button>
          ))}
        </nav>

        {showPlans && (
          <div className="overlay" onClick={() => setShowPlans(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Escolha seu plano</div>
              <p className="modal-sub">Invista na sua jornada espiritual 🙏</p>
              {Object.values(PLANS).map(p => (
                <div key={p.id} className={`plan-card${selectedPlan===p.id?" sel":""}`} onClick={() => setSelectedPlan(p.id)}>
                  {p.popular && <div className="plan-popular">Mais popular</div>}
                  <div className="plan-name">{p.emoji} {p.name}</div>
                  <div>
                    <span className="plan-price">{p.price}</span>
                    <span className="plan-period">/mês</span>
                  </div>
                  <div className="plan-feats">{p.features.map((f,i) => <div key={i}>✓ {f}</div>)}</div>
                </div>
              ))}
              <button className="plan-cta" onClick={confirmPlan}>
                Confirmar — {PLANS[selectedPlan].emoji} {PLANS[selectedPlan].name}
              </button>
              <button className="modal-close" onClick={() => setShowPlans(false)}>Fechar</button>
            </div>
          </div>
        )}

        {renderPurposeDetail()}
        {renderPhotoModal()}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}