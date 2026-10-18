# Plano de migração do layout para o padrão shadcn

> **Como usar numa nova conversa:** peça ao agente para ler `AGENTS.md`, `docs-internas/PROGRESSO.md` e este arquivo, e começar pela **Etapa 0**. Os mockups de referência estão no canvas de design "Torre de Controle — Telas" (9 telas: Meu dia, Tarefas, Editar tarefa, Nova tarefa, Captura rápida, Caixa de entrada, Pessoas e conversas, Agenda semanal, Configurações). Um commit por etapa; sem push sem pedido do dono.


## Contexto
Os mockups no canvas (Meu dia, Tarefas, Editar tarefa, Nova tarefa, Captura rápida, Caixa de entrada, Pessoas e conversas, Agenda semanal, Configurações) usam o padrão shadcn: controles de 36 px, cantos de 6 px, badges, abas em pílula, switches, tabelas compactas e menu lateral com item ativo em cinza. O app é usado todo dia e não pode perder dados, então a troca precisa ser gradual, reversível e sem tocar na lógica.

Abordagem escolhida: **híbrida, tela a tela**. Primeiro tokens e shell; depois, em cada tela, troca por componentes shadcn e remoção do CSS legado daquela tela. Cor primária continua `#0176d3`.

## O que o código tem hoje (levantamento)
- Três camadas de CSS sobrepostas: `src/style.css` (base antiga), `src/ux.css`, `src/design-system.css` (último, vence com `:root .app-shell …` e 18 `!important`). Mais CSS isolado por tela (`day-visual`, `inbox-card`, `conversations`, `planner-preview`, `agent`).
- Dois temas escuros em paralelo (~37 overrides em `style.css` + tokens do `design-system.css`).
- Faltam tokens shadcn padrão (`--card`, `--secondary`, `--destructive`, `--input`, `--ring`, `--radius`); `button.tsx` usa `bg-secondary` sem token.
- `src/components/ui` já tem: alert, badge, button, checkbox, collapsible, dialog, dropdown-menu, input, label, sheet, switch, tabs, textarea, tooltip. Badge, checkbox, label e switch não são usados ainda.
- Sem roteador: `page` é estado em `main.tsx:58` (valores `Home`, `Planejamento`, `Conversas`…). Os nomes "Meu dia", "Agenda semanal" e "Pessoas e conversas" já aparecem na interface por ternários em `AppShell.tsx:31` e `main.tsx:99`.
- Nova tarefa é um `<dialog>` nativo em `main.tsx:105`; Captura rápida já usa `Dialog` shadcn (`FeatureUI.tsx:20`).
- `npm test` e a CI (`build` + `test`) só cobrem lógica pura. Os Playwright (`supabase/tests/*_ui.mjs`) são manuais e dependem de textos, `aria-label`s e algumas classes.

## Regras da migração
1. **Só visual:** não alterar autosave de conversas, drag-and-drop (`taskDrag.ts`, `[data-task-id]`, `draggable`), reservas/agenda (`scheduling.ts`, `agendaLayout.ts`), `applyBatch`, `usePreference` nem chaves de localStorage.
2. **Preservar contratos dos testes:** nomes acessíveis (botões, labels, headings), `aria-label` e as classes consultadas (`.agenda-card`, `.conversation-*`, `.agent-*`, `.quick-capture-dialog`, `.app-shell.menu-compact`). `.card` em `conversation-pending` tem `className` exato testado: manter.
3. **Um commit por etapa**, commits pequenos em inglês no imperativo; sem `--no-verify`; sem push sem pedido (regra do `AGENTS.md`). Cada etapa deixa `npm run build` e `npm test` verdes e é reversível com `git revert`.
4. **Estilo novo só com utilitários Tailwind ou tokens** (`design-system.css`); sem CSS global novo. Código legível, uma instrução por linha, nos trechos alterados.
5. **Não editar `components/ui` à mão** além do necessário; ajustes de variante via `cva` do próprio arquivo ou classes no ponto de uso.

## Etapas

