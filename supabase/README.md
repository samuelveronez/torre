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

Migration aplicada em 4 de outubro de 2026 ao projeto `nvxwqrpztecrvrxoddxf` (Torre de Controle, São Paulo). O frontend está conectado por `src/supabase.ts`, com login em `src/Cloud.tsx` e persistência em `src/useCloudData.ts`. `service_role` e tokens Google permanecem apenas no backend/Vault.

Verificação: seis tabelas com RLS habilitada, consulta SQL remota respondendo e auditoria de segurança sem alertas. A validação local cobre isolamento entre usuários, espera, conclusão, reservas e conflitos. O login real de uma conta pessoal ainda depende de cadastro e confirmação de e-mail pelo usuário. O estado é recarregado ao entrar e após cada gravação; atualizações em outro dispositivo aparecem ao recarregar a página.

Ao entrar no app, criar preferências e os sete dias de jornada por upsert autenticado. Chamadas de `torre_release_expired_blocks()` liberam apenas reservas vencidas do próprio usuário. Chamá-la ao abrir ou atualizar a agenda.

Situações: todo/waiting/completed. UI Pessoal/Profissional corresponde a personal/professional. Fontes: torre/google_tasks. Não importar demonstrações como tarefas reais do Google.

Regras no banco: validação de duração, espera com responsável e data, conclusão com timestamp, remoção de reserva ao concluir/aguardar/alterar área ou duração, respeito à jornada e preservação de reservas manuais sobrepostas. A sincronização importa blocos ocupados sem apagar reservas. Propostas automáticas validam conflitos no banco antes de aplicar. Alterar jornada não reorganiza reservas anteriores automaticamente.

Referências: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [funções](https://supabase.com/docs/guides/database/functions).

## Convites e reservas sobrepostas

A migração `migrations/20261005102708_calendar_responses_manual_overlaps.sql` adiciona `response_status` aos eventos Google, permite reservas manuais simultâneas e impede que a sincronização as apague. A assinatura de `torre_apply_calendar` permanece igual e retorna zero reservas liberadas. O campo novo começa nulo; a próxima sincronização o preenche.

Aceitos, talvez e sem resposta bloqueiam sugestões automáticas quando o calendário bloqueia planejamento e o evento não está marcado como livre. Recusados ficam disponíveis para consulta e não bloqueiam. A interface permite mostrar recusados nas agendas diária e semanal. No modo Somente ocupado, não há resposta nem detalhes de convites.

Reservas manuais dispensam agenda atualizada e aceitam conflitos, mantendo tarefa em A fazer, duração, horário futuro, jornada e intervalo 7h–22h. A aplicação de propostas da IA verifica agenda atualizada e conflitos com eventos, tarefas existentes e outras tarefas da proposta sob o bloqueio transacional por usuário.

Validação: `node supabase/validate-calendar.mjs` (usa PGlite instalado em `.db-validation`); `deno test --no-check supabase/tests`; `npm run build`. O teste `supabase/tests/agenda_ui.mjs` usa Playwright e uma prévia Vite em 5181 (`TORRE_TEST_URL` permite outra URL). Todas as chamadas Supabase nele são interceptadas com dados fictícios. `PLAYWRIGHT_MODULE` pode apontar para uma instalação externa do Playwright.

### Eventos anônimos e permissões

A migração `20261005143000_anonymous_calendar_overlaps.sql` mantém a assinatura de `torre_apply_calendar`. No modo Somente ocupado, a integração consulta os eventos com somente ID, status e horários, preservando sobreposições sem guardar títulos, participantes ou respostas. O FreeBusy continua sendo a fonte dos bloqueios automáticos. No payload interno, `display_only` identifica eventos para exibição e `availability_only` identifica intervalos que não devem virar cartões. Se o Google negar os eventos individuais (403/404) ou não fornecer horários apesar de haver ocupação, a agenda usa disponibilidade consolidada e informa a limitação. Erros transitórios interrompem a sincronização sem substituir os dados anteriores.

A opção Detalhes permitidos exige uma permissão superior a freeBusyReader. Configurações explica o bloqueio e permite atualizar permissões após uma mudança no Google. Salvamentos exibem andamento, sucesso e erro.
