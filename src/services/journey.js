// ── MODIFICAÇÃO: desafios sem repetição com fingerprint e fallbacks inteligentes
// ── DATA: 2026-05-18
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { requestGemini } from "./gemini.js";
import { getStyleLibrary, pickChallengeStyle, pickJourneyStyle } from "./styleLibrary.js";

import {
  contentFingerprint,
  getGenerationConfig,
  pickDistinctFallback,
  slugifyId
} from "./aiGeneration.js";

const FALLBACK_CHALLENGES = [
  {
    title: "7 Dias de Proximidade com Deus",
    description: "Um plano simples e profundo para fortalecer sua caminhada com Deus nesta semana.",
    days: [
      { day: 1, task: "Leia Salmo 23 e agradeça a Deus por 3 cuidados que você já recebeu." },
      { day: 2, task: "Separe 10 minutos de oração em silêncio, apresentando suas maiores preocupações." },
      { day: 3, task: "Leia Filipenses 4:6-7 e entregue a Deus algo que tem tirado sua paz." },
      { day: 4, task: "Compartilhe um versículo com alguém e ore por essa pessoa." },
      { day: 5, task: "Leia Mateus 6:33 e anote uma prioridade espiritual para esta semana." },
      { day: 6, task: "Faça um ato de bondade intencional e dedique isso ao Senhor." },
      { day: 7, task: "Relembre a semana, agradeça a Deus e escreva um testemunho curto." }
    ]
  },
  {
    title: "Semana da Gratidão Ativa",
    description: "Treine os olhos para enxergar a fidelidade de Deus nos detalhes do cotidiano.",
    days: [
      { day: 1, task: "Anote 5 bênçãos pequenas de hoje e agradeça em voz alta." },
      { day: 2, task: "Envie uma mensagem de gratidão para alguém que Deus usou na sua vida." },
      { day: 3, task: "Leia Salmo 100 e escreva uma oração de louvor de 4 linhas." },
      { day: 4, task: "Durante o almoço, agradeça a Deus por algo específico do trabalho ou estudo." },
      { day: 5, task: "Releia um versículo antigo e registre como ele ganhou novo sentido." },
      { day: 6, task: "Ore 5 minutos apenas agradecendo, sem pedir nada." },
      { day: 7, task: "Compartilhe com alguém um testemunho de gratidão desta semana." }
    ]
  },
  {
    title: "Semana de Coragem e Obediência",
    description: "Pequenos passos de fé para sair da paralisia e obedecer com amor.",
    days: [
      { day: 1, task: "Leia Josué 1:9 e identifique um medo que precisa ser entregue a Deus." },
      { day: 2, task: "Escreva uma atitude de obediência possível para hoje e cumpra-a." },
      { day: 3, task: "Peça perdão ou reconcilie-se com alguém, se necessário." },
      { day: 4, task: "Leia Hebreus 11:1-6 e anote um exemplo de fé que te inspira." },
      { day: 5, task: "Ore 8 minutos pedindo coragem para uma decisão pendente." },
      { day: 6, task: "Pratique um ato de serviço que exija sair da zona de conforto." },
      { day: 7, task: "Revise a semana e registre onde viu Deus te fortalecer." }
    ]
  },
  {
    title: "Semana do Coração Reconciliado",
    description: "Uma trilha para curar relações, perdoar e restaurar vínculos com sabedoria.",
    days: [
      { day: 1, task: "Ore por alguém difícil e peça a Deus um coração manso." },
      { day: 2, task: "Escreva três mágoas e entregue-as a Deus em oração honesta." },
      { day: 3, task: "Leia Mateus 18:21-22 e reflita sobre o que o perdão liberta em você." },
      { day: 4, task: "Envie uma mensagem de paz (sem justificar) para quem você evitou." },
      { day: 5, task: "Pratique um gesto concreto de cuidado na sua família ou amizade." },
      { day: 6, task: "Anote um limite saudável que você precisa estabelecer com amor." },
      { day: 7, task: "Agradeça a Deus por um passo de reconciliação vivido nesta semana." }
    ]
  },
  {
    title: "Semana de Missão no Cotidiano",
    description: "Transforme a rotina em campo missionário com ações simples e intencionais.",
    days: [
      { day: 1, task: "Ore por três pessoas do seu trabalho ou estudo pelo nome." },
      { day: 2, task: "Faça um elogio sincero e específico para alguém hoje." },
      { day: 3, task: "Separe R$ 5 ou um item para doar com alegria." },
      { day: 4, task: "Convide alguém para um café e ouça com atenção plena." },
      { day: 5, task: "Compartilhe um versículo com contexto pessoal (não genérico)." },
      { day: 6, task: "Sirva alguém sem esperar reconhecimento." },
      { day: 7, task: "Escreva como Deus usou você como resposta de oração esta semana." }
    ]
  },
  {
    title: "Semana da Palavra Viva",
    description: "Aprofunde a leitura bíblica com criatividade, memorização e aplicação prática.",
    days: [
      { day: 1, task: "Leia um salmo completo e circule verbos de ação de Deus." },
      { day: 2, task: "Memorize um versículo curto e repita ao acordar e ao dormir." },
      { day: 3, task: "Leia a mesma passagem em outra tradução e compare nuances." },
      { day: 4, task: "Escreva uma paráfrase com suas palavras do versículo escolhido." },
      { day: 5, task: "Aplique o texto em uma decisão prática do seu dia." },
      { day: 6, task: "Ensine o versículo a alguém em linguagem simples." },
      { day: 7, task: "Registre a mudança de perspectiva que a Palavra gerou em você." }
    ]
  },
  {
    title: "Semana de Quietude e Escuta",
    description: "Desacelere o ritmo para ouvir a Deus com presença, silêncio e entrega.",
    days: [
      { day: 1, task: "Fique 7 minutos em silêncio, apenas respirando e reconhecendo Deus." },
      { day: 2, task: "Desligue notificações por 1 hora e ore sem pressa." },
      { day: 3, task: "Caminhe 15 minutos meditando em um atributo de Deus." },
      { day: 4, task: "Leia Marcos 4:39 e entregue sua ansiedade em uma frase." },
      { day: 5, task: "Anote o que Deus trouxe à mente durante o silêncio." },
      { day: 6, task: "Adore com uma música lenta, sem multitarefa." },
      { day: 7, task: "Defina um horário fixo de quietude para a próxima semana." }
    ]
  },
  {
    title: "Semana de Identidade em Cristo",
    description: "Renove a forma como você se vê à luz do evangelho e da graça.",
    days: [
      { day: 1, task: "Leia Efésios 1 e sublinhe quem você é em Cristo." },
      { day: 2, task: "Liste três mentiras sobre você e substitua por verdades bíblicas." },
      { day: 3, task: "Ore renunciando uma comparação que rouba sua paz." },
      { day: 4, task: "Escreva uma carta de graça para si mesmo(a)." },
      { day: 5, task: "Agradeça a Deus por um dom específico que Ele colocou em você." },
      { day: 6, task: "Compartilhe com alguém um testemunho de identidade restaurada." },
      { day: 7, task: "Declare em voz alta três verdades bíblicas sobre sua vida." }
    ]
  }
];

