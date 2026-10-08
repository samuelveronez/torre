# Captura com seleção de modelo

Implementação de 8 de outubro de 2026. A implantação remota ainda depende da restauração da sessão do Supabase. Não há resultados de avaliação paga em produção nesta entrega local.

## Comportamento

- Cada captura oferece os perfis Gratuito, Luna e Gemini. A escolha é salva na conta e reutilizada nas próximas capturas. O modelo geral do chat continua configurado separadamente.
- Gratuito usa `openrouter/free` para extração e `inception/mercury-decide:free` para decisões; Luna usa `openai/gpt-6-luna` e `openai/gpt-6-luna-decisions`; Gemini usa `google/gemini-2.5-flash`, com decisões representadas em JSON.
- O perfil fica registrado na captura. Uma tentativa com erro pode ser refeita com outro perfil. Uma captura já processada retorna as mesmas tarefas, sem duplicação.
- O texto fornece título, descrição, área, situação, labels, prazo de entrega, acompanhamento e pessoas envolvidas. Datas relativas usam a data original da captura em America/Sao_Paulo, inclusive nas novas tentativas.
- Prazo de entrega e acompanhamento são distintos. Quando uma tarefa está aguardando alguém e não informa acompanhamento, o sistema sugere o dia seguinte. Datas ambíguas ficam sem preenchimento e geram aviso.
- Pessoas podem corresponder a um cadastro ou permanecer como nome livre. Nomes completos com correspondência única são ligados diretamente; correspondências parciais exigem decisão de alta confiança. Nomes ambíguos não são ligados automaticamente.
- Pessoas e equipes podem ser editadas nos detalhes da tarefa, inclusive em tarefas que não estão aguardando.
- Uma falha não troca silenciosamente para outro modelo. O texto permanece salvo para nova tentativa. A captura registra evidências, modelos solicitados e servidos, tokens, duração e custo informado pelo provedor.

## Limites e qualidade

Os cortes iniciais são 0,80 para área e labels, 0,85 para espera e 0,95 com margem de 0,20 para associação de cadastro. Ainda precisam de calibração com respostas reais. Não foi demonstrado que Luna melhora a qualidade ou custa menos que Gemini nesta aplicação.

O comparador usa 100 exemplos fictícios, derivados de 20 famílias com cinco variações cada; portanto não são 100 observações independentes. Metade das famílias é reservada para validação. O comparador não cria tarefas e não envia capturas reais. A precisão por campo deve ser analisada junto com falhas e cobertura; acurácia agregada não substitui precisão das associações automáticas.

Não há leitura de conteúdo de anexos, criação automática de pessoas cadastradas ou sincronização dos vínculos de pessoas com Google Tasks. O modelo também não preenche automaticamente agenda/reserva de horário.

## Segurança e implantação

`torre_task_people` usa RLS por proprietário e vínculos compostos que impedem associar tarefas e cadastros de outra conta. A edição usa RPC autenticada; a gravação da triagem é atômica com as tarefas e histórico. A Edge Function valida o bearer JWT com Supabase Auth antes de acessar a chave privada no Vault.

Ordem de publicação: aplicar `20261008010000_capture_profiles_people.sql`, publicar `torre-integrations` com seus módulos compartilhados e publicar o build Vite em `docs` no GitHub Pages. Publicar o frontend antes da migração faria suas novas consultas falharem.

## Verificação local

- Build TypeScript/Vite aprovado.
- 40 testes Deno aprovados, incluindo oito novos testes do pipeline, e teste Node de configurações Telegram aprovado.
- Oito conjuntos de cenários SQL aprovados em banco local de validação, incluindo RLS, isolamento entre contas, idempotência, associação de pessoas e desfazer.
- Teste Playwright com backend simulado aprovado: seleção sem chamada paga, preferência salva, perfil da captura, datas, pessoas, edição livre e layout mobile sem transbordamento horizontal.

Esses testes verificam implementação e invariantes. Não substituem avaliação dos modelos reais nem confirmação de implantação remota.
