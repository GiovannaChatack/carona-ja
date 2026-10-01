# Especificação de Funcionalidade: Histórico de Viagens

**Diretório da Funcionalidade**: `specs/004-historico-viagens`

**Criado em**: 2026-10-01

**Status**: Rascunho

**Entrada**: Descrição do usuário: "slice 04 historico, saiba que essa spec sera implementada em
paralelo com a 005 de pagamentos, então essa spec precisa gerar tarefas para serem implementadas
em apenas uma seção, sei que isso é o proximo passo, mas achei interessante informar."

**Slice**: 4 de 6. **Pré-requisitos**: slice 001 (login, layout responsivo e publicação), slice
002 (passageiros) e slice 003 (trajetos e viagens). **Independente de**: slice 005 (Pagamentos),
que será implementado em paralelo, em outra sessão. **Slices que dependem deste**: nenhum
obrigatoriamente; o Resumo Mensal (006) poderá reaproveitar os mesmos critérios de período.

## Contexto e Restrições de Planejamento

- **Implementação em paralelo com o slice 005**: este slice MUST NOT depender de nada criado pelo
  slice de Pagamentos (status pago/pendente, data de pagamento, pendências). O histórico mostra o
  que foi **cobrado** em cada viagem; o que foi **pago** é responsabilidade do slice 005.
- **Sessão única**: o plano e as tarefas deste slice devem caber em uma única sessão de
  implementação, sem fatias internas publicadas separadamente. Por isso o escopo é deliberadamente
  enxuto: uma tela de consulta com filtros e totais, e o atalho a partir do passageiro.
- **Mínimo de pontos de contato com o slice 005**: este slice não altera os dados de viagens nem
  de participações. As únicas mudanças em telas existentes são o novo item "Histórico" na
  navegação e um atalho na tela de detalhes do passageiro; ambas são pequenas e aditivas, para
  facilitar a junção com as mudanças do slice 005 nos mesmos arquivos.

## Cenários de Usuário e Testes *(obrigatório)*

### História de Usuário 1 - Consultar o histórico de um período (Prioridade: P1)

Como motorista, quero abrir uma tela de histórico e ver, em formato de tabela, todas as viagens
de um período (por padrão, o mês atual), com o total de viagens e o valor total cobrado no
período, para conferir quanto rodei e quanto deveria ter recebido.

**Por que esta prioridade**: é o núcleo do slice; sem a consulta por período não há histórico.

**Teste Independente**: com viagens registradas no mês atual e no mês anterior (incluindo uma
arquivada), abrir "Histórico" e conferir que aparecem apenas as viagens ativas do mês atual, com a
quantidade e o total cobrado corretos; trocar para "Mês passado" e conferir os novos números; tudo
no celular e no computador.

**Cenários de Aceite**:

1. **Dado** que tenho viagens registradas, **Quando** abro "Histórico" na navegação, **Então** vejo
   as viagens ativas do mês atual, da mais recente para a mais antiga, e um resumo com o período,
   o número de viagens e o valor total cobrado.
2. **Dado** a tabela do histórico no computador, **Quando** olho cada linha, **Então** vejo data
   (`DD/MM/AAAA`), hora (`HH:mm`), percurso no sentido da viagem, "Ida" ou "Volta", os nomes dos
   passageiros e o total da viagem.
3. **Dado** o histórico no celular, **Quando** olho a lista, **Então** cada viagem aparece como um
   cartão com as mesmas informações essenciais, sem rolagem horizontal.
4. **Dado** que escolho o período "Mês passado", **Quando** o histórico atualiza, **Então** vejo
   apenas as viagens do mês anterior, e o resumo reflete apenas essas viagens.
5. **Dado** que escolho um período personalizado (data inicial e data final), **Quando** o
   histórico atualiza, **Então** vejo as viagens realizadas entre o início do dia inicial e o fim
   do dia final, inclusive.
6. **Dado** uma viagem arquivada no período, **Quando** consulto o histórico, **Então** ela não
   aparece na tabela nem entra no resumo.
7. **Dado** que não há viagens no período escolhido, **Quando** consulto o histórico, **Então**
   vejo um estado vazio explicando que não há viagens no período e o resumo com zero viagens e
   `R$ 0,00`.
