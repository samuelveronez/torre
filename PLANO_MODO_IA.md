# Modo IA — plano de implementação

Status: primeira versão implementada para avaliação e CRUD de tarefas e labels. Por orientação do usuário, organização de agenda fica fora desta etapa. Uso e validação em MODO_IA.md.

## Objetivo

Adicionar um agente conversacional em português à Torre de Controle. O usuário pede análises ou ações em linguagem natural, e o agente consulta dados reais, explica suas conclusões e realiza operações autorizadas sobre tarefas, labels e recursos de organização.

## Experiência

- Entrada “Modo IA” no AppShell, com conversa persistida e atalhos “Avaliar meu dia”, “Revisar atrasadas”, “Organizar tarefas” e “Gerenciar labels”.
- Respostas em linguagem natural com referências clicáveis às tarefas e labels citadas.
- Separar recomendações de ações efetivamente realizadas. Mostrar resultado, quantidade afetada e falhas, com opção de desfazer quando disponível.
- Manter contexto para comandos como “essas três”, usando IDs registrados na conversa.
- Resolver datas relativas no fuso America/Sao_Paulo. Pedir esclarecimento quando houver nomes duplicados, alvo indefinido ou informação essencial ausente.

## Escopo

1. Avaliação: tarefas atrasadas, prioridades, carga estimada, dependências externas, itens sem prazo e capacidade disponível na agenda. Explicar critérios; não inventar prazo, duração ou importância.
2. Tarefas: criar, consultar, editar, concluir, reabrir, arquivar e restaurar; gerenciar título, descrição, área, prioridade, duração, prazo, link, situação de espera, responsável e acompanhamento.
3. Labels: criar, consultar, editar nome/descrição/cor, arquivar, restaurar, associar e remover associação. Exclusão definitiva e mesclagem exigem definição explícita das consequências sobre vínculos.
4. Capturas: consultar, criar e converter usando os fluxos existentes.
5. Agenda: adiada; nenhuma ferramenta de organização de agenda no agente atual.
6. Preferências e capturas: extensões futuras; primeira versão concentrada em tarefas e labels.

Google Tasks e Calendar seguem as capacidades reais da integração. Não prometer CRUD de eventos externos nem sincronização de campos que o backend não suporta. Credenciais, contas e configurações de segurança ficam fora das ferramentas do agente.

## Política de execução

- Consultas e análises não alteram dados.
- Comandos explícitos de criação, edição, conclusão e associação executam diretamente quando os alvos são inequívocos.
- Sugestões feitas pela IA não autorizam alterações: oferecer “Aplicar”.
- Exclusões definitivas e ações destrutivas em lote apresentam prévia com os alvos exatos e confirmação vinculada àquela proposta.
- “Excluir tarefa” usa arquivamento recuperável, seguindo o comportamento atual. “Excluir definitivamente” é uma operação separada.
- Alterações em lote devem ser atômicas quando locais ao banco. Integrações externas usam fila e exibem estado pendente/erro.

## Arquitetura

React → endpoint autenticado de agente → OpenRouter → ferramentas validadas no servidor → Supabase → resposta com evidências e resultados.

- Criar componente de conversa e hook próprios; atualizar tarefas e labels após execução.
- Separar o agente da triagem atual. O classificador de capturas não substitui um modelo conversacional.
- Reutilizar armazenamento seguro da chave OpenRouter e os serviços de planejamento e integração existentes.
- Declarar ferramentas com schemas estritos. O modelo solicita operações; o servidor valida campos, ownership, alvos e permissões. Sem SQL livre ou acesso arbitrário a tabelas.
- Executar operações com contexto do usuário e RLS; chamadas privilegiadas existentes precisam verificar ownership explicitamente.
- Buscar contexto por período, status e filtro, com paginação. Sinalizar respostas baseadas em resultados parciais.
- Registrar conversas, mensagens, execuções e alterações com isolamento por usuário. Guardar IDs, estado anterior/posterior, modelo, uso e erros; não registrar chaves.
- Identificar cada pedido e cada operação para evitar duplicação em retries. Revalidar versão dos registros antes de aplicar propostas ou desfazer.
- Tratar conteúdo de tarefas, descrições e capturas como dados, nunca como instruções para executar ações.

## OpenRouter gratuito

- Começar com `openrouter/free` na API de chat, declarando ferramentas para selecionar modelos compatíveis. Registrar o modelo efetivamente servido.
- Permitir configurar um modelo específico `:free` após avaliar qualidade de tool calling em português.
- Bloquear modelos e fallbacks pagos no servidor. Nenhuma migração automática para cobrança.
- Limitar contexto, tokens de saída e passos por pedido; configuração inicial: até cinco rodadas de ferramentas, com operações agrupadas.
- Tratar limite 429, timeout e indisponibilidade com mensagens claras. Retry limitado para inferência; escrita somente com idempotência.
- Não executar análise automática em segundo plano no MVP: chamadas sob demanda para preservar cota.

Fontes: https://openrouter.ai/docs/guides/routing/routers/free-router e https://openrouter.ai/docs/api_reference/limits. Disponibilidade e cotas devem ser verificadas na implantação.

## Entregas

1. Conversa e análise somente leitura: autenticação, consulta de contexto, histórico e referências aos registros.
2. CRUD de tarefas e labels: ferramentas, validação, auditoria, idempotência e desfazer.
3. Ações em lote e prévias. Capturas, agenda e jornada ficam para extensões futuras.
4. Validação: isolamento entre usuários, pedidos ambíguos, prompt injection em tarefas, concorrência, retry após timeout, falhas parciais e indisponibilidade de modelos gratuitos.

## Critérios de aceite

- “O que devo fazer hoje?” produz recomendações apoiadas nos registros e na capacidade disponível.
- “Crie a label Financeiro e aplique às contas atrasadas” identifica o conjunto, cria ou reutiliza a label e informa o resultado.
- “Conclua a tarefa X” altera apenas o alvo resolvido e permite reabrir.
- “Passe essas três para amanhã” mantém os IDs da conversa e resolve a data no fuso do usuário.
- Exclusões em lote exibem prévia; falhas nunca são relatadas como sucesso.
- Reenviar uma operação não duplica registros; alterações concorrentes exigem nova avaliação.
- Chave privada não aparece no frontend; usuário A não consulta nem altera dados do usuário B.
- Nenhuma chamada usa modelo pago.
