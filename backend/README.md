# Backend (Fase A)

Backend inicial para assinatura Kiwify e segurança de dados.

## Requisitos

- Node 20+
- PostgreSQL 14+

## Setup

1. Copie `.env.example` para `.env`.
2. Configure `DATABASE_URL` e `KIWIFY_WEBHOOK_SECRET`.
3. Aplique schema:
   - `psql "$DATABASE_URL" -f sql/schema.sql`
4. Instale dependências:
   - `npm install`
5. Rode em desenvolvimento:
   - `npm run dev`

## Endpoints

- `GET /health` -> valida API e banco.
- `POST /webhooks/kiwify` -> recebe evento da Kiwify, valida assinatura e aplica upsert idempotente.

## Segurança aplicada nesta fase

- assinatura HMAC para webhook (quando `KIWIFY_WEBHOOK_SECRET` está configurado)
- idempotência por `provider + event_id`
- validação de payload com Zod
