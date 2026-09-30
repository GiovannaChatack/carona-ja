# Especificação de Funcionalidade: Registro e Gestão de Passageiros

**Diretório da Funcionalidade**: `specs/002-registro-passageiros`

**Criado em**: 2026-09-30

**Status**: Rascunho

**Entrada**: Descrição do usuário: "Crie a spec para a implementação da funcionalidade de registro
de passageiros. Passageiros não são usuarios do aplicativo, apenas devem ser cadastrados por um
usuario oferecedor de carona. Cada passageiro possui nome, telefone e valor padrão da viagem, caso
acredite que cada passageiro precise de mais atributos, por favor sugira e pergunte minha opinião.
Em uma feature possivel será possivel vincular passageiros a viagens feitas em uma rota definida,
seja de ida ou de volta."

**Slice**: 2 de 6. **Pré-requisitos**: slice 001 (login, layout responsivo e publicação).
**Slices que dependem deste**: Viagens (vínculo de passageiros a viagens de ida ou de volta),
Histórico, Pagamentos e Resumo Mensal.

## Esclarecimentos

### Sessão 2026-09-30

- P: Quais atributos além de nome, telefone e valor padrão? → R: Apenas uma observação livre,
  opcional, com até 200 caracteres.
- P: O telefone é obrigatório? → R: Sim, todo passageiro precisa ter telefone.
- P: O valor padrão é único ou separado por ida e volta? → R: Um único valor por trajeto, que vale
  tanto para a ida quanto para a volta; diferenças pontuais são ajustadas na própria viagem.
- P: Qual o escopo da funcionalidade? → R: Cobre o cadastro e a gestão completa dos passageiros:
  listar, inspecionar (ver detalhes), editar, arquivar/reativar e excluir.

## Cenários de Usuário e Testes *(obrigatório)*

### História de Usuário 1 - Cadastrar e listar passageiros (Prioridade: P1)

Como motorista (dono do sistema), quero cadastrar as pessoas que levo de carona, com nome,
telefone, o valor que costumo cobrar por trajeto e uma observação opcional, e ver todas elas em
uma lista, para ter esses dados à mão e, no próximo slice, apenas selecioná-las ao registrar uma
viagem.

**Por que esta prioridade**: sem passageiros cadastrados não é possível registrar viagens nem
cobranças; é o menor pedaço que já entrega valor (uma agenda de passageiros com seus valores).

**Teste Independente**: entrar no sistema, abrir "Passageiros" na navegação, ver o estado vazio,
cadastrar dois passageiros e conferir que ambos aparecem na lista com nome, telefone e valor
padrão formatados, no celular e no computador.

**Cenários de Aceite**:

1. **Dado** que não há passageiros cadastrados, **Quando** abro "Passageiros", **Então** vejo um
   estado vazio explicando para que servem os passageiros e um botão "Novo passageiro".
2. **Dado** que estou no formulário de novo passageiro, **Quando** informo nome, telefone e valor
   padrão válidos (com ou sem observação) e salvo, **Então** vejo a confirmação "Passageiro
   cadastrado" e o passageiro aparece na lista.
3. **Dado** que deixei nome ou telefone em branco, ou informei um telefone ou valor inválido,
   **Quando** tento salvar, **Então** vejo a mensagem de erro em português abaixo do campo
   correspondente e nada é salvo.
4. **Dado** que já existe um passageiro ativo chamado "Ana", **Quando** tento cadastrar outro
   passageiro chamado "ana" (mesmo nome, com diferença apenas de maiúsculas/minúsculas ou espaços
   nas pontas), **Então** o sistema impede o cadastro e informa que o nome já está em uso.
5. **Dado** que há passageiros cadastrados, **Quando** abro a lista, **Então** eles aparecem em
   ordem alfabética, com o telefone no formato `(11) 91234-5678` e o valor como `R$ 12,50`; no
   celular a lista é exibida em cartões, sem rolagem horizontal.
6. **Dado** que há muitos passageiros, **Quando** digito parte de um nome na busca, **Então** a
   lista mostra apenas os passageiros cujo nome contém o texto digitado.

---

### História de Usuário 2 - Inspecionar um passageiro (Prioridade: P2)

Como motorista, quero abrir um passageiro e ver todos os dados dele em um só lugar, para
conferir o cadastro, ler a observação e entrar em contato rapidamente.

