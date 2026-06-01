# Jornada com Deus

PWA de devocional diario para cristaos brasileiros, com foco em consistencia espiritual, experiencia mobile-first e evolucao para modelo SaaS com assinaturas.

Repositorio: [stefanycsaraujo6-lang/jornada-com-deus](https://github.com/stefanycsaraujo6-lang/jornada-com-deus.git)

## Stack atual

- Frontend: React + Vite (deploy alvo: Vercel)
- Dados do app (padrao oficial): **Convex** (Dev/Prod separados)
- Persistencia atual do MVP: `localStorage` (ate migracao para Convex)
- IA no app: Gemini (com servicos em `src/services`)
- PWA: `vite-plugin-pwa`
- Assinaturas e webhook Kiwify (fase A): Node + Express + PostgreSQL em `backend/`

**Supabase:** legado no codigo (`src/services/supabase*`). Nao usar em features novas; remover quando Convex cobrir auth/sync.

## Estrutura principal

- `src/`: aplicacao frontend
- `backend/`: API para healthcheck, webhook Kiwify e campanhas
- `docs/`: documentos de produto, requisitos, arquitetura e planejamento
- `.cursorrules`: diretrizes de assistente para o projeto

## Como rodar o frontend

1. Configure ambiente:
   - copie `.env.example` para `.env.local`
   - preencha `VITE_GEMINI_KEY`
2. Instale dependencias:
   - `npm install`
3. Rode em desenvolvimento:
   - `npm run dev`
4. Build de producao:
   - `npm run build`
5. Preview local do build:
   - `npm run preview`

## Como rodar o backend

Consulte `backend/README.md` para requisitos e configuracao de ambiente.

## Convex (dados do app)

Setup completo: `docs/convex-setup`.

```bash
npx convex login
npm run convex:dev
```

## Documentacao

Veja o mapa em `docs/README.md`.
