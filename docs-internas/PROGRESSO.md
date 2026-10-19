# Progresso do plano de organização (2026-10-18)

- [x] 1. Backup: `backup.yml` rodando (artefato criptografado diário), `RESTAURAR.md`, `scripts/restore-test.ps1`, botão "Exportar JSON" (Configurações → Preferências)
  - [ ] Pendente (dono): teste de restauração no projeto descartável (veroenz) com `scripts/restore-test.ps1`
- [x] 2. Guardrails: `.claude/settings.json` (deny de db push/reset/functions deploy e de `.env*`)
- [x] 3. Raiz limpa: documentos em `docs-internas/`; rascunhos, clone de publicação, capturas e projeto de treinamento movidos para `C:\Users\samue\torre-arquivo\` (fora do repositório e do OneDrive)
- [x] 4. `AGENTS.md` + `CLAUDE.md` (inclui regras de organização e de trabalho paralelo com o Codex)
- [x] 5. `ci.yml` (verde no GitHub), `npm run publish:docs`, `docs/assets` podado
- [ ] Opcional: Prettier em massa; quebrar `src/main.tsx` aos poucos

# Migração de UI shadcn (plano: `docs-internas/revisao_ui/PLANO_UI_UNIFICADO.md`)
Branch `ui/shadcn-layout`.
- [x] Etapa 0 — rede de segurança (2026-10-18)
  - `scripts/ui-smoke.mjs`: abre as 7 páginas em 1440/390 px, claro/escuro, e falha se houver erro de console ou rolagem horizontal. Precisa de `PLAYWRIGHT_MODULE` (playwright-core fora do repo) e `TORRE_TEST_URL` (dev server).
  - Os 6 Playwright manuais (`supabase/tests/*_ui.mjs`) passam de novo. Corrigidos mocks e seletores desatualizados: tabelas novas nos mocks, `ai-default`, histórico do Modo IA ("Histórico do agente"), "Testar modelo padrão", "Opções de processamento" (Captura rápida), menu de ações da tarefa ("Reservar horário"), RPC `torre_save_task`, aba "Agenda" no mobile. Rodar com `PLAYWRIGHT_MODULE` e `TORRE_TEST_URL`.
  - Capturas "antes" (fora do repo): `%TEMP%\torre-scratch\antes\`.
- [x] Etapa 1 — tokens shadcn em `src/design-system.css` (`--card`, `--popover`, `--secondary`, `--destructive`, `--input`, `--ring`, `--radius`, `--accent-foreground`), mapeados no `@theme inline`. Valores equivalentes aos antigos; 28 capturas (7 páginas × 1440/390 × claro/escuro) idênticas às de antes. Único efeito possível: botão de fechar do `Sheet` usa `bg-secondary` (agora `--muted`). Overrides escuros do `style.css` mantidos para a Etapa 7.
- [x] Etapa 2 — componentes de base (ainda sem uso nas telas): `components/ui/select.tsx` (Select shadcn), variantes `priorityHigh/Medium/Low` e `area` em `badge.tsx`, `components/TaskBadges.tsx` (`PriorityBadge`, `AreaBadge`), `components/PageHeader.tsx`, `components/StatCard.tsx`. `PageHeading` e os selects nativos seguem como estão até cada tela migrar (Etapas 3–6). Verificado por `tsc`, build, testes e smoke; sem mudança visual.
