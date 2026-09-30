# Pesquisa: Trajetos e Registro de Viagens

**Funcionalidade**: `specs/003-registro-viagens` | **Data**: 2026-09-30

A stack, o layout e as convenções foram decididos no slice 001
([research.md](../001-base-login-layout/research.md)), e os padrões de formulário, server actions,
avisos por URL e testes no slice 002 ([research.md](../002-registro-passageiros/research.md)).
Este documento registra apenas as decisões novas. Não há "NEEDS CLARIFICATION" pendente.

## 1. Três tabelas, uma por conceito da spec

- **Decisão**: `trajetos`, `viagens` e `viagem_passageiros` (participação). O total da viagem
  **não** é uma coluna: é a soma de `viagem_passageiros.valor_centavos`, exposta por uma view.
- **Justificativa**: segue o modelo acordado no slice 001
  ([data-model.md, Parte 2](../001-base-login-layout/data-model.md)), acrescentando o que a spec
  003 pediu: a tabela `trajetos`, o `trajeto_id` e o `sentido` na viagem, e o arquivamento da
  viagem. O Princípio V proíbe totais digitados ou guardados à parte (FR-013).
- **Divergências em relação ao modelo do slice 001**:
  - `viagens.observacao` foi removida: o usuário pediu só passageiros, sentido e valor.
  - "ida"/"volta" deixa de ser texto livre e vira a coluna `sentido`.
  - `viagem_passageiros.pago_em` **não** é criada aqui. Ela pertence ao slice de Pagamentos, que
    a usa (Princípio II: a migração pertence ao slice que a utiliza).
- **Alternativas consideradas**: guardar `total_centavos` na viagem (duplica a informação e pode
  divergir, o que o Princípio V proíbe); trajeto como texto dentro da viagem (impede arquivar,
  pré-selecionar e evitar duplicidades).

## 2. Gravação atômica da viagem e das participações: funções SQL (RPC)

- **Decisão**: registrar e editar uma viagem são funções Postgres chamadas com
  `supabase.rpc(...)`:
  - `public.registrar_viagem(...)`, criada na fatia B;
  - `public.editar_viagem(...)`, criada na fatia C.
  Ambas são `security invoker`: rodam como o motorista logado, com a RLS valendo normalmente.
  Arquivar e reativar a viagem são `update`s simples de uma linha, como no slice 002.
- **Justificativa**: uma viagem com N participações precisa ser gravada inteira ou não ser
  gravada. O cliente Supabase não abre transações entre várias chamadas, e uma função SQL executa
  tudo em uma única transação. A constituição (Princípio III) prefere funções SQL a um backend
  próprio.
- **Alternativas consideradas**:
  - inserir a viagem e depois as participações em duas chamadas: uma falha no meio deixaria uma
    viagem sem passageiros;
  - route handler com `service_role`: violaria o Princípio VI e seria desnecessário.

## 3. Edição por diferença, preservando as participações

- **Decisão**: `editar_viagem` compara as participações enviadas com as existentes:
  - atualiza o valor das que continuam (mantendo o `id` e `criado_em`);
  - insere as novas;
  - apaga as que saíram.
  Não há "apagar tudo e inserir de novo".
- **Justificativa**: o slice de Pagamentos vai guardar `pago_em` na participação. Recriar as
  linhas a cada edição apagaria o status de pagamento. A estratégia por diferença deixa esse
  slice sem retrabalho.
- **Alternativas consideradas**: apagar e recriar tudo (mais simples hoje, mas quebra o slice 005).

## 4. Integridade entre donos: chaves estrangeiras compostas

- **Decisão**: cada tabela ganha `unique (id, motorista_id)`, e as chaves estrangeiras incluem o
  dono:
  - `viagens (trajeto_id, motorista_id) → trajetos (id, motorista_id)`;
  - `viagem_passageiros (viagem_id, motorista_id) → viagens (id, motorista_id)`;
  - `viagem_passageiros (passageiro_id, motorista_id) → passageiros (id, motorista_id)`.
  A migração da fatia B acrescenta `unique (id, motorista_id)` em `passageiros`, uma restrição
  aditiva que o slice 002 não precisava.
