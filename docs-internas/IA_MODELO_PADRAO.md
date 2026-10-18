# Modelo padrão da IA

Configurações → IA → Modelo padrão de toda a aplicação permite escolher openrouter/free ou google/gemini-2.5-flash. O botão Salvar modelo padrão grava a escolha por usuário em torre_ai_settings.default_model, com a política RLS já existente. Novas contas e contas sem seleção continuam no gratuito. A mesma chave OpenRouter atende às duas opções; Gemini exige saldo e cobra por tokens.

A seleção no Modo IA também altera essa preferência global. A antiga escolha local do navegador é ignorada. A preferência vale para novas análises e comandos, testes sintéticos, extração e classificação de capturas/tarefas, organização de conversas, propostas de planejamento e resumos do Telegram. A classificação usa Mercury Decide no modo gratuito e Gemini com JSON validado no modo pago. Não há troca automática para um modelo cobrado quando o gratuito falha.

O backend carrega a preferência pelo usuário autenticado. Pedidos novos do agente usam a configuração da conta, independentemente do modelo enviado por um cliente antigo. Ao repetir um pedido já registrado, mantém seu requested_model original para preservar a idempotência e o histórico. Alterar o padrão não reescreve análises antigas.

O controle de processamento automático de capturas continua independente da seleção de modelo. Salvar o modelo não gera chamada de IA nem ativa capturas automaticamente.

Validações: ai_global_test.ts, telegram_backend_test.ts, agent_test.mjs, agent_context.mjs e ai_global_ui.mjs. Os testes usam APIs simuladas, incluindo Gemini pago, rejeição de resposta cobrada no modo gratuito, persistência e sincronização do chat com configurações.
