// ── MODIFICAÇÃO: planos Basic/Gold e IDs de produto Kiwify
// ── DATA: 2026-05-18

export const PLANS = {
  BASIC: "basic",
  GOLD: "gold"
};

export const KIWIFY_PRODUCT_ID_BASIC =
  process.env.KIWIFY_PRODUCT_ID_BASIC || process.env.KIWIFY_PRODUCT_BASIC_ID || "";
export const KIWIFY_PRODUCT_ID_GOLD =
  process.env.KIWIFY_PRODUCT_ID_GOLD || process.env.KIWIFY_PRODUCT_GOLD_ID || "";

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

export function resolvePlanByProductId(productId) {
  const normalized = normalizeProductId(productId);
  if (!normalized) return null;

  if (KIWIFY_PRODUCT_ID_GOLD && normalized === normalizeProductId(KIWIFY_PRODUCT_ID_GOLD)) {
    return PLANS.GOLD;
  }
  if (KIWIFY_PRODUCT_ID_BASIC && normalized === normalizeProductId(KIWIFY_PRODUCT_ID_BASIC)) {
    return PLANS.BASIC;
  }

  if (normalized.includes("gold") || normalized.includes("ouro")) return PLANS.GOLD;
  if (normalized.includes("basic") || normalized.includes("padrao") || normalized.includes("padrão")) {
    return PLANS.BASIC;
  }

  return null;
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
