# Torre de Controle — Design System

## Referência e direção
Referência: app GSA em Salesforce Gamificacao/app, interface inspirada no Salesforce Lightning. Reutilizar a linguagem visual, com estrutura simplificada para planejamento pessoal. Não copiar regras de gamificação, missões ou treinamento.

## Tokens
| Token | Valor | Uso |
|---|---|---|
| primary | #0176D3 | Botão principal e seleção |
| primary-strong | #0B5CAB | Texto azul e hover |
| heading | #032D60 | Títulos |
| canvas | #EEF1F6 | Fundo da aplicação |
| surface | #FFFFFF | Cartões e navegação |
| border | #D8DDE6 | Divisórias |
| text | #181818 | Texto principal |
| muted | #526174 | Texto secundário |
| personal | #6B3FA0 | Identificação pessoal |
| professional | #0B5CAB | Identificação profissional |
| success | #2E7045 | Conclusão |
| warning | #8A5700 | Prazo próximo |
| danger | #BA0517 | Erros e atraso |

Tipografia: Segoe UI, Arial, sans-serif. Base 14px; metadados 12px; títulos de seção 16px; título principal 26px. Pesos 400, 600 e 700.
Espaçamento: 4, 8, 12, 16, 24 e 32px. Cantos: 6px em controles, 10px em cartões. Sombras discretas apenas em elementos elevados. Bordas de 1px.

## Estrutura
Estrutura de app web tradicional: menu lateral branco de 248px com marca, seletor de área, captura e navegação; configurações e perfil no rodapé do menu. Barra superior fixa com busca de tarefas sempre disponível e captura rápida. A busca leva à lista de tarefas e mantém seu texto ao navegar. Conteúdo à direita com margens de 36px; manter azul, cinza claro e cartões brancos do GSA. Referência estrutural: imagem enviada em 04/10/2026, sem reproduzir tema escuro, IA ou funções fora do escopo. No celular, menu lateral abre por botão e a busca permanece no topo.

## Componentes
- Abas Tudo / Pessoal / Profissional com indicação textual e sublinhado azul.
- Agenda: sete colunas, horários e blocos com início/fim explícitos. Ocupado em cinza, tarefas pessoais em violeta claro, profissionais em azul claro. Não depender apenas da cor.
- Cartão de tarefa: descrição, área, duração, origem e prazo, com ação Planejar e Concluir.
- Linha de tarefa na lista independente: checkbox de conclusão, descrição, área, duração, origem e prazo. Concluir é a ação principal; reservar horário é opcional. Mostrar reserva existente sem ocultar a tarefa. Concluídas permitem reabrir. No celular, ações ficam abaixo do conteúdo.
- Captura: diálogo com rótulos persistentes; descrição, área e duração obrigatórias; prazo opcional.
- Planejamento: diálogo de dia e horário como alternativa ao arraste; validação de colisão e jornada.
- Jornada: linhas por dia da semana, ativação e início/fim.
- Botão primário azul; secundário branco com borda; destrutivo apenas onde necessário.
- Avisos: mensagens curtas de resultado ou erro em região de status.

## Estados
Estado vazio convida a capturar a primeira tarefa. Filtro sem resultados oferece limpar filtros. Integração futura deve distinguir carregando, desconectado, erro e atualizado; nunca apresentar dados fictícios como conexão ativa.
Na validação inicial, “Google Tasks · demonstração” e “Agenda · demonstração” são rótulos explícitos. Dados criados pelo usuário permanecem no navegador utilizado.

## Responsividade e acessibilidade
Desktop: agenda e pendências lado a lado. Abaixo de 1000px: empilhar painéis e permitir rolagem horizontal dentro da agenda, sem expandir a página. No celular, oferecer foco no dia e planejamento por botão.
Alvos de toque de pelo menos 44px, foco visível, contraste legível, rótulos em inputs, botões com nomes claros. Diálogos fecham por Escape, retêm o foco e o devolvem ao acionador. Suportar prefers-reduced-motion. Cor sempre acompanhada de texto.

## Conteúdo
Português brasileiro, direto e sem jargão técnico. Exemplos: Nova tarefa, Planejar, Voltar às pendências, Ocupado, Cabe em até 30 min. Sem mensagens de IA, ranking ou recompensas.

## Definição de pronto visual
Validar tela inicial, semana, foco no dia, captura, planejamento, vazio e jornada em desktop e celular. Conferir ausência de sobreposição, navegação por teclado e legibilidade de horários e ações.