8. **Dado** uma linha do histórico, **Quando** toco nela, **Então** abro os detalhes daquela
   viagem (tela do slice 003) e, ao voltar, encontro o histórico com os mesmos filtros.

---

### História de Usuário 2 - Filtrar o histórico por passageiro (Prioridade: P1)

Como motorista, quero filtrar o histórico por um passageiro para ver em quais viagens ele foi e
quanto foi cobrado dele no período, para conversar com ele sobre o acerto com números na mão.

**Por que esta prioridade**: responder "quantas vezes fulano foi este mês e quanto deu" é a
pergunta mais comum do dia a dia, junto com o período.

**Teste Independente**: com duas viagens de um passageiro (valores diferentes) e uma viagem sem
ele no mês, filtrar por esse passageiro e conferir que só as duas viagens aparecem e que o resumo
mostra a soma dos valores dele (e não a soma dos totais das viagens).

**Cenários de Aceite**:

1. **Dado** o histórico, **Quando** escolho um passageiro no filtro, **Então** vejo apenas as
   viagens do período em que ele foi passageiro.
2. **Dado** o filtro por passageiro aplicado, **Quando** olho cada linha, **Então** vejo também o
   valor cobrado desse passageiro naquela viagem, além do total da viagem.
3. **Dado** o filtro por passageiro aplicado, **Quando** olho o resumo, **Então** vejo o número de
   viagens dele no período e o valor total cobrado **dele** (soma dos valores individuais dele).
4. **Dado** um passageiro arquivado com viagens no período, **Quando** abro a lista do filtro,
   **Então** ele também pode ser escolhido, identificado como arquivado.
5. **Dado** a tela de detalhes de um passageiro, **Quando** escolho "Ver histórico", **Então**
   abro o histórico já filtrado por esse passageiro, no período padrão.

---

### História de Usuário 3 - Filtrar por trajeto e sentido (Prioridade: P2)

Como motorista, quero filtrar o histórico por trajeto e por sentido (Ida ou Volta), para conferir,
por exemplo, quantas idas à faculdade fiz no mês.

**Por que esta prioridade**: útil para conferência, mas menos frequente que período e passageiro.

**Teste Independente**: com viagens de ida e de volta em dois trajetos no mês, filtrar por um
trajeto e por "Volta" e conferir que só as voltas daquele trajeto aparecem, com o resumo correto.

**Cenários de Aceite**:

1. **Dado** o histórico, **Quando** escolho um trajeto no filtro, **Então** vejo apenas as viagens
   do período nesse trajeto, nos dois sentidos.
2. **Dado** o histórico, **Quando** escolho o sentido "Ida" ou "Volta", **Então** vejo apenas as
   viagens nesse sentido.
3. **Dado** filtros de período, passageiro, trajeto e sentido combinados, **Quando** o histórico
   atualiza, **Então** vejo apenas as viagens que atendem a **todos** os filtros, e o resumo
   reflete exatamente essas viagens.
4. **Dado** filtros aplicados, **Quando** escolho "Limpar filtros", **Então** o histórico volta ao
   padrão (mês atual, sem outros filtros).
5. **Dado** um trajeto arquivado com viagens no período, **Quando** abro a lista do filtro,
   **Então** ele também pode ser escolhido, identificado como arquivado.

---

### Casos de Borda

- Viagem realizada às 23:30 do último dia do mês (horário de São Paulo) → pertence a esse mês, e
  não ao seguinte, independentemente do fuso do aparelho.
- Período personalizado com data inicial depois da data final → o sistema rejeita e explica que a
  data inicial precisa ser anterior ou igual à final.
- Período personalizado com apenas uma das datas → o sistema pede a data que falta e mantém o
  período anterior até que o período esteja completo.
- Período personalizado muito longo (ex.: vários anos) → aceito; a tabela carrega as viagens mais
  recentes primeiro e permite carregar mais, e o resumo considera **todas** as viagens do período,
  não só as já carregadas.
- Viagens futuras (até 1 dia à frente, permitido pelo slice 003) → aparecem no período em que
  foram marcadas.
- Viagem editada depois (data, trajeto, passageiros ou valores) → o histórico mostra sempre os
  dados atuais da viagem.
