# Pesquisa: Controle de Pagamentos e Cobrança

**Funcionalidade**: `specs/005-controle-pagamentos` | **Data**: 2026-10-01

Decisões técnicas do slice 005. Partem do que os slices 001–003 já publicaram: tabelas
`perfis`, `passageiros`, `viagens`, `viagem_passageiros` e `trajetos`, a view `viagens_resumo`,
as funções `registrar_viagem` e `editar_viagem` (erros `CJ001`–`CJ006`) e os padrões de tela do
slice 002 (`useActionState`, `AvisoUrl`, `ResponsiveTable`, `ConfirmDialog`,
`tratarFalhaDeConexao`). Não há "NEEDS CLARIFICATION" pendente.

## 1. Situação de pagamento: coluna `pago_em date` na participação

- **Decisão**: acrescentar `viagem_passageiros.pago_em date` (nula = pendente; preenchida = paga
  naquela data). Não há coluna de "status" separada: a situação é derivada de `pago_em`.
- **Justificativa**: é o desenho previsto desde o slice 001 e confirmado no slice 003 (que já
  edita participações "por diferença" para não perder o `pago_em`). Uma única coluna impede
  estados contraditórios (ex.: "paga" sem data). `date`, e não `timestamptz`, porque o motorista
  informa um **dia** (FR-008) e o slice 006 agrupa por mês de São Paulo: um `date` já é o dia
  local, sem conversão de fuso.
- **Alternativas**: tabela `pagamentos` (um registro por acerto, ligado a várias participações),
  rejeitada: a spec não registra pagamento parcial, forma de pagamento nem valor recebido
  diferente do cobrado, então a tabela extra só traria junções; `status text` + `pago_em`,
  rejeitada pela redundância; `timestamptz`, rejeitada porque o horário não é pedido e
  complicaria a validação "não anterior à data da viagem".
- **Migração**: as participações existentes ficam com `pago_em = null`, ou seja, pendentes
  (FR-002). Nenhum backfill.

## 2. Regras de pagamento no banco: trigger de validação

- **Decisão**: um trigger `before insert or update of pago_em, valor_centavos` em
  `viagem_passageiros` (`public.validar_pagamento()`), que levanta:
  - `CJ007` ao alterar o valor de uma participação paga;
  - `CJ008` se a nova `pago_em` for posterior a hoje em São Paulo ou anterior ao dia da viagem
    em São Paulo;
  - `CJ009` ao marcar como paga uma participação de viagem arquivada ou com valor zero.
- **Justificativa**: com as regras no banco, marcar, desfazer e corrigir a data viram `update`
  simples pela API (com RLS), sem RPC nova. Um `update ... where id in (...)` é um único comando:
  se uma linha falhar no trigger, nenhuma é alterada (FR-010, "tudo ou nada"). A regra vale para
  qualquer caminho (tela de passageiro, tela de viagem, `editar_viagem`).
- **Alternativas**: função RPC `marcar_pagamentos(ids, data)`, rejeitada por duplicar o que o
  `update` + trigger já garantem; validação só no servidor Next, rejeitada porque o Princípio V
  pede que o banco proteja a integridade.
- **Exclusão de participação paga**: **não** é tratada no trigger. Um `before delete` também
  dispararia na exclusão em cascata (limpeza dos testes, exclusão de conta), e a ordem das
  cascatas não é garantida. A regra fica em `editar_viagem` (§4), o único caminho da interface que
  remove participações.

## 3. Marcar, desfazer e corrigir: `update` com filtros

- **Marcar** (FR-008, FR-011): `update viagem_passageiros set pago_em = :data where id in (:ids)
  and pago_em is null`, com `.select('id')` para saber quantas foram alteradas. As que já
  estavam pagas não casam com o filtro, então a data original é preservada; se o número de
  alteradas for menor que o de selecionadas, a tela informa "N viagens já estavam pagas".