- **Justificativa**: a verificação de uma chave estrangeira ignora a RLS. Com uma FK simples, um
  motorista que conhecesse o `id` de um passageiro de outra conta conseguiria vinculá-lo a uma
  viagem própria. Com a FK composta e `motorista_id default auth.uid()`, o banco rejeita esse
  vínculo (Princípio VI, SC-007).
- **Alternativas consideradas**: validar só dentro das funções SQL (um `insert` direto pela API
  ainda passaria); triggers de verificação (mais código com o mesmo efeito).

## 5. Bloqueio de exclusão: `on delete no action`

- **Decisão**:
  - as FKs para `trajetos` e `passageiros` usam `on delete no action` (o padrão);
  - a FK de `viagem_passageiros` para `viagens` usa `on delete cascade`.
  Assim, excluir um trajeto ou um passageiro com viagens falha com `23503`:
  - a action `excluirPassageiro` já traduz esse erro (research 002 §9, spec 002 FR-016, FR-023);
  - `excluirTrajeto` fará o mesmo (FR-007).
- **Justificativa**: `no action` é verificado no fim do comando. Se a própria conta do motorista
  for excluída, o `on delete cascade` a partir de `auth.users` apaga tudo sem esbarrar na
  restrição. Com `restrict`, a verificação é imediata e a exclusão da conta falharia conforme a
  ordem das cascatas.
- **Alternativas consideradas**: `restrict` (o problema acima); contar viagens antes de excluir
  (condição de corrida).

## 6. Data e hora: campo local de São Paulo, conversão no banco

- **Decisão**:
  - **No formulário**: `<input type="datetime-local">` com o valor `AAAA-MM-DDTHH:mm`, que
    representa a hora de São Paulo. O valor inicial é o momento atual formatado no fuso
    `America/Sao_Paulo` pelo servidor, com a nova função `paraCampoDataHora` em `lib/format.ts`.
  - **Na chamada**: a action envia o texto local para a função SQL no parâmetro
    `p_data_hora_local timestamp`.
  - **No banco**: a função converte com `p_data_hora_local at time zone 'America/Sao_Paulo'`
    e grava em `realizada_em timestamptz`.
  - **Regra de 1 dia no futuro**: é verificada em dois lugares. Na aplicação, a função pura
    `validarDataHoraLocal` compara strings locais, o que dá uma mensagem no campo. No banco, a
    função SQL rejeita com `realizada_em > now() + interval '1 day'`, como defesa em
    profundidade.
- **Justificativa**:
  - o Postgres conhece as regras históricas de fuso, inclusive o horário de verão anterior a
    2019, então nenhuma biblioteca de datas é necessária (Princípio III);
  - o campo nativo abre o seletor de data e hora do celular;
  - o formato local é o mesmo usado para exibir (FR-011, Princípio V).
- **Alternativas consideradas**:
  - converter no JavaScript com um deslocamento fixo de `-03:00`: erraria datas antigas com
    horário de verão;
  - biblioteca de fuso horário: dependência nova;
  - um `check` com `now()` na tabela: não é imutável e quebraria a restauração de backups.

## 7. Viagem duplicada no mesmo dia: aviso com confirmação

- **Decisão**: as funções `registrar_viagem`/`editar_viagem` recebem `p_confirmar_duplicada
  boolean`. Sem a confirmação, se existir outra viagem **ativa** com o mesmo trajeto, sentido e
  dia (dia calculado em `America/Sao_Paulo`), a função levanta um erro com SQLSTATE próprio
  `CJ001`. A action devolve `{ duplicada: 'Já existe uma viagem de ida neste trajeto em
  DD/MM/AAAA.' }`, e o formulário abre um `ConfirmDialog`. Ao confirmar, o formulário reenvia os
  mesmos dados com `confirmar_duplicada=1` (FR-015).
- **Justificativa**: a verificação e a gravação acontecem na mesma transação, e o fluxo segue o
  padrão de `useActionState` já usado.
- **Alternativas consideradas**: consultar antes de salvar em uma chamada separada (duas idas ao
  servidor e condição de corrida); bloquear de vez (a spec permite mais de uma viagem no dia).

## 8. Erros das funções SQL: SQLSTATE próprios

