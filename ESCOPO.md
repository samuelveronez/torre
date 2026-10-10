# Torre de Controle — Escopo vigente

Atualizado em 10/10/2026 após entrevista com Samuel. Este documento define o comportamento aprovado; aprovação de uma regra não significa que ela já foi implementada.

O [escopo original de 04/10/2026](revisao-de-arquitetura/escopo-original-2026-10-04.md) foi preservado. Consultar também a [revisão funcional](revisao-de-arquitetura/revisao-funcionalidades-e-telas.md) e a [revisão visual](revisao-de-arquitetura/revisao-visual-responsividade-interacao.md).

## Valor esperado e princípios

Reunir pendências e planejar um dia que caiba na agenda em 5 a 15 minutos. Reduzir o tempo gasto procurando tarefas no Google Tasks, caderno e e-mails. Considerar os intervalos disponíveis, mantendo flexibilidade para decisões manuais.

- A Torre centraliza a gestão das tarefas. Google Tasks é somente fonte de importação.
- DRY: uma fonte de verdade por informação, regras consistentes entre telas e responsabilidades claras por módulo.
- KISS: caminho cotidiano simples, com opções adicionais próximas de seu contexto.
- Capturar, organizar, executar e acompanhar são as capacidades centrais; tarefas convergem para um núcleo comum, preservando a origem.

## Experiência e telas

- Webapp pessoal responsivo: planejar no computador, consultar e capturar no celular, com layout adequado também ao tablet.
- Menu lateral, busca e seletor de área; menu recolhível no celular. Adaptar menu e controles para preservar legibilidade no tablet.
- Tarefas é uma visão independente: consultar, editar e concluir sem exigir reserva de horário.
- Meu dia reúne foco, reservas, prazos do dia, atrasadas e acompanhamentos. Tarefas e agenda diária representam o mesmo dia selecionado.
- Agenda semanal com foco opcional em um dia e sugestões de horários com prévia.
- Filtros por área, situação, prioridade e labels; busca e ordenação por prazo, acompanhamento, duração, nome, prioridade ou inclusão.
- Filtros de área, label e busca podem ocultar reservas de tarefas fora do filtro, mas a agenda deve avisar claramente que existem reservas ocultas e que a visão não representa toda a ocupação. Oferecer caminho para revelar ou limpar filtros.
- Lista compacta e painel de detalhes; no celular, detalhes ocupam a área de conteúdo. Ações essenciais disponíveis por teclado e sem arraste.
- Temas Claro/Escuro e densidades Compacta/Confortável integram as preferências.

## Captura, triagem e organização

Os dois caminhos permanecem, com destinos claros:

1. Adicionar tarefa: cria diretamente uma tarefa em A fazer, sem processamento obrigatório ou dependência de IA.
2. Captura rápida: guarda texto livre, lista, ditado ou anexos na caixa de entrada. Permite triagem manual e processamento automático de texto quando a IA estiver habilitada para isso.

- Informar destino e processamento previsto antes de salvar; preservar texto original e ligação com tarefas geradas.
- IA, anexos, labels, conversas com pessoas e Telegram fazem parte oficial do escopo.
- Labels classificam e filtram tarefas, sem projetos obrigatórios nem destinos de exportação para Google Tasks.
- Detalhes editáveis: título, descrição, área, duração, prioridade, prazo, link HTTP/HTTPS, situação, labels e pessoas envolvidas.
- Tarefas importadas também são editáveis na Torre; alterações ficam na Torre.
- Prazo e acompanhamento são distintos. Uma captura pode gerar várias tarefas, mantendo origem e revisão.

## Situações e acompanhamento

- Situações: A fazer, Aguardando resposta e Concluída. Permitir reabertura local, inclusive das importadas.
- Aguardando resposta exige pessoa/equipe e data de acompanhamento. Mostrar prazo e acompanhamento quando presentes, destacando acompanhamento vencido.
- Ao passar para Aguardando resposta, avisar e deixar escolher se mantém ou retira o horário existente.
- Se mantido em Aguardando resposta, o horário representa uma lembrança visual, sem ocupar disponibilidade. Diferenciar de reserva de execução.
- Alterar área ou duração de tarefa reservada também exige aviso e escolha entre manter ou retirar. Ao manter após alterar duração, o intervalo deve corresponder à duração atual e informar eventuais sobreposições.
- Como consequência da distinção entre lembrete e reserva, voltar a A fazer não deve converter silenciosamente a lembrança em ocupação; explicitar a conversão para reserva de execução.

## Meu dia e foco sem horário

- Permitir escolher tarefas como foco de um dia sem reservar horário.
- Foco, prazo e reserva são distintos: escolher foco não modifica prazo nem ocupa a agenda.
- Ao iniciar o dia seguinte, pedir a decisão do usuário sobre tarefas de foco não concluídas. Não transferir automaticamente nem retirar silenciosamente do foco anterior.
- A tarefa permanece na lista geral enquanto a decisão sobre foco estiver pendente.
- A revisão de foco é distinta da liberação de reservas: tarefa reservada não concluída retorna às pendências após o intervalo terminar, sem reagendamento automático.

