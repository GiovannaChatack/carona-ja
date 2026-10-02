# Especificação de Funcionalidade: Controle de Pagamentos e Cobrança

**Diretório da Funcionalidade**: `specs/005-controle-pagamentos`

**Criado em**: 2026-10-01

**Status**: Rascunho

**Entrada**: Descrição do usuário: "slice 005 controle de pagamentos, essa spec deve cobrir a
cobrança dos passageiros. Nisso gostaria de uma forma de acessar o usuario e enviar uma mensagem
por whatsapp para o passageiro fazendo a cobrança e detalhando as viagens que estão sendo
cobradas:" seguida do modelo de mensagem reproduzido em "Modelo da mensagem de cobrança" abaixo
(a chave PIX real do exemplo foi substituída por um marcador nesta spec).

**Slice**: 5 de 6. **Pré-requisitos**: slice 001 (login, layout responsivo e publicação), slice
002 (passageiros) e slice 003 (trajetos, viagens e participações). **Independente de**: slice 004
(Histórico), já publicado. **Slices que dependem deste**: Resumo
Mensal (006), que usará o status e a data de pagamento para calcular o valor recebido por mês.

## Contexto e Restrições de Planejamento

- **Independência do slice 004**: este slice MUST NOT depender da tela, dos filtros ou das
  consultas do Histórico. O slice 004 mostra o que foi **cobrado**; este slice controla o que
  foi **pago** e o que está **pendente**.
- **Pontos de contato com outros slices** (pequenos e aditivos, preservando o que o slice 004
  já acrescentou nas mesmas telas): o item "Pagamentos" na navegação, uma seção de pagamentos na
  tela de detalhes do passageiro e a situação de pagamento de cada passageiro na tela de detalhes
  da viagem (slice 003), além das travas de edição e arquivamento de viagens com participações
  pagas.
- **Sem serviços externos pagos**: a cobrança abre o WhatsApp do próprio motorista com a mensagem
  pronta; o envio é feito por ele no WhatsApp. O sistema não envia mensagens sozinho
  (constituição, Princípio III).

## Cenários de Usuário e Testes *(obrigatório)*

### História de Usuário 1 - Ver quem está devendo e marcar pagamentos (Prioridade: P1)

Como motorista, quero ver, para cada passageiro, as viagens que ele ainda não pagou e o total
devido, e marcar como pagas as viagens que ele acertou, para saber a qualquer momento quem me
deve e quanto.

**Por que esta prioridade**: é o núcleo do controle de pagamentos; sem o status pago/pendente não
há o que cobrar.

**Teste Independente**: com duas viagens de um passageiro (R$ 10,00 cada) e uma de outro, abrir
"Pagamentos", conferir os totais pendentes de cada um, marcar uma viagem do primeiro como paga e
conferir que o total dele cai para R$ 10,00 e que a viagem aparece entre as pagas com a data do
pagamento; tudo no celular e no computador.

**Cenários de Aceite**:

1. **Dado** que tenho viagens registradas, **Quando** abro "Pagamentos" na navegação, **Então**
   vejo os passageiros que têm valores pendentes, cada um com a quantidade de viagens pendentes e
   o total devido, do maior para o menor total, e no topo o total pendente de todos os
   passageiros somados.
2. **Dado** a lista de pendências, **Quando** toco em um passageiro, **Então** vejo as viagens
   pendentes dele, da mais antiga para a mais recente, cada uma com data (`DD/MM/AAAA`), "Ida" ou
   "Volta", percurso e o valor cobrado dele, e o total devido.
3. **Dado** as viagens pendentes de um passageiro, **Quando** seleciono uma ou mais e confirmo
   "Marcar como pagas" com a data do pagamento (por padrão, hoje), **Então** essas viagens deixam
   de estar pendentes, passam a constar como pagas com a data informada e o total devido é
   recalculado.
4. **Dado** as viagens pendentes de um passageiro, **Quando** escolho "Recebi tudo" e confirmo,
   **Então** todas as viagens pendentes dele passam a pagas com a data informada.
