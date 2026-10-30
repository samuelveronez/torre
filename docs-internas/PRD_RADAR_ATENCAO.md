# PRD — Radar de Atenção

**Produto:** Torre de Controle Executiva  
**Versão:** 1.1 — MVP simplificado  
**Data:** 29/10/2026  
**Status:** Proposto para desenvolvimento — não implementado  
**Repositório:** `samuelveronez/torre`  
**Banco:** Supabase — projeto Torre de Controle (`nvxwqrpztecrvrxoddxf`)

## 1. Resumo executivo

Transformar a tag **Radar** em uma experiência de acompanhamento de temas estratégicos, preservando o princípio: **Radar monitora; tarefa executa; Aguardando acompanha dependências**.

Itens do Radar não são, por padrão, entregas com vencimento. Devem ficar visíveis para revisão periódica, receber um nível de atenção, permitir anotações livres e gerar tarefas executáveis vinculadas quando necessário — sem serem automaticamente incluídos na programação semanal.

O MVP deve seguir KISS/DRY: reutilizar a estrutura atual, criar **apenas uma tabela auxiliar** para dados de Radar e **não criar tabela de histórico/updates**. O usuário escreverá e atualizará o contexto em **uma caixa de texto única**.

## 2. Problema e objetivo

Atualmente temas com a tag Radar coexistem em `torre_tasks` com tarefas executáveis. Isso causa:
- Datas atribuídas indevidamente durante redistribuição semanal;
- Temas tratados como atrasados ou concluíveis;
- Mistura de monitoramento estratégico com carga de execução;
- Falta de revisão periódica e clareza sobre quais temas pedem atenção.

**Objetivo:** uma página leve de Radar com temperatura, revisão, anotações atuais e vínculo com ações, sem desfigurar o fluxo atual de tarefas.

**Não objetivos no MVP:** IA preditiva, alertas automáticos externos, linha do tempo, versões de notas, tabela de updates, dashboard avançado, novo sistema de projetos.

## 3. Estado atual verificado em 29/10/2026

Estruturas existentes:
- `torre_tasks`: `id`, `user_id`, `title`, `description`, `status` (`todo`/`waiting`/`completed`), `priority` (`none`/`low`/`medium`/`high`), `due_date`, `follow_up_date`, `focus_date`, `updated_at`, `archived_at`, `source`, campos de sincronização com Google Tasks;
- `torre_labels`: etiquetas, incluindo **Radar**;
- `torre_task_labels`: vínculo muitos-para-muitos entre tarefas e etiquetas;
- `torre_task_people`: pessoas associadas às tarefas;
- `torre_triage_history`: histórico de triagem de capturas, **não** apropriado para anotações de Radar.

No momento da consulta: **11 itens ativos** com tag Radar; 9 em `todo` e 2 em `waiting`. Números são fotografia pontual, não requisito permanente.

## 4. Usuário e fluxos

**Usuário-alvo:** responsável pela Torre que acompanha programas, dependências, ideias e assuntos estratégicos, sem necessariamente ter uma próxima ação executável.

**Fluxo A — Consultar:** abrir Radar → visualizar assuntos e temperatura → filtrar → abrir detalhes.

**Fluxo B — Revisar:** abrir tema → ler descrição e notas → editar notas e/ou temperatura → salvar → marcar revisão como realizada → próxima revisão recalculada.

**Fluxo C — Converter atenção em execução:** abrir tema → criar tarefa relacionada com título, prioridade e vencimento → tarefa aparece no fluxo habitual de execução; tema permanece no Radar.

**Fluxo D — Organizar semana:** considerar apenas tarefas executáveis. Tema com Radar não recebe vencimento ou bloco de execução automático. Uma tarefa vinculada ao Radar **não herda** automaticamente a tag Radar.

## 5. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF01 | Página exclusiva listando itens ativos com tag Radar | P0 |
| RF02 | Temperatura do tema: `observar`, `atencao`, `critico` | P0 |
| RF03 | Revisão periódica a cada 7, 15 ou 30 dias; exibição de próxima revisão | P0 |
| RF04 | Campo de texto livre e único (`notes`) para contexto/atualizações, editável e persistente | P0 |
| RF05 | Criação de tarefa executável vinculada ao tema Radar | P0 |
| RF06 | Filtros por temperatura e revisão pendente | P1 |
| RF07 | Exibição opcional de pessoas ligadas ao tema pela estrutura existente | P1 |
| RF08 | Exibição de tarefas vinculadas e seus status | P1 |

