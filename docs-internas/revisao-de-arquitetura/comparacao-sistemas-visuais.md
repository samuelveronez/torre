# Sistemas visuais — comparação para a Torre

Revisão em 10/10/2026. Comparação documental e exemplos oficiais no navegador; nenhuma biblioteca instalada ou tela alterada. Preferências ainda aguardam entrevista.

## O que existe hoje

DESIGN_SYSTEM.md declara inspiração em Salesforce Lightning, com cores, tipografia, espaçamento, componentes e acessibilidade próprios. package.json usa React, CSS próprio e ícones Lucide, sem biblioteca de componentes Salesforce, Fluent, Material ou shadcn. Portanto, há um sistema de design próprio inspirado em Lightning, não adoção integral de um desses sistemas. O documento visual contém referências antigas incompatíveis com o ESCOPO.md vigente, como ausência de IA, dados de demonstração e persistência somente no navegador; deve ser atualizado posteriormente.

## Opções e valor para o usuário

| Referência | Valor possível na Torre | Exemplo aplicado | Custo ou limite |
|---|---|---|---|
| Evoluir o sistema atual | Preservar familiaridade e reduzir retrabalho | Reorganizar linha de tarefa; esconder ações secundárias; corrigir tablet | Componentes e acessibilidade continuam sob responsabilidade do projeto |
| Fluent 2, Microsoft | Interface de trabalho previsível, com listas e painéis contextuais | Lista e detalhes lado a lado no desktop; detalhes em tela ampla no celular; avisos próximos da ação | Migração de componentes e adaptação visual; não fornece a lógica da agenda |
| Material 3, Google | Navegação e controles adaptados ao espaço disponível e ao toque | Meu dia, Tarefas e Agenda como destinos visíveis no celular; navegação reduzida no tablet | Pode ocupar mais espaço; padrões precisam de implementação web adequada. A página oficial de Navigation bar informa implementação web indisponível; não presumir suporte integral em React |
| shadcn/ui | Aparência discreta e componentes personalizáveis para criar a identidade da Torre | Busca e filtros agrupados; situação e prioridade legíveis; ações secundárias no menu da tarefa | É código incorporado ao projeto, cuja manutenção passa a ser nossa. O exemplo de tabela também tem limites de largura; responsividade não é automática |

Fluent e Material são sistemas de design. shadcn/ui é uma base de componentes distribuída como código para compor um sistema próprio. Não são alternativas tecnicamente idênticas.

## DRY e KISS

DRY: compartilhar botão, campo, filtro, aviso e painel de tarefa entre Tarefas, Meu dia, Agenda e Pessoas; estados e vocabulário devem ser consistentes. Tokens comuns para cores, espaços, tipografia e densidade.

KISS: uma ação principal por contexto; captura começa pelo texto; opções avançadas aparecem quando necessárias; layout muda conforme o espaço sem comprimir títulos. Evitar três bibliotecas competindo pela mesma responsabilidade.

Recomendação provisória: corrigir fluxos e responsividade mantendo a identidade atual; avaliar Fluent 2 como primeira referência de interação para o uso executivo. Material merece maior peso se consulta e captura no celular forem prioritárias. shadcn merece maior peso se a preferência for uma aparência discreta e personalizada. A escolha final depende das respostas, e não autoriza migração.

## Exemplos oficiais

Capturas são das referências oficiais, não propostas da Torre:

- [Fluent: painel contextual](https://fluent2.microsoft.design/components/web/react/core/drawer/usage). [Captura](exemplos-design-system/fluent-painel.png).
- [Material: navegação móvel](https://m3.material.io/components/navigation-bar/overview). [Captura](exemplos-design-system/material-navegacao.png).
- [shadcn: lista de tarefas](https://ui.shadcn.com/examples/tasks). [Captura](exemplos-design-system/shadcn-tarefas.png).
- [Fluent 2 e aplicações Microsoft](https://fluent2.microsoft.design/).
- [shadcn: natureza e manutenção dos componentes](https://ui.shadcn.com/docs).
- [Google: classes de tamanho adaptativas](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes). Fonte de padrões para Android; não copiar unidades dp como breakpoints CSS sem validação.

O navegador carregou as três referências. Material exigiu renderização JavaScript; a consulta textual web isolada não mostrava o conteúdo, mas a página foi verificada no navegador.

## Direção confirmada por Samuel

- Referência visual: shadcn/ui, pela aparência discreta, limpa e personalizada.
- Computador: mais informações visíveis por linha, com lista compacta.
- Celular e tablet: captura com pouquíssimos campos, revelando opções adicionais conforme a necessidade (KISS).

Essas escolhas substituem a recomendação inicial de Fluent como primeira referência. Não representam autorização ou decisão técnica de instalar shadcn/ui; a adoção de biblioteca será avaliada separadamente.

Aplicação recomendada: cores da Torre usadas com moderação; título da tarefa com largura protegida; metadados alinhados e consistentes; ação de concluir acessível e ações secundárias agrupadas. No tablet, reorganizar a linha antes de comprimir o título. No celular, apresentar primeiro o texto e o destino da captura, deixando configurações de IA e detalhes em uma seção opcional. Compartilhar controles e estados entre telas (DRY), evitando duplicação de componentes e opções desnecessárias (KISS).
