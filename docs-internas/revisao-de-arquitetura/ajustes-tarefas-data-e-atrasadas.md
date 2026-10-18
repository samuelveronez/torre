# Menu de tarefas, data e proposta para atrasadas

Entregue: menu compartilhado com prioridades Alta/Media/Baixa/Sem prioridade, sem abrir editor. Hover abre menu e submenu, escolha explicita salva. Clique, toque e teclado preservados. Indicador reflete o valor salvo e falha mantem o valor anterior com mensagem acessivel. Data numerica redundante removida de Meu dia; mantidos seletor por icone, anterior/proximo e Hoje.

Proposta ainda nao implementada: acao discreta Reprogramar no cabecalho Atrasadas. Abre um dialogo com tarefas atrasadas dos filtros atuais inicialmente selecionadas; permite desmarcar, escolher Hoje ou outra data e revisar quantidade e prazos antes de aplicar. Alterar apenas prazo, preservando reservas, foco e acompanhamento. Oferecer Desfazer apos sucesso. Distinguir hoje real da data exibida em Meu dia, mostrando a data de destino no resumo.

Validacao local: alteracao de prioridade por clique e teclado, Escape restaura foco, falha simulada mantem prioridade anterior. Navegacao entre datas atualiza cabecalho. Hover foi implementado, mas a ferramenta de navegador nao oferece movimento de mouse para comprovar essa interacao fisicamente. Testes existentes: 17/17.

Nesta rodada o navegador tambem nao aplicou o override de viewport solicitado; nao houve nova validacao mobile deste ajuste.
