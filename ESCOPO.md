# Torre de Controle — Escopo do MVP

Data: 04/10/2026. Definição baseada na entrevista com Samuel.

## Valor esperado
Reunir pendências e planejar um dia que caiba na agenda em 5 a 15 minutos. Reduzir o tempo gasto procurando tarefas no Google Tasks, caderno e e-mails. A agenda profissional é pesada; o planejamento precisa considerar os intervalos reais disponíveis.

## Experiência
- Webapp pessoal responsivo: planejar no computador, consultar e capturar no celular.
- Layout web com menu lateral, seletor de área e busca de tarefas fixa no topo em todas as telas. Buscar abre a lista; agenda e configurações continuam acessíveis pelo menu. No celular, menu recolhível.
- Visão Tarefas independente como entrada principal: capturar, consultar e concluir sem precisar reservar horário.
- Agenda semanal na visão Planejamento, com foco opcional em um dia.
- Lista inclui tarefas com e sem reserva; filtros por área e status, busca por nome e ordenação por prazo, duração ou nome. Concluídas podem ser reabertas; reservar horário é opcional.
- Agenda e pendências juntas; abas Tudo, Pessoal e Profissional.
- Lista simples, sem projetos ou agrupamentos por contexto.
- Lista compacta com abertura de painel lateral de detalhes; no celular, detalhes ocupam a área de conteúdo.
- Detalhes editáveis: título, descrição, área, duração, prazo e link HTTP/HTTPS. Link simples, sem prévia ou anexos.
- Situações: A fazer, Aguardando resposta e Concluída. Captura entra diretamente em A fazer, sem processamento obrigatório.
- Aguardando resposta exige pessoa/equipe e data de acompanhamento. Data de acompanhamento é distinta do prazo. Mostrar ambos na lista, destacar acompanhamento vencido e permitir filtrar/ordenar por acompanhamento.
- Ao passar para Aguardando resposta, retirar reserva existente da agenda e manter a tarefa na lista. Retornar a A fazer permite planejar novamente.
- Alterar área ou duração de tarefa reservada retira a reserva para permitir novo planejamento sem colisões.
- Configurações oferecem temas Claro e Escuro; preferência persistida neste navegador.
- Captura rápida: descrição, área e duração estimada. Prazo opcional.
- Destacar prazos próximos e filtrar tarefas pela duração da janela disponível.
- Arrastar tarefa para um horário; oferecer alternativa por botão para celular e teclado.
- Reservar a duração estimada e impedir conflito com compromissos ou tarefas planejadas.
- Trabalho: horários diferentes por dia da semana. Tarefas profissionais dentro desses horários e pessoais fora deles.
- Tarefa planejada não concluída retorna às pendências quando o período reservado termina; não reagendar automaticamente.

## Integrações do MVP funcional
Google Tasks: importar tarefas e devolver a conclusão. Não implementar edição bidirecional completa. Tarefas criadas na Torre ficam apenas na Torre. Usar identificadores de lista e tarefa para impedir duplicidade; indicar falhas de sincronização e permitir nova tentativa.

Calendário profissional: aparece no Gmail sem conteúdo. Verificar permissões reais via Google antes de prometer integração. Consumir disponibilidade quando autorizada e exibir apenas “Ocupado”. Alternativa: registro manual dos blocos ocupados. Não extrair e-mails nem acessar o celular corporativo.

## Arquitetura escolhida
- Linguagem: TypeScript.
- Frontend: React + Vite, CSS com tokens próprios inspirados no GSA.
- Hospedagem da validação: GitHub Pages, repositório torre.
- Banco previsto: PostgreSQL no Supabase, com autenticação e políticas RLS por usuário.
- Backend previsto: funções no Supabase para integração, segredos e renovação de tokens Google. Não colocar segredos no frontend ou no GitHub.
- Persistência da validação: localStorage, dados fictícios; não sincroniza dispositivos e não substitui o banco.
- Datas e horários: armazenar instantes com fuso e apresentar em America/Sao_Paulo; duração em minutos.

## Modelo de dados previsto
tasks: id, user_id, title, description, reference_url, area, duration_minutes, due_date, status (todo/waiting/completed), waiting_for, follow_up_date, source, google_list_id, google_task_id. Compatibilidade local: tarefas existentes sem situation são A fazer; done continua indicando conclusão.
scheduled_blocks: id, user_id, task_id, start_at, end_at.
busy_blocks: id, user_id, start_at, end_at, source, external_id; sem conteúdo corporativo.
work_hours: user_id, weekday, start_time, end_time, enabled.
integration_accounts: user_id, provider, estado da conexão; credenciais protegidas no backend.

## Entrega inicial para validação visual
Agenda semanal, foco no dia, filtros de área e duração, cadastro de tarefas, planejamento e conclusão locais, ajustes de jornada e navegação entre semanas. Identificar Google e agenda como demonstração: nenhuma conexão real nesta entrega. Disponibilizar dados fictícios e não publicar dados pessoais existentes no projeto.

## Critérios de aceite do MVP funcional
1. Capturar tarefa com os três dados essenciais e vê-la imediatamente na área escolhida.
2. Consultar semana e dia no computador e celular; operações disponíveis por teclado.
3. Encontrar tarefas que cabem em uma janela e reservar sem conflito.
4. Retornar tarefa vencida não concluída à lista de pendências.
5. Concluir tarefa importada e confirmar sincronização com Google Tasks, distinguindo falha de sucesso.
6. Acessar os mesmos dados autenticados no computador e celular.
7. Representar disponibilidade corporativa sem revelar conteúdo das reuniões.

## Fora do escopo
IA, centro de treinamento, gamificação, pontuação, finanças, leitura automática de e-mails, colaboração e gerenciamento de projetos.
Também ficam para depois: processamento obrigatório de caixa de entrada, anexos, prévias automáticas, biblioteca e classificação Algum dia/talvez.

## Referências técnicas
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Pontos ainda a validar
Permissões da agenda compartilhada; credenciais OAuth Google; criação do Supabase; escolha dos horários reais de trabalho; comportamento e legibilidade das telas após avaliação do usuário.
