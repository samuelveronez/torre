# Torre de Controle — aparência, responsividade e interação

Data: 10/10/2026. Revisão realizada no navegador integrado, com capturas atuais da aplicação autenticada.

## Escopo, método e evidência

A aplicação local iniciou, mas o navegador retornou `ERR_CONNECTION_TIMED_OUT`. A URL publicada informada no projeto redirecionou para **https://torre.veronez.app/** e abriu com sessão existente. Esta revisão avalia essa versão publicada; não foi comprovado que ela corresponde exatamente ao código local.

Foram inspecionados aparência, hierarquia, navegação, estados vazios, formulários, foco e relações entre telas. DRY foi aplicado à consistência dos conceitos e controles; KISS, ao esforço para cumprir uma tarefa e à quantidade de decisões exigidas. As recomendações são qualitativas, sem pontuação automatizada.

Capturas: desktop com largura aproximada de 1390–1405 px; tablet de **768 × 1024**; celular de **390 × 844**; largura estreita de **320 × 740**. São testes de viewport no navegador, não testes em dispositivos físicos.

As 37 capturas estão em [evidencias-visuais](evidencias-visuais/). As cópias locais foram inspecionadas também nas folhas de contato. A captura de Conversas feita durante carregamento foi substituída pela tela carregada. Não foram usadas imagens antigas do repositório.

Nenhuma tarefa foi criada, editada, concluída ou reservada. Não foram enviados pedidos de IA, mensagens Telegram ou arquivos. Navegação e seções de configurações podem persistir preferências de tela; filtros foram limpos e o viewport restaurado ao terminar.

## Diagnóstico

A identidade visual é consistente: menu, cards, azul de ação, áreas, labels e formulários mantêm uma linguagem reconhecível. O editor lateral funciona bem como ponto comum entre tarefas e conversas, com ações fixas no rodapé.

Os problemas mais importantes aparecem **entre contextos**: filtros alteram a percepção de ocupação, a data não acompanha a lista diária no celular e o breakpoint do tablet mantém uma estrutura de desktop sem espaço suficiente. A prioridade deve ser corrigir essas relações, depois reduzir ruído visual e decisões técnicas nas entradas rápidas.

## Etapas revisadas

| Etapa | Tela ou relação | Saúde observada | Evidências |
| --- | --- | --- | --- |
| 1 | Navegação, menu e busca | Consistente; busca vazia oferece recuperação | 02, 15, 37 |
| 2 | Tarefas e filtros | Boa em desktop e 390 px; comprimida no tablet | 02, 16, 33, 34 |
| 3 | Tarefa → detalhes → retorno | Boa: Escape fecha e devolve foco; rodapé visível | 03, 17 |
| 4 | Captura rápida | Funcional; exige decisões técnicas antes do texto | 04, 19, 35, 36 |
| 5 | Caixa de entrada e processadas | Estados claros; triagens preservam origem e resultados | 09, 10 |
| 6 | Meu dia → filtro → agenda | Problema confirmado: reserva desaparece ao filtrar | 05, 06 |
| 7 | Meu dia → aba Agenda no celular | Abas funcionam; data fica separada das tarefas | 20, 21 |
| 8 | Agenda semanal → seleção de proposta | Grade densa; seleção afasta a agenda da área visível | 07, 08, 22 |
| 9 | Tarefa → reserva manual | Formulário legível, com aviso de sobreposição | 18 |
| 10 | Pessoa → conversa → tarefa → retorno | Vínculo funciona; seleção de pessoas atrasa acesso no celular | 11, 12, 23, 24, 25 |
| 11 | Modo IA, histórico existente | Bom reflow; cabeçalho e nomes aumentam carga cognitiva | 13, 14 |
| 12 | Configurações e integrações | Seções se adaptam; IA tem excesso de texto inicial | 01, 26–31 |

Saúde refere-se às interações observadas, não a todos os estados possíveis da funcionalidade.

