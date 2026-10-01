# Especificação de Funcionalidade: Trajetos e Registro de Viagens

**Diretório da Funcionalidade**: `specs/003-registro-viagens`

**Criado em**: 2026-09-30

**Status**: Concluído (2026-10-01)

**Entrada**: Descrição do usuário: "slice 3 viagens, essa spec deve definir a funcionalidade de
gerencia e registro de trajetos e viagens feitas nesses trajetos, nao se preocupe com percurso ou
distancia, apenas registre o ponto de origem e destino. Quanto as viagens apenas preciso saber
quais passageiros foram em cada viagem, se a viagem foi de ida ou de volta e o quanto foi pago no
total por todos passageiros. Qualquer duvida me pergunte"

**Slice**: 3 de 6. **Pré-requisitos**: slice 001 (login, layout responsivo e publicação) e slice
002 (passageiros). **Slices que dependem deste**: Histórico (filtros e consultas de viagens),
Pagamentos (status pago/pendente de cada participação) e Resumo Mensal.

## Esclarecimentos

### Sessão 2026-09-30

- P: Como o valor da viagem é registrado? → R: Cada passageiro tem o seu valor na viagem,
  pré-preenchido com o valor padrão dele e editável na hora; o total da viagem é a soma desses
  valores, calculada automaticamente (nunca digitada).
- P: O que o slice permite fazer com as viagens? → R: Registrar, listar, ver detalhes, editar e
  arquivar. Filtros e consultas por período ou passageiro ficam para o slice de Histórico.
- P: Ida e volta podem ser registradas juntas? → R: Não; cada registro é sempre uma única viagem,
  de ida ou de volta.
- P: O que significa arquivar uma viagem? → R: A viagem passa a ser desconsiderada (registrada
  por engano ou cancelada): sai da lista principal e não entra em totais, pendências nem no resumo
  mensal, mas continua consultável no filtro "Arquivadas" e pode ser reativada. Nada é apagado.
- P: Como os trajetos são geridos? → R: Igual aos passageiros: cadastrar, listar, editar,
  arquivar/reativar e excluir apenas se não houver viagens vinculadas.

## Cenários de Usuário e Testes *(obrigatório)*

### História de Usuário 1 - Cadastrar e listar trajetos (Prioridade: P1)

Como motorista, quero cadastrar os trajetos que faço com frequência, informando apenas o ponto de
origem e o ponto de destino (ex.: "Casa → Faculdade"), para depois só escolher o trajeto ao
registrar uma viagem.

**Por que esta prioridade**: toda viagem acontece em um trajeto; sem trajetos cadastrados não é
possível registrar viagens.

**Teste Independente**: abrir "Viagens" na navegação, entrar em "Trajetos", ver o estado vazio,
cadastrar dois trajetos e conferir que ambos aparecem na lista como "Origem → Destino", no celular
e no computador.

**Cenários de Aceite**:

1. **Dado** que não há trajetos cadastrados, **Quando** abro "Trajetos", **Então** vejo um estado
   vazio explicando que o trajeto é o caminho de origem e destino das viagens e um botão "Novo
   trajeto".
2. **Dado** que estou no formulário de novo trajeto, **Quando** informo origem e destino válidos e
   salvo, **Então** vejo a confirmação "Trajeto cadastrado" e o trajeto aparece na lista como
   "Origem → Destino".
3. **Dado** que deixei a origem ou o destino em branco, **Quando** tento salvar, **Então** vejo a
   mensagem de erro em português abaixo do campo correspondente e nada é salvo.
4. **Dado** que informei a mesma origem e o mesmo destino (ex.: "Casa" e "casa"), **Quando** tento
   salvar, **Então** o sistema impede o cadastro e informa que origem e destino precisam ser
   diferentes.
5. **Dado** que já existe um trajeto ativo "Casa → Faculdade", **Quando** tento cadastrar outro
   com a mesma origem e o mesmo destino (com diferença apenas de maiúsculas/minúsculas ou espaços
   nas pontas), **Então** o sistema impede o cadastro e informa que o trajeto já existe.
6. **Dado** que há trajetos cadastrados, **Quando** abro a lista, **Então** eles aparecem em ordem
   alfabética de origem e, em seguida, de destino.

---

### História de Usuário 2 - Registrar uma viagem (Prioridade: P1)