export function challengeFingerprint(challenge) {
  if (!challenge) return "";
  const tasks = (challenge.days || []).map((day) => day.task);
  return contentFingerprint([challenge.title, challenge.description, ...tasks]);
}

export function isSameChallenge(a, b) {
  const fpA = challengeFingerprint(a);
  const fpB = challengeFingerprint(b);
  return Boolean(fpA && fpB && fpA === fpB);
}

export function isSimilarChallenge(a, b) {
  if (isSameChallenge(a, b)) return true;
  const tasksA = (a?.days || []).map((day) => String(day.task || "").trim().toLowerCase());
  const tasksB = (b?.days || []).map((day) => String(day.task || "").trim().toLowerCase());
  if (tasksA.length < 4 || tasksB.length < 4) return false;

  let matches = 0;
  for (let i = 0; i < Math.min(tasksA.length, tasksB.length); i += 1) {
    if (tasksA[i] && tasksA[i] === tasksB[i]) matches += 1;
  }
  return matches >= 4;
}

function buildFallbackChallenge(template, userName) {
  const name = userName || "você";
  return {
    ...template,
    description: `${template.description} ${name}, convidamos você a viver isso com constância.`
  };
}

function fallbackChallenge(userName, variant = 0, nonce = "", blocked = []) {
  const blockedSet = new Set(
    blocked.map((entry) => challengeFingerprint(entry)).filter(Boolean)
  );

  return pickDistinctFallback(
    FALLBACK_CHALLENGES,
    (index) => buildFallbackChallenge(FALLBACK_CHALLENGES[index], userName),
    {
      variant,
      nonce,
      isBlocked: (entry) => blockedSet.has(challengeFingerprint(entry))
    }
  );
}

