# Backup e restauração do banco

## O que existe
- Workflow `.github/workflows/backup.yml`: todo dia às 06:00 UTC (e sob demanda em Actions → Backup do banco → Run workflow). Gera `schema.sql`, `data.sql` e `roles.sql` como artefato com retenção de 30 dias.
- Segredo necessário no GitHub (Settings → Secrets and variables → Actions): `SUPABASE_DB_URL`, a connection string do **Session pooler** (Supabase → Connect). O pooler funciona em IPv4; a conexão direta costuma exigir IPv6 e falha no GitHub Actions. Nunca colocar a string no repositório.
- Segredo `BACKUP_PASSPHRASE`: senha que criptografa os arquivos (AES256). **Obrigatório: o repositório é público e os artefatos de Actions de repositório público podem ser baixados por qualquer usuário logado no GitHub.** Guarde essa senha também num gerenciador de senhas; sem ela o backup não abre.

## Limites conhecidos
- **Arquivos do Storage (anexos, bucket `torre_files`) não estão no dump.** Só os metadados entram. Se os anexos importarem, baixar o bucket periodicamente pelo painel ou criar uma segunda etapa com a chave de serviço.
- O dump cobre o schema `public` (tabelas `torre_*`). Usuários do Auth não entram por padrão; em caso de perda total, será preciso recriar a conta e reimportar os dados.

## Restaurar (testar uma vez num projeto descartável, nunca direto na produção)
1. Criar um projeto Supabase novo e vazio.
2. Baixar o artefato do workflow, descompactar e descriptografar cada arquivo: `gpg -d -o schema.sql schema.sql.gpg` (idem `data.sql.gpg`; pede a `BACKUP_PASSPHRASE`).
3. Aplicar, na ordem, com o `psql` apontando para a connection string do projeto novo:
   `psql "$NOVO_DB_URL" -f schema.sql` e depois `psql "$NOVO_DB_URL" -f data.sql`.
4. Conferir a contagem de linhas de `torre_tasks`, `torre_scheduled_blocks` e `torre_preferences` contra a produção.
5. Anotar aqui a data do teste e qualquer ajuste necessário.

Último teste de restauração: **ainda não feito**.

## Publicar e reverter o site (GitHub Pages)
- Publicar: `npm run build`, depois `npm run publish:docs` (copia `dist` para `docs/` e apaga bundles antigos de `docs/assets`), commit e push na `main`.
- Reverter: `git revert` do commit de publicação (ou `git checkout <commit-anterior> -- docs`) e push. Os bundles antigos continuam no histórico do git.
- O CI (`.github/workflows/ci.yml`) roda build e testes em cada push/PR.
