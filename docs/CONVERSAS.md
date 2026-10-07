# Conversas — MVP

Selecione ou cadastre uma pessoa em **Conversas**. O registro abre com a data de hoje; ajuste para a data real antes de organizar notas antigas. Cada pessoa tem um histórico e no máximo um rascunho aberto. **Nova conversa** salva o registro atual antes de abrir outro.

Digite as notas no campo **Texto livre** durante ou depois do encontro. **Organizar com IA** prepara check-in, decisões e combinados para revisão; não cria tarefas. **Usar interpretação** substitui campos estruturados e combinados ainda sem tarefa, preservando os já vinculados. Também é possível preencher o formulário manualmente, sem IA.

**Salvar conversa** registra as notas. **Salvar e criar tarefas** cria apenas os combinados selecionados: minha ação vira A fazer; ação do outro vira Aguardando resposta. Responsável indefinido exige revisão. Esperas precisam de pessoa e acompanhamento. Sem acompanhamento explícito, a proposta sugere sete dias depois da conversa. Prazo de entrega é um campo separado. Datas relativas usam a data da conversa e o fuso de São Paulo; datas vencidas são preservadas e destacadas.

Os rascunhos são salvos após uma pausa de 900 ms. Uma cópia de recuperação, separada por conta, fica neste navegador enquanto houver alterações pendentes ou falha. Ao retornar, o rascunho é recuperado. Em conflito com outra janela, compare a versão salva e escolha explicitamente qual manter. Registros permanecem privados ao proprietário via RLS.

As tarefas ficam vinculadas aos combinados, com situação atual e botão **Abrir tarefa**. Depois da criação, editar a tarefa pelo editor da Torre; o combinado original é preservado. Conversas sem ações também podem ser salvas. Sem integração de calendário, áudio, projetos ou publicação de resumos nesta etapa.

## Backend

- Migration: `20261007025947_conversation_mvp.sql`.
- RPC autenticado `torre_save_conversation`: gravação e criação de tarefas atômicas, versão para concorrência e identificador de pedido para repetição segura.
- Função `torre-conversations`: valida JWT com Auth, verifica pessoa da conta e configuração existente de IA; usa `openrouter/free` via a extração compartilhada. Recebe texto, data e pessoa somente no clique explícito; anexos e histórico anterior não são enviados.
- O usuário autorizou explicitamente o envio de texto, data e nome da pessoa ao OpenRouter no clique em **Organizar com IA**. A função `torre-conversations` foi publicada e confirmada como ACTIVE em 07/10/2026; valida o token com Supabase Auth no próprio código.

## Validação

`node supabase/tests/conversations.mjs` verifica extração, referências ao texto, datas, transação, repetição, vínculos e isolamento com PGlite da infraestrutura existente.

`node supabase/tests/conversations_ui.mjs` usa Playwright (instalado ou indicado por `PLAYWRIGHT_MODULE`) e Edge em segundo plano. Sobe e encerra um Vite temporário na porta 5182; todas as APIs são simuladas e os dados são fictícios. Verifica revisão antes de criar, editor de tarefas, registro sem ações, falhas, recuperação e largura móvel. Capturas ficam em `visual-prep/conversations-desktop.png` e `visual-prep/conversations-mobile.png`.

`npm run build` valida TypeScript e o build de produção. A publicação do frontend usa `docs` na branch `main` pelo GitHub Pages, em https://torre.veronez.app/. Copiar o build de `dist` preservando `docs/CNAME` e `docs/.nojekyll`.