Como motorista, logo depois de uma carona, quero registrar a viagem escolhendo o trajeto, se foi
de ida ou de volta e quais passageiros foram, conferindo o valor de cada um e o total, para saber
exatamente quanto aquela viagem rendeu e, no slice de Pagamentos, quem ficou devendo.

**Por que esta prioridade**: é o objetivo central do sistema e a ação mais frequente do dia a dia
(constituição, Princípio IV).

**Teste Independente**: com dois passageiros e um trajeto cadastrados, registrar uma viagem de ida
com os dois passageiros, ajustar o valor de um deles e conferir que a viagem aparece na lista com
data, trajeto, sentido, número de passageiros e o total igual à soma dos valores.

**Cenários de Aceite**:

1. **Dado** que tenho trajetos e passageiros ativos, **Quando** escolho "Nova viagem", **Então**
   vejo o formulário com a data e a hora atuais preenchidas, a lista de trajetos ativos, a escolha
   do sentido (Ida ou Volta) e a lista de passageiros ativos para marcar.
2. **Dado** que escolhi o trajeto "Casa → Faculdade", **Quando** escolho "Ida", **Então** o
   formulário indica o percurso "Casa → Faculdade"; **Quando** escolho "Volta", **Então** indica
   "Faculdade → Casa".
3. **Dado** que marquei um passageiro com valor padrão R$ 12,00, **Quando** olho o valor dele na
   viagem, **Então** vejo R$ 12,00 pré-preenchido e posso alterá-lo apenas para esta viagem.
4. **Dado** que marquei passageiros com valores R$ 12,00 e R$ 10,00, **Quando** olho o total,
   **Então** vejo "Total: R$ 22,00", atualizado imediatamente a cada passageiro marcado,
   desmarcado ou valor alterado.
5. **Dado** que preenchi trajeto, sentido e ao menos um passageiro, **Quando** salvo, **Então**
   vejo a confirmação "Viagem registrada" e a viagem aparece no topo da lista de viagens.
6. **Dado** que não marquei nenhum passageiro, ou não escolhi o trajeto ou o sentido, **Quando**
   tento salvar, **Então** vejo a mensagem de erro no campo correspondente e nada é salvo.
7. **Dado** que não há trajetos ativos ou passageiros ativos cadastrados, **Quando** escolho "Nova
   viagem", **Então** vejo um aviso explicando o que falta e um atalho para cadastrar o trajeto ou
   o passageiro.
8. **Dado** que já registrei uma viagem antes, **Quando** abro "Nova viagem", **Então** o trajeto
   usado na última viagem já vem selecionado (se ainda estiver ativo).

---

### História de Usuário 3 - Listar e inspecionar viagens (Prioridade: P2)

Como motorista, quero ver as viagens registradas, da mais recente para a mais antiga, e abrir uma
delas para conferir quem foi e quanto cada um pagou.

**Por que esta prioridade**: permite conferir o que foi registrado logo após salvar; é o ponto de
partida para editar e arquivar.

**Teste Independente**: registrar três viagens em datas diferentes, conferir a ordem na lista e
abrir uma delas para ver os passageiros, os valores individuais e o total.

**Cenários de Aceite**:

1. **Dado** que não há viagens registradas, **Quando** abro "Viagens", **Então** vejo um estado
   vazio com o botão "Nova viagem" e o acesso a "Trajetos".
2. **Dado** que há viagens registradas, **Quando** abro "Viagens", **Então** vejo as viagens
   ativas da mais recente para a mais antiga, cada uma com data e hora (`DD/MM/AAAA HH:mm`), o
   percurso no sentido da viagem, a indicação "Ida" ou "Volta", o número de passageiros e o total;
   no celular a lista é exibida em cartões, sem rolagem horizontal.
3. **Dado** uma viagem na lista, **Quando** toco nela, **Então** vejo a tela de detalhes com data
   e hora, trajeto, sentido, cada passageiro com o valor dele nesta viagem, o total e as ações
   "Editar" e "Arquivar".
4. **Dado** uma viagem com um passageiro que depois foi arquivado, **Quando** abro os detalhes,
   **Então** o passageiro continua aparecendo com o nome e o valor da viagem, com a indicação de
   que está arquivado.