- **Desfazer** (FR-012): `set pago_em = null where id = :id and pago_em is not null`.
- **Corrigir a data** (FR-012): `set pago_em = :data where id = :id and pago_em is not null`.
- **"Recebi tudo"**: o servidor busca os ids pendentes do passageiro no momento da ação (e não os
  que a tela mostrava), para não deixar de fora uma viagem registrada em outra aba.
- **Justificativa**: o filtro `pago_em is null` resolve a corrida entre duas abas sem trava
  explícita; a RLS garante que ids de outra conta simplesmente não casam.

## 4. Edição de viagem com participação paga: `editar_viagem` com `CJ007`

- **Decisão**: nova migração redefine `public.editar_viagem` (`create or replace`, mesma
  assinatura) acrescentando, antes do passo de participações, a verificação: se alguma
  participação paga **sai** da viagem ou **muda de valor**, levanta `CJ007` com `detail` = nome do
  passageiro. O formulário de edição também desabilita a caixa e o valor dos passageiros pagos,
  com a etiqueta "Pago em DD/MM/AAAA" (FR-025).
- **Justificativa**: mensagem clara no lugar certo, sem depender do trigger para a remoção (§2).
  As demais alterações (data, trajeto, sentido, passageiros pendentes) seguem permitidas.
- **Data da viagem alterada para depois do pagamento**: não é bloqueada. É um caso raro (corrigir
  a data de uma viagem já paga) e o pagamento continua válido; registrado aqui como decisão
  consciente.

## 5. Arquivar viagem com participações pagas: confirmação reforçada

- **Decisão**: a tela de detalhes da viagem já conhece as participações; com `pago_em` na
  consulta, o `ConfirmDialog` de arquivar muda o texto quando há pagas: título "Arquivar viagem
  com pagamentos?", descrição "N passageiro(s) já pagaram esta viagem. Esses valores deixarão de
  ser contados. Os pagamentos ficam guardados e voltam se você reativar a viagem." e botão
  "Arquivar mesmo assim" (FR-024).
- **Justificativa**: o diálogo já é a confirmação explícita do slice 003; o texto específico torna
  a consequência visível sem um segundo passo. Arquivar não altera `pago_em` (Casos de Borda).

## 6. Pendências: view `pendencias_passageiros` e view `participacoes_detalhe`

- **Decisão**: duas views com `security_invoker = true`:
  - `participacoes_detalhe`: uma linha por participação, com passageiro, valor, `pago_em` e os
    dados da viagem (data, sentido, `arquivada_em`, origem e destino). Base da tela do passageiro,
    da cobrança e da situação na viagem.
  - `pendencias_passageiros`: uma linha por passageiro **com** pendência (participações com
    `pago_em is null`, `valor_centavos > 0` e viagem ativa), com nome, telefone, `arquivado_em`,
    `quantidade_pendentes` e `total_pendente_centavos`.
- **Justificativa**: as regras de "o que é dívida" (FR-003, FR-004) ficam escritas uma única vez,
  no banco, e todas as telas leem o mesmo resultado (SC-004). O total geral é a soma das linhas
  da view, calculada no servidor.
- **Alternativas**: consultas com `embed` do PostgREST (`viagem_passageiros` →
  `viagens` → `trajetos`), rejeitadas porque repetiriam o filtro de dívida em cada consulta e os
  totais exigiriam somar no Next.

## 7. Chave PIX: coluna em `perfis`

- **Decisão**: `perfis.chave_pix text`, nula enquanto não cadastrada, com
  `check (chave_pix is null or (chave_pix = btrim(chave_pix) and char_length(chave_pix) between 1
  and 77))` (FR-021, FR-022). Salva por server action com `update` em `perfis` (a política de
  update já existe desde o slice 001).
- **Justificativa**: é um dado do motorista, um por conta; `perfis` já existe com RLS "somente o
  dono". 77 caracteres é o maior tamanho de chave PIX (e-mail). O tipo da chave não é validado.
