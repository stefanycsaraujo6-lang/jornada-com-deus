# Backend — assinatura Kiwify

Controle de acesso com **status** `BASICO` (R$ 67,00) ou `OURO` (upgrade +R$ 33,00).

## Requisitos

- Node 20+
- PostgreSQL 14+

## Setup

1. Copie `.env.example` para `.env`.
2. Configure `DATABASE_URL`, `AUTH_JWT_SECRET`, `KIWIFY_WEBHOOK_SECRET`, `KIWIFY_PRODUCT_ID_BASICO`, `KIWIFY_PRODUCT_ID_UPGRADE`, `APP_URL`, `RESEND_API_KEY` (opcional), `CRON_SECRET`, OneSignal.
3. Migre o banco (sem `psql` — funciona no Windows):
   ```powershell
   cd backend
   npm run db:migrate
   ```
   Requer `DATABASE_URL` em `backend/.env`.
4. `npm install` e `npm run dev`

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Healthcheck |
| POST | `/api/auth/login` | Login e-mail + senha → JWT |
| GET | `/api/me` | Sessão (`Authorization: Bearer`) |
| POST | `/api/webhooks/kiwify` | Webhook Kiwify (também `/webhooks/kiwify`) |
| POST | `/api/premium/*` | Módulos Ouro (journeys, fasting, purposes) |

## Webhook Kiwify

- **approved/paid** + produto Básico (R$ 67): cria usuário `BASICO`, gera senha temporária, envia e-mail de boas-vindas com link do app.
- **approved/paid** + produto Upgrade (R$ 33): localiza usuário pelo e-mail e define `OURO`.
- **refund/chargeback**: rebaixa para `BASICO` e marca acesso `refunded`.
- Resposta **HTTP 200** para eventos válidos processados.

## Frontend (Vite)

- `VITE_KIWIFY_BASIC_URL` — checkout R$ 67,00
- `VITE_KIWIFY_UPGRADE_URL` — checkout upgrade; o app anexa `?email=` automaticamente