## Achados e recomendações

### V01 — Filtro de label apaga ocupação da agenda

**Alta prioridade; confirmado em execução.** Em Meu dia, sem filtro havia uma tarefa reservada às 19h e um compromisso Google às 17h. Ao selecionar GSA, o contador de reservas passou de 1 para 0 e o botão dessa reserva desapareceu da árvore de acessibilidade; o evento Google permaneceu. As telas mostram a redução do conjunto de reservas.

Isso mistura duas perguntas: “quais tarefas quero consultar?” e “quais horários estão ocupados?”. A barra de filtros ajuda a explicar a seleção, mas não torna a disponibilidade representada confiável.

**DRY:** manter uma interpretação única de ocupação. **KISS:** o usuário não deveria precisar limpar filtros para saber se um horário está reservado.

**Recomendação:** filtrar candidatos e listas, preservando ocupações na grade. Se for necessário ocultá-las, mostrar blocos neutros e aviso explícito. Aceite: uma reserva de outra label continua representada quando GSA está selecionada.

![Meu dia sem filtro: uma reserva](evidencias-visuais/05-meu-dia-desktop.jpg)

![Meu dia com GSA: nenhuma reserva no conjunto filtrado](evidencias-visuais/06-meu-dia-filtrado.jpg)

### V02 — Tablet fica menos legível que celular

**Alta prioridade; confirmado em 768 px.** O menu lateral permanece aberto, enquanto título, prioridade, reserva e seta continuam disputando a mesma linha. Um título de tarefa quebra em numerosas linhas dentro de uma coluna estreita. Em 390 px, a apresentação empilha melhor e dá mais largura ao título.

**Recomendação:** decidir a adaptação pelo espaço disponível no conteúdo. Recolher o menu mais cedo e/ou empilhar os controles da tarefa antes desse ponto. Aceite: títulos e metadados não ficam comprimidos para preservar controles laterais; validar 740, 768, 820 e 1024 px.

![Tarefas em tablet: título comprimido pelos controles](evidencias-visuais/33-tarefas-tablet.jpg)

### V03 — A data de Meu dia não acompanha as tarefas no celular

**Média prioridade; confirmado em 390 px.** Na aba Tarefas, vê-se “Meu dia” e os grupos, mas o seletor de data e o dia por extenso ficam na aba Agenda. O mesmo componente permite navegar entre dias, logo a lista precisa deixar claro qual dia representa.

**Recomendação:** colocar data e navegação de dia acima das abas. Aceite: trocar o dia na Agenda e voltar a Tarefas mantém a data visível no cabeçalho comum.

![Meu dia no celular: lista sem cabeçalho de data comum](evidencias-visuais/20-meu-dia-mobile.jpg)

### V04 — A semana é difícil de ler como um todo

**Média prioridade; confirmado em desktop e celular.** Sobreposições geram colunas estreitas de eventos “Ocupado”. No desktop capturado, apenas parte dos dias cabe na largura da grade; no celular, aproximadamente dois dias aparecem. A rolagem interna se soma à rolagem da página. Mostrar sobreposições tem valor, mas a visão geral perde força.

**Recomendação:** oferecer foco diário como entrada no celular e uma representação resumida da ocupação semanal. Manter detalhes de sobreposição disponíveis por expansão, sem eliminar eventos reais. Indicar claramente que há dias fora da área visível. Aceite: chegar ao sábado e voltar ao dia atual não exige procurar uma barra de rolagem pouco evidente.

![Agenda semanal no celular](evidencias-visuais/22-agenda-semana-mobile.jpg)

### V05 — Escolher tarefas para a proposta afasta o contexto da agenda

**Média prioridade; confirmado em desktop.** Abrir a seleção adiciona um painel grande com lista própria rolável, instrução e orientação opcional. A grade passa para baixo da área principal visível. O usuário escolhe tarefas com menor acesso visual ao tempo disponível.

