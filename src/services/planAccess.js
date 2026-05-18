// ── MODIFICAÇÃO: controle de acesso Basic/Gold
// ── DATA: 2026-05-18

export const PLANS = {
  basic: {
    id: "basic",
    name: "Padrão",
    emoji: "✝️",
    price: "R$ 67,00",
    features: [
      "Devocional diário padrão",
      "Versículo + reflexão + aplicação",
      "Marcar dia concluído e streak",
      "Histórico e desafio semanal",
      "Compartilhar versículo"
    ]
  },
  gold: {
    id: "gold",
    name: "Ouro",
    emoji: "👑",
    price: "Upsell exclusivo",
    popular: true,
    features: [
      "Jornadas de Fé exclusivas",
      "Campanhas de Jejum",
      "Propósitos em comunidade",
      "Tema personalizado do devocional",
      "Devocional aprofundado por IA"
    ]
  }
};

export const GOLD_REQUIRED_MESSAGE = "Disponível apenas no Plano Ouro";

export function normalizePlan(plan) {
  const value = String(plan || "").trim().toLowerCase();
  if (value === "gold" || value === "ouro") return "gold";
  return "basic";
}

export function isGold(plan) {
  return normalizePlan(plan) === "gold";
}

export function isBasic(plan) {
  return normalizePlan(plan) === "basic";
}

export function readStoredPlan(ls) {
  const stored = ls?.get?.("jcd_plan", "basic");
  const normalized = normalizePlan(stored);
  if (normalized !== stored) {
    ls?.set?.("jcd_plan", normalized);
  }
  return normalized;
}

export function savePlan(ls, plan) {
  const normalized = normalizePlan(plan);
  ls?.set?.("jcd_plan", normalized);
  return normalized;
}