- **Alternativas**: tabela `configuracoes_cobranca`, rejeitada por ser uma tabela de uma coluna;
  variável de ambiente, rejeitada porque o motorista precisa alterar pela interface.

## 8. Mensagem de cobrança: função pura compartilhada

- **Decisão**: `montarMensagemCobranca({ nome, chavePix, itens })` em
  `lib/pagamentos/mensagem.ts`, pura e testada, usada no cliente (prévia que muda ao desmarcar,
  FR-016) e nos testes. Regras:
  - saudação com `primeiroNome(nome)` (primeira palavra após colapsar espaços);
  - itens ordenados por `realizada_em` crescente; linha `- DD/MM/AAAA (Ida|Volta): R$ x,yy`;
  - total = soma em centavos dos itens (nunca ponto flutuante);
  - linhas separadas por `\n`, exatamente como no modelo da spec.
- **Espaço do "R$"**: `Intl.NumberFormat('pt-BR', { currency: 'BRL' })` produz `R$` + espaço
  não separável (U+00A0). Na mensagem, ele é trocado por espaço comum, para o texto copiado ser
  idêntico ao modelo (SC-006) e não estranhar em outros aplicativos. A interface continua usando
  `formatCurrency` sem alteração.
- **Justificativa**: uma única fonte do texto; a comparação literal com o exemplo da spec vira um
  teste unitário.

## 9. Abrir o WhatsApp: link `wa.me`

- **Decisão**: `linkWhatsApp(telefone, texto)` → `https://wa.me/55<dígitos>?text=<texto
  codificado com encodeURIComponent>`, aberto por um `<a target="_blank" rel="noopener
  noreferrer">` (FR-018).
- **Justificativa**: é o formato oficial de "click to chat"; no celular abre o aplicativo, no
  computador abre o aplicativo de desktop ou o WhatsApp Web. Não exige conta comercial, API paga
  nem servidor (Princípio III). O telefone já é gravado só com dígitos e com DDD (slice 002), então
  basta prefixar `55`. Um `<a>` (e não `window.open` depois de um `await`) evita bloqueio de
  pop-up no celular.
- **Tamanho**: com 60 viagens, o texto codificado fica perto de 4 mil caracteres, dentro do que
  navegadores e o WhatsApp aceitam. Acima disso, "Copiar mensagem" continua disponível.
- **Alternativas**: WhatsApp Business API (paga, exige servidor e aprovação de modelo), rejeitada;
  `api.whatsapp.com/send`, equivalente, mas o `wa.me` é o formato documentado e mais curto.

## 10. Copiar a mensagem: `navigator.clipboard.writeText`

- **Decisão**: botão cliente que chama `navigator.clipboard.writeText(texto)` e mostra o toast
  "Mensagem copiada" (FR-019). Se a API falhar ou não existir, mostra "Não foi possível copiar.
  Selecione o texto da prévia e copie." e a prévia continua selecionável.
- **Justificativa**: produção roda em HTTPS (Vercel) e o desenvolvimento em `localhost`, ambos
  contextos seguros. Sem dependência nova.

## 11. Data do pagamento: campo `date`, padrão "hoje em São Paulo"

- **Decisão**: `<input type="date">` nativo, preenchido pelo servidor com o dia atual de São Paulo
  (`hojeEmSaoPaulo()`, já existente em `lib/format.ts` desde o slice 004), com `max` =
  hoje e `min` = dia da viagem mais recente entre as selecionadas. A função pura
  `validarDataPagamento` repete as regras no servidor para a mensagem no campo; o trigger (§2) é
  a garantia final (FR-009).
- **Justificativa**: o dia vem do servidor para não depender do fuso do aparelho; o `date` nativo
  é acessível e já usado como padrão de campos nativos no slice 003.

## 12. Rotas

