# Revisão das funcionalidades de negócio e das telas — Torre de Controle

Data: 10/10/2026.

## Alcance e limites

Revisão estática do código atual em `src`, confrontada com `ESCOPO.md` e `README.md`. A avaliação anterior do Supabase foi usada como contexto, sem revalidar seus números ou alertas. Nenhuma funcionalidade ou dado de negócio foi alterado.

O servidor Vite iniciou em `http://127.0.0.1:5173/`, mas o navegador integrado retornou `ERR_CONNECTION_TIMED_OUT` nas duas tentativas de acesso. Portanto, esta é uma revisão funcional e estrutural das telas pelo código, **não uma auditoria visual concluída**. Não foram validados aparência, contraste, tamanhos de toque, responsividade, navegação por teclado ou comportamento autenticado em execução. As imagens antigas do repositório não foram usadas como evidência atual.

## Diagnóstico

A Torre tem um núcleo de negócio coerente: transformar pendências em ações, reservar tempo e acompanhar dependências. Tarefas continuam sendo o ponto de convergência de capturas, Google Tasks e combinados de conversas.

A complexidade aparece nos caminhos para fazer a mesma coisa e nas diferenças entre suas regras: criar tarefa diretamente ou capturar para triagem; planejar manualmente ou por sugestão; registrar conversas com pessoas ou conversar com o agente. O próximo ganho deve vir da previsibilidade desses caminhos, antes de acrescentar módulos.

O objetivo original — reunir pendências e planejar um dia em 5 a 15 minutos — continua sendo um bom critério de decisão. IA, anexos, labels, conversas e Telegram são expansões do MVP; isso não as torna dispensáveis, mas exige atualizar o escopo e demonstrar como reduzem o esforço diário.

## 1. Inventário de negócio

| Capacidade | Implementação encontrada | Avaliação e orientação |
| --- | --- | --- |
| Capturar | Tarefa direta; captura de lista ou texto livre; ditado; anexos; triagem manual ou automática | Flexível, mas com resultados diferentes conforme a entrada e a configuração da IA. Explicar o destino antes de salvar. |
| Organizar | Áreas pessoal/profissional, labels, prioridade, duração, prazo, situação e ações em lote | Boa cobertura. Exibir primeiro os dados necessários à decisão; manter campos adicionais nos detalhes. |
| Executar | Lista de tarefas, conclusão, reabertura, Meu dia | Núcleo adequado. Meu dia precisa diferenciar compromissos obrigatórios de tarefas escolhidas para foco. |
| Planejar | Reserva por formulário ou arraste; agenda diária/semanal; propostas com seleção e prévia | Boa separação entre sugestão e aplicação. Resolver diferenças de regra e contexto entre planejamento manual e assistido. |
| Acompanhar | Espera com pessoa/equipe e data distinta do prazo; grupos de acompanhamento; combinados anteriores | Forte aderência à gestão executiva. Unificar como a pessoa é representada e consultada. |
| Integrar Google | Seleção de listas e calendários; privacidade por calendário; estado de sincronização | O código distingue dados locais e importados. A experiência precisa tornar essas restrições evidentes antes da edição. |
| Usar IA | Triagem, classificação, propostas, organização de conversas e agente de tarefas/labels | Há valor, mas também configurações e comportamentos distribuídos. Comunicar o alcance de cada ação. |
| Fechar o dia | Resumo Telegram com agenda de envio e estado de entrega | Complemento útil. Ainda depende de configuração técnica de bot e da última sincronização disponível. |

## 2. Achados prioritários

### F01 — Filtros podem esconder reservas da agenda

**Prioridade alta. Evidência:** `src/main.tsx` deriva `active` de `matchingTasks`, já filtrado por área, busca e labels, e passa `active` para `TimedAgenda` e `AllDayAgenda` da semana. `Home` também recebe `matchingTasks` para desenhar tarefas e reservas.

**Consequência:** ao filtrar uma label ou buscar uma tarefa, outras reservas podem deixar de aparecer na agenda. Os eventos Google continuam sendo fornecidos separadamente. A tela pode aparentar disponibilidade que não corresponde a todas as reservas.

**Recomendação:** separar o conjunto de tarefas candidatas do conjunto de ocupações. Usar filtros para escolher tarefas; representar todas as ocupações relevantes ou sinalizar explicitamente as ocultas. Critério de aceite: filtrar uma label não transforma uma reserva de outra label em um espaço aparentemente livre.

### F02 — Conflitos são avisados, mas não impedidos

**Prioridade alta. Evidência:** `ESCOPO.md` exige impedir conflitos. `src/scheduling.ts`, em `reservationError`, valida futuro, jornada e faixa de 7h a 22h, mas não rejeita sobreposições. `reservationWarning` informa que é possível reservar mesmo assim. Em `src/main.tsx`, `plan` salva e depois apresenta esse aviso; o formulário também mostra aviso antes do envio.