- Viagem reativada → volta a aparecer no histórico e no resumo.
- Trajeto ou passageiro renomeado → o histórico exibe o nome atual.
- Passageiro removido de uma viagem por edição → a viagem deixa de aparecer no filtro desse
  passageiro.
- Viagem com valor zero para o passageiro filtrado → aparece normalmente, com `R$ 0,00`.
- Nenhuma viagem registrada ainda → o histórico mostra um estado vazio com atalho para "Nova
  viagem".
- Filtro por um passageiro ou trajeto inexistente ou de outra conta (ex.: endereço alterado à
  mão) → o filtro é ignorado e o histórico mostra o período sem esse filtro, sem expor dados.
- Falha de conexão ao consultar → mensagem "Não foi possível carregar o histórico. Tente
  novamente." com a opção de tentar de novo, mantendo os filtros escolhidos.

## Requisitos *(obrigatório)*

### Requisitos Funcionais

**Consulta e período**

- **FR-001**: A navegação principal MUST ganhar o item "Histórico", visível no celular e no
  computador, que abre a tela de histórico de viagens.
- **FR-002**: O histórico MUST listar apenas viagens ativas (não arquivadas), da mais recente
  para a mais antiga; viagens arquivadas MUST NOT aparecer nem entrar em nenhum total (slice 003,
  FR-021).
- **FR-003**: O motorista MUST conseguir escolher o período entre: "Este mês" (padrão), "Mês
  passado", "Últimos 30 dias" e "Personalizado" (data inicial e data final, inclusive).
- **FR-004**: Os limites dos períodos e a data de cada viagem MUST ser calculados no fuso
  `America/Sao_Paulo` (constituição, Princípio V).
- **FR-005**: No período personalizado, o sistema MUST exigir as duas datas e MUST rejeitar data
  inicial posterior à final, com mensagem em português.

**Filtros**

- **FR-006**: O motorista MUST conseguir filtrar por passageiro (um por vez), por trajeto (um por
  vez) e por sentido (Ida, Volta ou ambos), combináveis entre si e com o período; o resultado MUST
  atender a todos os filtros ao mesmo tempo.
- **FR-007**: As listas de escolha de passageiro e de trajeto MUST incluir também os arquivados,
  identificados como tal, para permitir consultar o histórico antigo.
- **FR-008**: O motorista MUST conseguir limpar todos os filtros de uma vez, voltando ao padrão.
- **FR-009**: Os filtros escolhidos MUST ser preservados ao abrir os detalhes de uma viagem e
  voltar, e ao recarregar a página.
- **FR-010**: A tela de detalhes do passageiro MUST oferecer o atalho "Ver histórico", que abre o
  histórico já filtrado por esse passageiro.

**Tabela e resumo**

- **FR-011**: Cada viagem do histórico MUST exibir data, hora, percurso no sentido da viagem,
  sentido, nomes dos passageiros e total da viagem; com filtro por passageiro, MUST exibir também
  o valor cobrado desse passageiro naquela viagem.
- **FR-012**: No computador o histórico MUST ser exibido como tabela; no celular, como cartões,
  sem rolagem horizontal e sem perder as informações do FR-011 (constituição, Princípio IV).
- **FR-013**: O histórico MUST exibir um resumo do resultado filtrado com: o período consultado,
  o número de viagens e o valor total cobrado. Sem filtro por passageiro, o total cobrado é a soma
  dos totais das viagens; com filtro por passageiro, é a soma dos valores individuais desse
  passageiro.
- **FR-014**: O resumo MUST ser derivado das viagens registradas, MUST considerar todas as
  viagens do resultado (inclusive as ainda não carregadas na tela) e MUST bater exatamente com a
  soma das linhas exibidas quando todas estiverem carregadas (constituição, Princípio V).
- **FR-015**: A tabela MUST carregar as viagens mais recentes primeiro e permitir carregar mais,
  progressivamente, quando houver muitas viagens no resultado.
- **FR-016**: Tocar em uma viagem do histórico MUST abrir os detalhes dela (tela do slice 003).
- **FR-017**: Quando o resultado for vazio, o histórico MUST mostrar um estado vazio que explique
  o motivo (nenhuma viagem registrada, ou nenhuma viagem com os filtros escolhidos) e ofereça a
  ação adequada ("Nova viagem" ou "Limpar filtros").