5. **Dado** um passageiro sem nenhuma viagem pendente, **Quando** abro a tela de pagamentos dele,
   **Então** vejo "Nenhum valor pendente" e o total devido `R$ 0,00`.
6. **Dado** que nenhum passageiro tem pendências, **Quando** abro "Pagamentos", **Então** vejo um
   estado vazio informando que ninguém está devendo.
7. **Dado** a tela de detalhes de um passageiro (slice 002), **Quando** a abro, **Então** vejo o
   total devido por ele e o atalho para as pendências e pagamentos dele.

---

### História de Usuário 2 - Cobrar o passageiro pelo WhatsApp (Prioridade: P1)

Como motorista, quero, a partir das pendências de um passageiro, abrir o WhatsApp com a conversa
dele e uma mensagem de cobrança pronta, detalhando cada viagem pendente, o total e a minha chave
PIX, para cobrar em poucos toques sem montar a mensagem à mão.

**Por que esta prioridade**: é o pedido central deste slice; montar a mensagem manualmente é
demorado e sujeito a erros de soma.

**Teste Independente**: com a chave PIX cadastrada e duas viagens pendentes de um passageiro,
escolher "Cobrar pelo WhatsApp" e conferir que o WhatsApp abre na conversa com o telefone dele, com
a mensagem no formato do modelo, listando as duas viagens e o total correto.

**Cenários de Aceite**:

1. **Dado** um passageiro com viagens pendentes e a chave PIX cadastrada, **Quando** escolho
   "Cobrar pelo WhatsApp", **Então** vejo uma prévia da mensagem com todas as viagens pendentes
   selecionadas e o total.
2. **Dado** a prévia da cobrança, **Quando** desmarco uma das viagens, **Então** ela sai da
   mensagem e o total é recalculado na hora.
3. **Dado** a prévia da cobrança, **Quando** escolho "Abrir no WhatsApp", **Então** o WhatsApp
   abre (aplicativo no celular, WhatsApp Web ou aplicativo de computador no computador) na
   conversa com o telefone do passageiro, com a mensagem já escrita, pronta para eu enviar.
4. **Dado** a prévia da cobrança, **Quando** escolho "Copiar mensagem", **Então** o texto completo
   é copiado e vejo a confirmação "Mensagem copiada".
5. **Dado** que ainda não cadastrei a chave PIX, **Quando** escolho "Cobrar pelo WhatsApp",
   **Então** sou avisado de que a chave PIX é necessária e levado ao cadastro dela, voltando à
   cobrança depois de salvar.
6. **Dado** um passageiro sem viagens pendentes, **Quando** abro a tela de pagamentos dele,
   **Então** a opção de cobrança fica indisponível, com a indicação "Nada a cobrar".
7. **Dado** que abri a cobrança no WhatsApp, **Quando** volto ao sistema, **Então** as viagens
   continuam pendentes até que eu as marque como pagas.

---

### História de Usuário 3 - Cadastrar a chave PIX para cobranças (Prioridade: P1)

Como motorista, quero cadastrar e alterar a chave PIX que aparece nas mensagens de cobrança, para
que os passageiros saibam para onde pagar.

**Por que esta prioridade**: a mensagem de cobrança depende da chave; sem ela a História 2 não
funciona.

**Teste Independente**: cadastrar uma chave PIX, gerar uma cobrança e conferir que a chave aparece
na mensagem; alterar a chave e conferir que a próxima cobrança usa a nova.

**Cenários de Aceite**:

1. **Dado** a tela de configurações de cobrança, **Quando** informo a chave PIX e salvo, **Então**
   vejo a confirmação e a chave passa a ser usada em todas as cobranças.
2. **Dado** uma chave já cadastrada, **Quando** a altero e salvo, **Então** as cobranças geradas
   a partir daí usam a nova chave.
3. **Dado** que deixo a chave em branco ou com mais caracteres que o permitido, **Quando** tento
   salvar, **Então** vejo uma mensagem que indica o problema e a chave anterior é mantida.

---

### História de Usuário 4 - Desfazer um pagamento marcado por engano (Prioridade: P2)

