# Banco da Torre

Migration: `migrations/202610040001_torre.sql`. Aplicar uma vez via Supabase CLI ou SQL Editor após confirmar o projeto. Não executar em projeto sem identificar primeiro tabelas existentes.

Tabelas prefixadas `torre_` para evitar colisão com outros apps:

| Tabela | Conteúdo |
|---|---|
| torre_tasks | Tarefas, descrição, link, prazo, situação e acompanhamento |
| torre_scheduled_blocks | Uma reserva por tarefa |
| torre_busy_blocks | Disponibilidade corporativa ou manual, sem conteúdo |
| torre_work_hours | Jornada por dia da semana (0 = domingo) |
| torre_preferences | Tema e fuso horário |
| torre_integration_accounts | Estado das conexões, sem tokens |

Todas exigem usuário autenticado e isolam linhas por `auth.uid()`. A integração pode ser lida pelo dono, mas só o backend altera seu estado. Não há dados de demonstração, usuário inicial ou senhas nesta migration.

O frontend atual continua local; esta migration não conecta o app automaticamente. Depois de aplicar, configurar Supabase Auth, URL/publishable key e camada de persistência. `service_role` e tokens Google permanecem apenas no backend/Vault.

Ao entrar no app, criar preferências e os sete dias de jornada por upsert autenticado. Chamadas de `torre_release_expired_blocks()` liberam apenas reservas vencidas do próprio usuário. Chamá-la ao abrir ou atualizar a agenda.

Situações: todo/waiting/completed. UI Pessoal/Profissional corresponde a personal/professional. Fontes: torre/google_tasks. Não importar demonstrações como tarefas reais do Google.

Regras no banco: validação de duração, espera com responsável e data, conclusão com timestamp, remoção de reserva ao concluir/aguardar/alterar área ou duração, prevenção de conflito de reservas e respeito à jornada. Importação de blocos ocupados que conflitam com reservas é rejeitada; o backend deve informar o conflito e liberar/reagendar antes de tentar novamente. Alterar jornada não reorganiza reservas anteriores automaticamente.

Referências: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [funções](https://supabase.com/docs/guides/database/functions).
