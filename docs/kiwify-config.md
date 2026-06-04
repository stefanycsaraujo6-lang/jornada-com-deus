# Kiwify — Jornada com Deus (valores oficiais)

Registro para não perder IDs e links. **Secrets** (webhook) ficam só no dashboard Convex, nunca no Git.

## Plano Básico (R$ 67,00 vitalício)

| Campo | Valor |
|-------|--------|
| Checkout (link de pagamento) | `https://pay.kiwify.com.br/fDiPMgJ` |
| **ID do produto** (Convex `KIWIFY_PRODUCT_ID_BASICO`) | `0e63c120-5488-11f1-adb2-dfc45ee7e920` |

Como conferir no painel: Produtos → abrir o Básico → URL contém  
`.../products/edit/0e63c120-5488-11f1-adb2-dfc45ee7e920`

## Plano Ouro (upgrade +R$ 33,00)

| Campo | Valor |
|-------|--------|
| Checkout | _pendente_ |
| ID do produto (`KIWIFY_PRODUCT_ID_UPGRADE`) | _pendente_ |

## Webhook

| Campo | Valor |
|-------|--------|
| URL (Convex produção) | `https://insightful-tern-334.convex.site/kiwify` |
| Secret (`KIWIFY_WEBHOOK_SECRET`) | **obrigatório** — mesmo valor na Kiwify e no Convex |

Sem o secret configurado, o webhook é **rejeitado** (ninguém ganha acesso fake).

## Onde colar cada coisa

**Cloudflare Pages**

- `VITE_KIWIFY_BASIC_URL` = `https://pay.kiwify.com.br/fDiPMgJ`
- `VITE_KIWIFY_UPGRADE_URL` = (quando tiver o link do upgrade)

**Convex → Settings → Environment Variables (Production)**

- `KIWIFY_PRODUCT_ID_BASICO` = `0e63c120-5488-11f1-adb2-dfc45ee7e920`
- `KIWIFY_PRODUCT_ID_UPGRADE` = (quando criar o produto Ouro)
- `KIWIFY_WEBHOOK_SECRET` = segredo gerado na Kiwify
- `APP_URL` = `https://jornada-com-deus.pages.dev`