Como motorista, quero desfazer a marcação de pagamento de uma viagem ou corrigir a data do
pagamento, para consertar enganos sem distorcer quem está devendo.

**Por que esta prioridade**: enganos acontecem, mas são menos frequentes que marcar e cobrar.

**Teste Independente**: marcar uma viagem como paga, desfazer o pagamento e conferir que ela
volta às pendências e ao total devido; marcar de novo com outra data e conferir a data exibida.

**Cenários de Aceite**:

1. **Dado** a lista de viagens pagas de um passageiro (mais recentes primeiro, com a data do
   pagamento), **Quando** escolho "Desfazer pagamento" em uma delas e confirmo, **Então** ela
   volta a pendente, sem data de pagamento, e o total devido aumenta no valor dela.
2. **Dado** uma viagem paga, **Quando** altero a data do pagamento para outra data válida e
   salvo, **Então** a nova data passa a ser exibida.
3. **Dado** o pedido de desfazer um pagamento, **Quando** cancelo a confirmação, **Então** nada
   muda.

---

### História de Usuário 5 - Situação de pagamento na viagem (Prioridade: P3)

Como motorista, quero ver nos detalhes de uma viagem quais passageiros já pagaram e quais estão
pendentes, e marcar o pagamento ali mesmo, para acertar com quem paga logo após a carona.

**Por que esta prioridade**: conveniência; o mesmo resultado é obtido pela tela do passageiro.

**Teste Independente**: abrir os detalhes de uma viagem com dois passageiros, marcar um como pago
e conferir a situação na viagem e nas pendências desse passageiro.

**Cenários de Aceite**:

1. **Dado** os detalhes de uma viagem ativa (slice 003), **Quando** os abro, **Então** vejo, ao
   lado de cada passageiro, "Pago em DD/MM/AAAA" ou "Pendente".
2. **Dado** um passageiro pendente na viagem, **Quando** escolho "Marcar como pago" e confirmo a
   data, **Então** ele passa a pago nessa viagem e deixa de constar nas pendências dele.

---

### Casos de Borda

- Participações existentes antes deste slice → começam todas como pendentes; o "Recebi tudo"
  (História 1, cenário 4) permite quitar de uma vez as viagens antigas já acertadas.
- Participação com valor `R$ 0,00` → não gera dívida: não aparece nas pendências, não entra nos
  totais nem nas cobranças.
- Viagem arquivada (slice 003) → suas participações não aparecem nas pendências nem entram em
  totais ou cobranças; ao reativá-la, as participações voltam com a situação que tinham.
- Arquivar uma viagem com participações já pagas → o sistema pede confirmação explícita adicional,
  informando quantos passageiros já pagaram e que esses valores deixarão de ser contados; a
  situação e a data dos pagamentos são preservadas.
- Editar uma viagem (slice 003) alterando o valor de um passageiro já pago, ou removendo-o da
  viagem → bloqueado com a mensagem "Este passageiro já pagou esta viagem. Desfaça o pagamento
  antes de alterar o valor ou removê-lo."; as demais alterações da viagem (data, trajeto, sentido,
  passageiros pendentes) continuam permitidas.
- Passageiro arquivado com pendências → continua aparecendo em "Pagamentos", identificado como
  arquivado, e pode ser cobrado e ter pagamentos marcados.
- Data de pagamento no futuro → rejeitada com mensagem; data anterior à data da viagem →
  rejeitada, pois não se paga uma viagem antes de ela existir. Datas consideradas no fuso
  `America/Sao_Paulo`.
- Marcar como paga uma viagem que já foi paga (ex.: duas abas abertas) → a operação não duplica
  nem altera a data original; o sistema informa que a viagem já estava paga e atualiza a tela.
- Muitas viagens pendentes (ex.: 60) → a cobrança lista todas as selecionadas, em ordem
  cronológica; a prévia permite rolar e o total continua correto.
- Duas viagens no mesmo dia e no mesmo sentido → aparecem como duas linhas iguais na mensagem,
  cada uma com o seu valor.
