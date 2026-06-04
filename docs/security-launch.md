# Segurança — checklist de lançamento

## Corrigido no código

### 1. Chave Gemini fora do browser (produção)

- O app chama apenas `/api/gemini` (Cloudflare Pages Function).
- A chave fica em **GEMINI_KEY** no painel Cloudflare (tipo Segredo).
- **Remova** `VITE_GEMINI_KEY` das variáveis de Production no Cloudflare.
- Requisições exigem login: header `X-Session-Token` + validação em Convex `/session/validate`.
- Rate limit básico por IP na Function (30 req/min).

### 2. Webhook Kiwify — fail closed

- Sem `KIWIFY_WEBHOOK_SECRET` no Convex → webhook retorna **503** (não processa).
- Assinatura HMAC SHA-256 obrigatória (`x-kiwify-signature` ou equivalente).

### 3. Streak / histórico no Convex

- Tabela `userProgress` sincroniza `jcd_history` após login e ao marcar dia concluído.
- localStorage continua como cache offline; servidor é a cópia de recuperação.

## Você precisa configurar (painéis)

**Convex (Production)**

| Variável | Obrigatório |
|----------|-------------|
| `KIWIFY_WEBHOOK_SECRET` | Sim |
| `KIWIFY_PRODUCT_ID_BASICO` | Sim |
| `APP_URL` | Sim |

**Cloudflare Pages (Production)**

| Variável | Tipo |
|----------|------|
| `GEMINI_KEY` | Segredo |
| `CONVEX_SITE_URL` | Texto (`https://insightful-tern-334.convex.site`) |
| `VITE_CONVEX_URL` | Texto |
| `VITE_KIWIFY_BASIC_URL` | Texto |

**Kiwify**

- Webhook URL: `https://insightful-tern-334.convex.site/kiwify`

Depois de alterar variáveis: `npx convex deploy` + reimplantar Pages.

## Pendente (médio prazo)

- Rate limit mais forte (KV Durable Object)
- HTTPS/cookies Convex
- Remover `backend/` e Supabase legado
- CSP headers
- Validação de força de senha
