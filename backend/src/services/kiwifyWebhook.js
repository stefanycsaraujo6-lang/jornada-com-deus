import {
  USER_STATUS,
  extractPaymentStatus,
  isApprovedPaymentStatus,
  isRefundPaymentStatus,
  mapSubscriptionStatus,
  resolveStatusByProductId
} from "../config/plans.js";
import { sendWelcomeAccessEmail } from "./email.js";
import { generateTempPassword, hashPassword } from "../utils/password.js";

function pickEmail(payload) {
  return (
    payload?.Customer?.email ||
    payload?.customer?.email ||
    payload?.data?.customer?.email ||
    payload?.data?.Customer?.email ||
    payload?.buyer?.email ||
    ""
  )
    .trim()
    .toLowerCase();
}

function pickName(payload, email) {
  return (
    payload?.Customer?.full_name ||
    payload?.Customer?.name ||
    payload?.customer?.name ||
    payload?.data?.customer?.name ||
    payload?.data?.Customer?.full_name ||
    email?.split("@")?.[0] ||
    "Usuário"
  ).trim();
}

function pickProductId(payload) {
  return (
    payload?.Product?.product_id ||
    payload?.Product?.id ||
    payload?.product?.product_id ||
    payload?.product?.id ||
    payload?.data?.product?.product_id ||
    payload?.data?.product?.id ||
    payload?.subscription?.product_id ||
    ""
  );
}

function pickCustomerId(payload) {
  return String(
    payload?.Customer?.id ||
      payload?.customer?.id ||
      payload?.data?.customer?.id ||
      ""
  );
}

function pickSubscriptionId(payload) {
  return String(
    payload?.subscription?.id ||
      payload?.Subscription?.id ||
      payload?.data?.subscription?.id ||
      ""
  );
}

export function logKiwifyWebhook(payload, meta = {}) {
  console.log("[kiwify:webhook]", {
    at: new Date().toISOString(),
    event: payload?.event_type || payload?.event || meta.eventType,
    status: extractPaymentStatus(payload),
    email: pickEmail(payload) || null,
    productId: pickProductId(payload) || null,
    ...meta
  });
}

async function upsertUserBasico(client, { email, name, customerId, tempPassword }) {
  const passwordHash = tempPassword ? await hashPassword(tempPassword) : null;

  const result = await client.query(
    `
      insert into users (
        email,
        name,
        status,
        access_status,
        password_hash,
        must_change_password,
        kiwify_customer_id
      )
      values ($1, $2, 'BASICO', 'active', $3, $4, $5)
      on conflict (email)
      do update set
        name = excluded.name,
        status = case
          when users.status = 'OURO' then users.status
          else 'BASICO'
        end,
        access_status = 'active',
        password_hash = coalesce(excluded.password_hash, users.password_hash),
        must_change_password = case
          when excluded.password_hash is not null then true
          else users.must_change_password
        end,
        kiwify_customer_id = coalesce(excluded.kiwify_customer_id, users.kiwify_customer_id)
      returning id, (xmax = 0) as inserted
    `,
    [email, name, passwordHash, Boolean(passwordHash), customerId || null]
  );

  return {
    userId: result.rows[0].id,
    created: result.rows[0].inserted
  };
}

async function upgradeUserToOuro(client, email) {
  const result = await client.query(
    `
      update users
      set status = 'OURO',
          access_status = 'active'
      where email = $1
      returning id
    `,
    [email]
  );
  return result.rows[0]?.id || null;
}

async function downgradeUserToBasico(client, userId) {
  await client.query(
    `
      update users
      set status = 'BASICO',
          access_status = 'refunded'
      where id = $1
    `,
    [userId]
  );
}

async function upsertSubscription(client, userId, payload, planStatus, paymentStatus) {
  const providerCustomerId = pickCustomerId(payload) || null;
  const providerSubscriptionId = pickSubscriptionId(payload) || `manual:${userId}:${planStatus}`;
  const providerProductId = pickProductId(payload) || null;
  const status = mapSubscriptionStatus(paymentStatus);

  await client.query(
    `
      insert into subscriptions (
        user_id,
        provider,
        provider_customer_id,
        provider_subscription_id,
        provider_product_id,
        plan,
        status
      )
      values ($1, 'kiwify', $2, $3, $4, $5, $6)
      on conflict (provider, provider_subscription_id)
      do update set
        plan = excluded.plan,
        status = excluded.status,
        provider_product_id = excluded.provider_product_id,
        updated_at = now()
    `,
    [userId, providerCustomerId, providerSubscriptionId, providerProductId, planStatus, status]
  );
}

export async function processKiwifyWebhook(client, payload) {
  logKiwifyWebhook(payload);

  const email = pickEmail(payload);
  if (!email) {
    throw new Error("Webhook sem email do cliente.");
  }

  const paymentStatus = extractPaymentStatus(payload);
  const productId = pickProductId(payload);
  const resolvedStatus = resolveStatusByProductId(productId);

  if (isRefundPaymentStatus(paymentStatus)) {
    const existing = await client.query(`select id from users where email = $1`, [email]);
    if (!existing.rows[0]) {
      return { action: "ignored_refund_missing_user", email };
    }

    const userId = existing.rows[0].id;
    await downgradeUserToBasico(client, userId);
    await upsertSubscription(client, userId, payload, USER_STATUS.BASICO, paymentStatus);
    return { action: "downgraded_to_basico", email, userId };
  }

  if (!isApprovedPaymentStatus(paymentStatus)) {
    return { action: "ignored_non_approved", email, paymentStatus };
  }

  if (!resolvedStatus) {
    throw new Error(`Produto Kiwify não mapeado: ${productId || "desconhecido"}`);
  }

  const name = pickName(payload, email);
  const customerId = pickCustomerId(payload);

  if (resolvedStatus === USER_STATUS.OURO) {
    const userId = await upgradeUserToOuro(client, email);
    if (!userId) {
      throw new Error(`Upgrade Ouro: usuário não encontrado para ${email}`);
    }
    await upsertSubscription(client, userId, payload, USER_STATUS.OURO, paymentStatus);
    return { action: "upgraded_to_ouro", email, userId };
  }

  const existing = await client.query(`select id, password_hash from users where email = $1 limit 1`, [email]);
  const isNewUser = existing.rowCount === 0;
  const tempPassword = isNewUser || !existing.rows[0]?.password_hash ? generateTempPassword(12) : null;

  const { userId, created } = await upsertUserBasico(client, {
    email,
    name,
    customerId,
    tempPassword
  });

  await upsertSubscription(client, userId, payload, USER_STATUS.BASICO, paymentStatus);

  if (tempPassword) {
    try {
      await sendWelcomeAccessEmail({
        email,
        name,
        tempPassword,
        loginUrl: process.env.APP_URL
      });
    } catch (err) {
      console.error("[kiwify:webhook] falha ao enviar e-mail de boas-vindas", err?.message || err);
      console.log("[kiwify:webhook] credenciais temporárias (fallback log)", { email, tempPassword });
    }
  }

  return {
    action: created ? "activated_basico_new" : "activated_basico_existing",
    email,
    userId,
    status: USER_STATUS.BASICO,
    created,
    welcomeEmailSent: Boolean(tempPassword)
  };
}
