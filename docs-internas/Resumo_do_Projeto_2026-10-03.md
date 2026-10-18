# Resumo do projeto — Centro de Treinamento Executivo com IA + Torre de Controle

Data do resumo: 3 de outubro de 2026.

Este documento reúne o trabalho registrado na conversa e os arquivos locais conferidos nesta data. Os recursos do Google foram verificados durante a configuração anterior; seus links não foram reabertos para este resumo.

## 1. Objetivo e decisões

Construir uma ferramenta pessoal para acompanhar temas críticos, decisões, reuniões, comunicação executiva e treinos de conversas difíceis.

- Usar somente dados fictícios e genéricos.
- Manter um HTML local como protótipo e alternativa de uso.
- Adotar Google Drive para arquivos, Google Sheets para dados e Apps Script para automação e futura interface web.
- Deixar Looker Studio como evolução opcional.
- Retirar AppSheet da arquitetura alvo, conforme a orientação mais recente. Os documentos locais sobre AppSheet são referências de uma proposta anterior.
- Usar a conta pessoal confirmada na conversa para os recursos Google.
- Pedir confirmação antes das ações sensíveis previstas no pedido: criar ou editar recursos Google, executar o script pela primeira vez, publicar, alterar permissões ou criar gatilhos.
- Não enviar e-mails, não compartilhar publicamente e não apagar arquivos.

A intenção é usar este ambiente pessoal com exemplos sintéticos. O uso futuro de dados corporativos deverá acontecer no ambiente aprovado pela empresa, seguindo suas regras.

## 2. Protótipo local e revisão para uso diário

Foi criado e refinado um HTML autocontido, com Torre de Controle, visão semanal, geração de mensagens, preparação de reuniões, simulador, templates e exportações.

Arquivo principal: `Centro de Treinamento Executivo IA/01_HTML_Local/index.html`.

Melhorias registradas na versão revisada:

1. Atualização rápida com os campos de uso frequente primeiro e detalhes opcionais recolhidos.
2. Apenas o título/nome obrigatório na criação de tema; lacunas de dono, ação e data são sinalizadas.
3. Posição calculada a partir do status no protótipo.
4. Atalho para usar o dono do tema como responsável pelo próximo passo.
5. Possibilidade de desfazer a última alteração da sessão, com limites documentados.
6. Filtros para temas ativos, atrasados, com escalação, lacunas ou atualização antiga.
7. Visão semanal com prioridades sugeridas, ações vencidas, decisões, pedidos de ajuda e compromissos.
8. Botões para gerar mensagens diretamente a partir dos dados atuais do tema.
9. Simulador com perguntas difíceis, níveis de pressão e rodadas de réplica.
10. CSV completo ou filtrado, com UTF-8/BOM, vírgula, aspas e quebras de linha tratadas e proteção contra interpretação de texto como fórmula.
11. Separação das fontes de dados, templates, regras, interface, inicialização e estilos; montagem em um único HTML.
12. Adaptação da tabela para cartões e dos formulários para telas de celular.

Também foram produzidos CSVs, schema, templates, documentação, backlog e um pacote local `Centro_de_Treinamento_Executivo_IA_v2.zip`. O pacote é uma entrega anterior; sua equivalência com todos os arquivos atuais não foi reconferida neste resumo.

## 3. Validação do protótipo

O relatório local registra **43 de 43 verificações automatizadas aprovadas**, cobrindo criação/edição, filtros, resumo semanal, mensagens, simulador, reuniões, JSON, CSV, validação de dados, falha de armazenamento e proteção de conteúdo exibido.

Esses testes executam o JavaScript com interfaces e armazenamento simulados. O relatório atual também registra uma conferência anterior em navegador real de layout, foco, cópia, persistência e importação/exportação. Essa conferência não foi repetida para este resumo.

O simulador usa heurísticas locais. Suas notas são apoio ao treino, não avaliação validada de desempenho nem resultado de uma API de IA generativa.

## 4. Estrutura criada no Google Drive

Foi criada a pasta principal **Centro de Treinamento Executivo IA**, com dez subpastas:

```text
00_Inbox
01_Google_Sheets
02_Apps_Script
03_HTML_Web_App
04_Templates
05_Dados_Sinteticos
06_Exports
07_Documentacao_MD
08_Looker_Studio
09_Archives
```

