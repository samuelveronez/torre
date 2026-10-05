# Configuração das integrações da Torre

## Supabase Auth

Em Authentication → URL Configuration, definir Site URL e adicionar Redirect URL:
`https://samuelveronez.github.io/torre/`.

## Google

1. Habilitar Google Calendar API e Google Tasks API no projeto Google Cloud.
2. Configurar um cliente OAuth do tipo Web application.
3. Origem da aplicação: `https://samuelveronez.github.io`.
4. URI de redirecionamento autorizada: `https://nvxwqrpztecrvrxoddxf.supabase.co/functions/v1/torre-google-callback`.
5. Cadastrar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` em Supabase → Edge Functions → Secrets. Não colocar o segredo no GitHub ou frontend.
6. Na Torre, abrir Configurações → Conectar Google. Selecionar listas, áreas e calendários. Depois sincronizar.

O app pede acesso Tasks para devolver conclusão e Calendar somente leitura. No modo “Somente ocupado”, não persiste o conteúdo dos eventos. Calendários com acesso freeBusyReader permanecem nesse modo. Um cliente OAuth em modo Testing pode exigir reconexão após sete dias; configurar o consentimento Google conforme o uso pretendido.

Funções publicadas: torre-integrations (valida JWT no código), torre-google-callback (state único por usuário), torre-google-worker (token privado do Vault). O cron executa a fila de conclusões a cada cinco minutos.

## Captura e labels

Ctrl/Cmd+K abre a captura. Até dez arquivos de vinte MB, em bucket privado. Falhas de upload ficam visíveis e podem ser repetidas selecionando o mesmo arquivo. A captura só vira tarefa quando os uploads terminarem. Transformação e desfazer são operações no banco; repetir a transformação não duplica a tarefa.

## IA

A chave pessoal OpenRouter fica criptografada no Vault. Extração de texto livre e ordenação da agenda usam `openrouter/free`, escolhido pelo usuário, com JSON validado no backend e modelo efetivamente servido registrado; classificação usa `inception/mercury-decide:free`. Somente modelos gratuitos, sem fallback pago. Listas são separadas por candidatos e decisões de limite; texto livre gera itens com referência literal ao texto original. Mercury classifica área e cada label por item, com corte 0,8. Até 20 tarefas e 20 mil caracteres; 30 minutos e sem prazo. Anexos não são enviados à IA. O bloqueio dura 120 segundos; criação de tarefas, labels e histórico ocorre em uma transação. Repetir retorna `taskIds` existentes. Desfazer arquiva o conjunto e preserva captura/anexos. Ditado usa reconhecimento do navegador (pt-BR), sem armazenamento de gravações pela Torre, e requer revisar/salvar o texto.

“Sugerir minha semana” recebe até 20 IDs selecionados e orientação, obtém tarefas e disponibilidade no banco e usa o roteador gratuito para ordenar/justificar. O algoritmo calcula intervalos de 15 minutos respeitando jornada, área, duração, reservas e ocupados. Nenhum detalhe de compromissos Google é enviado à IA. Propostas ficam em tabela com RLS e leitura do proprietário; escrita só no backend. A aplicação verifica snapshot, expiração, agenda atualizada e conflitos, e salva atomicamente apenas itens aceitos. Ajustes de horário na prévia são validados novamente no banco. Os RPCs de IA e aplicação de propostas são exclusivos do backend, com JWT validado na função.

Arraste usa imagem compacta 220 × 56 px, prévia da duração, encaixe por ponteiro em 15 minutos e bloqueio visual de conflitos. Mantém Planejar como alternativa.


## Validação

`npm run build` verifica o frontend. `deno check supabase/functions/torre-integrations/index.ts supabase/functions/torre-google-callback/index.ts supabase/functions/torre-google-worker/index.ts` verifica o backend. `deno test supabase/tests/triage_test.ts` valida respostas da IA. `supabase/tests/integrations.sql` usa dados temporários e ROLLBACK para verificar regras no banco remoto.

Testes reais de consentimento, renovação Google e entrega de e-mail exigem configuração das credenciais e entrada da conta. Não considerar esses fluxos confirmados apenas porque as funções foram publicadas.

Validação adicional: `deno test supabase/tests/openrouter_test.ts supabase/tests/triage_test.ts`; `supabase/tests/openrouter.sql` testa exclusão mútua, autorização, labels, idempotência e desfazer, com ROLLBACK.
