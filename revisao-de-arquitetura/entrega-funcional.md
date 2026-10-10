# Entrega das mudanças funcionais — 10/10/2026

Implementação das decisões confirmadas na entrevista, com DRY e KISS: foco como data na tarefa, tipo de reserva na tabela existente e faixa horária nas preferências existentes. Nenhuma nova tabela de negócio.

## Comportamento entregue

- Google Tasks somente importa registros novos. Tarefas já importadas preservam título, descrição, prazo, conclusão e arquivamento locais; exclusão no Google não apaga a tarefa na Torre. Edição e reabertura locais disponíveis. A API rejeita escrita em Google Tasks; novas autorizações usam tasks.readonly. Tokens antigos podem continuar com o consentimento anterior até reconectar, mas o código não envia alterações.
- Foco sem horário pelo editor ou Meu dia → Escolher tarefas. Não altera prazo nem ocupa tempo. Focos anteriores incompletos pedem trazer para hoje, retirar ou decidir depois; a última opção não muda a data gravada.
- Mudanças de área, duração e situação em tarefas reservadas pedem manter ou retirar horário, também em lote. Cancelar preserva a tarefa. Em espera, manter cria lembrete; ao voltar a A fazer, manter converte explicitamente em reserva.
- Lembretes tracejados não bloqueiam disponibilidade, não entram nos avisos de conflito e não são liberados automaticamente como reservas expiradas.
- Jornada orienta reservas manuais com aviso; exceções são permitidas. Sobreposições continuam permitidas e avisadas considerando todas as tarefas, inclusive ocultas pelos filtros.
- Configurações → Preferências permite definir início/fim da agenda, de 0h a 24h em horas inteiras. Meu dia, semana, arraste e sugestões usam a mesma faixa. Horários existentes fora dela permanecem acessíveis acima da grade.
- O agente pode preparar propostas de horários. O link Revisar horários abre a prévia semanal reutilizada; só Aplicar proposta cria reservas. O banco valida novamente disponibilidade, jornada, duração, propriedade e alterações do contexto. Para mudar área/duração/situação de tarefas já reservadas, o agente orienta usar o editor.
- A tarefa e sua reserva são gravadas na mesma transação. Uma reserva recusada não deixa campos da tarefa parcialmente alterados. Vínculos com pessoas e labels seguem seus contratos existentes.

## Validação

- `npm test`: 17/17 testes de regras e regressão.
- Build TypeScript/Vite aprovado; permanecem avisos conhecidos de diretivas use client e tamanho do pacote.
- Deno check aprovado para integrações e worker Google.
- Testes SQL com usuários sintéticos: edição/reabertura Google locais, foco, lembrete, conversão, duração, rollback de horário inválido, ausência de novos envios, RLS entre contas e aplicação automática que ignora lembretes mas respeita a jornada. Tudo revertido com rollback.
- Navegador local acessível. Teste isolado de foco anterior, edição, manter reserva e manter como lembrete. Prévia do agente carregada com transporte simulado: sem seleção, aplicar fica desabilitado; falha mantém a prévia para nova tentativa.
- 24 combinações de largura (320, 390, 768, 820, 1024, 1440), tema e densidade em Meu dia, com faixa 5h–24h: sem rolagem horizontal da página; 76 intervalos de quinze minutos em todos os casos. Evidências em `evidencias-funcionais`.
- Nenhuma tarefa real foi criada, editada ou concluída nos testes. Nenhuma mensagem Telegram foi enviada. A fila e os campos históricos de envio Google foram preservados: tentativas iniciais de limpeza foram rejeitadas pela revisão automática e substituídas pela desativação do processamento.

## Limites da validação

A chamada real do agente ao modelo e a importação real de uma nova tarefa Google não foram disparadas nesta entrega. Foram testadas as regras de importação/alocação, a prévia com transporte simulado e a aplicação no banco com rollback. Acessibilidade com leitor de tela físico, toque físico, zoom real de 200% e upload real continuam conforme limitações da revisão visual anterior.

Os advisors continuam indicando achados anteriores: [função privilegiada de pessoas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [duas tabelas privadas sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [11 FKs sem índice](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [sete políticas permissivas sobrepostas](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies) e três índices sem uso. A RPC nova é SECURITY INVOKER e teve isolamento validado.

## Publicação

Backend implantado: integrações v27; callback Google v5; worker Google v5. Três migrações aplicadas. Interface publicada em https://torre.veronez.app/. Commit de integração `202c9695bbb762e7bedf55e26bcb18daa6620776`; GitHub Pages run `38096525361` concluído com success. O domínio entregou `index-D7zYaUoA.js` e `index-b0vdnem1.css`, os mesmos arquivos do build local validado. A correção remota de centralização da captura foi preservada. POST sem autenticação à integração retornou 401. Confirmação do domínio por leitura do HTML, sem executar fluxos autenticados com dados reais.