**Por que esta prioridade**: a lista mostra apenas os dados essenciais; a tela de detalhes é o
ponto de partida para editar, arquivar, excluir e, nos próximos slices, ver as viagens e
pagamentos do passageiro.

**Teste Independente**: tocar em um passageiro da lista e conferir que a tela de detalhes mostra
nome, telefone, valor padrão, observação, situação e datas, e que as ações de gestão estão
disponíveis.

**Cenários de Aceite**:

1. **Dado** um passageiro na lista, **Quando** toco nele, **Então** vejo a tela de detalhes com
   nome, telefone, valor padrão, observação (ou a indicação "Sem observação"), situação
   (ativo/arquivado), data de cadastro e data da última alteração, no formato `DD/MM/AAAA`.
2. **Dado** que estou na tela de detalhes no celular, **Quando** toco no telefone, **Então** o
   aparelho oferece a ligação para esse número.
3. **Dado** que estou na tela de detalhes de um passageiro ativo, **Quando** olho as ações,
   **Então** vejo "Editar", "Arquivar" e "Excluir"; se ele estiver arquivado, vejo "Reativar" no
   lugar de "Arquivar" e um aviso de que o passageiro está arquivado.
4. **Dado** que estou na tela de detalhes, **Quando** escolho voltar, **Então** retorno à lista
   com a mesma busca e filtro que eu estava usando.
5. **Dado** um endereço de passageiro inexistente ou de outra conta, **Quando** tento abri-lo,
   **Então** vejo a página "Página não encontrada".

---

### História de Usuário 3 - Editar os dados de um passageiro (Prioridade: P2)

Como motorista, quero corrigir o nome, o telefone, a observação ou atualizar o valor padrão de um
passageiro, para manter o cadastro certo quando algo muda (ex.: reajuste do valor da carona).

**Por que esta prioridade**: cadastros erram e valores mudam; sem edição o motorista teria que
recriar o passageiro.

**Teste Independente**: editar o telefone e o valor padrão de um passageiro existente e conferir
que a tela de detalhes e a lista mostram os novos dados.

**Cenários de Aceite**:

1. **Dado** um passageiro cadastrado, **Quando** escolho "Editar", **Então** o formulário vem
   preenchido com os dados atuais.
2. **Dado** que alterei o valor padrão de R$ 10,00 para R$ 12,00 e salvei, **Quando** volto aos
   detalhes, **Então** vejo R$ 12,00, a data da última alteração atualizada e a confirmação
   "Passageiro atualizado".
3. **Dado** que estou editando, **Quando** desisto e volto sem salvar, **Então** nenhum dado é
   alterado.
4. **Dado** que o passageiro já tem viagens registradas (a partir do slice de Viagens) e alterei
   seu valor padrão, **Quando** consulto essas viagens, **Então** os valores registrados nelas não
   mudaram; o novo valor vale apenas para as próximas viagens.

---

### História de Usuário 4 - Arquivar, reativar e excluir passageiros (Prioridade: P3)

Como motorista, quero tirar da lista as pessoas que não pegam mais carona comigo sem perder o que
já aconteceu com elas, trazê-las de volta se voltarem a pegar carona e apagar cadastros feitos
por engano.

**Por que esta prioridade**: mantém a lista enxuta ao longo do tempo; é menos urgente que
cadastrar, inspecionar e editar.

**Teste Independente**: arquivar um passageiro, confirmar que ele some da lista principal e
aparece no filtro "Arquivados"; reativá-lo e confirmar que volta à lista principal; excluir um
passageiro cadastrado por engano após confirmação.

**Cenários de Aceite**:

1. **Dado** um passageiro ativo, **Quando** escolho "Arquivar" e confirmo, **Então** ele sai da
   lista de ativos e passa a aparecer apenas ao filtrar por "Arquivados", com a confirmação
   "Passageiro arquivado".
2. **Dado** um passageiro arquivado, **Quando** escolho "Reativar", **Então** ele volta para a
   lista de ativos com os mesmos dados.
3. **Dado** um passageiro arquivado chamado "Ana" e um passageiro ativo também chamado "Ana",
   **Quando** tento reativar o arquivado, **Então** o sistema avisa que já existe um passageiro
   ativo com esse nome e pede para renomear um deles antes.
4. **Dado** um passageiro sem nenhuma viagem vinculada, **Quando** escolho "Excluir", **Então** o
   sistema pede confirmação explícita e, após confirmar, remove o passageiro definitivamente e
   volta para a lista.