**Consequência:** a regra atual difere do compromisso original de planejar um dia que caiba na agenda. O planejamento assistido se apresenta como respeitando disponibilidade, enquanto o manual aceita conflitos.

**Recomendação:** definir uma política explícita. Sugestão: oferecer horários livres por padrão e tratar sobreposição como exceção deliberada, com aviso prévio também no arraste. Se a flexibilidade atual for intencional, atualizar o escopo e revisar o rótulo “Bloquear planejamento” dos calendários. Não foi verificada nesta revisão a validação final do backend.

### F03 — Captura rápida e nova tarefa têm destinos diferentes

**Prioridade média. Evidência:** `AppShell` abre `QuickCapture`, que salva na caixa de entrada. “Nova tarefa” e “Adicionar” abrem o formulário direto em `main.tsx`. `features.capture` pode iniciar triagem automática quando a IA está habilitada.

**Consequência:** o usuário precisa entender qual entrada cria uma tarefa imediatamente, qual preserva uma anotação e qual pode gerar várias tarefas. A mesma captura muda de comportamento com a configuração da IA.

**Recomendação:** preservar os dois usos, com linguagem consistente: “Adicionar tarefa” e “Guardar anotação”. Na captura, informar se haverá processamento automático e mostrar um caminho claro para revisar o resultado. Manter criação direta disponível sem IA.

### F04 — Meu dia representa urgências e reservas, sem seleção independente de foco

**Prioridade média. Evidência:** `src/taskView.ts`, em `dayGroups`, agrupa reservas, prazos do dia, atrasadas e acompanhamentos. Em `Home.tsx`, “Escolher tarefas” leva à reserva de horário.

**Consequência:** escolher uma tarefa para o dia implica planejar tempo. Tarefas importantes sem prazo ou reserva não entram automaticamente no foco. Atrasos podem dominar a percepção do dia.

**Recomendação:** distinguir “precisa de atenção hoje” de “quero fazer hoje”. Validar com o usuário se uma escolha de foco sem horário é necessária antes de criar estado ou tabela. Mostrar duração total selecionada e capacidade disponível ajudaria a avaliar se o plano cabe.

### F05 — Contexto temporal pode ficar desatualizado com a aplicação aberta

**Prioridade média. Evidência:** `today` é calculado uma vez no módulo `main.tsx`. `useCloudData.load` libera reservas vencidas, mas o hook não contém atualização periódica ou ao recuperar foco. O relógio de `Home` atualiza a hora, sem atualizar por si só o conjunto de reservas carregado.

**Consequência:** atravessar a meia-noite ou deixar uma reserva terminar pode manter referências de dia e reservas antigas até um novo carregamento. Outras ações podem provocar esse carregamento, portanto não se trata de falha reproduzida em execução.

**Recomendação:** recalcular o dia e atualizar dados ao retomar a janela ou atingir limites relevantes. Critério de aceite: uma tarefa não concluída retorna às pendências após a reserva terminar, sem exigir uma edição não relacionada.

### F06 — Edição em lote pode terminar parcialmente

**Prioridade média. Evidência:** `useCloudData.setTasks` executa gravações sequenciais para tarefa, pessoas, labels e reserva, sem uma transação única no cliente. O erro recarrega dados e retorna falha.

**Consequência:** operações anteriores podem já estar salvas quando uma posterior falha. Uma mensagem geral de falha não informa necessariamente quais tarefas foram alteradas.

**Recomendação:** para ações em lote, retornar resultados por tarefa ou garantir atomicidade no backend quando o negócio exigir tudo ou nada. Testar falha no meio de uma operação com várias tarefas e apresentar o resultado real.

### F07 — Entrada não oferece recuperação de senha

**Prioridade média. Evidência:** `src/Cloud.tsx` oferece entrar, criar conta e reenviar confirmação, sem ação de recuperação de senha. O fluxo de entrada não usa `try/finally` para garantir a saída do estado pendente diante de uma exceção.

**Consequência:** há um caminho de recuperação para confirmação, mas não para esquecimento de senha; uma falha inesperada também pode deixar o formulário pendente.

**Recomendação:** completar a recuperação de acesso e padronizar tratamento de falhas e mensagens compreensíveis. Não foram realizados testes de autenticação.

## 3. Revisão das telas e etapas

Saúde abaixo significa avaliação estrutural pelo código; todas as etapas têm validação visual e funcional em execução pendente.

