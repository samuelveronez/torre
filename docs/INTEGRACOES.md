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

A chave pessoal é armazenada criptografada no Vault. O frontend recebe apenas indicação de existência. O modelo e provedor ainda não foram escolhidos: chamadas de triagem por IA permanecem desativadas, com processamento manual disponível. O contrato e validação estão em `supabase/functions/_shared/triage.ts`; o futuro adaptador recebe somente texto digitado e labels existentes.

## Validação

`npm run build` verifica o frontend. `deno check supabase/functions/torre-integrations/index.ts supabase/functions/torre-google-callback/index.ts supabase/functions/torre-google-worker/index.ts` verifica o backend. `deno test supabase/tests/triage_test.ts` valida respostas da IA. `supabase/tests/integrations.sql` usa dados temporários e ROLLBACK para verificar regras no banco remoto.

Testes reais de consentimento, renovação Google e entrega de e-mail exigem configuração das credenciais e entrada da conta. Não considerar esses fluxos confirmados apenas porque as funções foram publicadas.