5. **Dado** um passageiro com viagens vinculadas (a partir do slice de Viagens), **Quando** tento
   excluí-lo, **Então** o sistema não permite a exclusão e sugere arquivar.

---

### Casos de Borda

- Nome com espaços extras nas pontas ou só com espaços → os espaços das pontas são removidos; um
  nome vazio após isso é rejeitado.
- Nome ou observação muito longos → limites de 80 e 200 caracteres, respectivamente, com aviso no
  campo.
- Observação só com espaços → tratada como "sem observação".
- Telefone com máscara, espaços, parênteses ou traços → apenas os dígitos são considerados; são
  aceitos números brasileiros com DDD (10 ou 11 dígitos). Números com outro formato são
  rejeitados com mensagem explicando o formato esperado.
- Valor padrão zero (carona gratuita) → aceito e exibido como `R$ 0,00`.
- Valor padrão negativo, com mais de duas casas decimais ou acima de R$ 9.999,99 → rejeitado com
  mensagem no campo.
- Valor digitado com vírgula ("12,5") ou ponto ("12.50") → interpretado como R$ 12,50.
- Dois passageiros com o mesmo telefone → permitido (ex.: irmãos que usam o telefone de um
  responsável).
- Busca sem resultados → mensagem "Nenhum passageiro encontrado" com opção de limpar a busca.
- Nenhum passageiro arquivado → o filtro "Arquivados" mostra um estado vazio próprio.
- Falha de conexão ao salvar → mensagem "Não foi possível salvar. Tente novamente." e os dados
  digitados permanecem no formulário.
- Clique duplo em "Salvar" → o passageiro é cadastrado uma única vez.

## Requisitos *(obrigatório)*

### Requisitos Funcionais

**Cadastro e dados do passageiro**

- **FR-001**: O sistema MUST permitir que o motorista cadastre passageiros. Passageiros MUST NOT
  ter login nem acesso ao sistema; são apenas registros do motorista.
- **FR-002**: Cada passageiro MUST ter nome (obrigatório, 1 a 80 caracteres após remover espaços
  das pontas).
- **FR-003**: Cada passageiro MUST ter telefone (obrigatório): um número brasileiro com DDD (10 ou
  11 dígitos), exibido no formato `(DD) 9XXXX-XXXX` ou `(DD) XXXX-XXXX`.
- **FR-004**: Cada passageiro MAY ter uma observação livre (opcional, até 200 caracteres), para
  anotações como forma de pagamento ou dias em que costuma ir.
- **FR-005**: Cada passageiro MUST ter um único valor padrão por trajeto (obrigatório, de R$ 0,00
  a R$ 9.999,99, com no máximo duas casas decimais), usado tanto para viagens de ida quanto de
  volta.
- **FR-006**: O sistema MUST impedir dois passageiros ativos com o mesmo nome, ignorando
  diferenças de maiúsculas/minúsculas e espaços nas pontas.

**Listagem e inspeção**

- **FR-007**: O sistema MUST exibir a lista de passageiros ativos em ordem alfabética, mostrando
  nome, telefone e valor padrão, em tabela no computador e em cartões no celular.
- **FR-008**: O sistema MUST oferecer busca por nome na lista, que filtra enquanto o motorista
  digita, e um filtro para alternar entre "Ativos" e "Arquivados".
- **FR-009**: O sistema MUST exibir um estado vazio com a ação "Novo passageiro" quando não
  houver passageiros ativos.
- **FR-010**: O sistema MUST oferecer uma tela de detalhes de cada passageiro com todos os seus
  dados (nome, telefone, valor padrão, observação, situação, data de cadastro e data da última
  alteração) e as ações de gestão disponíveis para a situação atual.
- **FR-011**: O telefone MUST ser um link de ligação na lista e nos detalhes (tocar abre o
  discador no celular).

**Edição, arquivamento e exclusão**

- **FR-012**: O motorista MUST conseguir editar todos os dados de um passageiro, com as mesmas
  validações do cadastro.
- **FR-013**: Alterar o valor padrão MUST NOT alterar valores já registrados em viagens
  anteriores; o valor padrão serve apenas para pré-preencher as próximas viagens (constituição,
  Princípio V).
- **FR-014**: O motorista MUST conseguir arquivar um passageiro, após confirmação; passageiros
  arquivados MUST NOT aparecer na lista de ativos nem (no slice de Viagens) na seleção de novas
  viagens, mas MUST continuar visíveis no filtro "Arquivados", nos detalhes e no histórico.