**Removidos em v1.1:** histórico automático de atualizações, tabela `torre_radar_updates`, timeline, controle de versões das notas.

## 6. Proposta de interface

### Página Radar
- Contadores: monitorados, em atenção/críticos, com revisão pendente;
- Busca por título/texto e filtros por temperatura e revisão;
- Cards com título, temperatura, pessoa(s) quando houver, resumo e próxima revisão;
- Clique abre edição/detalhe em tela dedicada ou painel integrado ao padrão visual atual da Torre;
- **Não** exibir “atrasado” por falta de revisão; exibir **“Revisão pendente”**.

### Detalhe do tema
- Título e descrição original;
- Temperatura: Observar / Atenção / Crítico;
- Periodicidade: 7 / 15 / 30 dias;
- Próxima revisão e botão “Revisado”;
- Campo **Anotações e contexto atual**: textarea multilinha editável;
- Ação “Salvar” com estado de sucesso/erro; pode evoluir para autosave com debounce e controle de concorrência;
- Botão “Criar tarefa vinculada” e listagem simples das ações.

**Sem histórico automático:** salvar substitui o texto anterior. Usuário pode escrever datas manualmente no conteúdo caso queira registro cronológico.

## 7. Regras de negócio

**RN01 — Sem vencimento automático.** Tema com tag Radar não ganha `due_date` na programação semanal; `due_date` fica nulo por padrão.

**RN02 — Revisão ≠ vencimento.** `next_review_date` só indica necessidade de olhar novamente; nunca participa de métricas de tarefas atrasadas ou de carga executável.

**RN03 — Temperatura ≠ prioridade.** Temperatura mede atenção ao tema; prioridade das tarefas executáveis continua independente.

**RN04 — Tarefa vinculada, Radar preservado.** Criar tarefa nova não converte, conclui ou remove o tema; a ação tem sua própria prioridade, status e prazo.

**RN05 — Nota única.** `notes` representa o contexto atual; editar e salvar substitui a versão anterior; sem versões nem registros de atualização separados.

**RN06 — Revisão.** Confirmar revisão grava `last_reviewed_at` e calcula `next_review_date` conforme intervalo escolhido. Editar notas isoladamente **não** implica confirmar revisão.

**RN07 — Respeitar status Aguardando.** Tema com tag Radar pode ter status `waiting` na estrutura antiga. Preservar `waiting_for` e `follow_up_date` existentes. Datas de acompanhamento não devem ser confundidas com datas de execução nem revisão do Radar.

**RN08 — Preservação de dados.** Migração não deve excluir, concluir ou renomear registros e etiquetas existentes. Fazer backfill idempotente.

**RN09 — Google Tasks.** Tema Radar não deve ser enviado ou reprogramado como uma tarefa executável por automações; avaliar impacto sobre registros previamente sincronizados e não excluir itens remotos automaticamente.

**RN10 — Isolamento.** Todas as operações respeitam usuário proprietário e RLS.

## 8. Modelo de dados proposto

### Reutilizar
- `torre_tasks` para título, descrição, pessoas, status e vínculo com labels;
- `torre_labels` + `torre_task_labels` para identificar Radar.

### Criar somente `public.torre_radar`
| Campo | Tipo sugerido | Regra |
|---|---|---|
| `task_id` | uuid, PK | FK para `torre_tasks.id`, relação 1:1 |
| `user_id` | uuid, not null | Mesmo proprietário da tarefa |
| `temperature` | text, not null | check in (`observar`, `atencao`, `critico`); default `observar` |
| `review_interval_days` | integer, not null | check in (7,15,30); default 15 |
| `next_review_date` | date, nullable | Quando revisar novamente |
| `last_reviewed_at` | timestamptz, nullable | Última revisão confirmada |
| `notes` | text, not null | default texto vazio |
| `updated_at` | timestamptz, not null | Última alteração da configuração/notas |

**Integridade e segurança:** estabelecer FK composta `(user_id,task_id)` para `torre_tasks(user_id,id)` se houver chave/unique correspondente; habilitar RLS e políticas por `auth.uid() = user_id`; índice `(user_id,next_review_date)`.

### Vínculo das ações
Adicionar `radar_task_id uuid null` em `torre_tasks`, com FK para o registro pai; assegurar mesmo `user_id` e impedir autorreferência. Se necessário, usar FK composta e índice `(user_id,radar_task_id)`. Não atribuir automaticamente a label Radar às ações-filhas.

