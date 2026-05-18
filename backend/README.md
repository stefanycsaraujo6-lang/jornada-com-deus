# Backend (Fase A)

Backend para assinatura Kiwify com planos **Basic** e **Gold**.

## Requisitos

- Node 20+
- PostgreSQL 14+

## Setup

1. Copie `.env.example` para `.env`.
2. Configure `DATABASE_URL`, `KIWIFY_WEBHOOK_SECRET`, `KIWIFY_PRODUCT_ID_BASIC`, `KIWIFY_PRODUCT_ID_GOLD`, `CRON_SECRET`, `ONESIGNAL_APP_ID` e `ONESIGNAL_REST_API_KEY`.
3. Aplique schema:
   - `psql "$DATABASE_URL" -f sql/schema.sql`
   - Se já existia banco antigo: `psql "$DATABASE_URL" -f sql/migration_002_basic_gold.sql`
4. Instale dependências:
   - `npm install`
5. Rode em desenvolvimento:
   - `npm run dev`

## Endpoints

- `GET /health` -> valida API e banco.
- `GET /api/me` -> plano do usuário (header `X-User-Email`).
- `POST /api/webhooks/kiwify` -> webhook Kiwify (também em `/webhooks/kiwify`).
- `POST /api/premium/journeys` -> exige Gold.
- `POST /api/premium/fasting` -> exige Gold.
- `POST /api/premium/purposes` -> exige Gold.
- `POST /notifications/campaigns/*` -> campanhas OneSignal (cron).

### Webhook Kiwify

- Processa apenas pagamentos **approved/paid**.
- Produto Basic: cria/atualiza usuário como `basic`.
- Produto Gold: atualiza para `gold` (`is_gold=true`).
- Reembolso/chargeback: rebaixa para `basic`.
- Conta nova Basic recebe senha temporária (log no servidor; enviar por e-mail em produção).

### Segurança

- Assinatura HMAC quando `KIWIFY_WEBHOOK_SECRET` está configurado.
- Idempotência por `provider + event_id`.
- Rotas premium retornam `403` com `GOLD_REQUIRED` para upgrade no frontend.
