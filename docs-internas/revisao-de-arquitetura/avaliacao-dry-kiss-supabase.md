# Avaliação DRY e KISS — Torre de Controle

> Avaliação fornecida pelo usuário e salva localmente em 10/10/2026. Os achados abaixo reproduzem a análise recebida; não foram verificados novamente durante o salvamento.

Diagnóstico: a estrutura do Supabase é tecnicamente organizada, mas apresenta sinais de complexidade crescente para uma aplicação pessoal de produtividade e gestão executiva.

Minha recomendação é simplificar antes de adicionar novas funcionalidades, sem sair eliminando tabelas. O maior risco não é a quantidade de tabelas isoladamente, mas manter diversas estruturas que representam informações semelhantes e precisam permanecer sincronizadas.

| Inventário | Quantidade | Contexto |
| --- | --- | --- |
| Tabelas | 24 | Esquema público |
| Edge Functions | 7 | Ativas |
| Tarefas | 201 | Registros |

## Avaliação preliminar de arquitetura

| Princípio | Nota | Avaliação |
| --- | --- | --- |
| DRY | 7/10 | Boa separação, com redundâncias potenciais |
| KISS | 5/10 | Complexidade operacional considerável |

Notas qualitativas, não métricas automatizadas. Baseadas no esquema e inventário das funções, sem revisão completa de seus códigos.

## 1. Onde existe oportunidade de simplificação

| Estrutura atual | Avaliação | Recomendação |
| --- | --- | --- |
| `torre_tasks` | Adequada | Manter como núcleo central |
| `torre_captures` + `torre_triage_history` | Bem separadas | Manter, com retenção do histórico |
| `torre_people` + tabelas de ligação | Boa normalização | Manter |
| `torre_google_status` + `torre_integration_accounts` | Possível sobreposição | Avaliar consolidação |
| `torre_calendar_events` + `torre_busy_blocks` | Possível duplicidade de horários | Definir uma fonte de verdade |
| `torre_week_proposals` + `torre_scheduled_blocks` | Estados de planejamento distintos | Preservar somente se ambos forem necessários |
| `torre_ai_settings` + preferências de IA em capturas e execuções | Configuração distribuída | Centralizar padrões |
| Sete Edge Functions | Modularização por integração | Investigar código repetido |

Há três oportunidades prioritárias.

## 2. Aplicando DRY: reduzir repetição

DRY significa Don’t Repeat Yourself: não repetir conhecimento ou regras de negócio desnecessariamente.

### Prioridade 1 — Unificar a lógica de integração com Google

Existem `torre_google_status` e `torre_integration_accounts`, além de tabelas específicas para calendários e listas. Isso é justificável quando cada uma tem uma responsabilidade clara, mas o estado de conexão pode acabar armazenado em mais de um lugar.

Proposta: ter uma única fonte de verdade para o estado das integrações e deixar nas demais tabelas somente os dados de cada serviço.

### Prioridade 2 — Separar disponibilidade de eventos

`torre_calendar_events` guarda eventos com seus horários; `torre_busy_blocks` também guarda intervalos de tempo.

Há uma razão legítima para manter ambas: uma representa eventos e a outra, somente disponibilidade. Mas é necessário verificar se os bloqueios derivados de eventos são recalculáveis e se existe risco de divergência.

Proposta: documentar a tabela de origem e a regra de atualização.

### Prioridade 3 — Reaproveitar código nas Edge Functions

Foram encontradas sete funções, incluindo três relacionadas ao Google e três ao Telegram.

Separá-las por responsabilidade pode ser uma boa arquitetura. O problema seria repetir autenticação, validação, tratamento de erros e registros de auditoria em várias funções.

Proposta: investigar componentes compartilhados sem transformar tudo em uma função gigante.

## 3. Aplicando KISS: reduzir complexidade

KISS significa Keep It Simple, Stupid: adotar a solução mais simples que atenda ao problema.

Para sua Torre, eu manteria uma arquitetura conceitual com quatro capacidades centrais:

**Interface da Torre de Controle:** Capturar · Organizar · Executar · Acompanhar

| Capacidade | Responsabilidade |
| --- | --- |
| Captura | Entrada e triagem |
| Tarefas | Prioridades e responsáveis |
| Agenda | Tempo e planejamento |
| Contexto | Pessoas e conversas |

**Serviços compartilhados:** Autenticação · Google · IA · Telegram · Auditoria

Isso não significa reduzir o banco a quatro tabelas. Significa ter quatro conceitos de negócio claramente definidos, deixando as tabelas auxiliares como detalhes técnicos.

Essa distinção é importante: normalizar dados muitas vezes aumenta o número de tabelas e, ainda assim, melhora a simplicidade do sistema.

## 4. Achados adicionais da auditoria técnica

Executei também as verificações automáticas de segurança e desempenho do Supabase.

| Achado | Quantidade | Interpretação |
| --- | --- | --- |
| Chaves estrangeiras sem índice correspondente | 11 | Pode prejudicar consultas e operações relacionadas |
| Índices sem uso registrado | 4 | Candidatos a revisão, não exclusão imediata |
| Políticas RLS permissivas sobrepostas | 7 | Oportunidade concreta de simplificar regras |
| Função privilegiada acessível a usuários autenticados | 1 | Exige revisão de autorização |
| Proteção contra senhas vazadas desabilitada | 1 | Recomendável habilitar |
| Tabelas privadas sem políticas RLS | 2 | Verificar acesso; pode ser intencional |

Duas observações merecem atenção.

A função `public.torre_set_task_people` é executável pelo papel `authenticated` e utiliza `SECURITY DEFINER`. Isso não comprova uma vulnerabilidade, mas torna importante validar como o código verifica a propriedade da tarefa. Documentação do alerta [link não incluído no texto recebido].

As sete Edge Functions também estão configuradas com `verify_jwt=false`. Isso pode ser necessário para webhooks e callbacks, mas é preciso verificar se cada endpoint implementa autenticação ou validação própria.

## 5. Plano recomendado, em ordem

| Etapa | Ação | Resultado |
| --- | --- | --- |
| 1 | Auditar autenticação das funções e função privilegiada | Reduzir risco |
| 2 | Identificar fontes de verdade para Google e agenda | Evitar divergências |
| 3 | Revisar políticas RLS sobrepostas | Simplificar segurança |
| 4 | Identificar funções e tabelas realmente utilizadas | Eliminar complexidade sem valor |
| 5 | Revisar índices conforme consultas reais | Otimizar desempenho |

O que eu não faria agora: apagar tabelas vazias, fundir tabelas somente porque têm campos semelhantes ou reconstruir o banco inteiro. Com apenas 201 tarefas, o foco deve ser consistência e manutenção, não otimização prematura.

## Conclusão

A Torre apresenta uma boa base para evoluir, mas há uma tendência a adicionar estruturas específicas para cada nova capacidade.

Eu adotaria uma regra de arquitetura:

> Uma fonte de verdade por informação, uma responsabilidade clara por módulo e nenhuma abstração sem necessidade comprovada.

O objetivo não seria necessariamente passar de 24 para 15 tabelas, mas garantir que qualquer nova funcionalidade possa aproveitar o núcleo existente sem criar outra camada de sincronização, configuração ou manutenção.

Esta análise foi feita em leitura, sem alterar o projeto.
