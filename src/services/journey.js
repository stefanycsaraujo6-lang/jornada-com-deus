// ── MODIFICAÇÃO: desafios sem repetição com fingerprint e fallbacks inteligentes
// ── DATA: 2026-05-18
// ── TASK: TASK-10 (refactor App.jsx com hooks/serviços)
import { requestGemini } from "./gemini.js";
import { getStyleLibrary, pickChallengeStyle, pickJourneyStyle } from "./styleLibrary.js";

import {
  contentFingerprint,
  getGenerationConfig,
  parseAiJson,
  pickDistinctFallback,
  slugifyId
} from "./aiGeneration.js";
import { getJourneyByTitle } from "../data/journeyCatalog.js";

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

function hashUserSeed(parts) {
  const text = parts.filter(Boolean).join("|");
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getJourneyFallback(name, variant = 0, userName = "", userEmail = "", nonce = "") {
  const seed = hashUserSeed([name, userName, userEmail, variant, nonce]);
  const base = FALLBACK_JOURNEY_TEMPLATES[seed % FALLBACK_JOURNEY_TEMPLATES.length];
  return {
    title: name,
    description: base.description,
    steps: base.steps
  };
}

function normalizeChallengePayload(parsed) {
  const days = (parsed?.days || parsed?.dias || [])
    .map((day, index) => ({
      day: Number(day?.day ?? day?.dia ?? index + 1),
      task: String(day?.task || day?.tarefa || day?.texto || "").trim()
    }))
    .filter((day) => day.task);

  if (days.length < 3) return null;

  return {
    title: String(parsed?.title || parsed?.titulo || "Desafio semanal").trim(),
    description: String(parsed?.description || parsed?.descricao || "").trim(),
    days: days.slice(0, 7),
    styleId: parsed?.styleId,
    styleLabel: parsed?.styleLabel
  };
}

function normalizeJourneyPayload(parsed, journeyName) {
  const steps = (parsed?.steps || parsed?.etapas || parsed?.stages || [])
    .map((step, index) => ({
      step: Number(step?.step ?? step?.etapa ?? step?.stage ?? index + 1),
      title: String(step?.title || step?.titulo || step?.name || "").trim(),
      preview: String(step?.preview || step?.previa || step?.description || step?.descricao || "").trim()
    }))
    .filter((step) => step.title || step.preview);

  if (steps.length < 3) return null;

  return {
    title: String(parsed?.title || parsed?.titulo || journeyName).trim(),
    description: String(parsed?.description || parsed?.descricao || "").trim(),
    steps: steps.slice(0, 5),
    styleId: parsed?.styleId,
    styleLabel: parsed?.styleLabel
  };
}

async function callAI(prompt, generationConfig) {
  const data = await requestGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig
  });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseAiJson(text);
}

