# Progresso do plano de organização (2026-10-18)

- [x] 1. Backup: `.github/workflows/backup.yml`, `RESTAURAR.md`, botão "Exportar JSON" (Configurações → Preferências)
  - [ ] Pendente (dono): criar o secret `SUPABASE_DB_URL`, rodar o workflow uma vez e fazer a restauração de teste
- [x] 2. Guardrails: `.claude/settings.json` (deny de db push/reset/functions deploy e de `.env*`)
- [x] 3. Raiz limpa: documentos em `docs-internas/`, screenshots em `docs-internas/evidencias/`, `.gitignore` ampliado
  - [ ] Pendente (dono): decidir sobre `Centro de Treinamento Executivo IA/`, `Centro_..._v2.zip` e `visual-prep/` (apenas ignorados, nada apagado)
- [x] 4. `AGENTS.md` + `CLAUDE.md`
- [x] 5. `ci.yml`, `npm run publish:docs`, `docs/assets` podado (2 arquivos em uso)
  - [ ] Nenhum commit foi feito: o working tree tem mudanças suas em andamento (main.tsx, CSS etc.)