### Etapa 0 — Rede de segurança (sem mudança visual)
- `git status` / `git fetch`; trabalhar em branch `ui/shadcn-layout`.
- Rodar uma vez os Playwright existentes e anotar quais já falham (suspeita: `agent_ui.mjs` ainda procura o botão `Conversas`, mas o `aria-label` atual é "Pessoas e conversas"). Corrigir esses testes primeiro para ter linha de base confiável.
- Capturar screenshots "antes" de cada tela (fora do repo: `%TEMP%\torre-scratch\`).

### Etapa 1 — Tokens e base (invisível para o usuário)
Arquivos: `src/design-system.css`.
- Completar tokens shadcn no `:root` e `[data-theme=dark]`: `--card`, `--card-foreground`, `--popover`, `--secondary`, `--destructive`, `--input`, `--ring`, `--radius` (6 px). Mapear no `@theme inline`. Manter `--primary: #0176d3`.
- Unificar o tema escuro nos tokens (paleta do `design-system.css`) e preparar a remoção dos overrides escuros do `style.css`, **sem removê-los ainda**.
- Remover o remendo `:root [data-slot=button]` e `:root select` só quando as telas já usarem `Button`/`Select` próprios (etapas seguintes); nesta etapa apenas criar os tokens.
- Verificar: `npm run build`, `npm test`, abrir `npm run dev` em claro e escuro; nenhuma diferença visível.

### Etapa 2 — Shell: menu lateral e cabeçalho
Arquivos: `src/AppShell.tsx`, `src/components/Experience.tsx` (`PageHeading`), `src/design-system.css`.
- Menu: centralizar rótulos/ícones/contadores em um único array `items` (elimina os ternários repetidos), mantendo as chaves internas `Home`, `Planejamento`, `Conversas` (evita migrar preferência salva). Ícones lucide diferentes por item (Meu dia = Sun, Caixa de entrada = Inbox, Tarefas = ListChecks, Agenda semanal = CalendarDays, Pessoas e conversas = Users, Modo IA = Sparkles).
- Agrupar: itens de trabalho, grupo "Assistente" (Modo IA), grupo "Labels" (já existente, com `+`), rodapé com Configurações. Item ativo em cinza (`bg-muted`), contador discreto.
- Cabeçalho de 56 px: botão de recolher, trilha "Torre de Controle › tela", busca (`Input` shadcn), filtro de área (grupo de botões com `aria-pressed`, como hoje), `Capturar` primário, avatar. Mantém Ctrl+K e Escape.
- Mobile: a gaveta `Sheet` continua; ajustar só estilos.
- Manter classes `.sidebar`, `.app-topbar`, `.top-search`, `.top-area`, `.menu-compact` enquanto houver teste/CSS dependente.
- Verificar: Playwright `agent_ui.mjs` (menu recolher/expandir) e navegação manual entre páginas, em desktop e 390 px.

### Etapa 3 — Componentes de base reutilizáveis
Arquivos novos (pequenos, em `src/components/`): `PageHeader`, `StatCard`, `Toolbar` (se necessário). Reaproveitar `Badge`, `Checkbox`, `Switch`, `Label`, `Tabs` de `components/ui` e a variante de botão `outline`/`ghost` já existente. Criar variantes de `Badge` para prioridade (alta = vermelho, média = âmbar) e área (ponto colorido).
- Evita repetir o mesmo marcado em 8 telas e concentra a decisão visual.

### Etapa 4 — Configurações (menor risco, já tem design aprovado)
Arquivos: `main.tsx` (ramo `Configurações`, hoje linha ~103), `FeatureUI.tsx` (`IntegrationSettings`, `LabelEditor`), `TelegramSettings.tsx`, `AiModelSettings.tsx`, `ExportData.tsx`, `AgendaRange.tsx`.
- Submenu em grupos: **Preferências** (Aparência, Labels, Jornada de trabalho), **Integrações** (Google, Calendários e listas, Telegram, Inteligência artificial), **Dados** (Exportar dados).
- Conteúdo em coluna de até ~660 px; `Switch` nos liga/desliga; tabelas compactas; autosave nos controles simples (tema, densidade, faixa de horas, jornada, modelos), botão explícito só para chave de API, label e ações de integração. Manter os textos de botões que `ai_global_ui.mjs` e `telegram_ui.mjs` procuram (ou atualizar os testes no mesmo commit).
- Dividir `IntegrationSettings` em arquivos por seção (`settings/GoogleSection.tsx` etc.) ao mexer, sem reformatar o resto.

### Etapa 5 — Modais e painéis
- **Captura rápida** (`FeatureUI.tsx`): já é `Dialog`; ajustar para 512 px, cabeçalho/rodapé shadcn, `Select` do modelo, lista de anexos. Manter `.quick-capture-dialog` e textos de `capture_profiles_ui.mjs`.
- **Editar tarefa** (`TaskList.tsx` `TaskDetails`): `Sheet` com cabeçalho, separadores, `Switch` em "Foco do dia", rodapé fixo; **manter o salvar explícito e a confirmação de descarte**.
- **Nova tarefa** (`main.tsx` `<dialog>`): migrar para `Dialog` shadcn reaproveitando o formulário de Editar tarefa; atenção ao foco/ciclo de teclado hoje feito à mão em `main.tsx:79-88` e ao modo `'plan'` que usa o mesmo `<dialog>`. Fazer este por último dos modais e testar Tab/Escape.

### Etapa 6 — Telas, em ordem de menor risco para maior
1. **Caixa de entrada** (`FeatureUI.tsx` `Inbox`/`CaptureCard`, `inbox-card.css`): abas em pílula, cartões, sugestões com checkbox, estados processando/falhou com `Alert`.
2. **Tarefas** (`TaskList.tsx`, `TaskRow.tsx`, `BulkActions.tsx`, `InlinePriority.tsx`): barra de abas + selects de filtro, tabela com cabeçalho; badges de prioridade e área; `Checkbox`. Preservar `draggable`, `data-task-id` e o drag multi-seleção.
3. **Meu dia** (`Home.tsx`, `DayTaskGroup.tsx`, `AgendaEvents.tsx`, `day-visual.css`, `day-header.css`): cartões de resumo, lista agrupada, agenda lateral. Não mexer em alturas de 48 px/hora, `slotAt`, `onDrop`.
4. **Pessoas e conversas** (`Conversations.tsx`, `conversations.css`): só marcação/classes dos blocos; **sem tocar** em debounce, fila, versão otimista e recuperação local. Manter `.conversation-*` e o `className` exato do bloco de pendentes.
5. **Agenda semanal** (grade em `main.tsx` ramo `Planejamento`, `WeekPlanner.tsx`, `planner-preview.css`): painel lateral com proposta da IA e lista "sem horário"; carga por dia. Manter DnD da grade, rolagem automática e `Sheet` do planejador.

Cada tela: trocar elementos → remover as regras de CSS legado daquela tela (`ux.css`/`style.css`/`design-system.css`) → conferir lado a lado com o mockup → commit.

### Etapa 7 — Limpeza do legado
- Remover de `style.css`, `ux.css` e `design-system.css` as regras não referenciadas (busca por classe antes de apagar), os overrides escuros duplicados, os `!important` e os remendos `:root [data-slot=…]`.
- Considerar importar o Tailwind completo só se necessário; por ora manter como está.
- Atualizar `docs-internas/DESIGN_SYSTEM.md` (se existir) e `docs-internas/PROGRESSO.md`, e o `AGENTS.md` se algum comando/pasta mudar.

## Verificação (por etapa e no final)
- `npm run build` e `npm test` verdes a cada commit; `deno test --no-check supabase/tests` e `node supabase/validate-calendar.mjs` se algo de backend for tocado (não deve ser).
- `npm run dev`: percorrer as 9 telas em claro e escuro, em 1440 px e 390 px; comparar com os mockups do canvas.
- Playwright manual por tela afetada (`agenda_ui`, `conversations_ui`, `capture_profiles_ui`, `ai_global_ui`, `telegram_ui`, `agent_ui`), depois de corrigir os que já estavam desatualizados na Etapa 0.
- Teste funcional de regressão: criar/editar/concluir tarefa, arrastar tarefa para um horário e para uma label, salvar conversa e recarregar a página (rascunho preservado), aplicar proposta semanal.
- Publicação só a pedido: `npm run build && npm run publish:docs`; reverter = voltar ao commit anterior e republicar.

## Riscos e mitigação
- **Cascata de CSS em 3 camadas:** trabalhar por tela com escopo (`main.home-page`, `main.week-page`…) e apagar o legado da tela no mesmo commit.
- **Testes por texto/classe:** lista de contratos na seção "Regras"; atualizar o teste no mesmo commit quando o texto mudar de propósito.
- **`<dialog>` nativo → `Dialog`:** isolar na Etapa 5, último modal, com checagem de teclado.
- **Arquivos densos (`main.tsx` 34 KB, `Conversations.tsx` 27 KB):** editar só os trechos necessários; não reformatar o resto.

## Fora do escopo
Mudanças de regra de negócio, banco, Edge Functions, migrations, Modo IA (tela própria), nova versão mobile dedicada.