**Recomendação:** usar seleção compacta com duração total e resumo de capacidade ao lado. Reaproveitar o padrão de seleção da lista quando apropriado. Aceite: selecionar tarefas e conferir disponibilidade sem alternar repetidamente entre duas regiões roláveis.

### V06 — Captura rápida começa pela configuração da IA

**Média prioridade; confirmado nos formulários.** Modelo e modo aparecem antes do campo de texto. O formulário explica cobrança por tokens, mas uma ação chamada “rápida” começa por decisões de processamento. A página de tarefas, por sua vez, oferece “Adicionar”, que abre outro caminho de criação.

**DRY:** os caminhos de entrada precisam compartilhar linguagem sobre seu resultado. **KISS:** colocar a anotação primeiro, com padrão visível e opções avançadas recolhíveis.

**Recomendação:** priorizar o texto e explicitar “guardar anotação” versus “adicionar tarefa”. Mostrar se a anotação será processada automaticamente. Preservar a informação de cobrança antes de qualquer envio. Em 320 px, a rolagem alcança Salvar; não foi observado botão inacessível.

### V07 — Pessoas ocupam a primeira tela da conversa móvel

**Média prioridade; confirmado em 390 px.** Após escolher uma pessoa, o usuário continua vendo cadastro, grade de pessoas e histórico. O conteúdo da conversa aparece abaixo. A ação de seleção não aproxima automaticamente o registro escolhido da área principal.

**Recomendação:** transformar a lista de pessoas em seletor recolhível no celular e mostrar a pessoa ativa junto da conversa. Aceite: escolher uma pessoa torna título e início da conversa visíveis, mantendo um caminho curto para trocar de pessoa.

![Seleção de pessoa ocupa a primeira tela](evidencias-visuais/23-conversa-mobile-topo.jpg)

### V08 — Configurações de IA exigem leitura longa antes da ação

**Média prioridade; confirmado.** Em 390 px, a primeira tela contém essencialmente explicações. Modelo padrão, chave e ações estão abaixo. O texto reúne regras de captura, prazo, acompanhamento, pessoas, agenda e Telegram em um único lugar.

**Recomendação:** abrir com estado e ação principal; agrupar “modelo”, “processamento de capturas” e “chave”. Colocar as regras perto dos fluxos que as usam e manter detalhes consultáveis. Evitar repetir longos textos em configurações, agente e captura.

![Configurações de IA no celular](evidencias-visuais/26-configuracoes-mobile.jpg)

### V09 — Nomes e ações similares pedem consistência

**Baixa a média prioridade; observado entre telas.** “Conversas” é módulo de registros com pessoas e também o botão de histórico do agente. Reservar aparece como texto na lista desktop, somente ícone no celular e “Planejar” nos cartões da semana. “Captura rápida”, “Capturar” e “Adicionar” convivem.

Não é preciso tornar todos os contextos iguais. É preciso preservar o significado da ação.

**Recomendação:** usar “Histórico da IA” no agente e uma nomenclatura comum para reserva. Manter rótulos acessíveis nos ícones e considerar texto curto nas ações frequentes. Essa é a aplicação mais direta de DRY à interface.

### V10 — Metadados e controles competem com o conteúdo

**Baixa prioridade; observado.** A lista mostra área, duração, label, inclusão, prioridade e reserva em cada linha. “Sem prioridade” ganha um seletor permanente mesmo quando não há decisão a comunicar. Datas de inclusão ocupam espaço em consultas diárias. Textos auxiliares são pequenos e claros sobre fundo claro, exigindo validação de contraste.

**Recomendação:** preservar título, próxima ação, prazo/acompanhamento e reserva como primeira leitura. Recuar inclusão e informações de origem para detalhes ou exibição opcional. Verificar contraste e tamanho de alvos, sem concluir falha WCAG apenas pela imagem.

## Relações entre telas: o que funcionou