- Nome do passageiro com mais de uma palavra (ex.: "Maria Eduarda") → a saudação usa apenas o
  primeiro nome ("Olá, Maria!").
- Celular sem WhatsApp instalado ou WhatsApp que não abre → a opção "Copiar mensagem" continua
  disponível para colar em qualquer aplicativo.
- Falha de conexão ao marcar ou desfazer pagamentos → mensagem clara em português, a seleção é
  mantida e nada é alterado parcialmente.

## Modelo da mensagem de cobrança

A mensagem MUST seguir exatamente este modelo, com os asteriscos (negrito no WhatsApp), as
quebras de linha e as linhas em branco indicados. Exemplo para a passageira "Duda" com duas
viagens pendentes de R$ 10,00 em 28/09/2026:

```text
Olá, Duda!

Segue o detalhamento das suas viagens pendentes (Total Devido: R$ 20,00):

- 28/09/2026 (Ida): R$ 10,00
- 28/09/2026 (Volta): R$ 10,00

*Valor a ser pago: R$ 20,00*

Você pode pagar via PIX para a chave:
*<chave PIX do motorista>*

Qualquer dúvida, estou à disposição. Obrigado!
```

- **Saudação**: primeiro nome do passageiro, como cadastrado.
- **Linhas de viagem**: uma por viagem selecionada, em ordem cronológica (da mais antiga para a
  mais recente; no mesmo dia, pela hora), no formato `- DD/MM/AAAA (Ida|Volta): R$ valor`.
- **Total Devido** e **Valor a ser pago**: ambos iguais à soma das viagens listadas na mensagem.
- **Chave PIX**: a chave cadastrada pelo motorista, sem espaços extras dentro dos asteriscos.
- **Valores**: no formato brasileiro (`R$ 1.234,56`), conforme a constituição (Princípio I); o
  exemplo original usava ponto decimal (`R$ 20.00`), que foi padronizado.

## Requisitos *(obrigatório)*

### Requisitos Funcionais

**Situação de pagamento**

- **FR-001**: Cada participação em viagem (slice 003) MUST ter uma situação de pagamento:
  "pendente" ou "paga"; participações pagas MUST registrar a data do pagamento (constituição,
  Princípio V).
- **FR-002**: Novas participações MUST começar como pendentes; as participações já existentes
  quando este slice for publicado MUST ser consideradas pendentes.
- **FR-003**: Participações com valor `R$ 0,00` MUST NOT ser tratadas como dívida: não aparecem
  nas pendências e não entram em totais devidos nem em cobranças.
- **FR-004**: Apenas participações de viagens ativas MUST contar em pendências, totais e
  cobranças; participações de viagens arquivadas MUST ser ignoradas, preservando a situação que
  tinham (slice 003, FR-021).

**Pendências e marcação de pagamentos**

- **FR-005**: A navegação principal MUST ganhar o item "Pagamentos", visível no celular e no
  computador, que abre a lista de passageiros com valores pendentes.
- **FR-006**: A lista de pendências MUST exibir, para cada passageiro com valor pendente, o nome
  (com a indicação "arquivado", quando for o caso), a quantidade de viagens pendentes e o total
  devido, ordenada do maior para o menor total, e MUST exibir o total pendente geral.
- **FR-007**: A tela de pagamentos de um passageiro MUST exibir as viagens pendentes (da mais
  antiga para a mais recente, com data, sentido, percurso e valor do passageiro), o total devido
  e as viagens pagas (das mais recentes para as mais antigas, com a data do pagamento).
- **FR-008**: O motorista MUST conseguir marcar como pagas uma, várias ou todas ("Recebi tudo")
  as viagens pendentes de um passageiro, de uma só vez, informando a data do pagamento, que vem
  preenchida com a data de hoje.
- **FR-009**: A data do pagamento MUST NOT ser futura nem anterior à data da viagem, considerando
  o fuso `America/Sao_Paulo`; o sistema MUST rejeitar datas inválidas com mensagem em português.
- **FR-010**: Marcar como pagas várias viagens MUST ser uma operação única: ou todas as
  selecionadas passam a pagas, ou nenhuma é alterada.