- **FR-015**: O motorista MUST conseguir reativar um passageiro arquivado, desde que não exista
  outro passageiro ativo com o mesmo nome (FR-006).
- **FR-016**: O motorista MUST conseguir excluir definitivamente um passageiro sem viagens
  vinculadas, após confirmação explícita. O sistema MUST impedir a exclusão de passageiros com
  viagens vinculadas e sugerir o arquivamento.

**Interface, privacidade e navegação**

- **FR-017**: A navegação principal MUST ganhar o item "Passageiros", visível no celular e no
  computador, seguindo o padrão do slice 001.
- **FR-018**: Cadastro, edição, arquivamento, reativação e exclusão MUST exibir uma confirmação
  rápida em português ao concluir e uma mensagem clara em caso de falha, sem perder o que foi
  digitado.
- **FR-019**: Cada motorista MUST ver e alterar apenas os próprios passageiros; nenhum dado de
  passageiro MUST ficar acessível sem autenticação (constituição, Princípio VI).
- **FR-020**: Valores MUST ser exibidos no formato `R$ 1.234,56`, datas no formato `DD/MM/AAAA` e
  todos os textos em português do Brasil (constituição, Princípio I).

### Entidades Principais

- **Passageiro**: pessoa que pega carona com o motorista, cadastrada e mantida somente por ele;
  não é usuário do sistema. Atributos: nome, telefone, valor padrão por trajeto, observação
  (opcional), situação (ativo/arquivado, com a data do arquivamento), data de cadastro e data da
  última alteração. Pertence a um único motorista.
- **Motorista (Usuário)**: definido no slice 001; é o dono de todos os passageiros.
- **Participação em viagem** *(slice futuro, citado para delimitar o escopo)*: vínculo entre um
  passageiro e uma viagem de ida ou de volta em uma rota, com o valor efetivamente cobrado
  (pré-preenchido com o valor padrão). Não é criada neste slice.

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **SC-001**: O motorista cadastra um novo passageiro, a partir da tela inicial, em menos de 1
  minuto no celular.
- **SC-002**: Com 100 passageiros cadastrados, o motorista encontra e abre os detalhes de um
  passageiro pelo nome em menos de 10 segundos.
- **SC-003**: Editar, arquivar ou reativar um passageiro leva no máximo 3 toques a partir da tela
  de detalhes (sem contar a digitação).
- **SC-004**: 100% das tentativas de salvar dados inválidos (nome vazio, nome duplicado, telefone
  ausente ou fora do formato, valor fora da faixa, observação longa demais) são bloqueadas com uma
  mensagem que indica o campo e como corrigir.
- **SC-005**: Nenhum passageiro de um motorista é visível para outra conta ou para visitantes
  não autenticados (verificado tentando acessar os dados com outra conta).
- **SC-006**: As telas de passageiros (lista, detalhes e formulário) não apresentam rolagem
  horizontal nas larguras de 360px, 768px, 1280px e 1920px.
- **SC-007**: Após alterar o valor padrão de um passageiro, 100% dos valores de viagens já
  registradas permanecem iguais (verificado a partir do slice de Viagens).

## Premissas

- Há um único motorista (o dono do sistema); passageiros não têm conta, login nem acesso a
  nenhuma tela (constituição, Restrições de Domínio).
- O vínculo de passageiros a viagens (ida ou volta de uma rota) é do próximo slice (Viagens).
  Este slice apenas garante que o cadastro já nasça compatível: valor padrão para pré-preencher a
  viagem, arquivamento em vez de exclusão quando houver histórico e bloqueio de exclusão com
  viagens vinculadas.
- O conceito de "rota definida" citado na descrição será especificado no slice de Viagens; este
  slice não cadastra rotas.
- A tela de detalhes do passageiro será ampliada pelos slices seguintes (viagens, pendências e
  pagamentos do passageiro); neste slice ela mostra apenas os dados cadastrais.
- O limite de R$ 9.999,99 para o valor padrão é uma trava contra erros de digitação, e não uma
  regra de negócio; pode ser revisto.
- Apenas telefones brasileiros são aceitos; números estrangeiros estão fora do escopo.
- Não há importação de contatos da agenda do celular nem envio de mensagens aos passageiros
  neste slice.
- As telas reutilizam o layout, os componentes e os formatadores definidos no slice 001.