## Agenda e planejamento

- Arrastar tarefa para horário, com formulário/botão como alternativa para celular e teclado.
- Reservar a duração estimada. Permitir sobreposição com compromissos ou outras tarefas apenas com aviso, sem exigir confirmação adicional.
- Disponibilizar avisos nos caminhos de formulário e arraste. Ocupações conhecidas continuam relevantes mesmo quando ocultas por filtros.
- Jornada semanal com horários diferentes por dia. Profissionais dentro e pessoais fora da jornada são orientação: avisar desvios, mas permitir reserva.
- Permitir configurar a faixa horária nas preferências, substituindo o limite fixo de 7h a 22h.
- Sugestões procuram encaixes conforme duração, jornada e disponibilidade; a escolha manual continua flexível e informa desvios.
- Propostas não criam reservas antes da revisão e aplicação. Mostrar também tarefas que não couberam.
- O Modo IA pode propor reservas com prévia obrigatória antes de aplicar, além das sugestões da agenda semanal.

## Google Tasks — somente importação

Decisão final de 10/10/2026: “Vamos centralizar na Torre sem devolver ao Google. Somente importação.” Essa decisão substitui as respostas anteriores que consideravam sincronização de edições, exportação automática, destinos por label e preferência da Torre em conflitos bidirecionais.

- Importar tarefas das listas selecionadas, preservando identificadores de lista e tarefa para impedir duplicidade.
- Gerenciar importadas na Torre: título, descrição, prazo, conclusão e reabertura locais não são enviados ao Google.
- Tarefas criadas por formulário, captura, conversas ou IA ficam na Torre, sem exportação.
- Não implementar mapeamento de labels para listas, seleção de destino de exportação ou conflitos de escrita entre os sistemas.
- Reimportações devem respeitar a centralização: não duplicar tarefas nem apagar alterações/conclusões locais. Definir e documentar a política técnica de atualização dos dados de origem na implementação, preservando o controle local.
- Mostrar origem, estado da importação, falhas e nova tentativa. Não apresentar conclusão local como pendente de envio ao Google.
- A mudança de escopo ainda exige implementação e transição do comportamento atual. A atualização deste documento não altera integrações, filas ou dados existentes.

## Calendários

- Manter leitura de calendários/disponibilidade conforme seleção e permissões reais da conta Google.
- Representar calendário profissional como Ocupado quando não houver autorização para detalhes. Detalhes apenas quando autorizados e conforme preferência de privacidade do calendário.
- Mostrar atualização da agenda e distinguir ausência de eventos de dados desatualizados.
- Registro manual de blocos ocupados permanece alternativa quando não houver acesso autorizado.
- Não extrair e-mails nem acessar o celular corporativo. A decisão de somente importar Google Tasks não altera a leitura de calendários.

## IA, conversas, anexos e Telegram

- IA: triagem, classificação por labels, análise/comandos de tarefas e labels, organização de conversas e propostas de horários.
- Diferenciar análise sem alterações, proposta, aplicação e desfazer. Reservas propostas pelo agente sempre exigem prévia.
- Conversas: registro privado por pessoa, texto original, check-in, decisões, combinados, histórico e tarefas vinculadas. Evitar duplicação ao revisitar registros.
- Anexos: entrada pela captura, vínculo com origem e tratamento de falhas de upload. Sua inclusão no escopo não implica envio automático do conteúdo à IA.
- Telegram: bot, vínculo do chat, resumo diário, dias/horário, teste e estado de entrega. Resumos usam os dados registrados e a última agenda disponível.
- Modelo e processamento configuráveis; comunicar efeito e custo antes de executar. Criação direta e gestão básica permanecem disponíveis sem IA.

## Arquitetura e dados

- TypeScript, React, Vite e CSS com tokens próprios inspirados no GSA.
- Aplicação publicada acessível em https://torre.veronez.app/; fluxo de hospedagem documentado separadamente.
- Autenticação e persistência em PostgreSQL/Supabase, com isolamento por usuário. localStorage serve a preferências/recuperação quando aplicável, não ao banco central de tarefas.
- Integrações, segredos e renovação de tokens no backend; não colocar segredos no frontend ou GitHub.
- Instantes com fuso, apresentação em America/Sao_Paulo e duração em minutos.
- Consultar esquema nas migrations. O modelo de seis tabelas do documento inicial é histórico.
- Foco por dia, lembrança sem bloqueio e faixa configurável são requisitos; escolha de tabelas/abstrações pertence à implementação, seguindo DRY e KISS.

## Estado conhecido e mudanças pendentes

