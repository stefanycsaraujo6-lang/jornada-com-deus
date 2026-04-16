# Backend (Fase A)

Backend inicial para assinatura Kiwify e segurança de dados.

## Requisitos

- Node 20+
- PostgreSQL 14+

## Setup

1. Copie `.env.example` para `.env`.
2. Configure `DATABASE_URL`, `KIWIFY_WEBHOOK_SECRET`, `CRON_SECRET`, `ONESIGNAL_APP_ID` e `ONESIGNAL_REST_API_KEY`.
3. Aplique schema:
   - `psql "$DATABASE_URL" -f sql/schema.sql`
4. Instale dependências:
   - `npm install`
5. Rode em desenvolvimento:
   - `npm run dev`

## Endpoints

- `GET /health` -> valida API e banco.
- `POST /webhooks/kiwify` -> recebe evento da Kiwify, valida assinatura e aplica upsert idempotente.
- `POST /notifications/campaigns/daily` -> campanha diária segmentada por tags OneSignal.
- `POST /notifications/campaigns/streak-risk` -> campanha de risco de streak.
- `POST /notifications/campaigns/challenge-weekly` -> campanha de desafio semanal.

### Segurança dos endpoints de campanha

- Enviar header `x-cron-secret: <CRON_SECRET>`.
- Payload opcional:
  - `dryRun` (boolean)
  - `heading` (string)
  - `message` (string)
  - `url` (url)

## Segurança aplicada nesta fase

- assinatura HMAC para webhook (quando `KIWIFY_WEBHOOK_SECRET` está configurado)
- idempotência por `provider + event_id`
- validação de payload com Zod
