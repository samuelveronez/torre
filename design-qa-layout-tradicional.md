# QA — Layout tradicional da Torre

final result: passed

## Evidências
- Referência estrutural: imagem fornecida pelo usuário, `C:/Users/samue/.codex/codex-remote-attachments/01a1081b-a6bd-7d73-a278-8c139eb09a9b/31A56037-5521-450F-91BF-37B0A83B267B/1-Imagem-colada-1.jpg`.
- Implementação: https://samuelveronez.github.io/torre/ — capturas locais `layout-desktop.png` e `layout-mobile.png`.
- Comparação conjunta: `layout-comparacao.png`, referência à esquerda e implementação à direita.
- Viewport desktop solicitado: 1280 × 833; captura retornada: 1265 × 823. Mobile: viewport 390 × 844. Sem transformação dos pixels; comparação de estrutura e proporção, sem alegação de correspondência pixel a pixel.
- Estado: tela Tarefas com demonstração existente; a referência exibe processamento de entrada. O usuário pediu a estrutura de app e preservação do visual existente, não cópia do conteúdo ou tema escuro.

## Superfícies verificadas
Tipografia: Segoe UI e hierarquia atual preservadas, títulos legíveis e metadados em tamanho menor.
Espaçamento: menu lateral de 248px, área central com respiro, busca fixa no topo e lista com ações alinhadas; no celular, menu recolhível e ações abaixo da descrição.
Cores: azul Salesforce, cartões brancos e fundo cinza preservados por instrução do usuário. Tema escuro da referência não foi replicado.
Assets: ícones Lucide, biblioteca já utilizada no GSA; referência sem fotos ou ilustrações necessárias para este escopo. Não houve geração de imagens.
Conteúdo: funções da Torre mantidas, sem importar treinamento, classificação por IA ou bibliotecas da referência.

## Correção durante QA
[P2] O botão Nova tarefa perdia o nome acessível quando seu texto era ocultado no celular. Adicionado aria-label; nova captura e árvore acessível confirmam “Nova tarefa”. Menu também fecha com Escape, verificado após publicação.

## Interações verificadas
- Buscar “documentos” nas configurações abre Tarefas e retorna a tarefa correspondente.
- Buscar “carro” na agenda móvel abre Tarefas e retorna a tarefa correspondente.
- Limpar busca restaura a lista.
- Menu móvel abre, navega para Agenda semanal e fecha; Escape fecha o menu.
- Busca visível em todas as telas e posição fixa no topo.
- Build TypeScript/Vite concluído e página pública carregada.

## Limites e refinamentos
Sem problemas visuais P0/P1/P2 pendentes no escopo avaliado. P3: considerar menu lateral recolhível também no desktop se necessário. Esta entrega continua sendo demonstração com armazenamento local; integrações não fazem parte da alteração de layout.

# Entrega UX de 5 de outubro de 2026

final result: not tested at user request

Composição escolhida: lista contínua da opção 1 com agenda lateral da opção 2. Referência: C:/Users/samue/.codex/generated_images/01a10894-1604-7f83-bdfd-62fbc0eadc41/exec-25dbfca4-573c-4900-9d49-09cd7221d371.png.

Antes da instrução de dispensar testes: conferidos Meu dia em desktop, editor sobreposto, configurações em 375/768/1440 pixels, temas claro e escuro, timestamp do banco e salvamento do editor. Corrigidos deslocamento horizontal do layout e corte do botão Arquivar no celular. A suíte anterior passou com 15 testes; isso não valida as alterações posteriores.

A pedido do usuário, não foram executados novos testes de seleção múltipla, classificação de labels, arrastar para labels ou desfazer. Build TypeScript/Vite concluído. Não há alegação de QA visual completo ou de correspondência pixel a pixel.

Implementação: Meu dia com tarefas reservadas/prazo e grupos recolhíveis, navegação de data, disponibilidade Google e timeline lateral de 360 pixels; lista compartilhada e editor global; submenu das configurações; filtros combinados; densidade local por usuário; inclusão recente; seleção e ações em lote; atribuição de label por arrastar; toasts com Desfazer e duração de 12 segundos. A classificação de labels no backend usa JWT do usuário, textos de tarefas dessa conta e somente labels ativas existentes. Anexos e segredos não são enviados ao navegador.

Limites existentes: datas importadas do Google Tasks continuam editáveis no Google. Classificação por IA limitada a 20 tarefas por chamada. Desfazer preserva os demais campos e recusa sobrescrever mudanças posteriores nos campos alterados; restauração de reservas respeita as validações do banco. Conclusões Google podem ser desfeitas pelo toast; reabertura habitual permanece no Google Tasks.

## Label drag correction — 2026-10-05
- Source allowed move while label requested copy; changed task drag to copyMove.
- Task-specific payload, valid UUIDs, selected-task support, visible grip and label hover feedback.
- Native automated gesture starts but does not reach target in controlled browser; end-to-end manual localhost test confirmed by user: label added.
- Three drag protocol tests passed; production build passed.