| Etapa | Tela ou fluxo | Saúde estrutural | Recomendação |
| --- | --- | --- | --- |
| 1 | Entrada e acesso | Incompleta | Acrescentar recuperação de senha e robustez de erro. |
| 2 | Captura rápida | Boa cobertura, previsibilidade a melhorar | Explicar destino e processamento automático. O fechamento descarta texto ao reabrir, pois o estado é reiniciado; avaliar rascunho ou confirmação quando houver conteúdo. |
| 3 | Caixa de entrada | Coerente com triagem | Preserva original, tarefas geradas e desfazer. Tornar estados pendente, processando, falha e processada fáceis de distinguir. |
| 4 | Tarefas | Núcleo forte | Há filtros, ordenação, ações em lote e estados vazios. Consolidar filtros ativos globais e locais numa leitura clara. |
| 5 | Detalhes de tarefa | Boa proteção de edição | Há aviso de descarte, retorno de foco e validação de espera. Explicar campos importados somente leitura e consequências de trocar área, duração ou situação. |
| 6 | Meu dia | Útil, foco a esclarecer | Separar atenção obrigatória, escolhas do dia e disponibilidade; manter ocupações visíveis apesar dos filtros. |
| 7 | Agenda semanal e proposta | Rica, regras a alinhar | Reserva manual, sugestão, revisão e aplicação precisam compartilhar contexto e política de conflito. O horário inicial fixo de 19h pode ser inválido para tarefas profissionais. |
| 8 | Conversas com pessoas | Boa ligação com execução | Histórico, rascunho recuperável, conflitos de versão e combinados vinculados são pontos fortes. Priorizar combinados pendentes e tornar clara a relação com tarefas. |
| 9 | Modo IA | Boa explicitação de alcance | “Analisar” é padrão; há histórico, proposta e desfazer. Explicar limites do desfazer antes de ações relevantes. Renomear “Conversas” do histórico do agente para evitar confusão com conversas com pessoas. |
| 10 | Configurações e Telegram | Completa, carga técnica alta | Separar ajustes cotidianos de configuração avançada. O texto de IA reúne muitas regras; distribuir explicações junto das ações. Telegram informa vínculo, horário e entrega, mas configurar BotFather exige conhecimento técnico. |

## 4. Pontos fortes a preservar

- Tarefas convergem para um núcleo comum, mantendo a origem e restrições do Google.
- Espera exige acompanhamento distinto do prazo e retira a reserva ao salvar.
- Conclusão Google tem estado pendente e erro de sincronização na linha da tarefa.
- Planejamento assistido oferece prévia editável, aplicação explícita e lista de tarefas que não couberam.
- Conversas preservam texto original e ligam combinados a tarefas; há recuperação local e tratamento de conflito de versão.
- Calendários permitem somente disponibilidade, com explicação das limitações de permissão.
- Detalhes usam rótulos, aviso de descarte, Escape, retorno de foco e contenção de Tab. São mecanismos encontrados no código, não comprovação de acessibilidade completa.

## 5. Simplicidade e consistência

Manter três superfícies principais para uso diário: **Meu dia, Tarefas e Agenda**. Captura deve estar sempre acessível; caixa de entrada serve ao processamento. Conversas e IA podem permanecer como capacidades complementares, conforme seu uso real.

Não recomendo fundir Meu dia com Agenda: uma ajuda a decidir o que fazer, a outra representa ocupação de tempo. Recomendo compartilhar regras e componentes de reserva entre elas.

Labels são gerenciadas tanto pelo menu quanto por Configurações; tarefas surgem por formulário, captura, conversas e IA. Esses caminhos são legítimos quando compartilham validação, linguagem e resultado. DRY aqui significa uma regra de negócio por conceito, sem exigir uma única tela para todas as entradas.

Atualizar `README.md`: ele ainda afirma que Google não está conectado e descreve seis tabelas, enquanto o código já inclui integração Google, IA, conversas e Telegram. A documentação antiga não deve ser usada como inventário atual.

## 6. Plano de melhoria e validação

| Ordem | Ação | Resultado verificável |
| --- | --- | --- |
| 1 | Separar filtros de seleção e ocupação da agenda | Reservas não desaparecem como se fossem horários livres. |
| 2 | Decidir política de sobreposição e atualizar escopo | Formulário, arraste e proposta comunicam a mesma regra. |
| 3 | Validar relógio, expiração e atualização ao retomar | Aplicação aberta mantém dia e pendências corretos. |
| 4 | Explicar captura direta, anotação e triagem | Usuário prevê o resultado antes de salvar. |
| 5 | Melhorar falhas parciais, rascunhos e recuperação de acesso | Falha não deixa o usuário sem caminho ou sem saber o que foi salvo. |
| 6 | Validar Meu dia com uma rotina real | Planejamento em 5 a 15 minutos, com duração compatível com a disponibilidade. |
| 7 | Executar auditoria visual autenticada | Evidências atuais de desktop e celular, estados vazios/erro, foco, teclado e legibilidade. |

Para a etapa visual, capturar entrada, captura, triagem, lista, detalhes, Meu dia, reserva com conflito, proposta, conversa, agente e configurações. Usar dados de teste para exercitar alterações; evitar modificar dados reais durante a revisão.

## Conclusão

A cobertura funcional é ampla e aderente à produtividade executiva. A prioridade é tornar o produto previsível: ocupação sempre confiável, regras de reserva claras, destino de captura evidente e recuperação segura quando algo falha. Não há evidência nesta revisão que justifique remover módulos ou reconstruir as telas.
