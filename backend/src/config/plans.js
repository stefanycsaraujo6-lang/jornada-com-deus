// Planos oficiais: Básico R$ 67,00 | Upgrade Ouro +R$ 33,00

export const USER_STATUS = {
  BASICO: "BASICO",
  OURO: "OURO"
};

/** @deprecated use USER_STATUS */
export const PLANS = USER_STATUS;

export const KIWIFY_PRODUCT_ID_BASICO =
  process.env.KIWIFY_PRODUCT_ID_BASICO ||
  process.env.KIWIFY_PRODUCT_ID_BASIC ||
  process.env.KIWIFY_PRODUCT_BASIC_ID ||
  "";

export const KIWIFY_PRODUCT_ID_UPGRADE =
  process.env.KIWIFY_PRODUCT_ID_UPGRADE ||
  process.env.KIWIFY_PRODUCT_ID_GOLD ||
  process.env.KIWIFY_PRODUCT_GOLD_ID ||
  "";

const APPROVED_STATUSES = new Set([
  "paid",
  "approved",
  "completed",
  "order_approved",
  "subscription_active"
]);

const REFUND_STATUSES = new Set([
  "refunded",
  "chargedback",
  "chargeback",
  "refund",
  "canceled",
  "cancelled",
  "subscription_canceled",
  "subscription_cancelled"
]);

export function normalizeProductId(value) {
  return String(value || "").trim().toLowerCase();
}

export function resolveStatusByProductId(productId) {
  const normalized = normalizeProductId(productId);
  if (!normalized) return null;

  if (KIWIFY_PRODUCT_ID_UPGRADE && normalized === normalizeProductId(KIWIFY_PRODUCT_ID_UPGRADE)) {
    return USER_STATUS.OURO;
  }
  if (KIWIFY_PRODUCT_ID_BASICO && normalized === normalizeProductId(KIWIFY_PRODUCT_ID_BASICO)) {
    return USER_STATUS.BASICO;
  }

  if (normalized.includes("upgrade") || normalized.includes("ouro") || normalized.includes("gold")) {
    return USER_STATUS.OURO;
  }
  if (
    normalized.includes("basico") ||
    normalized.includes("básico") ||
    normalized.includes("basic") ||
    normalized.includes("principal")
  ) {
    return USER_STATUS.BASICO;
  }

  return null;
}

export function normalizeUserStatus(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "OURO" || raw === "GOLD") return USER_STATUS.OURO;
  return USER_STATUS.BASICO;
}

export function extractPaymentStatus(payload) {
  const candidates = [
    payload?.order_status,
    payload?.status,
    payload?.data?.order_status,
    payload?.data?.status,
    payload?.subscription?.status,
    payload?.data?.subscription?.status,
    payload?.event_type,
    payload?.event
  ];

  for (const value of candidates) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) continue;
    if (APPROVED_STATUSES.has(normalized) || REFUND_STATUSES.has(normalized)) {
      return normalized;
    }
    if (normalized.includes("approved") || normalized.includes("paid")) return "paid";
    if (normalized.includes("refund") || normalized.includes("chargeback")) return "refunded";
  }

  return "";
}

export function isApprovedPaymentStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return APPROVED_STATUSES.has(normalized) || normalized.includes("approved") || normalized.includes("paid");
}

export function isRefundPaymentStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return REFUND_STATUSES.has(normalized) || normalized.includes("refund") || normalized.includes("chargeback");
}

export function mapSubscriptionStatus(paymentStatus) {
  if (isRefundPaymentStatus(paymentStatus)) return "refunded";
  if (isApprovedPaymentStatus(paymentStatus)) return "active";
  return "canceled";
}

export function isUpgradeProduct(productId) {
  return resolveStatusByProductId(productId) === USER_STATUS.OURO && Boolean(KIWIFY_PRODUCT_ID_UPGRADE);
}
