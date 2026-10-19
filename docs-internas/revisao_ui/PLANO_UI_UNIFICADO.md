# Plano unificado — migração de UI para o padrão shadcn

Substitui `PLANO_UI_SHADCN.md` (mantido só como histórico). Referência visual: `torre_nova_ui_shadcn.html` (10 telas, 1440 px, modo claro), guardada fora do repositório em `C:Userssamue	orre-arquivomockups-ui` (HTML não é versionado; ver `AGENTS.md`).

**Como usar numa nova conversa:** ler `AGENTS.md`, `docs-internas/PROGRESSO.md` e este arquivo; começar pela Etapa 0. Um commit por etapa; sem push sem pedido do dono.

## Registro de decisões (dono, 2026-10-19) e pendências

Todas as decisões em aberto da migração de UI foram levadas ao dono. **Não há mais decisão em aberto**, exceto a marcada como "aguarda o dono". Os itens de trabalho decorrentes estão em "Trabalho aprovado, ainda não feito".

### Decisões tomadas
| Tema | Decisão | Efeito |
|---|---|---|
| Rótulo "Somente consulta" nas runs antigas do Modo IA | Manter | Nada a fazer |
| "Descartar" proposta do Modo IA | Manter local (só oculta no navegador; a proposta expira no servidor) | Nada a fazer |
| Toda proposta do Modo IA exige Aplicar | Confirmado (decisão anterior) | Já em produção |
| Carga por dia na Agenda | **Contar tarefas + reuniões do Google** (hoje conta só tarefas) | Item de trabalho T1 |
| Ordem padrão da lista de Tarefas | **Prazo** (hoje "Mais recentes") | Item de trabalho T2 |
| Agenda semanal no celular | **Gaveta (`Sheet`)** para proposta da IA e "Tarefas sem horário" (hoje empilhado) | Item de trabalho T3 |
| Dicas em Configurações e Captura rápida | Manter texto como no mockup | Nada a fazer |
| "Excluir tarefa" do mockup | **Não implementar** (evita perda de dados) | Nada a fazer; registrado como diferença aceita |
| Menu "⋯" da conversa no Modo IA | **Criar renomear e excluir; "excluir" = arquivar (recuperável)** | Item de trabalho T4 (backend) |
| Refazer `ReservationDecision`, `FocusReview` e menu mobile no kit | **Depois** | Pendência P1 |
| Componentes shadcn sem uso (`badge`, `checkbox`, `collapsible`, `input`, `label`, `select`, `switch`, `tabs`, `textarea`) | **Apagar** | **Feito** (commit local; `tsc`, build e `npm test` verdes) |
| Mockups HTML (`torre_nova_ui_shadcn.html`, `Modo IA-html/`) | **Mover para fora do projeto** | **Feito**: agora em `C:\Users\samue\torre-arquivo\mockups-ui\` |
| Teste de restauração do backup (`scripts/restore-test.ps1`) | Dono faz depois | Pendência P2 (dono) |
| Pasta `.db-validation/` (115 MB, ignorada pelo git) | **Aguarda o dono** (pediu risco x benefício) | Pendência P3 (dono) |

### Trabalho aprovado, ainda não feito
| ID | Item | Observações |
|---|---|---|
| T1 | Carga por dia inclui reuniões do Google | Mudar `src/dayLoad.ts` (somar eventos com horário, não recusados, dentro do dia) + teste novo em `unit-tests.mjs`; decidir se reunião fora da jornada conta (proposta: conta até o limite da barra) |
| T2 | Ordem padrão de Tarefas = Prazo | Mudar o padrão de `usePreference(...,'task-sort')`; afeta quem nunca escolheu ordem; conferir `ui-smoke` e capturas |
| T3 | Agenda mobile em `Sheet` | Botões "Sem horário · N" e "Sugerir minha semana" abrem a gaveta; grade do dia fica livre; manter DnD no desktop; capturas 390 px |
| T4 | Modo IA: renomear e arquivar conversa | **Backend:** migration nova (coluna de título e de arquivamento em conversas, RPCs com RLS, teste SQL de isolamento), Edge Function e deploy pelo dono (ou autorizado); **frontend:** menu "⋯" no cabeçalho da conversa; arquivadas somem da lista e voltam por "Ver arquivadas". Plano próprio antes de começar |

### Pendências em aberto
| ID | Pendência | Responsável | Situação |
|---|---|---|---|
| P1 | Refazer `ReservationDecision`, `FocusReview` e o menu mobile no kit; depois apagar remendos `:root [data-slot=…]` e `!important` | Agente, quando o dono pedir | Adiado por decisão |
| P2 | Teste de restauração do backup no projeto descartável | Dono | Aberta |
| P3 | `.db-validation/` | Dono | Aguarda decisão (ver risco x benefício no relatório da sessão) |
| P4 | Conferir em produção (logado) o Modo IA e a Agenda semanal | Dono | Aberta (publicado em 2026-10-19) |

**Situação geral:** a migração visual (Etapas 0 a 7 e Modo IA) está concluída e publicada. Restam T1 a T4 (melhorias aprovadas) e P1 a P4.

## Decisões fechadas (dono, 2026-10-18)
| Tema | Decisão |
|---|---|
| Carga por dia na Agenda | **Implementar**, calculada no frontend (reservas + jornada), em commit próprio de "feature" |
| Autosave nas Configurações | **Só controles simples** (tema, densidade, faixa de horas, jornada, modelos). Chave de API, label e ações de integração mantêm botão explícito |
| Mobile (390 px) | **Todas as telas responsivas**, com desenho de 390 px definido antes de implementar cada tela (ver "Mobile") |
| Navegação mobile | **Barra inferior** (Meu dia, Caixa, Tarefas, Agenda, Mais) |
| Capturar no mobile | **Botão flutuante** |
| Agenda no mobile | **Um dia por vez** |
| Tarefas no mobile | **Lista de 2 níveis, ações no menu "…"**, sem arrastar |
| Modo escuro | **Derivar dos tokens**, sem mockup novo; revisar capturas em escuro ao fim de cada etapa |

## Protocolo de fidelidade ao mockup (obrigatório em toda tela)

**Por que existe:** as Etapas 3 e 4 ficaram abaixo do mockup. O objetivo do projeto é um visual melhor e mais organizado, não só código mais limpo. A causa: o CSS antigo (`button{min-height:44px;color:azul}`, `input,select{...}`, regras `:root …`) vence os utilitários Tailwind e os componentes shadcn, e a marcação antiga foi só "adaptada".

**Descobertas (2026-10-18)**
- O mockup é um mini design system escrito à mão (~25 classes, ~6 KB de CSS por tela): `.nav .sub .btn(.btn-p/-d/-g/-sm/-i) .inp .lab .desc .sep .sw .badge .tbl .th .tr .seg`. O layout está em estilos inline. Dá para **portar quase literalmente**.
- Isolar o CSS antigo em `@layer` foi testado e **rejeitado**: mudou 20–30% dos pixels no mobile escuro e quebrou espaçamentos, porque CSS sem camada passa a vencer qualquer regra antiga, independentemente da especificidade.

**Regras**
1. **Fonte da verdade = HTML do mockup.** Antes de cada tela: extrair DOM e CSS reais (script no rascunho) e capturar **todos os estados** do mockup (cada seção/aba/estado vazio/erro), 1440 px (e a versão 390 px definida).
2. **Kit portado:** `src/ui-kit.css` com as classes do mockup, escopado em `.tc` (especificidade 0,2,0, vence `button`, `input` e `:root button` do CSS antigo), usando as cores do tema (`--border`, `--muted`, `--primary`…) para o modo escuro funcionar. Componentes finos em `src/ui-kit/` (`Sw`, `Seg`…). A tela migrada ganha o wrapper `.tc`; **marcação nova com as classes do mockup, não adaptação da antiga**. Lógica, hooks e dados não mudam.
3. **Exceção à regra "sem CSS novo":** `ui-kit.css` é permitido (é a porta do mockup). A cada tela migrada, apagar o CSS antigo dela (Etapa 7 vira incremental).
4. **Aceite visual por tela (bloqueia o commit):** (a) capturas lado a lado mockup × app, mesmo viewport e mesmos dados de exemplo; (b) checklist: tipografia (14/13/12 px, pesos 500/600), alturas (36/34/32 px), raios (6/8 px), espaçamentos (gap 16/24/32), cores, ícones, rótulos e textos de apoio idênticos; (c) diferença de pixels medida e anotada; (d) tema escuro conferido; (e) 390 px conferido.
5. **Dados de exemplo:** o que o mockup mostra e o app ainda não calcula (contadores, "Ativo", "Sincronizado hoje") é decidido antes: ligar a dado real existente, ou omitir e registrar a diferença.
6. **Desvios só com decisão do dono**, registrados na lista de diferenças conhecidas da tela.

**Refazer (fora da ordem original)**
- **Etapa 3b — Shell fiel:** marca com ícone, contadores nos itens (Meu dia, Caixa, Tarefas) e nas labels, Modo IA separado por divisor (sem o título "Assistente"), Labels sem seta de recolher, "Configurações" e "Recolher menu" no rodapé, botão de painel e trilha no cabeçalho, busca à direita, `Capturar`, avatar "SV" com a conta (sai e e-mail passam para o menu do avatar). Largura da lateral 240 px.
- **Etapa 4b — Configurações fiel (8 seções):** Aparência, Labels (tabela + editor com paleta), Jornada de trabalho (tabela com switches e total de horas), Google (cartão de status + ações), Calendários e listas (duas tabelas com switches), Telegram (cartão de status + passos), Inteligência artificial (switch, chave, modelos), Exportar dados.

## Princípios (valem para todas as etapas)
1. **Só visual**, exceto os itens marcados "feature" abaixo, sempre em commit separado e cortável. Não alterar: autosave de conversas, drag-and-drop (`taskDrag.ts`, `[data-task-id]`, `draggable`), `scheduling.ts`, `agendaLayout.ts`, `applyBatch`, `usePreference`, chaves de localStorage.
2. **Contratos dos testes preservados:** nomes acessíveis, `aria-label`, `.agenda-card`, `.conversation-*`, `.agent-*`, `.quick-capture-dialog`, `.app-shell.menu-compact`; `className` exato do `.card` em `conversation-pending`.
3. Cada etapa deixa `npm run build`, `npm test` e o smoke de UI verdes e é reversível com `git revert`.
4. Estilo novo só com utilitários Tailwind ou tokens de `src/design-system.css`; sem CSS global novo; `components/ui` só via `cva` ou classes no ponto de uso.
5. Banco, migrations e Edge Functions: fora do escopo deste plano. O Modo IA (tela própria) é tratado em `PLANO_MODO_IA_UNIFICADO.md`.
6. Fidelidade ao mockup tem prioridade sobre reaproveitar componentes shadcn; ver "Protocolo de fidelidade".

## Itens "feature" (não são só visual)
- F1. Carga por dia na Agenda semanal (decidido: implementar).
- F2. Cartões de resumo em Meu dia (derivados de dados já carregados).
- F3. Autosave dos controles simples em Configurações.
- F4. Painel lateral "Tarefas sem horário" na Agenda, se ainda não existir como lista equivalente.
- F5. Navegação mobile: barra inferior, "Mais" e botão flutuante Capturar.
- F6. Agenda de um dia por vez no mobile (seletor de dia).
Cada um: commit próprio, teste de regra nova quando houver cálculo (`npm test`), pode ser cortado sem quebrar a etapa.

## Etapas

### Etapa 0 — Rede de segurança (sem mudança visual)
- `git status`/`git fetch`; branch `ui/shadcn-layout`.
- Rodar os Playwright existentes (`agent_ui`, `agenda_ui`, `conversations_ui`, `capture_profiles_ui`, `ai_global_ui`, `telegram_ui`), anotar falhas e corrigir primeiro (suspeita: `agent_ui.mjs` procura o botão `Conversas`; o `aria-label` atual é "Pessoas e conversas").
- Criar `scripts/ui-smoke.mjs`: abre cada página pelo menu e **falha se houver erro de console**, em 1440 px e 390 px. Se for mantido, citar no `AGENTS.md`.
- Capturas "antes" de cada tela (1440/390, claro/escuro) em `%TEMP%\torre-scratch\`, fora do repositório.

### Etapa 1 — Tokens e base (invisível)
`src/design-system.css`: completar `--card`, `--card-foreground`, `--popover`, `--secondary`, `--destructive`, `--input`, `--ring`, `--radius` (6 px) no `:root` e `[data-theme=dark]`, mapear no `@theme inline`; manter `--primary: #0176d3`. Unificar o escuro nos tokens, sem remover ainda os overrides de `style.css`. Verificar: build, test, `npm run dev` em claro e escuro sem diferença visível.