const FALLBACK_JOURNEY_TEMPLATES = [
  {
    description: "Uma trilha em 5 etapas para aprofundar intimidade com Deus com práticas simples e transformadoras.",
    steps: [
      { step: 1, title: "Porta da Intenção", preview: "Escolha um horário fixo e um lugar sem distrações para encontrar Deus." },
      { step: 2, title: "Raízes na Palavra", preview: "Leia um capítulo curto e sublinhe uma promessa para meditar no dia." },
      { step: 3, title: "Coração em Oração", preview: "Ore em voz baixa entregando medos e agradecendo vitórias recentes." },
      { step: 4, title: "Fé em Movimento", preview: "Pratique um ato concreto de obediência ou serviço ainda hoje." },
      { step: 5, title: "Constância com Propósito", preview: "Revise a semana e defina um compromisso espiritual para os próximos 7 dias." }
    ]
  },
  {
    description: "Uma jornada criativa para sair do automático e viver a fé com presença, coragem e esperança.",
    steps: [
      { step: 1, title: "Mapa do Coração", preview: "Escreva o que mais tem ocupado seus pensamentos e entregue a Deus." },
      { step: 2, title: "Escuta Ativa", preview: "Leia Salmo 27 em voz alta e anote uma frase que tocar sua alma." },
      { step: 3, title: "Renúncia Leve", preview: "Identifique um hábito que rouba paz e substitua por 10 minutos com Deus." },
      { step: 4, title: "Reconciliação", preview: "Tome uma atitude de paz com alguém (mensagem, oração ou conversa)." },
      { step: 5, title: "Testemunho Vivo", preview: "Compartilhe com alguém como Deus tem falado com você nesta jornada." }
    ]
  },
  {
    description: "Cinco movimentos progressivos para cultivar maturidade espiritual com criatividade e profundidade pastoral.",
    steps: [
      { step: 1, title: "Clareza de Chamado", preview: "Defina uma palavra-guia para esta jornada (ex.: confiança, cura, missão)." },
      { step: 2, title: "Memória de Fidelidade", preview: "Liste 3 momentos em que Deus te sustentou e agradeça por cada um." },
      { step: 3, title: "Palavra que Orienta", preview: "Escolha um livro bíblico e leia um trecho com perguntas de aplicação." },
      { step: 4, title: "Missão do Dia", preview: "Planeje uma ação de bondade alinhada ao tema da jornada." },
      { step: 5, title: "Legado de Fé", preview: "Escreva uma carta curta para seu eu do futuro sobre o que Deus ensinou." }
    ]
  },
  {
    description: "Uma experiência inovadora em etapas para integrar fé, emoções e prática no ritmo real da sua rotina.",
    steps: [
      { step: 1, title: "Desacelerar", preview: "Faça uma pausa de 5 minutos sem tela e respire com presença de Deus." },
      { step: 2, title: "Ver com Gratidão", preview: "Registre 5 sinais de graça que passaram despercebidos hoje." },
      { step: 3, title: "Conversar com Deus", preview: "Use um diário de oração com 3 perguntas: peço, agradeço, confesso." },
      { step: 4, title: "Caminhar com Outros", preview: "Convide alguém para orar junto por um propósito específico." },
      { step: 5, title: "Recomeçar", preview: "Celebre um pequeno avanço e defina o próximo passo com esperança." }
    ]
  }
];

export function isSameJourney(a, b) {
  if (!a || !b) return false;
  const descA = String(a.description || "").trim().toLowerCase();
  const descB = String(b.description || "").trim().toLowerCase();
  const stepA = a.steps?.[0];
  const stepB = b.steps?.[0];
  const titleA = String(stepA?.title || "").trim().toLowerCase();
  const titleB = String(stepB?.title || "").trim().toLowerCase();
  const previewA = String(stepA?.preview || "").trim().toLowerCase();
  const previewB = String(stepB?.preview || "").trim().toLowerCase();
  return Boolean(
    descA &&
    descB &&
    titleA &&
    titleB &&
    previewA &&
    previewB &&
    descA === descB &&
    titleA === titleB &&
    previewA === previewB
  );
}

