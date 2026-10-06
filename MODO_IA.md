# Modo IA

O agente avalia tarefas em português e faz CRUD de tarefas e labels. Não possui ferramentas de organização de agenda.

## Uso

Abra **Modo IA** no menu. A chave cadastrada em **Configurações → IA** é reutilizada; o chat não depende de ativar a triagem automática de capturas.

- **Analisar** consulta dados e responde sem gravar alterações.
- **Executar pedido** aplica comandos explícitos. Arquivamentos de múltiplos registros exibem uma prévia para aplicar.
- **Desfazer pedido** restaura os campos alterados quando os registros ainda correspondem ao resultado da operação. Criações são arquivadas; seus vínculos novos são removidos. Não recria reservas nem reabre conclusões do Google Tasks.

Exemplos: “Avalie minhas tarefas e explique o que merece atenção”; “Crie uma label Financeiro e aplique à tarefa Pagar aluguel”; “Passe o prazo da tarefa Comprar material para amanhã”; “Conclua a tarefa X”; “Arquive estas duas tarefas”.

Excluir significa arquivar, com possibilidade de restaurar. Exclusão definitiva não é oferecida. Tarefas importadas do Google conservam as regras atuais: título, notas, prazo e reabertura são feitos no Google Tasks; conclusão é enviada pela fila existente.

## Implementação e limites

O frontend usa `agent-chat`, `agent-apply` e `agent-undo` da função `torre-integrations`. Toda ação verifica o JWT com Supabase Auth. Chaves ficam no Vault/backend.

`torre_agent_runs` armazena mensagens, respostas, propostas e auditoria com RLS por usuário; o cliente tem somente leitura. RPCs de escrita são exclusivos do backend e validam ownership e snapshots. Cada pedido tem UUID estável para repetição segura. Lotes locais são transacionais; um erro reverte o lote inteiro. Propostas expiram em 30 minutos.

O contexto contém totais da conta inteira e um recorte paginado de tarefas e labels. Descrições longas são limitadas a 2 mil caracteres e marcadas como truncadas. O agente pode buscar outras páginas, inclusive concluídas e arquivadas. Histórico mostrado: últimos 30 pedidos; contexto do modelo: últimos seis. Limites iniciais: quatro chamadas ao modelo, 50 alterações por lote e saída de até 3 mil tokens por chamada.

O modelo é `openrouter/free`; não há fallback pago. Ferramentas têm schemas explícitos, e a resposta servida precisa identificar um modelo gratuito. A chamada não exige suporte a parâmetros opcionais (`require_parameters=false`) e não envia temperatura nem chamadas paralelas. A disponibilidade e as cotas dependem do OpenRouter.

Em **Configurações → IA → Testar agente gratuito**, o backend usa a chave cadastrada para pedir uma chamada de ferramenta com texto sintético. O teste não envia tarefas, não executa a ferramenta e não cria registros. A interface mostra o modelo servido ou o diagnóstico: chave, política de dados, compatibilidade, cota, capacidade ou timeout. Logs registram somente modelo solicitado, status, código e categoria; nunca chave, prompts ou corpo bruto do provedor. Testes locais usam respostas simuladas; o botão valida a disponibilidade real naquele momento.

## Publicação

1. Aplicar `supabase/migrations/20261006160000_ai_agent.sql` no projeto `nvxwqrpztecrvrxoddxf`.
2. Publicar `torre-integrations` com os arquivos de `_shared`, incluindo `agent.ts` e `agentService.ts`. A função conserva `verify_jwt=false` porque valida cada bearer com `auth.getUser`, como a versão anterior.
3. Executar `npm run build` e copiar o conteúdo de `dist` para `docs`, conservando `CNAME`, `.nojekyll` e os documentos existentes.

## Validação

- `node supabase/tests/agent_test.mjs`: validação de campos, bloqueio de agenda, ferramentas somente leitura, modelos gratuitos e erros de capacidade.
- `node supabase/validate-calendar.mjs`: migrações e testes SQL, incluindo isolamento, aplicação atômica, idempotência, conflito de versões e desfazer.
- `node supabase/tests/agent_ui.mjs`: Playwright com Supabase inteiramente simulado. Usa uma prévia Vite em 5182; `TORRE_TEST_URL` e `PLAYWRIGHT_MODULE` podem definir URL e instalação do Playwright.
- `npm run build`: TypeScript e bundle do frontend.

O advisory remoto ainda informa configurações anteriores de proteção de senhas e tabelas privadas sem políticas; a tabela e os RPCs do agente foram verificados separadamente com RLS e grants restritos. Referências: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection e https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.