- **Tarefa → detalhes → retorno:** Escape fechou e devolveu foco ao título acionado. Shift+Tab no primeiro controle voltou ao último controle do editor, mostrando contenção de foco no cenário testado.
- **Conversa → tarefa → conversa:** o combinado abriu a tarefa correspondente; Escape devolveu foco a “Abrir tarefa”. O contexto da conversa foi preservado.
- **Captura → cancelamento:** Escape fechou sem criar registro, e a área de texto recebeu foco ao abrir.
- **Busca → vazio → recuperação:** busca sem correspondência mostrou filtro ativo, contagem zero, explicação e Limpar filtros; limpar recuperou a lista.
- **Menu móvel → tela:** selecionar uma tela fechou o menu e exibiu o conteúdo correspondente.
- **Meu dia → Agenda:** alternar as abas mostrou tarefas ou agenda sem perda do dia selecionado no cenário observado.

## DRY e KISS: direção recomendada

| Conceito | Aplicação de DRY | Aplicação de KISS |
| --- | --- | --- |
| Ocupação | Uma regra para representar reservas e compromissos em dia e semana | Filtros de tarefas não exigem raciocínio extra sobre disponibilidade |
| Reserva | Mesma linguagem e contexto em lista, editor, dia e semana | Uma entrada curta, com aviso de conflito antes de aplicar |
| Captura | Destino e resultado consistentes em todos os pontos de entrada | Texto primeiro; processamento explicado e opções secundárias recolhíveis |
| Dia ativo | Data compartilhada por tarefas e agenda | Data visível antes das abas |
| Pessoas | Registro e tarefa permanecem ligados sem copiar o combinado | Pessoa ativa visível; seletor compacto no celular |
| IA | Explicações comuns sobre analisar, propor, aplicar e desfazer | Configuração fora do caminho principal, mantendo custos e efeitos claros |

## Plano recomendado

1. Corrigir a representação de ocupação sob filtros. Validar o mesmo cenário em Meu dia e semana.
2. Ajustar o breakpoint do menu e das linhas de tarefa, com prioridade para 768 px.
3. Unificar o cabeçalho de data de Meu dia e simplificar a seleção de pessoas no celular.
4. Reduzir a densidade da grade semanal e preservar contexto ao escolher tarefas para proposta.
5. Simplificar captura e configurações de IA, mantendo informação de custo e efeito antes do envio.
6. Padronizar rótulos e hierarquia de metadados.
7. Completar testes com dados de teste: criação, triagem, espera, conclusão, reserva, conflitos, desfazer e falhas de rede.

## Limites da validação

Não foram exercitados salvamentos, triagem nova, arraste com aplicação, proposta gerada/aplicada, conclusão, desfazer, envio Telegram ou alterações de integrações. Login e recuperação de senha não foram avaliados porque a sessão já estava autenticada. Tema escuro, outras densidades, zoom de 200%, teclado virtual, leitor de tela e dispositivos físicos continuam pendentes.

O aviso de sobreposição foi visto no formulário de reserva; nenhuma reserva foi submetida. Portanto, esta rodada não comprova a política final do backend. A comparação de ocupação sob filtro foi confirmada em Meu dia; o comportamento equivalente da semana permanece a validar em execução.

Os mecanismos de foco testados são pontos fortes, mas não constituem auditoria completa de acessibilidade. Capturas contêm dados da conta e foram mantidas localmente.

## Galeria de evidências

As folhas abaixo apresentam todas as capturas aceitas em ordem. Os originais numerados na mesma pasta permitem inspeção em resolução completa.

![Evidências 01 a 12 — desktop e fluxos iniciais](evidencias-visuais/contato-01.jpg)

![Evidências 13 a 24 — agente e fluxos móveis](evidencias-visuais/contato-02.jpg)

![Evidências 25 a 36 — configurações, tablet e 320 pixels](evidencias-visuais/contato-03.jpg)

![Evidência 37 — busca vazia e recuperação](evidencias-visuais/37-busca-vazia-desktop.jpg)
