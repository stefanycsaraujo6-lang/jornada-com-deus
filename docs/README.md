# Mapa da Documentacao

Este diretorio concentra os documentos de produto e de execucao do projeto.

## Arquivos atuais

- `docs/project brief`: visao geral do produto, proposta de valor, publico e metas do MVP.
- `docs/prd`: requisitos funcionais e nao funcionais do produto.
- `docs/arquitetura`: arquitetura tecnica do frontend e diretrizes de resiliência.
- `docs/stories`: user stories por epico com criterios de aceite.
- `docs/tasks`: plano de implementacao e checklist operacional.
- `docs/kiwify-blueprint`: blueprint de evolucao SaaS, Kiwify, seguranca e LGPD.
- `docs/convex-setup`: login, Dev/Prod e comandos Convex.

## Padrao oficial de dados (2026)

| Papel | Tecnologia |
|-------|------------|
| App (usuarios, historico, comunidade) | **Convex** |
| Pagamento / plano Basic-Gold | **PostgreSQL** (`backend/` + Kiwify) |
| MVP ate migrar | `localStorage` (temporario) |
| Nao usar em codigo novo | Supabase (legado) |

Deploy frontend: **Vercel**. API de assinatura: **Render** (ver `render.yaml`).

## Observacao de padronizacao

Os arquivos nesta pasta estao sem extensao por decisao historica do projeto.
Se quiser padronizar para `.md` no futuro, faca em um unico commit de renomeacao para manter rastreabilidade limpa.