Estado baseado nas revisões de 10/10/2026. Existente significa capacidade encontrada, sem validar todos os cenários.

| Capacidade ou regra aprovada | Estado conhecido |
| --- | --- |
| Tarefas, áreas, prioridade, labels, pessoas, espera e acompanhamento | Existentes; manter |
| Criação direta e captura com caixa de entrada/triagem | Existentes; esclarecer destinos |
| IA, anexos, conversas e Telegram | Existentes; incorporados ao escopo |
| Reserva manual com aviso de sobreposição | Existente; manter |
| Sugestões na agenda com prévia | Existentes; manter |
| Ocultar reservas fora do filtro com aviso | Ocultação observada; aviso específico pendente |
| Foco sem horário e decisão de pendências no dia seguinte | Pendente |
| Jornada como aviso, permitindo exceções | Pendente; código revisado rejeita desvios |
| Escolher manter/retirar reserva ao alterar área, duração ou situação | Pendente; retirada automática encontrada |
| Horário em espera como lembrança sem bloquear disponibilidade | Pendente |
| Faixa horária configurável | Pendente; limite fixo encontrado |
| Agente propondo reservas com prévia | Pendente; agente revisado atua em tarefas/labels |
| Google Tasks só importação, sem devolver conclusão/edições | Mudança pendente; devolução de conclusão existe |
| Edição/reabertura locais de tarefas importadas | Mudança pendente; restrições encontradas |
| Layout do tablet e data comum em Meu dia | Melhorias pendentes da revisão visual |

## Critérios de aceite

1. Criar tarefa diretamente e vê-la sem passagem obrigatória por caixa de entrada ou IA.
2. Guardar anotação/anexos, conhecer destino e revisar tarefas geradas com origem preservada.
3. Consultar tarefas, dia e semana em desktop, tablet e celular, com teclado e alternativa ao arraste.
4. Reservar com avisos de sobreposição e desvio de jornada, sem bloqueio por esses motivos.
5. Escolher manter/retirar horário ao alterar área, duração ou situação; lembrança em espera não ocupa disponibilidade.
6. Escolher foco sem horário e decidir tarefas não concluídas ao iniciar o dia seguinte.
7. Liberar reserva vencida não concluída para pendências, sem reagendamento automático.
8. Importar Google Tasks sem duplicação e editar/concluir/reabrir localmente, sem escrita de retorno ao Google.
9. Avisar reservas ocultas por filtros; sugestões consideram também ocupações conhecidas fora do filtro.
10. Configurar faixa horária, com regra consistente nas visões e caminhos de planejamento.
11. Receber proposta de reservas no agente e revisar antes de aplicar.
12. Acessar dados autenticados em dispositivos diferentes e respeitar privacidade autorizada de calendários.
13. Abrir tarefa de combinado e retornar à conversa mantendo contexto.
14. Mostrar falhas de importação, salvamento, upload e entrega com estado verdadeiro e recuperação.

## Fora do escopo

Centro de treinamento, gamificação, pontuação, finanças, leitura automática de e-mails, colaboração entre usuários e gerenciamento de projetos.

Processamento obrigatório de toda tarefa pela caixa de entrada, prévias automáticas de links, biblioteca e classificação Algum dia/talvez continuam fora do escopo.

Exportação de tarefas, devolução de conclusão/edições e sincronização bidirecional com Google Tasks ficam fora do escopo por decisão final da entrevista.

## Validações ainda necessárias

- Implementar e testar pendências com dados de teste; decisão de escopo não equivale a mudança entregue.
- Definir preservação local em reimportações e transição das conclusões antes tratadas como pendentes de envio.
- Validar foco entre dias, lembranças sem bloqueio, mudança de duração e avisos nos caminhos de reserva.
- Completar testes de erro, tema escuro, densidades, zoom, teclado virtual e acessibilidade.
- O documento original preserva registros de entrega e validações de 04/10/2026; eles não comprovam o comportamento deste novo escopo.


## Refinamentos da lista de tarefas — 10/10/2026

- Prioridade aparece como indicador discreto nos metadados (Alta, Média ou Baixa); Sem prioridade não ocupa espaço na linha. A ação Alterar prioridade no menu abre o editor; sem seletor permanente na lista.
- Em dispositivos com mouse e hover, o controle de concluir/reabrir aparece ao passar o mouse na linha ou ao navegar nela pelo teclado. Mantém sua posição para evitar deslocamentos. Em dispositivos de toque permanece visível.
- Seleção para ações em lote usa checkbox quadrado e destaque da linha; conclusão usa símbolo circular. No celular, áreas de toque de 44 px envolvem símbolos menores e não encobrem o título.
- Botão de recolher navegação apenas com ícone, descrição acessível e dica. Editor lateral com fontes levemente maiores.

- Densidade visual preferida: Confortável (menos apertada), padrão para novas preferências. Compacta continua disponível em Configurações.