- **FR-011**: Marcar como paga uma participação que já está paga MUST NOT alterar a data original
  nem duplicar o pagamento.
- **FR-012**: O motorista MUST conseguir desfazer o pagamento de uma viagem, após confirmação, e
  corrigir a data de um pagamento já registrado.
- **FR-013**: A tela de detalhes do passageiro (slice 002) MUST exibir o total devido por ele e o
  atalho para a tela de pagamentos dele.
- **FR-014**: A tela de detalhes da viagem (slice 003) MUST exibir a situação de pagamento de cada
  passageiro ("Pago em DD/MM/AAAA" ou "Pendente") e permitir marcar o pagamento de um passageiro
  pendente.

**Cobrança pelo WhatsApp**

- **FR-015**: A tela de pagamentos de um passageiro com valores pendentes MUST oferecer a ação
  "Cobrar pelo WhatsApp"; sem pendências, a ação MUST ficar indisponível com a indicação "Nada a
  cobrar".
- **FR-016**: A cobrança MUST exibir uma prévia da mensagem com todas as viagens pendentes
  selecionadas por padrão, permitindo desmarcar e remarcar viagens, com o total recalculado na
  hora; a cobrança MUST exigir ao menos uma viagem selecionada.
- **FR-017**: A mensagem MUST seguir o "Modelo da mensagem de cobrança" desta spec, com valores
  derivados das participações registradas, nunca digitados.
- **FR-018**: A ação "Abrir no WhatsApp" MUST abrir o WhatsApp na conversa com o telefone
  cadastrado do passageiro (com o código do Brasil), com a mensagem preenchida, no celular e no
  computador; o envio é feito pelo motorista no próprio WhatsApp.
- **FR-019**: A cobrança MUST oferecer também "Copiar mensagem", que copia o texto completo e
  confirma a cópia.
- **FR-020**: Gerar ou abrir uma cobrança MUST NOT alterar a situação de pagamento de nenhuma
  viagem.

**Chave PIX**

- **FR-021**: O motorista MUST conseguir cadastrar e alterar a chave PIX usada nas cobranças, em
  uma tela de configurações de cobrança acessível a partir de "Pagamentos".
- **FR-022**: A chave PIX MUST ser obrigatória para salvar, ter no máximo 77 caracteres e ser
  guardada sem espaços no início ou no fim; o sistema aceita qualquer tipo de chave (CPF, CNPJ,
  telefone, e-mail ou chave aleatória) sem validar o tipo.
- **FR-023**: Sem chave PIX cadastrada, a cobrança MUST avisar que ela é necessária e levar ao
  cadastro, retornando à cobrança após salvar.

**Integridade com viagens**

- **FR-024**: Arquivar uma viagem com participações pagas MUST exigir confirmação explícita
  adicional, informando quantos passageiros já pagaram e que esses valores deixarão de ser
  contados (constituição, Princípio V; slice 003, Premissas).
- **FR-025**: A edição de uma viagem MUST bloquear a alteração do valor e a remoção de um
  passageiro cuja participação esteja paga, com mensagem que oriente desfazer o pagamento antes.

**Escopo, privacidade e formatos**

- **FR-026**: Cada motorista MUST ver e alterar apenas os próprios pagamentos, pendências e chave
  PIX; nenhum desses dados MUST ficar acessível sem autenticação (constituição, Princípio VI).
- **FR-027**: Valores MUST ser exibidos no formato `R$ 1.234,56`, datas como `DD/MM/AAAA` e todos
  os textos em português do Brasil, inclusive na mensagem de cobrança (constituição, Princípio I).
- **FR-028**: Marcações, desfazimentos, correções de data e o cadastro da chave PIX MUST exibir
  confirmação de sucesso; falhas MUST exibir mensagem clara em português, mantendo a seleção e os
  dados informados.

### Entidades Principais

- **Participação em viagem** (slice 003, ampliada): ganha a situação de pagamento (pendente ou
  paga) e a data do pagamento, quando paga. É a unidade cobrada e paga.
- **Configuração de cobrança do motorista**: dados do motorista usados nas cobranças. Atributo:
  chave PIX. Uma por motorista.
