# Telegram e resumo diário

Configurações → Telegram guarda nome e token no Vault por usuário. O backend valida o token com getMe e exige que pertença ao nome informado. Trocar o token remove o vínculo e desativa o envio.

1. Salvar as credenciais.
2. Clicar em Vincular meu Telegram, abrir o link e tocar em Iniciar no Telegram. O código é de uso único, expira em dez minutos e é armazenado somente como hash. Apenas chat privado pode ser vinculado.
3. Voltar à Torre e clicar em Atualizar conexão.
4. Selecionar dias e horário, ativar o envio e salvar o lembrete.
5. Enviar resumo de teste para validar IA e entrega. É permitido um teste por minuto.

Os dias selecionados são os dias de envio. Quarta às 21h gera fechamento de quarta e preparação de quinta. O fuso é America/Sao_Paulo. O horário padrão sugerido é 21h; o envio começa desativado. A IA usa a chave OpenRouter do usuário e o modelo openrouter/free. Não altera tarefas nem agenda. Usa concluídas do dia, pendências, reservas, eventos dos calendários selecionados e bloqueios manuais. Informa limitações da última sincronização e de listas truncadas. Reservas e reuniões ocorridas não provam conclusão ou presença.

Funções publicadas: torre-telegram-settings (JWT validado com Auth.getUser), torre-telegram-webhook (segredo do webhook no Vault) e torre-telegram-worker (credencial de worker já existente no Vault). A opção verify_jwt é false porque a autenticação é feita pelas próprias funções, incluindo webhook e cron que não usam JWT de usuário. Nenhuma função devolve tokens.

O webhook é configurado ao gerar o link de vínculo. Outra integração existente no bot é preservada e bloqueia o vínculo. Este canal entrega resumos; mensagens comuns ainda não criam tarefas.

O cron torre-telegram-digest verifica a cada minuto se existe envio devido, invoca o worker e usa timeout HTTP de 90 segundos. Há tolerância de até uma hora no mesmo dia para iniciar um envio atrasado. A reivindicação é transacional e única por usuário/data. Processa até cinco contas por chamada. Falha de geração é registrada para consulta na tela; não há repetição automática de um envio incerto. O botão de teste é independente do envio automático. O texto não é armazenado no histórico de entregas; ficam estado, data, modelo e ID da mensagem. Configuração de horário/chat é protegida por RLS, com gravação exclusiva do backend.

Validações:

- node supabase/tests/telegram_digest.mjs — datas, agendamento, vínculo temporário, duplicidade e RLS.
- npx --yes deno test --allow-env supabase/tests/telegram_backend_test.ts — snapshots por usuário, proteção das chaves, falha de IA e envio controlado com rede simulada.
- node supabase/tests/telegram_ui.mjs — formulário, vínculo, dias, hora, teste, erro e celular; TORRE_TEST_URL seleciona a prévia e PLAYWRIGHT_MODULE pode selecionar o Playwright.
- npx --yes deno check supabase/functions/torre-telegram-settings/index.ts supabase/functions/torre-telegram-webhook/index.ts supabase/functions/torre-telegram-worker/index.ts
- npm run build