function fallbackJourney(name, variant = 0) {
  const base = FALLBACK_JOURNEY_TEMPLATES[Math.abs(Number(variant) || 0) % FALLBACK_JOURNEY_TEMPLATES.length];
  return {
    title: name,
    description: base.description,
    steps: base.steps
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

export async function genChallenge(userName, options = {}) {
  const todayKey = options.todayKey || new Date().toISOString().slice(0, 10);
  const variant = Number.isFinite(options.variant) ? options.variant : 0;
  const nonce = options.nonce || Math.random().toString(36).slice(2, 10);
  const history = Array.isArray(options.history) ? options.history.slice(-8) : [];
  const blockedChallenges = Array.isArray(options.blockedChallenges) ? options.blockedChallenges : [];
  const style = pickChallengeStyle({ todayKey, variant, userName, nonce });
  const styleCatalog = getStyleLibrary()
    .map((s) => `${s.id}: ${s.identity}`)
    .join(" | ");
  const previousSummary = options.previousChallenge
    ? `\nDESAFIO IMEDIATAMENTE ANTERIOR (PROIBIDO repetir titulo, descricao, tarefas, versiculos e estrutura):\n${JSON.stringify({
        title: options.previousChallenge.title,
        description: options.previousChallenge.description,
        days: options.previousChallenge.days || []
      })}`
    : "";
  const blockedSummary = blockedChallenges.length
    ? `\nDESAFIOS BLOQUEADOS NESTA SEMANA (NUNCA repita estes conteudos):\n${blockedChallenges
        .map((entry, index) => `- ${index + 1}. titulo="${entry?.title || ""}", dia1="${entry?.days?.[0]?.task || ""}", dia7="${entry?.days?.[6]?.task || ""}"`)
        .join("\n")}`
    : "";
  const historyBlock = history.length
    ? `\nHISTORICO RECENTE (NAO REPETIR titulos, tarefas nem angulos centrais):\n${history
        .map((h, i) => `- ${i + 1}. titulo="${h.title || ""}", dia1="${h.firstTask || ""}", estilo="${h.styleLabel || ""}"`)
        .join("\n")}`
    : "";
  const generationConfig = getGenerationConfig(options.forceNew);
  const blockedForFallback = [
    ...blockedChallenges,
    ...(options.previousChallenge ? [options.previousChallenge] : [])
  ];

  try {
    const parsed = await callAI(`Crie um desafio espiritual semanal (7 dias) INEDITO, CRIATIVO e INOVADOR para ${userName || "um cristão"}.
ID unico desta geracao: ${todayKey}-${variant}-${nonce}.
Objetivo: profundo, humano, praticável na vida real e espiritualmente consistente.

REGRAS OBRIGATORIAS:
1) PROIBIDO repetir qualquer desafio listado em "DESAFIO IMEDIATAMENTE ANTERIOR", "DESAFIOS BLOQUEADOS" ou "HISTORICO RECENTE".
2) Cada um dos 7 dias precisa ter tarefa unica, especifica e executavel em 10 a 25 minutos.
3) Misture: Biblia, oracao, silencio, autoexame, reconciliacao, gratidao, servico ao proximo.
4) Linguagem pastoral, calorosa e realista, sem culpa toxica e sem legalismo.
5) Sequencia progressiva: do interior para a pratica.
6) Inclua micro-acoes concretas (ex.: "enviar mensagem de perdao", "anotar 3 medos e orar por eles").
7) Varie tema central, metaforas, livros biblicos citados e tipo de pratica.
8) Traga criatividade intuitiva: desafios inteligentes para rotina real (trabalho, familia, cansaco, decisoes).
9) Se parecer similar a qualquer versao anterior, reescreva completamente antes de responder.

BIBLIOTECA DE ESTILOS DISPONIVEIS:
${styleCatalog}

ESTILO OBRIGATORIO DESTA GERACAO:
- id: ${style.id}
- nome: ${style.label}
- identidade: ${style.identity}
- diretriz de escrita: ${style.challengeGuide}
${previousSummary}${blockedSummary}${historyBlock}

Responda APENAS com JSON válido:
{"title":"título motivador e criativo","description":"2 frases com sentido espiritual e humano","days":[{"day":1,"task":"tarefa específica"},{"day":2,"task":"tarefa específica"},{"day":3,"task":"tarefa específica"},{"day":4,"task":"tarefa específica"},{"day":5,"task":"tarefa específica"},{"day":6,"task":"tarefa específica"},{"day":7,"task":"tarefa específica"}],"styleId":"${style.id}","styleLabel":"${style.label}"}`, generationConfig);
    return parsed;
  } catch {
    return {
      ...fallbackChallenge(userName, variant, nonce, blockedForFallback),
      styleId: style.id,
      styleLabel: style.label,
      fromFallback: true
    };
  }
}

export async function genJourney(name, userName, options = {}) {
  const variant = Number.isFinite(options.variant) ? options.variant : 0;
  const nonce = options.nonce || Math.random().toString(36).slice(2, 10);
  const history = Array.isArray(options.history) ? options.history.slice(-5) : [];
  const style = pickJourneyStyle({ journeyName: name, variant, userName, nonce });
  const styleCatalog = getStyleLibrary()
    .map((s) => `${s.id}: ${s.identity}`)
    .join(" | ");
  const previousSummary = options.previousJourney
    ? `\nJORNADA ANTERIOR (PROIBIDO repetir descrição, metáforas, títulos das etapas e previews):\n${JSON.stringify({
        title: options.previousJourney.title,
        description: options.previousJourney.description,
        steps: (options.previousJourney.steps || []).slice(0, 3)
      })}`
    : "";
  const historyBlock = history.length
    ? `\nHISTORICO RECENTE (NAO REPETIR angulos, estruturas nem frases centrais):\n${history.map((h, i) => `- ${i + 1}. jornada="${h.journeyName || ""}", etapa1="${h.firstStepTitle || ""}"`).join("\n")}`
    : "";
  const personClause = userName ? `Personalize sutilmente para ${userName}.` : "";
  const generationConfig = getGenerationConfig(options.forceNew);

  try {
    const parsed = await callAI(`Você é um designer de jornadas espirituais cristãs brasileiras, biblicamente fiel, criativo e pastoral.
Crie a jornada especial "${name}" para ${userName || "um cristão"} com 5 etapas progressivas.
ID unico desta geracao: ${slugifyId(name)}-${variant}-${nonce}.

OBJETIVO: jornada INÉDITA, profunda, humana, inovadora e praticável — nunca genérica.

REGRAS OBRIGATORIAS:
1) Cada etapa precisa ter título marcante e preview específico (ação concreta em 1-2 frases).
2) Progressão clara: do interior (oração, autoconhecimento) para prática (missão, relacionamento, obediência).
3) Linguagem acolhedora, inteligente e realista — sem religiosês vazio.
4) Traga criatividade: metáforas vivas, desafios originais e conexão com rotina real (família, trabalho, cansaço).
5) Esta versão deve ser CLARAMENTE diferente de qualquer jornada anterior em estrutura, tom e propostas.
6) Evite repetir fórmulas batidas ("defina um horário", "leia a bíblia" sem contexto) — inove com tarefas surpreendentes.
7) Mantenha fidelidade bíblica e esperança realista (sem triunfalismo).
8) O título da jornada pode reinterpretar "${name}" com criatividade, sem perder o tema central.

BIBLIOTECA DE ESTILOS DISPONIVEIS:
${styleCatalog}

ESTILO OBRIGATORIO DESTA GERACAO:
- id: ${style.id}
- nome: ${style.label}
- identidade: ${style.identity}
- diretriz de escrita: ${style.journeyGuide}
${previousSummary}${historyBlock}
${personClause}

Responda APENAS com JSON válido:
{"title":"título criativo da jornada","description":"2-3 frases inspiradoras e específicas","steps":[{"step":1,"title":"título da etapa","preview":"ação concreta"},{"step":2,"title":"título","preview":"ação concreta"},{"step":3,"title":"título","preview":"ação concreta"},{"step":4,"title":"título","preview":"ação concreta"},{"step":5,"title":"título","preview":"ação concreta"}],"styleId":"${style.id}","styleLabel":"${style.label}"}`, generationConfig);
    return parsed;
  } catch {
    return {
      ...fallbackJourney(name, variant),
      styleId: style.id,
      styleLabel: style.label,
      fromFallback: true
    };
  }
}