export async function genChallenge(userName, options = {}) {
  const todayKey = options.todayKey || new Date().toISOString().slice(0, 10);
  const variant = Number.isFinite(options.variant) ? options.variant : 0;
  const nonce = options.nonce || Math.random().toString(36).slice(2, 10);
  const history = Array.isArray(options.history) ? options.history.slice(-8) : [];
  const blockedChallenges = Array.isArray(options.blockedChallenges) ? options.blockedChallenges : [];
  const userEmail = options.userEmail || "";
  const style = pickChallengeStyle({ todayKey, variant, userName, userEmail, nonce });
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
    const parsed = await callAI(`Você é um diretor espiritual cristão brasileiro — alguém que acompanha pessoas reais na caminhada com Deus, semana a semana, conhecendo suas lutas, rotina e limitações. Você não cria "listas de tarefas religiosas"; você desenha uma semana que transforma de dentro para fora.

TAREFA: criar um desafio espiritual de 7 dias para ${userName || "um cristão brasileiro comum"}.
ID único: ${todayKey}-${variant}-${nonce}.

QUEM VAI VIVER ISSO: alguém que trabalha, cuida de família, lida com cansaço, nem sempre tem tempo longo para Deus, mas quer viver a fé de forma real — não performática.

PRINCÍPIOS DO DESAFIO:
1) PROGRESSÃO ORGÂNICA: comece pelo interior (escuta, autoconhecimento, entrega) e avance para o exterior (ação, reconciliação, serviço). O dia 1 deve ser acessível e gentil; o dia 7 deve exigir coragem real.
2) TAREFAS CONCRETAS E ESPECÍFICAS: "ore mais" não é tarefa. "Às 7h da manhã, antes de abrir o celular, sente-se em silêncio por 5 minutos e diga a Deus o que mais te preocupa usando suas próprias palavras" — isso é tarefa. Cada dia precisa ter ação clara, executável em 10-25 minutos, com horário ou gatilho sugerido.
3) VARIEDADE DE PRÁTICAS: misture leitura bíblica contextualizada (não genérica), oração com formato definido, silêncio intencional, escrita reflexiva, ação com outras pessoas (reconciliação, serviço, presença), renúncia a algo concreto, e ritual simbólico de entrega.
4) LINGUAGEM PASTORAL: escreva como quem senta ao lado, não como quem prega do púlpito. Tom de conversa franca entre amigos que levam a fé a sério — sem culpa tóxica, sem legalismo, sem religiosês, sem infantilização.
5) PROFUNDIDADE BÍBLICA: cada tarefa deve ter raiz na Escritura (cite o texto), mas aplicada com inteligência — não como decoração, mas como espelho da vida real.
6) SURPRESA CRIATIVA: pelo menos 2 tarefas devem ser inesperadas — algo que o leitor nunca viu em devocional de app. Pense em práticas monásticas adaptadas, exercícios ignacianos simplificados, rituais judaicos de gratidão, ou gestos proféticos do cotidiano.
7) INEDITISMO: se parecer com qualquer versão anterior (título, estrutura, tarefas), reescreva completamente.

VOZ ESTILÍSTICA:
- estilo: ${style.label}
- identidade: ${style.identity}
- diretriz: ${style.challengeGuide}

ESTILOS DO SISTEMA: ${styleCatalog}
${previousSummary}${blockedSummary}${historyBlock}

Responda APENAS com JSON válido:
{"title":"título que provoque curiosidade e compromisso (não genérico)","description":"2 frases que expliquem o coração do desafio — por que esta semana importa, o que pode mudar","days":[{"day":1,"task":"tarefa detalhada com ação, contexto bíblico e duração"},{"day":2,"task":"..."},{"day":3,"task":"..."},{"day":4,"task":"..."},{"day":5,"task":"..."},{"day":6,"task":"..."},{"day":7,"task":"..."}],"styleId":"${style.id}","styleLabel":"${style.label}"}`, generationConfig);
    const normalized = normalizeChallengePayload(parsed);
    if (!normalized) throw new Error("Desafio inválido");
    return normalized;
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
  const userEmail = options.userEmail || "";
  const style = pickJourneyStyle({ journeyName: name, variant, userName, userEmail, nonce });
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
  const personClause = userName
    ? `Personalize profundamente para ${userName}${userEmail ? ` (${userEmail})` : ""}. Jornada exclusiva desta pessoa.`
    : "";
  const catalog = getJourneyByTitle(name);
  const catalogBlock = catalog
    ? `
CATÁLOGO OFICIAL DA TRILHA (obrigatório seguir foco e tópicos):
- Subtítulo: ${catalog.subtitle}
- Intensidade: ${catalog.intensity}
- Tópicos específicos (distribua nas 5 etapas, uma etapa pode fundir 2 tópicos):
${catalog.topics.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}
Cada etapa deve citar explicitamente o tópico trabalhado e uma referência bíblica aplicada.`
    : "";
  const generationConfig = getGenerationConfig(options.forceNew);

  try {
    const parsed = await callAI(`Você é um formador espiritual cristão — alguém que já conduziu retiros, acompanhou pessoas em crises de fé, e sabe que transformação real não acontece num único momento de êxtase, mas no acúmulo fiel de pequenas decisões ao longo de dias. Você pensa como os pais do deserto, os jesuítas e os pastores de comunidades de base: profundidade com simplicidade.

TAREFA: criar a jornada espiritual INTENSA "${name}" para ${userName || "um cristão brasileiro"} com 5 etapas progressivas.
ID único: ${slugifyId(name)}-${variant}-${nonce}.
${catalogBlock}

QUEM VAI VIVER ISSO: alguém que quer ir mais fundo com Deus, mas não tem formação teológica. Sente que a fé virou rotina, ou está num momento de busca real. Precisa de orientação prática, não de teoria.

ARQUITETURA DA JORNADA:
1) ARCO NARRATIVO: a jornada deve ter uma história — começo (despertar), meio (confronto/aprofundamento) e fim (envio/compromisso). Não é lista de atividades, é peregrinação interior com destino claro.
2) CADA ETAPA = MOVIMENTO COMPLETO: título evocativo (não descritivo) + preview que seja uma instrução concreta e específica (o que fazer, como, com que atitude). O preview deve bastar como orientação — sem precisar de explicação adicional.
3) PROGRESSÃO: do recolhimento íntimo ao envio missionário. Etapa 1 deve ser introspectiva e acessível. Etapa 5 deve exigir coragem e envolver outras pessoas.
4) ENRAIZAMENTO BÍBLICO: cada etapa deve brotar de um texto bíblico (citado no preview), não como decoração, mas como fundamento orgânico da prática proposta.
5) ORIGINALIDADE CONCRETA: evite fórmulas genéricas ("ore mais", "leia a Bíblia", "defina um horário"). Proponha práticas que surpreendam: lectio divina adaptada, exame de consciência inaciano, jejum de uma atividade específica, carta a Deus, caminhada meditativa, ritual de perdão, silêncio cronometrado sem exceção.
6) BELEZA E PESO: os títulos das etapas devem ser poéticos mas não vazios — como nomes de capítulos de um livro que você quer continuar lendo. A descrição da jornada deve convencer o leitor de que vale a pena investir dias nisso.
7) O título pode reinterpretar "${name}" com liberdade criativa, sem perder o tema central.

VOZ ESTILÍSTICA:
- estilo: ${style.label}
- identidade: ${style.identity}
- diretriz: ${style.journeyGuide}

ESTILOS DO SISTEMA: ${styleCatalog}
${previousSummary}${historyBlock}
${personClause}

Responda APENAS com JSON válido:
{"title":"título da jornada (poético, memorável, que gere desejo de começar)","description":"2-3 frases que pintem o destino desta jornada — o que o leitor será diferente ao final","steps":[{"step":1,"title":"título evocativo","preview":"instrução concreta com referência bíblica e atitude interior"},{"step":2,"title":"...","preview":"..."},{"step":3,"title":"...","preview":"..."},{"step":4,"title":"...","preview":"..."},{"step":5,"title":"...","preview":"..."}],"styleId":"${style.id}","styleLabel":"${style.label}"}`, generationConfig);
    const normalized = normalizeJourneyPayload(parsed, name);
    if (!normalized) throw new Error("Jornada inválida");
    return normalized;
  } catch {
    return {
      ...getJourneyFallback(name, variant, userName, userEmail, nonce),
      styleId: style.id,
      styleLabel: style.label,
      fromFallback: true
    };
  }
}

