const STYLE_LIBRARY = [
  {
    id: "contemplativo",
    label: "Contemplativo",
    identity: "tom reverente, sensivel e poeticamente simples",
    devotionalGuide: "convide para pausa interior, escuta e adoração silenciosa diante de Deus",
    challengeGuide: "proponha praticas de silencio, observacao da graca e gratidao atenta no cotidiano"
  },
  {
    id: "confronto-amoroso",
    label: "Confronto Amoroso",
    identity: "tom firme e gentil, verdade com misericordia",
    devotionalGuide: "nomeie areas de autoengano com amor e convide ao arrependimento pratico sem condenacao",
    challengeGuide: "traga tarefas de honestidade espiritual, confissao e passos concretos de obediencia"
  },
  {
    id: "cura-emocional",
    label: "Cura Emocional",
    identity: "tom acolhedor, terapeutico pastoral e esperancoso",
    devotionalGuide: "fale com empatia sobre dor, ansiedade, luto e cansaco, apontando para restauracao em Cristo",
    challengeGuide: "inclua praticas de entrega emocional a Deus, respiracao-oracao, diario e reconstrucao de limites"
  },
  {
    id: "missao-pratica",
    label: "Missao Pratica",
    identity: "tom ativo, encorajador e orientado a acao",
    devotionalGuide: "mostre como a fe se traduz em servico, testemunho e fidelidade nas pequenas rotinas",
    challengeGuide: "proponha micro-missoes concretas de bondade, reconciliacao e impacto no proximo"
  },
  {
    id: "quietude-com-deus",
    label: "Quietude com Deus",
    identity: "tom calmo, profundo e de descanso espiritual",
    devotionalGuide: "conduza para desaceleracao, confianca e permanencia em Deus no meio da pressa",
    challengeGuide: "estruture tarefas de desacelerar, desligar ruidos e cultivar presenca com Deus"
  }
];

function hashString(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getStyleLibrary() {
  return STYLE_LIBRARY;
}

export function pickStyle(seed) {
  const idx = hashString(seed) % STYLE_LIBRARY.length;
  return STYLE_LIBRARY[idx];
}

export function pickDailyDevotionalStyle({ todayKey, userName, theme, plan }) {
  return pickStyle(`devotional|${todayKey}|${userName || ""}|${theme || ""}|${plan || ""}`);
}

export function pickChallengeStyle({ todayKey, variant, userName }) {
  return pickStyle(`challenge|${todayKey}|${variant || 0}|${userName || ""}`);
}
