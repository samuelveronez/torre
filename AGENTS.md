# Torre de Controle — instruções para agentes (Codex e Claude Code)

App pessoal de planejamento (tarefas, agenda, captura com IA, Telegram), usado todo dia. **Não pode perder dados.**
Stack: React 19 + Vite + Tailwind 4 + shadcn/ui no frontend; Supabase (Postgres + RLS + Edge Functions Deno) no backend; publicado no GitHub Pages. Projeto Supabase: `nvxwqrpztecrvrxoddxf` (produção, única).

## Início e fim de sessão (Codex e outros agentes)
**Ao começar**
1. Leia este arquivo e `docs-internas/PROGRESSO.md`.
2. Rode `git status` e `git fetch`. Se a `main` local estiver atrás do `origin/main` ou houver mudanças não commitadas que não sejam suas, avise o dono antes de qualquer `pull`, `reset` ou `restore`.
3. Rascunhos, clones e builds de publicação vão em `%TEMP%\torre-scratch\` ou `C:\Users\samue\torre-arquivo\` (fora do repositório). **Nunca** dentro do projeto.

**Ao terminar**
1. `npm run build` e `npm test` verdes.
2. `git status`: a raiz só pode ter os itens permitidos em "Organização do repositório"; nada de imagens, `.zip`, clones ou `.md` novos sem pedido.
3. Commits só dos seus arquivos. Não dar push sem o dono pedir; push de `.github/workflows/*` exige a permissão `workflow` do `gh`.
4. Se mudou algo que afeta o fluxo (comando, pasta, deploy), atualize este arquivo e `docs-internas/PROGRESSO.md`.

**Nunca, sem pedido explícito do dono:** `supabase db push|reset`, `supabase functions deploy`, SQL direto na produção, publicar o site (`publish:docs`) com mudanças não revisadas, imprimir segredos ou partes de URLs de conexão em logs.

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

## Organização do repositório (manter)
- **Raiz só com**: `README.md`, `AGENTS.md`, `CLAUDE.md`, `package*.json`, configs (`vite`, `tsconfig`, `components.json`, `index.html`, `.gitignore`) e as pastas `src/`, `supabase/`, `docs/`, `docs-internas/`, `scripts/`, `.github/`, `.claude/`. Qualquer outra coisa na raiz (imagens, `.zip`, `.md`, clones) está errada.
- **Área de rascunho fora do repositório**: clones, builds de publicação, `*.tar`, testes descartáveis e capturas de tela temporárias vão em `%TEMP%\torre-scratch\` (ou `.scratch/`, ignorada pelo git). **Nunca** criar clones, `node_modules` ou outro `.git` dentro do projeto nem dentro de `docs-internas/`.
- **`docs-internas/`** guarda só texto versionável (`.md`). Relatórios novos só sob pedido, em `docs-internas/` (revisões em `docs-internas/revisao-de-arquitetura/`). Imagens e evidências ficam fora do git (`docs-internas/evidencias/` é ignorada); o repositório é **público**, então nunca commitar capturas de login, e-mails, IDs ou tokens.
- **`docs/`** é só o build publicado. Publicar: `npm run build` e `npm run publish:docs`; conferir se `docs/assets` ficou só com os arquivos referenciados por `docs/index.html`.
- **`visual-prep/`** existe vazia e ignorada pelo git: é onde os testes de UI (`conversations_ui.mjs`, `telegram_ui.mjs`) gravam capturas. Não guardar nada importante nela; arquivar fora do repositório.
- **Scripts auxiliares** reutilizáveis ficam em `scripts/`; descartáveis ficam no rascunho.

## Trabalho em paralelo com outros agentes
- Codex e Claude Code editam esta mesma pasta. Antes de começar: `git status` e `git fetch`. Se a `main` local estiver atrás do `origin/main`, avise o dono em vez de dar `pull`/`reset` sobre mudanças não commitadas.
- Um agente por vez na pasta. Não apagar `.git/index.lock` se houver processo git rodando.
- Em logs públicos (GitHub Actions) **nunca imprimir** partes de URLs de conexão, senhas ou tokens, nem para depurar.
