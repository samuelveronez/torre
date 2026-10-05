# Prioridades

Alta, Média, Baixa e Sem prioridade são salvas na conta da Torre. Tarefas existentes começam sem prioridade. A prioridade das tarefas importadas é própria da Torre e não altera o Google Tasks.

Nas listas, Meu dia e pendências da agenda semanal, selecione a prioridade diretamente na linha. O controle informa falhas e mantém o valor anterior quando o salvamento não termina. Alterações podem ser desfeitas pela mensagem da aplicação. O editor, a criação de tarefas e as ações em lote também permitem definir prioridade. Na caixa de entrada, tarefas já criadas permitem edição inline.

A lista de tarefas tem filtro e ordenação por prioridade. Meu dia permite escolher entre ordem atual e prioridade dentro de cada grupo, preservando a separação por reserva, prazo, atraso e acompanhamento. Alterar uma prioridade não muda automaticamente a ordenação atual nem o horário reservado.

Verificação: TypeScript e build completos; testes transacionais de padrão, quatro valores, restrição de valores inválidos e RLS em `supabase/tests/task_priority.sql`; interface em dados isolados para edição, falha com manutenção do valor anterior, filtro e ordenação. A sincronização Google atualiza somente seus campos e preserva a prioridade local.
