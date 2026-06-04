// Controle de acesso: BASICO (R$ 67) | OURO (upgrade +R$ 33)

export const USER_STATUS = {
  BASICO: "BASICO",
  OURO: "OURO"
};

export const PLANS = {
  BASICO: {
    id: "BASICO",
    name: "Básico",
    emoji: "✝️",
    price: "R$ 67,00 vitalício",
    priceNote: "ou em até 10x",
    features: [
      "Devocional diário personalizado",
      "Versículo + reflexão + aplicação",
      "Marcar dia concluído e sequência de dias",
      "Histórico e desafio semanal",
      "Compartilhar versículo",
      "Ranking da comunidade"
    ]
  },
  OURO: {
    id: "OURO",
    name: "Ouro",
    emoji: "👑",
    price: "+ R$ 33,00",
    popular: true,
    features: [
      "Jornadas Temáticas Intensas",
      "Protocolos de Jejum Bíblico Guiado",
      "Campanhas e Propósitos semanais",
      "Tema personalizado do devocional",
      "Download de imagens do versículo"
    ]
  }
};

export const OURO_REQUIRED_MESSAGE =
  "Disponível apenas no Nível Ouro. Ative por mais R$ 33,00 na Kiwify.";

/** @deprecated */
export const GOLD_REQUIRED_MESSAGE = OURO_REQUIRED_MESSAGE;

export function normalizeStatus(status) {
  const raw = String(status || "").trim().toUpperCase();
  if (raw === "OURO" || raw === "GOLD") return USER_STATUS.OURO;
  if (raw === "BASICO" || raw === "BASIC" || raw === "BRONZE" || raw === "PRATA") return USER_STATUS.BASICO;
  return USER_STATUS.BASICO;
}

/** Compatibilidade com hooks que usam plan id basic/gold */
export function statusToLegacyPlan(status) {
  return normalizeStatus(status) === USER_STATUS.OURO ? "gold" : "basic";
}

export function isOuro(status) {
  return normalizeStatus(status) === USER_STATUS.OURO;
}

export function isBasico(status) {
  return normalizeStatus(status) === USER_STATUS.BASICO;
}

/** @deprecated use isOuro */
export function isGold(planOrStatus) {
  return isOuro(planOrStatus);
}

export function readStoredStatus(ls) {
  const fromUser = ls?.get?.("jcd_user")?.status;
  if (fromUser) return normalizeStatus(fromUser);
  const legacy = ls?.get?.("jcd_status") || ls?.get?.("jcd_plan", "BASICO");
  const normalized = normalizeStatus(legacy === "gold" ? "OURO" : legacy);
  ls?.set?.("jcd_status", normalized);
  return normalized;
}

export function saveStatus(ls, status) {
  const normalized = normalizeStatus(status);
  ls?.set?.("jcd_status", normalized);
  const user = ls?.get?.("jcd_user");
  if (user?.email) {
    ls?.set?.("jcd_user", { ...user, status: normalized });
  }
  return normalized;
}

/** @deprecated */
export function normalizePlan(plan) {
  const raw = String(plan || "").trim().toLowerCase();
  if (raw === "gold" || raw === "ouro") return "gold";
  return "basic";
}

/** @deprecated */
export function readStoredPlan(ls) {
  return statusToLegacyPlan(readStoredStatus(ls));
}

/** @deprecated */
export function savePlan(ls, plan) {
  const status = plan === "gold" || plan === "ouro" ? USER_STATUS.OURO : USER_STATUS.BASICO;
  return statusToLegacyPlan(saveStatus(ls, status));
}

export function buildKiwifyUpgradeUrl(email) {
  const base = import.meta.env.VITE_KIWIFY_UPGRADE_URL || "";
  if (!base) return "";
  const trimmed = String(email || "").trim().toLowerCase();
  if (!trimmed) return base;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}email=${encodeURIComponent(trimmed)}`;
}

export function buildKiwifyBasicUrl(email) {
  const base = import.meta.env.VITE_KIWIFY_BASIC_URL || "";
  if (!base) return "";
  const trimmed = String(email || "").trim().toLowerCase();
  if (!trimmed) return base;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}email=${encodeURIComponent(trimmed)}`;
}