[Abrir a pasta principal](https://drive.google.com/drive/folders/1vLRJ08RzekiD3YWRm7bRLVL-6-LBvDLq).

A estrutura foi verificada durante a configuração como pertencente à conta pessoal confirmada, sem compartilhamento público. As subpastas reservam espaço para as próximas entregas; sua existência não significa que todas já contenham os arquivos planejados.

## 5. Google Sheets configurado

Foi criada a planilha **Torre de Controle Executiva**, dentro de `01_Google_Sheets`.

[Abrir a planilha](https://docs.google.com/spreadsheets/d/1oLf82drufQDRQf7Y7sYWORun-KVNzQtf4t_UikYqHEM/edit).

Ela contém oito abas sem acentos:

| Aba | Conteúdo inicial verificado |
|---|---|
| Temas | 8 temas fictícios |
| Decisoes | 4 decisões fictícias |
| Reunioes | 4 reuniões fictícias |
| Simulacoes | 5 simulações fictícias |
| Templates | 15 templates |
| Historico | 3 eventos sintéticos |
| Dashboard | 14 indicadores calculados |
| Config | 10 listas de validação |

Configurações concluídas:

- Cabeçalhos conforme o pedido de configuração Google, em snake_case.
- Primeira linha congelada e filtros nas seis abas operacionais.
- Formatação de cabeçalhos, textos, datas e horários.
- Localidade brasileira e fuso `America/Sao_Paulo`.
- Quatorze validações estritas ligadas às listas da aba Config.
- Notas do simulador numéricas, de 1 a 5.
- Indicadores de status, lacunas de dono/data, decisões pendentes, reuniões, simulações e médias das notas.

### Verificações realizadas no Google

- Existência da planilha, pasta de destino, oito abas e cabeçalhos.
- Quantidade de registros fictícios e tipos das notas.
- Regras de validação e respectivas referências à Config.
- Quatorze resultados do Dashboard sem erros de fórmula.
- Recálculo real: um status foi temporariamente alterado, os indicadores mudaram e o exemplo foi restaurado.
- Conferência visual do Dashboard e da Config no Chrome.
- Acesso restrito à conta proprietária no momento da verificação.

As fórmulas e validações foram preparadas para as linhas 2 a 1000, ou 999 registros por aba. Esse alcance precisa ser ampliado antes de ultrapassar a capacidade prevista.

O indicador “Decisões pendentes” conta somente o status Pendente. “Em analise” fica fora dessa contagem, conforme a definição registrada na planilha.

## 6. Apps Script e documentação

Há arquivos locais de preparação em `Centro de Treinamento Executivo IA/03_Apps_Script`:

- `Code.gs`;
- `Schema.gs`;
- `Index.html`;
- plano do Web App e estrutura recomendada.

O relatório local registra verificação sintática do código. Esses arquivos são um esqueleto de implementação, ainda sem comprovação de execução nos serviços Google.

**Não há criação confirmada de um projeto Apps Script vinculado à planilha, primeira execução ou publicação de Web App.** Também não há URL de script ou de aplicativo publicado para entregar.

A documentação local cobre campos, regras de uso, contexto, melhorias, testes, conexão, arquitetura e backlog. A criação dos onze documentos solicitados em `07_Documentacao_MD` do Google Drive permanece pendente de confirmação e execução.

## 7. Divergências que precisam ser resolvidas

Os arquivos locais passaram por revisões, e alguns planos ainda descrevem versões anteriores. A documentação antiga de conexão, por exemplo, fala em sete abas e conexão manual, enquanto a planilha Google já possui oito abas configuradas.

O relatório de testes local registra migração para snake_case e schemaVersion 2. Entretanto, o schema local inclui campos adicionais, como `motivo` e `nivel_risco`, e alguns documentos ainda citam schemaVersion 1 e nomes antigos.

Portanto, **não existe sincronização automática comprovada entre o HTML local e a planilha Google**. Antes de integrar, é necessário consolidar cabeçalhos, tipos, enums, posição, escala de notas e regras de migração. Backups antigos não devem ser importados presumindo compatibilidade.

A visão semanal do protótipo representa a carteira atual. Selecionar uma semana antiga não reconstrói automaticamente a posição histórica dos temas.

## 8. Próximos passos em ordem de prioridade

1. Consolidar um contrato único entre a planilha atual, o HTML e o Apps Script; atualizar documentos antigos.
2. Preparar a implementação final e obter confirmação para criar e preencher o projeto Apps Script vinculado.
3. Implementar leitura, criação e edição com validação, IDs estáveis, tratamento de datas, histórico e controle de conflitos.
4. Conectar a interface via HTML Service e testar mensagens, reuniões, simulador e resumo semanal.
5. Obter confirmação para a primeira execução e realizar os testes nos serviços Google.
6. Implementar briefing em Google Docs e backup manual, com confirmação antes de criar cada recurso.
7. Criar a documentação do projeto na pasta Google reservada, após autorização.
8. Solicitar confirmação para publicar o Web App com execução como proprietário e acesso apenas ao próprio usuário.
9. Avaliar Looker Studio somente depois de estabilizar o uso diário e a qualidade dos dados.

## 9. Estado atual

**Concluído:** protótipo local revisado, materiais locais de apoio, estrutura de pastas no Drive e planilha Google com exemplos sintéticos, validações e Dashboard testado.

**Pendente:** integração efetiva entre HTML e Sheets, consolidação do contrato, projeto Apps Script online, testes de execução, documentação no Drive e publicação restrita do Web App.

Este resumo foi salvo localmente. Nenhum recurso Google foi criado ou alterado durante sua elaboração.