5. **Dado** um endereço de viagem ou de trajeto inexistente ou de outra conta, **Quando** tento
   abri-lo, **Então** vejo a página "Página não encontrada".

---

### História de Usuário 4 - Editar uma viagem (Prioridade: P2)

Como motorista, quero corrigir uma viagem registrada com erro (data, trajeto, sentido, passageiros
ou valores), para que o registro reflita o que realmente aconteceu.

**Por que esta prioridade**: erros de registro no celular são comuns; sem edição o motorista teria
que arquivar e registrar de novo.

**Teste Independente**: editar uma viagem trocando o sentido, removendo um passageiro e alterando
o valor de outro, e conferir que os detalhes e o total refletem a mudança.

**Cenários de Aceite**:

1. **Dado** uma viagem ativa, **Quando** escolho "Editar", **Então** o formulário vem preenchido
   com os dados atuais, incluindo os valores individuais registrados (e não os valores padrão
   atuais dos passageiros).
2. **Dado** que estou editando, **Quando** adiciono um passageiro, **Então** o valor dele vem
   pré-preenchido com o valor padrão atual; os demais passageiros mantêm os valores já
   registrados.
3. **Dado** que alterei dados e salvei, **Quando** volto aos detalhes, **Então** vejo os novos
   dados, o total recalculado e a confirmação "Viagem atualizada".
4. **Dado** que estou editando, **Quando** desisto e volto sem salvar, **Então** nada é alterado.
5. **Dado** que a viagem tem um passageiro ou um trajeto que foi arquivado depois, **Quando** edito
   a viagem, **Então** eles continuam na viagem, mas não posso escolher outros passageiros ou
   trajetos arquivados.

---

### História de Usuário 5 - Arquivar e reativar viagens (Prioridade: P3)

Como motorista, quero desconsiderar uma viagem registrada por engano ou cancelada, sem apagá-la,
e poder trazê-la de volta se me enganar.

**Por que esta prioridade**: corrige erros sem perder dados; é menos frequente que registrar e
editar.

**Teste Independente**: arquivar uma viagem, conferir que ela some da lista principal e aparece no
filtro "Arquivadas"; reativá-la e conferir que volta à lista principal.

**Cenários de Aceite**:

1. **Dado** uma viagem ativa, **Quando** escolho "Arquivar" e confirmo, **Então** ela sai da lista
   principal, passa a aparecer apenas no filtro "Arquivadas" e vejo a confirmação "Viagem
   arquivada".
2. **Dado** uma viagem arquivada, **Quando** abro os detalhes, **Então** vejo um aviso de que ela
   está arquivada e não é considerada em totais e pendências, e a ação "Reativar" no lugar de
   "Editar" e "Arquivar".
3. **Dado** uma viagem arquivada, **Quando** escolho "Reativar", **Então** ela volta à lista
   principal com os mesmos dados e vejo a confirmação "Viagem reativada".

---

### História de Usuário 6 - Editar, arquivar, reativar e excluir trajetos (Prioridade: P3)

Como motorista, quero corrigir o nome dos pontos de um trajeto, tirar da lista os trajetos que não
faço mais sem perder as viagens antigas e apagar trajetos cadastrados por engano.

**Por que esta prioridade**: mantém a lista de trajetos correta e enxuta; é menos urgente que
registrar viagens.

**Teste Independente**: editar a origem de um trajeto, arquivá-lo e conferir que ele não aparece
em "Nova viagem" mas continua nas viagens antigas; reativá-lo; excluir um trajeto sem viagens.

**Cenários de Aceite**:

1. **Dado** um trajeto, **Quando** edito a origem de "Casa" para "Casa (Centro)" e salvo, **Então**
   vejo a confirmação "Trajeto atualizado" e as viagens já registradas nesse trajeto passam a
   exibir o novo nome.
2. **Dado** um trajeto ativo, **Quando** escolho "Arquivar" e confirmo, **Então** ele sai da lista
   de ativos, aparece no filtro "Arquivados", não pode ser escolhido em novas viagens e as viagens
   já registradas continuam mostrando-o.
3. **Dado** um trajeto arquivado, **Quando** escolho "Reativar", **Então** ele volta à lista de
   ativos, desde que não exista outro trajeto ativo com a mesma origem e o mesmo destino.
