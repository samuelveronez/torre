# Evolução visual — implementação local

> Registro historico da etapa visual. As regras funcionais foram entregues depois; o estado atual de aceite esta em `aceite-2026-10-11.md`.


Data: 10/10/2026. Entrega de código local, sem publicação, migração de banco ou mudança de APIs.

## Alterações

- Base shadcn/ui oficial, Tailwind CSS 4, Radix, alias `@/` e utilitário local de classes. Componentes incorporados: Button, Input, Textarea, Label, Checkbox, Switch, Badge, Tabs, Dialog, Sheet, Dropdown Menu, Tooltip, Collapsible e Alert. A adoção é gradual; controles antigos ainda existem onde seus contratos foram preservados.
- Tokens Zinc e azul, Segoe UI, temas e densidades preservados. Cabeçalho, campos, estado vazio e aviso de filtros compartilhados. `DESIGN_SYSTEM.md` atualizado.
- Navegação recolhida abaixo de 1024 px, com Sheet e destinos preservados. Pessoas e conversas ganhou rótulo explícito.
- Linha de tarefa compartilhada: título abre detalhes, labels em faixa secundária, metadados reorganizados conforme a largura do conteúdo e ações em menu. Editor em Sheet, com salvamento explícito e proteção existente contra descarte.
- Captura com texto primeiro, destino explícito, resumo de IA e opções de processamento recolhidas. Falhas preservam texto e arquivos no estado do componente.
- Meu dia com data acima das abas acessíveis; tarefas e agenda lado a lado a partir de 1200 px. Aviso de reservas ocultas calculado a partir de todas as tarefas e do período exibido.
- Agenda semanal preserva a grade existente; seleção inicial diária no celular, controles Dia/Semana e navegação entre dias. Planejamento usa painel não modal no computador e Sheet modal no celular, mantendo a prévia existente.
- Pessoas e conversas separa seleção e conteúdo no celular e preserva seleção e posição de retorno. Modo IA distingue Histórico do agente. Caixa de entrada recolhe opções de triagem; ajuda de IA em Configurações fica expansível.

## Verificação concluída

`npm run build`: TypeScript e Vite passaram. O build informa avisos de diretivas `use client` das bibliotecas e de bundle principal acima de 500 kB (936,39 kB; 278,44 kB gzip). Não foram suprimidos.

13/13 testes passaram: testes existentes de visualização de tarefas, agendamento, calendário, arraste e labels, mais o cálculo de reservas ocultas, inclusive atravessando meia-noite. O executor local transpila os testes TypeScript existentes e fornece o registro `Deno.test`; não substitui testes de integração do Supabase.

A página de tarefas foi verificada em 320, 390, 768, 820, 1024 e 1440 px, nos dois temas e nas duas densidades: 24 combinações sem rolagem horizontal da página. Métricas em `evidencias-implementacao/matriz-responsiva.json`; capturas correspondentes na mesma pasta.

Interações verificadas com componentes reais e dados sintéticos:

- Menu móvel, destinos e menus de tarefa; Escape restaura foco ao controle de origem.
- Foco inicial da captura, opções inicialmente recolhidas e preservação de texto após falha simulada.
- Editor: Tab/Shift+Tab circulam no painel; edição e salvamento em memória; retorno ao título da tarefa.
- Busca sem resultados e recuperação pelos filtros.
- Meu dia: aviso de uma reserva oculta por área e remoção pelo botão Limpar filtros; mudança da data atualiza agenda e tarefas; abas abaixo de 1200 px e colunas acima desse limite.
- Pessoas: abrir conversa sintética e voltar preserva pessoa selecionada e histórico.
- Planejamento: seleção mostra 1 tarefa e 45 minutos, sem aplicação de reserva.

## Evidências e execução

Antes: `evidencias-visuais/`, associado à auditoria anterior. Depois: `evidencias-implementacao/`. Os conjuntos usam dados e ambientes diferentes e não constituem comparação pixel a pixel.

Validação local: `npm run dev -- --host 127.0.0.1 --port 5174`, seguido de `/revisao-de-arquitetura/validacao-visual/index.html`. O arquivo de validação importa os componentes da aplicação, usa estado em memória e bloqueia requisições externas. A criação direta nessa página usa formulário de teste; não comprova persistência do formulário de produção. Não está incluído no entry point de produção.

Logs: `evidencias-implementacao/build.log` e `testes.log`. Executor: `validacao-visual/unit-tests.mjs` e `typescript-loader.mjs`.

## Limites e aceite ainda pendente

O navegador inicialmente não acessava o servidor restrito na porta 5173. O servidor local na porta 5174 permitiu os testes. Ao abrir a confirmação nativa de descarte do editor, o navegador travou e deixou de responder: cancelamento/aceite dessa confirmação e zoom de 200% não foram concluídos.

Ainda requerem validação: leitor de tela real, contraste medido, dispositivos com toque real, matriz completa de todas as telas, grade semanal com eventos sobrepostos, estados autenticados das integrações, upload efetivo e sua recuperação, criação direta com persistência, propostas de IA e aplicação de reservas. A página sintética não monta a grade semanal completa nem autentica serviços externos. Estados de IA e configurações foram preservados, mas não tiveram todos os caminhos executados.

As regras funcionais pendentes do ESCOPO.md continuam para a próxima etapa. A implementação visual está no código local; o aceite integral de interação permanece pendente dos testes acima. Nenhum dado real foi alterado e a versão publicada não foi usada como validação desta implementação.