**Nota:** estes são requisitos de esquema, não migração executada. Validar constraints e padrões de RLS do projeto antes de implementar.

## 9. Migração e compatibilidade

1. Criar tabela e coluna de vínculo, constraints, índices e RLS;
2. Identificar itens pela etiqueta Radar, respeitando usuário e itens não arquivados;
3. Criar `torre_radar` idempotentemente, com temperatura `observar`, revisão padrão de 15 dias e notas vazias; preservar a descrição preexistente em `torre_tasks.description`;
4. Avaliar `due_date` preexistente antes de remover: separar datas indevidas de compromissos reais; não apagar prazos sem checagem;
5. Ajustar seletores de organização semanal, vencidos, métricas de conclusão e sincronização para excluir temas Radar (mas não tarefas-filhas executáveis);
6. Manter status/aguardando existentes, `follow_up_date` e as etiquetas;
7. Verificar contagens antes/depois e executar testes de regressão.

Se um item perder a tag Radar, definir comportamento explícito de configuração órfã (preferir preservar metadados e ocultar da página, sem exclusão automática).

## 10. Critérios de aceite (BDD)

**CA01 — Identificar tema**  
Dado um item ativo com a tag Radar, quando abrir a página Radar, então o item aparece sem ser tratado como tarefa vencida.

**CA02 — Nota persistente**  
Dado um tema Radar, quando editar e salvar anotações, então reabrir o tema mostra o texto salvo, sem criar registro histórico.

**CA03 — Preservação de nota**  
Dado um tema com notas, quando mudar temperatura ou periodicidade, então o texto permanece íntegro.

**CA04 — Revisão**  
Dado um tema com periodicidade de 15 dias, quando confirmar revisão, então `last_reviewed_at` é atualizado e a próxima revisão é agendada para 15 dias depois; nenhuma tarefa é criada.

**CA05 — Revisão pendente**  
Dado `next_review_date` no passado, quando consultar Radar, então o estado é “Revisão pendente”, e não “Tarefa atrasada”.

**CA06 — Criar ação**  
Dado um tema Radar, quando criar uma tarefa vinculada, então ela aparece em A fazer, com vencimento/prioridade próprios; o tema permanece no Radar e a tarefa não herda a tag Radar automaticamente.

**CA07 — Distribuição semanal**  
Dado um tema Radar sem data, quando executar a distribuição semanal, então nenhum vencimento é atribuído ao tema, mesmo se `status='todo'`.

**CA08 — Dependências**  
Dado um item Radar em Aguardando, quando migrar ou revisar, então `waiting_for` e `follow_up_date` não são apagados.

**CA09 — Acesso**  
Dado um usuário autenticado, quando consultar ou alterar Radar, então só consegue ler e editar registros próprios, observadas as políticas RLS.

**CA10 — Integridade**  
Dada uma ação vinculada, quando consultar o tema, então o relacionamento pertence ao mesmo usuário e não aponta para si próprio.

## 11. Entregas e etapas sugeridas

1. **Schema e segurança:** tabela `torre_radar`, coluna `radar_task_id`, FK, RLS e índices;
2. **Consulta e UI:** página Radar, temperatura, filtros e detalhe;
3. **Edição:** campo único de notas e salvamento com feedback;
4. **Revisão:** periodicidade, botão de revisão e estado pendente;
5. **Ações:** criar tarefa vinculada e listar ações;
6. **Compatibilidade:** programação semanal, vencidos, métricas, integração Google Tasks;
7. **Backfill e testes:** preservar 11 registros Radar observados na consulta inicial e validar comportamento da Torre.

## 12. Indicadores de sucesso

- Percentual de temas revisados dentro da periodicidade configurada;
- Número de temas Radar que geraram tarefas executáveis;
- Meta **zero** de temas Radar com vencimento atribuído automaticamente;
- Meta **zero** de temas Radar contabilizados indevidamente como tarefas atrasadas.

## 13. Decisões de produto e pendências técnicas

**Decidido:** notas em campo único, sem histórico; Radar sem prazo por padrão; revisão separada de vencimento; tema pode gerar várias ações; reuso da tag atual e da tabela `torre_tasks`.

**Validar na implementação:** comportamento dos itens Radar já associados ao Google Tasks, UX de salvamento, forma de tratamento de um prazo de entrega explicitamente informado em tema Radar e política para retirada da tag Radar.

---

**Registro:** documento de requisitos somente. Nenhuma mudança de schema, dados, código de produção ou implantação do Supabase foi solicitada ou executada ao salvar este PRD.