4. **Dado** um trajeto sem nenhuma viagem vinculada (ativa ou arquivada), **Quando** escolho
   "Excluir" e confirmo, **Então** ele é removido definitivamente.
5. **Dado** um trajeto com viagens vinculadas, **Quando** tento excluí-lo, **Então** o sistema não
   permite a exclusão e sugere arquivar.

---

### Casos de Borda

- Origem ou destino com espaços extras nas pontas ou só com espaços → os espaços das pontas são
  removidos; um campo vazio após isso é rejeitado.
- Origem ou destino muito longos → limite de 80 caracteres cada, com aviso no campo.
- Trajeto "A → B" e trajeto "B → A" → são trajetos diferentes e ambos podem existir; o motorista
  pode, porém, usar um único trajeto com os sentidos Ida e Volta.
- Viagem de ida e de volta no mesmo dia, no mesmo trajeto → são duas viagens independentes,
  registradas separadamente.
- Já existe uma viagem no mesmo trajeto, sentido e dia → o sistema avisa ("Já existe uma viagem
  de ida neste trajeto em DD/MM/AAAA") e permite salvar mesmo assim (pode haver mais de uma).
- Mesmo passageiro marcado duas vezes na mesma viagem → impossível; cada passageiro aparece uma
  única vez na seleção.
- Valor individual zero (carona gratuita para um passageiro) → aceito; se todos forem zero, o
  total é `R$ 0,00`.
- Valor individual negativo, com mais de duas casas decimais ou acima de R$ 9.999,99 → rejeitado
  com mensagem no campo; "12,5" ou "12.50" são interpretados como R$ 12,50.
- Data e hora da viagem mais de 1 dia no futuro → rejeitada; viagens passadas (esquecidas de
  registrar) são aceitas com qualquer data anterior.
- Passageiro arquivado → não aparece na seleção de novas viagens, mas continua nas viagens em que
  já estava; o mesmo vale para trajetos arquivados.
- Alteração do valor padrão de um passageiro → não altera nenhuma viagem já registrada (slice 002,
  FR-013).
- Passageiro com viagens vinculadas (ativas ou arquivadas) → não pode ser excluído; o sistema
  sugere arquivar (slice 002, FR-016).
- Muitas viagens registradas → a lista carrega as mais recentes primeiro e permite carregar mais.
- Nenhuma viagem ou trajeto arquivado → o filtro "Arquivadas"/"Arquivados" mostra um estado vazio
  próprio.
- Falha de conexão ao salvar → mensagem "Não foi possível salvar. Tente novamente." e os dados
  preenchidos permanecem no formulário.

## Requisitos *(obrigatório)*

### Requisitos Funcionais

**Trajetos**

- **FR-001**: O motorista MUST conseguir cadastrar trajetos informando origem e destino, ambos
  obrigatórios, com 1 a 80 caracteres após remover os espaços das pontas. Nenhum outro dado
  (percurso, distância, endereço, mapa) é registrado.
- **FR-002**: O sistema MUST rejeitar trajetos com origem igual ao destino, comparando sem
  diferenciar maiúsculas/minúsculas e ignorando espaços das pontas.
- **FR-003**: O sistema MUST impedir dois trajetos ativos do mesmo motorista com a mesma origem e
  o mesmo destino (mesma comparação do FR-002); "A → B" e "B → A" são trajetos distintos.
- **FR-004**: O motorista MUST conseguir listar os trajetos, em ordem alfabética de origem e
  depois de destino, com filtro entre "Ativos" (padrão) e "Arquivados".
- **FR-005**: O motorista MUST conseguir editar origem e destino de um trajeto, com as mesmas
  validações do cadastro; as viagens já registradas passam a exibir os novos nomes.
- **FR-006**: O motorista MUST conseguir arquivar um trajeto, após confirmação, e reativá-lo desde
  que não viole o FR-003. Trajetos arquivados MUST NOT aparecer na escolha de novas viagens, mas
  MUST continuar visíveis nas viagens já registradas.
- **FR-007**: O motorista MUST conseguir excluir definitivamente um trajeto sem nenhuma viagem
  vinculada (ativa ou arquivada), após confirmação explícita. O sistema MUST impedir a exclusão de
  trajetos com viagens vinculadas e sugerir o arquivamento.

**Registro de viagens**

- **FR-008**: O motorista MUST conseguir registrar uma viagem informando: trajeto (um trajeto
  ativo), sentido (Ida ou Volta), data e hora, e os passageiros que foram (ao menos um, apenas
  passageiros ativos, cada um no máximo uma vez).
- **FR-009**: O sentido "Ida" MUST representar o percurso da origem para o destino do trajeto e
  "Volta" o percurso do destino para a origem; a interface MUST exibir o percurso no sentido
  escolhido (ex.: "Faculdade → Casa" para a volta do trajeto "Casa → Faculdade").
- **FR-010**: Cada registro MUST corresponder a uma única viagem, de ida ou de volta; ida e volta
  são sempre duas viagens registradas separadamente.
- **FR-011**: A data e a hora MUST vir preenchidas com o momento atual, podem ser alteradas para
  qualquer momento passado e MUST NOT estar mais de 1 dia no futuro. Datas e horas MUST ser
  exibidas e interpretadas no fuso `America/Sao_Paulo`.
- **FR-012**: Cada passageiro marcado MUST ter um valor próprio nesta viagem, pré-preenchido com o
  valor padrão dele no momento da marcação e editável apenas para esta viagem, entre R$ 0,00 e
  R$ 9.999,99, com no máximo duas casas decimais.
- **FR-013**: O total da viagem MUST ser a soma dos valores individuais dos passageiros, calculado
  pelo sistema e exibido em tempo real no formulário, na lista e nos detalhes; o total MUST NOT
  ser digitado manualmente (constituição, Princípio V).
- **FR-014**: O formulário de nova viagem MUST pré-selecionar o trajeto usado na última viagem
  registrada, quando ele ainda estiver ativo.
- **FR-015**: Ao salvar uma viagem no mesmo trajeto, sentido e dia de outra viagem ativa, o
  sistema MUST exibir um aviso e permitir que o motorista confirme o registro.
- **FR-016**: Quando não houver trajeto ativo ou passageiro ativo, a tela de nova viagem MUST
  explicar o que falta e oferecer um atalho para o cadastro correspondente.

**Consulta, edição e arquivamento de viagens**

- **FR-017**: O motorista MUST conseguir listar as viagens, da mais recente para a mais antiga,
  com filtro entre "Ativas" (padrão) e "Arquivadas", exibindo data e hora, percurso no sentido da
  viagem, sentido, número de passageiros e total, com carregamento progressivo das mais antigas.
- **FR-018**: O motorista MUST conseguir abrir os detalhes de uma viagem, com data e hora,
  trajeto, sentido, cada passageiro com o valor dele nesta viagem (indicando os passageiros
  arquivados) e o total.
- **FR-019**: O motorista MUST conseguir editar uma viagem ativa (data e hora, trajeto, sentido,
  passageiros e valores), com as mesmas validações do registro. Passageiros e trajeto já
  vinculados, mesmo que arquivados depois, MUST poder permanecer na viagem; novos vínculos MUST
  aceitar apenas passageiros e trajetos ativos.
- **FR-020**: Os valores individuais registrados em uma viagem MUST NOT mudar quando o valor
  padrão do passageiro for alterado; só mudam por edição explícita daquela viagem.
- **FR-021**: O motorista MUST conseguir arquivar uma viagem ativa, após confirmação, e reativar
  uma viagem arquivada. Viagens arquivadas MUST NOT ser editáveis e MUST NOT entrar em totais,
  pendências, resumos ou quaisquer contagens deste e dos próximos slices, mas MUST continuar
  consultáveis no filtro "Arquivadas".
- **FR-022**: Viagens MUST NOT ser excluídas definitivamente pela interface; o arquivamento é a
  única forma de desconsiderar uma viagem.
- **FR-023**: O sistema MUST impedir a exclusão de passageiros vinculados a qualquer viagem (ativa
  ou arquivada), cumprindo a regra prevista no slice 002 (FR-016).

**Interface, privacidade e navegação**

- **FR-024**: A navegação principal MUST ganhar o item "Viagens", visível no celular e no
  computador; a gestão de trajetos MUST ser acessível a partir da tela de Viagens.
- **FR-025**: Cadastros, edições, arquivamentos, reativações e exclusões MUST exibir uma
  confirmação rápida em português ao concluir e uma mensagem clara em caso de falha, sem perder o
  que foi preenchido.
- **FR-026**: Cada motorista MUST ver e alterar apenas os próprios trajetos e viagens; nenhum
  desses dados MUST ficar acessível sem autenticação (constituição, Princípio VI).
- **FR-027**: Valores MUST ser exibidos no formato `R$ 1.234,56`, datas no formato `DD/MM/AAAA`,
  horas no formato `HH:mm` e todos os textos em português do Brasil (constituição, Princípio I).

### Entidades Principais

- **Trajeto**: par origem → destino que o motorista percorre com frequência. Atributos: origem,
  destino, situação (ativo/arquivado, com a data do arquivamento), data de cadastro e data da
  última alteração. Pertence a um único motorista; não guarda percurso nem distância.
- **Viagem**: uma carona realizada em um trajeto, em um único sentido. Atributos: trajeto, sentido
  (ida ou volta), data e hora, situação (ativa/arquivada, com a data do arquivamento), data de
  registro e data da última alteração. O total é derivado das participações, nunca armazenado
  como valor digitado.
- **Participação em viagem**: vínculo entre um passageiro e uma viagem, com o valor cobrado desse
  passageiro naquela viagem. É a unidade que o slice de Pagamentos marcará como paga ou pendente.
  Cada passageiro aparece no máximo uma vez por viagem.
- **Passageiro** e **Motorista (Usuário)**: definidos nos slices 002 e 001.

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **SC-001**: Com trajeto e passageiros já cadastrados, o motorista registra uma viagem com até 4
  passageiros, a partir da tela inicial, em menos de 30 segundos no celular, sem precisar alterar
  valores.
- **SC-002**: O motorista cadastra um novo trajeto em menos de 30 segundos no celular.
- **SC-003**: Em 100% das viagens, o total exibido é igual à soma dos valores individuais dos
  passageiros, na lista, nos detalhes e após qualquer edição.
- **SC-004**: Após alterar o valor padrão de um passageiro, 100% dos valores de viagens já
  registradas permanecem iguais.
- **SC-005**: 100% das tentativas de salvar dados inválidos (viagem sem passageiro, sem trajeto ou
  sem sentido; data mais de 1 dia no futuro; valor fora da faixa; trajeto com origem igual ao
  destino ou duplicado) são bloqueadas com uma mensagem que indica o campo e como corrigir.
- **SC-006**: Nenhuma viagem arquivada é contada em totais ou listagens de viagens ativas
  (verificado arquivando uma viagem e conferindo a lista e os totais).
- **SC-007**: Nenhum trajeto ou viagem de um motorista é visível para outra conta ou para
  visitantes não autenticados (verificado tentando acessar os dados com outra conta).
- **SC-008**: As telas de trajetos e viagens (listas, detalhes e formulários) não apresentam
  rolagem horizontal nas larguras de 360px, 768px, 1280px e 1920px.

## Premissas

- Há um único motorista (o dono do sistema); passageiros não acessam nenhuma tela (constituição,
  Restrições de Domínio).
- "O quanto foi pago no total" é entendido como o valor cobrado da viagem (soma dos valores dos
  passageiros). Saber se cada passageiro já pagou ou está devendo é responsabilidade do slice de
  Pagamentos, que usará as participações criadas aqui; neste slice nenhuma participação é marcada
  como paga.
- Quando o slice de Pagamentos existir, arquivar uma viagem com participações já pagas deverá
  exigir confirmação explícita adicional (constituição, Princípio V); essa regra será definida
  naquele slice.
- Filtros por período, por passageiro ou por trajeto, e a lista de viagens na tela de detalhes do
  passageiro, ficam para o slice de Histórico; aqui a lista de viagens oferece apenas o filtro
  "Ativas"/"Arquivadas".
- Trajetos não têm nome ou apelido próprio: são identificados por "Origem → Destino".
- Não há registro de viagem sem passageiros (o motorista sozinho) nem de passageiros avulsos não
  cadastrados; o passageiro precisa estar cadastrado antes.
- O limite de R$ 9.999,99 por passageiro é o mesmo do valor padrão (slice 002) e serve como trava
  contra erros de digitação.
- As telas reutilizam o layout, os componentes e os formatadores definidos nos slices 001 e 002.