### Etapa 2 — Componentes de base (antes do shell)
`src/components/`: `PageHeader`, `StatCard`, variantes de `Badge` (prioridade: alta vermelho, média âmbar; área: ponto colorido), `Select` shadcn (substitui os selects nativos, cujo chevron preto destoa), reuso de `Checkbox`, `Switch`, `Label`, `Tabs`. Reescrever `PageHeading` uma única vez aqui.

### Etapa 3 — Shell: menu lateral e cabeçalho
`AppShell.tsx`, `Experience.tsx`, `design-system.css`.
- Array único `items` (acaba com os ternários), mantendo as chaves `Home`, `Planejamento`, `Conversas`. Ícones lucide por item; grupos "Assistente" (Modo IA) e "Labels" (com `+`); Configurações no rodapé; ativo em `bg-muted`.
- Cabeçalho 56 px: recolher, trilha, busca (`Input`), filtro de área (`aria-pressed`), `Capturar`, avatar. Manter Ctrl+K e Escape.
- Remover o rótulo "Planejamento" sob o logo.
- **Mobile (F5, feature):** barra inferior de 5 itens + "Mais" (`Sheet`) e FAB de Capturar, conforme a seção "Mobile". Reaproveita o mesmo array `items`; muda só a apresentação abaixo de 768 px. Atenção: o `aria-label` dos botões da barra deve ser igual ao do menu lateral (ex.: "Pessoas e conversas") para não quebrar os testes.
- Manter `.sidebar`, `.app-topbar`, `.top-search`, `.top-area`, `.menu-compact` enquanto houver teste/CSS dependente.

