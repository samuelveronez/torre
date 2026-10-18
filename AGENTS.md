# Torre de Controle — instruções para agentes (Codex e Claude Code)

App pessoal de planejamento (tarefas, agenda, captura com IA, Telegram), usado todo dia. **Não pode perder dados.**
Stack: React 19 + Vite + Tailwind 4 + shadcn/ui no frontend; Supabase (Postgres + RLS + Edge Functions Deno) no backend; publicado no GitHub Pages. Projeto Supabase: `nvxwqrpztecrvrxoddxf` (produção, única).

## Mapa
- `src/` — frontend (alias `@/` = `src/`). `components/ui` é shadcn: não editar à mão.
- `supabase/migrations/` — única fonte do schema. `supabase/functions/` — Edge Functions (`_shared/` = código comum). `supabase/tests/` — testes Deno, SQL e Playwright.
- `docs/` — site publicado (GitHub Pages). Não editar à mão; publicar com `npm run build && npm run publish:docs`.
- `docs-internas/` — escopo, design system, decisões, evidências e `RESTAURAR.md`. Relatórios e screenshots vão aqui, nunca na raiz.

## Comandos
- `npm run dev` · `npm run build` (tsc + vite) · `npm test` (testes de regra do frontend)
- `deno test --no-check supabase/tests` · `node supabase/validate-calendar.mjs` (banco via PGlite)
- Antes de dar algo por pronto: `npm run build` e `npm test` verdes. Regra nova de negócio = teste novo. Mudança de UI = conferir no `npm run dev`.

## Regras de segurança (produção)
- **Nunca** rodar `supabase db push`, `db reset`, `functions deploy` nem SQL direto na produção. Isso é feito só pelo dono. Preparar a migration/função e avisar.
- Migrations: sempre novo arquivo com timestamp; nunca editar uma já aplicada; só mudanças aditivas (remoção de coluna/tabela em migration separada, depois). Tabela nova exige RLS e teste SQL de isolamento entre usuários.
- Publicar a migration antes da Edge Function que depende dela.
- Nunca colocar `service_role`, tokens ou segredos no frontend ou no repo. A chave publishable em `src/supabase.ts` é a única permitida. Não ler `.env*`.
- Backup diário: `.github/workflows/backup.yml` (ver `docs-internas/RESTAURAR.md`). Reverter deploy do site: voltar ao commit anterior e republicar.

## Estilo
- Código novo legível: uma instrução por linha, arquivos pequenos e com uma responsabilidade. Não compactar nem minificar à mão. Em arquivo antigo e denso, não reformatar fora do trecho que você alterou.
- Imports com `@/`. Novos estilos: utilitários Tailwind ou tokens de `src/design-system.css`; não criar CSS global novo.
- UI e documentação em português; identificadores de código em inglês.

## Git e artefatos
- Commits pequenos, mensagem no imperativo em inglês, um assunto por commit. Não commitar nem dar push sem pedido. Nunca `--no-verify`.
- Não criar `.md` novos sem pedido. Não commitar `dist/`, `.zip`, imagens soltas na raiz.
- O working tree pode ter mudanças do dono que não são suas: faça `git add` só dos seus arquivos.
