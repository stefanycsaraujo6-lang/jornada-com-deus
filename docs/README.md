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
- `docs/cloudflare-deploy`: publicar o frontend na Cloudflare Pages.

## Padrao oficial de dados (2026)

| Papel | Tecnologia |
|-------|------------|
| App (usuarios, historico, comunidade) | **Convex** |
| Pagamento / plano BASICO-OURO | **Convex** + webhook Kiwify |
| MVP ate migrar | `localStorage` (temporario) |
| Nao usar em codigo novo | Supabase (legado) |

Deploy frontend: **Cloudflare Pages**. API/dados: **Convex** (sem Render/Neon).

## Observacao de padronizacao

Os arquivos nesta pasta estao sem extensao por decisao historica do projeto.
Se quiser padronizar para `.md` no futuro, faca em um unico commit de renomeacao para manter rastreabilidade limpa.