### Etapa 4 — Configurações
Submenu em grupos: Preferências (Aparência, Labels, Jornada), Integrações (Google, Calendários e listas, Telegram, IA), Dados (Exportar). Coluna até ~660 px; `Switch`; autosave só nos controles simples (F3). Dividir `IntegrationSettings` por seção ao mexer. Manter textos que `ai_global_ui` e `telegram_ui` procuram, ou atualizar o teste no mesmo commit.

### Etapa 5 — Modais e painéis
- Captura rápida (`Dialog`, 512 px, `Select` do modelo, lista de anexos).
- Editar tarefa (`Sheet`, `Switch` em "Foco do dia", rodapé fixo; **manter salvar explícito e confirmação de descarte**).
- Nova tarefa (`<dialog>` → `Dialog`, por último; testar Tab/Escape e o modo `'plan'`).

### Etapa 6 — Telas, de menor a maior risco
Cada tela: trocar elementos → remover o CSS legado da tela → conferir lado a lado com o mockup e com o desenho mobile → commit.
1. **Caixa de entrada** — abas em pílula, cartões, sugestões com `Checkbox`, `Alert` para processando/falhou.
2. **Tarefas** — abas, `Select`s, tabela com cabeçalho, badges; preservar `draggable`, `data-task-id` e arrastar multi-seleção.
3. **Meu dia** — cartões de resumo (F2), lista agrupada, agenda lateral. Não mexer em 48 px/hora, `slotAt`, `onDrop`.
4. **Pessoas e conversas** — só marcação/classes; sem tocar em debounce, fila, versão otimista e recuperação local.
5. **Agenda semanal** — painel da IA, "Tarefas sem horário" (F4), carga por dia (F1); manter DnD, rolagem automática e `Sheet` do planejador.