- **Decisão**:
  - `/pagamentos`: pendências por passageiro e total geral (FR-005, FR-006);
  - `/pagamentos/[passageiroId]`: pendentes, pagas e ações (FR-007, FR-008, FR-012);
  - `/pagamentos/[passageiroId]/cobrar`: prévia e envio (FR-015–FR-020);
  - `/pagamentos/configuracoes`: chave PIX (FR-021–FR-023), aceita `?voltar=` apenas no formato
    `/pagamentos/<uuid>/cobrar` (sem redirecionamento aberto).
- **Justificativa**: segue o padrão de uma pasta por rota dos slices anteriores; a cobrança em
  rota própria é mais simples no celular que um diálogo longo e permite o retorno após cadastrar a
  chave (US2, cenário 5). `configuracoes` é segmento estático e tem prioridade sobre
  `[passageiroId]`; além disso, `[passageiroId]` só aceita UUID (`ehUuid`).

## 13. Navegação e convivência com o slice 004

- **Decisão**: item "Pagamentos" (`/pagamentos`, ícone `Wallet` do `lucide-react`) depois de
  "Histórico" em `components/layout/nav-items.ts`.
- **Slice 004 já publicado** (integrado à `main` durante este planejamento):
  `nav-items.ts`, `app/(app)/passageiros/[id]/page.tsx` ("Ver histórico") e
  `app/(app)/viagens/[id]/page.tsx` (retorno ao Histórico em `hrefDeVolta`) já têm as mudanças
  dele; este slice só acrescenta, sem alterá-las. `hojeEmSaoPaulo` já existe em `lib/format.ts`
  e é reaproveitada. O item "Pagamentos" ocupa o 5º e último espaço da BottomNav.

## 14. Tela de detalhes do passageiro e da viagem

- **Passageiro** (FR-013): um cartão "Pagamentos" com o total devido (da view
  `pendencias_passageiros`; sem linha = `R$ 0,00`) e o link "Ver pagamentos" para
  `/pagamentos/[id]`.
- **Viagem** (FR-014, fatia C): a lista de passageiros ganha a situação ("Pago em DD/MM/AAAA" com
  `Badge`, ou "Pendente") e, em viagem ativa, o botão "Marcar como pago" que abre um diálogo com a
  data. Participações de `R$ 0,00` mostram "Sem cobrança" e não têm ação.

## 15. Testes

- **Unitários (Vitest)**:
  - `tests/unit/pagamentos-mensagem.test.ts`: o exemplo da spec reproduzido literalmente,
    primeiro nome, ordem cronológica, duas viagens no mesmo dia, total em centavos, chave PIX,
    `linkWhatsApp` (prefixo 55 e codificação de `*`, `\n`, `!`, acentos);
  - `tests/unit/pagamentos-validacao.test.ts`: `validarDataPagamento` (hoje, futuro, antes da
    viagem, vazio, formato inválido) e `validarChavePix` (vazia, só espaços, 77 e 78 caracteres,
    aparar espaços);
  - `tests/unit/format.test.ts`: `formatDataCampo` (`hojeEmSaoPaulo` já é testada desde o
    slice 004).
- **E2E (Playwright, `mobile` 360px e `desktop` 1280px)**:
  - `tests/e2e/pagamentos.spec.ts`: pendências, marcar, "Recebi tudo", desfazer, corrigir data,
    trava de edição, aviso ao arquivar, viagem arquivada fora das pendências, situação na viagem;
  - `tests/e2e/cobranca.spec.ts`: chave PIX (cadastro, validação, retorno à cobrança), prévia,
    desmarcar, `href` do WhatsApp (sem abrir o link), copiar (permissão de área de transferência
    concedida no Chromium).
- A limpeza dos testes continua excluindo viagens de teste; a cascata leva as participações
  (pagas ou não), já que não há trigger de `delete` (§2). A chave PIX da conta de teste é
  restaurada ao fim do `cobranca.spec.ts`.
