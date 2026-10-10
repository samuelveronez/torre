# Torre de Controle — Design System

Atualizado em 10/10/2026. Direção aprovada: aparência discreta inspirada em shadcn/ui, listas compactas no computador e captura simples no celular. O ESCOPO.md define as regras de negócio; este documento define sua apresentação.

## Base e identidade

React/Vite com Tailwind CSS 4 e componentes oficiais shadcn/ui baseados em Radix. Componentes ficam em `src/components/ui`, com personalizações locais. Não adicionar outra biblioteca para a mesma responsabilidade. A grade e o posicionamento da agenda permanecem próprios.

Zinc neutro nas superfícies e bordas; azul #0176D3 nas ações principais. Tema claro: fundo #FAFAFA, superfície #FFFFFF, texto #18181B, secundário #71717A, borda #E4E4E7. Tema escuro: fundo #09090B, superfície #18181B, texto #F4F4F5, secundário #A1A1AA, borda #3F3F46, azul #79B8FF. Pessoal e profissional usam indicadores pequenos; a cor vem acompanhada de texto.

Segoe UI, Arial, sans-serif; corpo 14 px, metadados 12 px, seções 16 px e título de página 26 px (22 px no celular). Campos de texto no celular usam 16 px. Espaçamento baseado em 4/8/12/16/24/32 px, controles com cantos de 6 px e painéis com 10 px. Tokens em `src/design-system.css`, compatíveis com tokens antigos durante a migração. Tailwind não injeta Preflight global neste projeto para preservar controles e grade existentes.

## Componentes e relações

- Cabeçalho, campos, estado vazio e aviso de reservas ocultas compartilhados em Experience. Botões, entradas, diálogos, painéis e menus usam componentes shadcn.
- Linhas de tarefas compartilhadas entre Tarefas, Meu dia e seleções: título e conclusão primeiro, metadados claros e labels em faixa secundária; prioridade acessível e ações adicionais em menu. Reservar/Reagendar continua disponível sem arraste.
- Adicionar tarefa cria diretamente. Captura rápida salva na caixa de entrada. Exibir destinos e processamento sem exigir decisões de IA antes do texto.
- Captura começa pelo texto, anexos e ditado; opções de processamento ficam recolhidas. Preservar texto e arquivos quando houver falha. Ditado depende do suporte/permissão do navegador.
- Editor em Sheet lateral, com salvar explícito e confirmação de descarte; corpo rolável e ações no rodapé. Manter todas as restrições de negócio atuais até a etapa funcional.
- Data e navegação de Meu dia ficam acima das abas. Agenda com filtros avisa quando reservas foram ocultadas e oferece limpar filtros. A contagem considera reservas que atravessam meia-noite.
- Agenda semanal mantém eventos reais e sobreposições. Alternância Dia/Semana e navegação explícita. No celular, iniciar no dia atual da semana exibida ou segunda-feira. Seleção e prévia em painel; no desktop ele permite consultar a agenda, no celular é modal. Nada é aplicado automaticamente.
- Pessoas e conversas preserva vínculo com tarefas e contexto de retorno. No celular, separar lista de pessoas/histórico e conversa. Modo IA usa o nome Histórico do agente.
- Configurações apresenta controles antes de ajuda longa. Estado de integração, carregamento, falha e recuperação deve refletir as respostas existentes; não criar estados fictícios.

## Responsividade

Abaixo de 1024 px, navegação em Sheet, sem alterar a preferência de menu salva. Linhas se reorganizam quando o contêiner tem menos de 720 px, preservando largura do título. Editor ocupa toda a largura abaixo de 768 px. Meu dia usa abas abaixo de 1200 px e duas colunas acima desse limite. Rolagem horizontal fica restrita à grade semanal.

Preservar densidades Compacta e Confortável. Não persistir escolhas automáticas de breakpoint como preferência do usuário.

## Acessibilidade e aceite

Rótulos em português, foco visível, nomes acessíveis em ícones, contraste legível e alternativas ao arraste. Dialog/Sheet/Menu Radix gerenciam foco; Escape devolve foco ao acionador. Proteger operações em andamento e alterações não salvas. Alvos de toque de pelo menos 44 px, movimento reduzido e reflow com zoom.

Validar 320, 390, 768, 820, 1024 e 1440 px, ambos os temas/densidades, dados longos, espera, reservas, vazio, erro e teclado. Evidências e limitações ficam na pasta revisao-de-arquitetura. A validação sintética não substitui testes autenticados de integrações nem comprova entrega das funcionalidades pendentes do ESCOPO.md.

Densidade padrão: Confortável, conforme preferência confirmada. A opção Compacta continua disponível; preferências já salvas são preservadas.