- **Pendência do passageiro** (derivada, não armazenada): conjunto das participações pendentes,
  com valor maior que zero, de viagens ativas de um passageiro, com a quantidade e o total devido.
- **Mensagem de cobrança** (derivada, não armazenada): texto gerado a partir do passageiro, das
  participações selecionadas e da chave PIX.
- **Passageiro** (slice 002), **Viagem** e **Trajeto** (slice 003): usados na exibição e na
  mensagem; o telefone do passageiro é o destino da cobrança.

## Critérios de Sucesso *(obrigatório)*

### Resultados Mensuráveis

- **SC-001**: A partir da tela inicial, o motorista abre o WhatsApp com a cobrança pronta de um
  passageiro em até 4 toques e menos de 20 segundos no celular.
- **SC-002**: O motorista marca como pagas todas as viagens pendentes de um passageiro em menos de
  15 segundos no celular.
- **SC-003**: Em 100% das cobranças, o total da mensagem é igual à soma das viagens listadas nela,
  e cada valor listado é igual ao valor do passageiro nos detalhes da respectiva viagem.
- **SC-004**: Em 100% dos casos, o total devido de um passageiro é igual à soma dos valores das
  viagens pendentes listadas para ele, e o total pendente geral é igual à soma dos totais dos
  passageiros.
- **SC-005**: Nenhuma viagem arquivada ou participação de `R$ 0,00` aparece nas pendências, nos
  totais ou nas cobranças (verificado arquivando uma viagem pendente e conferindo as telas).
- **SC-006**: 100% das mensagens geradas seguem o modelo definido (saudação, linhas de viagem,
  totais, chave PIX e fechamento), verificado comparando o texto copiado com o modelo.
- **SC-007**: Nenhum pagamento, pendência ou chave PIX de um motorista é visível para outra conta
  ou para visitantes não autenticados (verificado com uma segunda conta).
- **SC-008**: As telas de pagamentos, cobrança e configurações não apresentam rolagem horizontal
  nas larguras de 360px, 768px, 1280px e 1920px.

## Premissas

- Há um único motorista (o dono do sistema); passageiros não acessam o sistema e não recebem
  nada automaticamente: toda cobrança é enviada pelo motorista no WhatsApp dele.
- O pagamento é registrado por viagem (participação): não há pagamento parcial de uma viagem nem
  crédito/saldo a favor do passageiro; se o passageiro pagar uma parte do total, o motorista
  marca como pagas as viagens que o valor cobre.
- A forma de pagamento (PIX, dinheiro etc.) não é registrada; apenas a situação e a data.
- O sistema não guarda histórico das cobranças enviadas, e não tem como saber se a mensagem foi
  de fato enviada no WhatsApp; isso pode ser acrescentado depois, fora deste slice.
- O texto da mensagem é fixo (modelo desta spec); ajustes pontuais podem ser feitos pelo motorista
  no próprio WhatsApp antes de enviar. Um editor de modelo está fora do escopo.
- O telefone do passageiro é sempre brasileiro (slice 002); o código do país (55) é acrescentado
  automaticamente na abertura do WhatsApp.
- A saudação usa o primeiro nome do cadastro; quem quiser um apelido (ex.: "Duda") deve
  cadastrá-lo como nome do passageiro.
- O valor recebido por mês e os resumos mensais pertencem ao slice 006, que usará a data do
  pagamento registrada aqui; este slice mostra apenas pendências e a lista de pagas por
  passageiro.
- Filtro ou coluna de status de pagamento no Histórico (slice 004) ficam para depois que os dois
  slices estiverem concluídos, fora do escopo deste slice.
- O item "Pagamentos" ocupa a quinta e última posição disponível na navegação inferior do celular
  (Início, Passageiros, Viagens, Histórico, Pagamentos); acomodar o item do slice 006 é decisão
  daquele slice.
- As telas reutilizam o layout, os componentes (incluindo tabela em cartões no celular), os
  formatadores e o padrão de mensagens de erro definidos nos slices 001 a 003.
