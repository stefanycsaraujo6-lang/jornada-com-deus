export const USER_STATUS = {
  BASICO: "BASICO" as const,
  OURO: "OURO" as const,
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function pickEmail(payload: Record<string, unknown>) {
  const customer = payload.Customer as Record<string, unknown> | undefined;
  const customerLower = payload.customer as Record<string, unknown> | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  const dataCustomer = data?.customer as Record<string, unknown> | undefined;
  const buyer = payload.buyer as Record<string, unknown> | undefined;

  return String(
    customer?.email ||
      customerLower?.email ||
      dataCustomer?.email ||
      buyer?.email ||
      ""
  )
    .trim()
    .toLowerCase();
}

export function pickName(payload: Record<string, unknown>, email: string) {
  const customer = payload.Customer as Record<string, unknown> | undefined;
  const customerLower = payload.customer as Record<string, unknown> | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  const dataCustomer = data?.customer as Record<string, unknown> | undefined;

  return String(
    customer?.full_name ||
      customer?.name ||
      customerLower?.name ||
      dataCustomer?.name ||
      email.split("@")[0] ||
      "Usuário"
  ).trim();
}

export function pickProductId(payload: Record<string, unknown>) {
  const product = payload.Product as Record<string, unknown> | undefined;
  const productLower = payload.product as Record<string, unknown> | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  const dataProduct = data?.product as Record<string, unknown> | undefined;
  const subscription = payload.subscription as Record<string, unknown> | undefined;

  return String(
    product?.product_id ||
      product?.id ||
      productLower?.product_id ||
      productLower?.id ||
      dataProduct?.product_id ||
      dataProduct?.id ||
      subscription?.product_id ||
      ""
  );
}

export function pickCustomerId(payload: Record<string, unknown>) {
  const customer = payload.Customer as Record<string, unknown> | undefined;
  const customerLower = payload.customer as Record<string, unknown> | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  const dataCustomer = data?.customer as Record<string, unknown> | undefined;

  return String(customer?.id || customerLower?.id || dataCustomer?.id || "");
}

export function extractPaymentStatus(payload: Record<string, unknown>) {
  const candidates = [
    payload.order_status,
    payload.status,
    (payload.data as Record<string, unknown> | undefined)?.order_status,
    (payload.data as Record<string, unknown> | undefined)?.status,
    (payload.subscription as Record<string, unknown> | undefined)?.status,
    payload.event_type,
    payload.event,
  ];

  for (const value of candidates) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) continue;
    if (
      ["paid", "approved", "completed", "order_approved", "subscription_active"].includes(
        normalized
      ) ||
      ["refunded", "chargedback", "chargeback", "refund", "canceled", "cancelled"].includes(
        normalized
      )
    ) {
      return normalized;
    }
    if (normalized.includes("approved") || normalized.includes("paid")) return "paid";
    if (normalized.includes("refund") || normalized.includes("chargeback")) return "refunded";
  }
  return "";
}

export function isApprovedPaymentStatus(status: string) {
  const n = status.toLowerCase();
  return (
    ["paid", "approved", "completed", "order_approved", "subscription_active"].includes(n) ||
    n.includes("approved") ||
    n.includes("paid")
  );
}

export function isRefundPaymentStatus(status: string) {
  const n = status.toLowerCase();
  return (
    ["refunded", "chargedback", "chargeback", "refund", "canceled", "cancelled"].includes(n) ||
    n.includes("refund") ||
    n.includes("chargeback")
  );
}

export function resolveStatusByProductId(productId: string) {
  const normalized = productId.trim().toLowerCase();
  const basicoId = (process.env.KIWIFY_PRODUCT_ID_BASICO || "").trim().toLowerCase();
  const upgradeId = (process.env.KIWIFY_PRODUCT_ID_UPGRADE || "").trim().toLowerCase();

  if (upgradeId && normalized === upgradeId) return USER_STATUS.OURO;
  if (basicoId && normalized === basicoId) return USER_STATUS.BASICO;

  if (normalized.includes("upgrade") || normalized.includes("ouro") || normalized.includes("gold")) {
    return USER_STATUS.OURO;
  }
  if (
    normalized.includes("basico") ||
    normalized.includes("básico") ||
    normalized.includes("basic")
  ) {
    return USER_STATUS.BASICO;
  }
  return null;
}