**Escopo, privacidade e formatos**

- **FR-018**: O histórico MUST ser somente leitura: não cria, edita, arquiva nem exclui viagens,
  e não altera nenhum dado registrado.
- **FR-019**: O histórico MUST NOT exibir nem depender de status de pagamento (pago/pendente);
  essa informação pertence ao slice 005.
- **FR-020**: Cada motorista MUST ver apenas o próprio histórico; nenhum dado MUST ficar acessível
  sem autenticação, e filtros que apontem para dados de outra conta MUST ser ignorados
  (constituição, Princípio VI).
- **FR-021**: Valores MUST ser exibidos no formato `R$ 1.234,56`, datas como `DD/MM/AAAA`, horas
  como `HH:mm` e todos os textos em português do Brasil (constituição, Princípio I).
- **FR-022**: Falhas ao carregar o histórico MUST exibir uma mensagem clara em português com a
  opção de tentar novamente, sem perder os filtros escolhidos.

### Entidades Principais

Este slice não cria entidades novas; ele consulta as existentes.

- **Viagem** e **Participação em viagem** (slice 003): fonte de todas as linhas e totais do
  histórico. O total da viagem é a soma dos valores das participações.
- **Passageiro** (slice 002) e **Trajeto** (slice 003): usados nos filtros e na exibição.
- **Filtro do histórico** (conceito de tela, não armazenado): período (tipo e datas), passageiro,
  trajeto e sentido escolhidos.
- **Resumo do histórico** (derivado, não armazenado): número de viagens e valor total cobrado do
  resultado filtrado.

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **SC-001**: A partir da tela inicial, o motorista descobre quantas viagens um passageiro fez no
  mês atual e quanto foi cobrado dele em menos de 15 segundos no celular.
- **SC-002**: Em 100% das consultas, o número de viagens e o valor total do resumo são iguais à
  contagem e à soma das linhas exibidas, depois de carregadas todas as viagens do resultado.
- **SC-003**: Em 100% das consultas, o total cobrado de um passageiro no histórico é igual à soma
  dos valores dele nos detalhes de cada viagem listada.
- **SC-004**: Nenhuma viagem arquivada aparece no histórico ou é contada no resumo (verificado
  arquivando uma viagem do período e conferindo a tabela e o resumo).
- **SC-005**: Viagens realizadas entre 21:00 e 23:59 do último dia do mês (horário de São Paulo)
  são contadas nesse mês em 100% dos casos.
- **SC-006**: Com 500 viagens no período, o histórico mostra as primeiras viagens e o resumo
  completo em até 2 segundos em uma conexão móvel comum.
- **SC-007**: Nenhuma viagem de um motorista é visível no histórico de outra conta ou para
  visitantes não autenticados (verificado com uma segunda conta).
- **SC-008**: A tela de histórico não apresenta rolagem horizontal nas larguras de 360px, 768px,
  1280px e 1920px.

## Premissas

- Há um único motorista (o dono do sistema); passageiros não acessam o histórico.
- O histórico é organizado **por viagem** (uma linha por viagem); com filtro por passageiro, a
  linha ganha o valor daquele passageiro. Uma visão "uma linha por participação" não é necessária.
- O período padrão é o mês atual, por ser a unidade natural de acerto com os passageiros.
- Viagens arquivadas continuam consultáveis apenas no filtro "Arquivadas" da tela de Viagens
  (slice 003); o histórico não tem opção para incluí-las.
- A coluna ou o filtro de status de pagamento no histórico, se desejados, serão acrescentados
  depois que os slices 004 e 005 estiverem concluídos, fora do escopo deste slice.
- Exportação (planilha, PDF), impressão, gráficos e ordenação por outras colunas estão fora do
  escopo; a ordem é sempre da mais recente para a mais antiga.
- O "Resumo Mensal" (slice 006) é uma tela própria; o resumo deste slice cobre apenas o resultado
  filtrado e não substitui aquele slice.
- O atalho "Ver histórico" é a única ampliação da tela de detalhes do passageiro neste slice; a
  lista de pendências do passageiro pertence ao slice 005.
- As telas reutilizam o layout, os componentes (incluindo a apresentação de tabela em cartões no
  celular) e os formatadores definidos nos slices 001 a 003.