- **Decisão**: as funções levantam erros com códigos da classe `CJ` (Caronas Já), que chegam ao
  cliente em `error.code` pelo PostgREST. As actions traduzem cada código para uma mensagem em
  pt-BR ([contracts/acoes.md](./contracts/acoes.md)).

  | Código | Situação |
  |--------|----------|
  | `CJ001` | viagem duplicada no mesmo dia (aviso, pede confirmação) |
  | `CJ002` | trajeto inexistente, de outra conta ou arquivado (quando não é o trajeto atual da viagem) |
  | `CJ003` | passageiro inexistente, de outra conta ou arquivado (quando não estava na viagem) |
  | `CJ004` | nenhuma participação, ou valor fora da faixa |
  | `CJ005` | data e hora mais de 1 dia no futuro |
  | `CJ006` | viagem inexistente, de outra conta ou arquivada (só na edição) |

- **Justificativa**: as mensagens do banco não são adequadas ao usuário. Com códigos estáveis,
  as actions indicam o campo certo (SC-005).
- **Alternativas consideradas**: interpretar o texto da mensagem (frágil).

## 9. Total e lista: view `viagens_resumo`

- **Decisão**: criar a view `public.viagens_resumo` com `security_invoker = true`. Ela junta cada
  viagem com o seu trajeto e agrega `count(*)` e `sum(valor_centavos)` das participações:
  - a lista e os detalhes leem dessa view;
  - os detalhes buscam as participações à parte, com o nome e a situação de cada passageiro;
  - `security_invoker` faz a view respeitar a RLS das tabelas de origem, o mesmo padrão previsto
    para `resumo_mensal` no slice 006.
- **Justificativa**: o total é derivado em um único lugar, que o slice 006 também usará
  (SC-003). A ordenação e o limite ficam no banco.
- **Alternativas consideradas**: somar no código a partir de um `select` aninhado (repete a regra
  em cada tela); uma coluna mantida por trigger (dado duplicado).

## 10. Lista de viagens: "Carregar mais" por URL

- **Decisão**: `/viagens` lê `?pagina=N` (padrão 1) e busca as `N × 20` viagens mais recentes da
  situação escolhida, pedindo uma a mais para saber se existe continuação. Quando existe, a lista
  termina com o link "Carregar mais" para `?pagina=N+1`, com `scroll={false}`. A ordem é
  `realizada_em desc, criado_em desc`.
- **Justificativa**:
  - o volume é de poucas centenas de viagens por ano;
  - o estado fica na URL, então "Voltar" dos detalhes retorna ao mesmo ponto (padrão `?de=` do
    slice 002);
  - não precisa de estado no cliente nem de rota de API.
- **Alternativas consideradas**:
  - cursor/keyset: mais eficiente, mas desnecessário no volume atual;
  - rolagem infinita: mais código no cliente;
  - carregar tudo: cresce sem limite.

## 11. Formulário de viagem: componente cliente com total em tempo real

- **Decisão**: um único `FormularioViagem` (cliente) serve para nova viagem e edição:
  - **Trajeto**: `<select>` nativo com os trajetos ativos, e também o trajeto atual da viagem na
    edição, mesmo que arquivado.
  - **Sentido**: dois botões de rádio grandes, "Ida" e "Volta", com o percurso resultante
    exibido abaixo.
  - **Data e hora**: o campo nativo descrito no §6.
  - **Passageiros**: uma lista de caixas de marcação, uma por passageiro ativo, e também os
    passageiros já vinculados na edição, mesmo que arquivados. Ao marcar, aparece o campo de
    valor pré-preenchido com o valor padrão (`centavosParaCampo`).
  - **Total**: calculado no cliente com a mesma `parseValorEmCentavos` do servidor e exibido em
    uma barra fixa no rodapé, junto com o botão "Salvar".
  - **Campos enviados**: `trajeto`, `sentido`, `data_hora`, `passageiros` (repetido, um por id
    marcado), `valor_<id>` e `confirmar_duplicada`.
- **Justificativa**: registrar a viagem é a ação mais frequente (Princípio IV, SC-001). O total
  ao vivo usa a mesma regra de conversão do servidor, então o valor exibido é o que será gravado.
  Elementos nativos dispensam componentes novos.
- **Alternativas consideradas**:
  - componente `Select`/`Combobox` do shadcn: novo componente sem ganho para poucas opções;
  - total calculado só no servidor: sem retorno imediato ao usuário.