### Etapa 7 — Limpeza do legado
Remover regras não referenciadas (buscar a classe antes), overrides escuros duplicados, `!important`, remendos `:root [data-slot=…]` e `:root select`. Atualizar `docs-internas/PROGRESSO.md` e `AGENTS.md` se algo mudar.

## Correções de design aplicadas durante a implementação
- **Meu dia:** botão "Foco" só no hover/foco de teclado (ou no menu "…"); linha do "agora" atrás do texto dos eventos; "Aguardando retorno" com contraste AA e marcador de estado, sem usar opacidade.
- **Agenda:** eventos curtos (15 a 30 min) com altura mínima e tooltip com texto e horário completos.
- **Conversas:** "Excluir rascunho" fora da hierarquia de "Nova conversa" (menu "…" ou `ghost` vermelho com confirmação); pessoa selecionada com destaque claro.

## Mobile (390 px) — decisão por tela
Decisões (dono): **barra inferior** de navegação, **botão flutuante** para Capturar, Agenda **um dia por vez**, Tarefas em **lista com ações por menu**.

Padrão:
- **Barra inferior fixa** (≤ 767 px) com 5 itens: Meu dia, Caixa de entrada, Tarefas, Agenda, Mais. "Mais" abre um `Sheet` com Pessoas e conversas, Modo IA, Labels e Configurações. Contador da Caixa como ponto/número no ícone. Respeitar `env(safe-area-inset-bottom)`.
- **Cabeçalho reduzido:** título da tela, busca como ícone (abre campo em tela cheia), filtro de área em menu. Sem botão de recolher.
- **Capturar:** botão flutuante (FAB) no canto inferior direito, acima da barra inferior; esconde ao abrir teclado. Substitui o botão do cabeçalho no mobile; Ctrl+K segue no desktop.
- Conteúdo em coluna única, alvos de toque ≥ 44 px, sem rolagem horizontal da página, conteúdo com padding inferior para não ficar atrás da barra e do FAB.
- A gaveta `Sheet` atual deixa de ser a navegação principal no mobile; `.menu-compact` continua só no desktop.

| Tela | Desenho em 390 px |
|---|---|
| Meu dia | Cartões de resumo em 2×2; Tarefas do dia em linhas; agenda abaixo, em seção recolhível |
| Tarefas | Tabela vira lista de 2 níveis: título + checkbox; abaixo badges e prazo · prioridade · duração. Concluir pelo checkbox; demais ações no menu "…"; sem arrastar. Filtros num `Sheet` com botão "Filtrar" |
| Caixa de entrada | Abas com rolagem horizontal; cartões em largura total; ações empilhadas |
| Pessoas e conversas | Lista de pessoas e conversa em duas telas (lista → detalhe, com voltar); rodapé de salvar fixo acima da barra inferior |
| Agenda semanal | **Um dia por vez:** seletor Seg–Dom no topo (com ponto nos dias com reservas), grade de horas de um dia, navegação por setas ou deslize; carga do dia (F1) sob o seletor; proposta da IA e "Tarefas sem horário" em `Sheet`, abertos por botão. Grade de 7 colunas só em ≥ 768 px |
| Configurações | Acessada por "Mais"; submenu vira lista de seções; cada seção em página própria com voltar |
| Editar tarefa | `Sheet` em tela cheia, rodapé fixo |
| Nova tarefa / Captura rápida | `Dialog` em tela cheia, foco no primeiro campo |

Regras: o desenho de cada tela em 390 px é definido (mockup ou descrição aprovada) **antes** de implementar a tela; o smoke de UI roda em 390 px; DnD continua só no desktop (no mobile, escolher horário por seletor, sem alterar `taskDrag.ts`).

## Verificação (por etapa e no final)
- `npm run build`, `npm test`, `ui-smoke` verdes; `deno test --no-check supabase/tests` e `node supabase/validate-calendar.mjs` só se algo de backend for tocado (não deve).
- `npm run dev`: 10 telas em claro e escuro, 1440 px e 390 px; comparar com mockups e capturas "antes".
- Teclado nos modais afetados: Tab, Escape, foco visível.
- Regressão funcional: criar/editar/concluir tarefa; arrastar para horário e para label; salvar conversa e recarregar (rascunho preservado); aplicar proposta semanal.
- Publicação só a pedido: `npm run build && npm run publish:docs`; reverter = commit anterior e republicar.

## Riscos
- **Cascata de 3 CSS:** escopo por tela (`main.home-page`, `main.week-page`…), apagar o legado da tela no mesmo commit.
- **Testes por texto/classe:** contratos listados nos princípios; atualizar o teste junto quando o texto mudar de propósito.
- **Escuro sem mockup:** revisar capturas ao fim de cada etapa; ajustar tokens, não telas.
- **Mobile em telas densas (Agenda, Conversas):** o desenho prévio por tela é obrigatório; sem ele a tela não entra na etapa.
- **Arquivos densos** (`main.tsx` 34 KB, `Conversations.tsx` 27 KB): editar só os trechos necessários.