## 12. Validação compartilhada: `lib/validacao.ts`

- **Decisão**: mover para `lib/validacao.ts` as funções genéricas hoje em
  `lib/passageiros/validacao.ts`: `Resultado`, `parseValorEmCentavos`, `centavosParaCampo`,
  `ehUuid` e `colapsarEspacos`. Detalhes:
  - `parseValorEmCentavos` ganha a mensagem de campo vazio como parâmetro opcional; o padrão
    continua "Informe o valor padrão.";
  - `lib/passageiros/validacao.ts` passa a importá-las e a reexportá-las, então os testes e as
    importações atuais continuam funcionando;
  - as regras novas ficam em `lib/trajetos/validacao.ts` e `lib/viagens/validacao.ts`.
- **Justificativa**: evita que viagens dependam do módulo de passageiros para regras de dinheiro,
  com mudança mínima e sem quebrar nada.
- **Alternativas consideradas**: importar direto de `lib/passageiros/validacao.ts` (acoplamento
  estranho e mensagem "valor padrão" errada no contexto da viagem); duplicar o código (duas regras
  de dinheiro podem divergir, o que o Princípio V proíbe).

## 13. Rotas: trajetos dentro de Viagens

- **Decisão**: um único item novo de navegação, "Viagens" (`/viagens`, ícone `Car`). Os
  trajetos ficam em `/viagens/trajetos` e são acessados pelo botão "Trajetos" na tela de viagens
  (FR-024). As rotas estáticas `nova` e `trajetos` têm prioridade sobre `[id]` no App Router.
- **Justificativa**: a barra inferior do celular comporta no máximo 5 itens, e ainda faltam
  Histórico, Pagamentos e Resumo. Trajetos são pouco acessados depois de cadastrados.
- **Alternativas consideradas**: um item "Trajetos" próprio (esgotaria a barra inferior).

## 14. Tela inicial

- **Decisão**: `/inicio` passa a ter o botão primário "Registrar viagem" (`/viagens/nova`) e o
  secundário "Passageiros". O texto que dizia que viagens viriam "em breve" é atualizado.
- **Justificativa**: SC-001 mede o registro a partir da tela inicial, que não deve anunciar como
  futura uma funcionalidade que já existe.

## 15. Exclusão de viagens fora da interface

- **Decisão**: a interface nunca exclui viagens (FR-022). A tabela `viagens`, porém, tem uma
  política de `delete` "somente o dono", usada apenas pela limpeza dos testes e2e, que exclui as
  viagens criadas e, por cascata, as participações, antes de excluir os passageiros e trajetos de
  teste.
- **Justificativa**:
  - a spec restringe a interface, não o banco;
  - sem essa política, os dados de teste se acumulariam na conta de teste e impediriam a limpeza
    dos passageiros, por causa da FK;
  - a RLS continua limitando a exclusão ao dono.
- **Alternativas consideradas**:
  - `service_role` nos testes: proibido pelo Princípio VI;
  - deixar os dados de teste acumularem: os testes ficariam frágeis e a conta poluída.

## 16. Testes

- **Unitários (Vitest)**:
  - `validarTrajeto`: espaços, limites, origem igual ao destino;
  - `validarViagem`: sem passageiros, valores, `valor_<id>` ausente, ids inválidos;
  - `validarDataHoraLocal`: formato e o limite de 1 dia no futuro, com "agora" injetado;
  - `percurso`: ida e volta;
  - `somarCentavos`;
  - `paraCampoDataHora`;
  - `parseValorEmCentavos` com a mensagem customizada.
- **Ponta a ponta (Playwright, `mobile` e `desktop`)**:
  - `tests/e2e/trajetos.spec.ts` (US1, US6) e `tests/e2e/viagens.spec.ts` (US2–US5);
  - um passageiro com viagem não pode ser excluído (FR-023);
  - alterar o valor padrão não muda uma viagem já registrada (SC-004).
  - O helper de limpeza é ampliado para excluir, nesta ordem, viagens, trajetos e passageiros
    `E2E …` criados pelo worker.
- **RLS e FKs compostas**: verificação manual com uma segunda conta, no
  [quickstart](./quickstart.md), incluindo uma tentativa de vincular o passageiro de outra conta
  pela API.
