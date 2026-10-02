---

description: "Lista de tarefas do slice 005: Controle de Pagamentos e Cobrança"
---

# Tarefas: Controle de Pagamentos e Cobrança

**Entrada**: Documentos de design em `specs/005-controle-pagamentos/`

**Pré-requisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/rotas.md](./contracts/rotas.md),
[contracts/acoes.md](./contracts/acoes.md), [quickstart.md](./quickstart.md)

**Testes**: incluídos e **substituem a validação manual**. A constituição exige testes
automatizados para as regras de cálculo e verificação em larguras de celular e desktop:

- Vitest para mensagem de cobrança, link do WhatsApp, totais, datas e chave PIX;
- Playwright (`mobile` 360px e `desktop` 1280px) para as telas, com **uma única conta de teste**
  (`E2E_EMAIL`/`E2E_SENHA`). A verificação de privacidade usa um cliente **sem sessão** e ids de
  outra conta inexistentes, sem segunda conta.

**Organização**: **sessão única**, sem fatias publicadas separadamente (pedido do usuário). Execute
em ordem, de T001 a T046: `/speckit-implement`. As fases por história existem para
rastreabilidade e ordem; a publicação acontece só na Fase 8. Ao fim de cada fase, `npm run test` e
`npm run typecheck` devem passar, e nenhuma tela fica sem uso.

## Formato: `[ID] [P?] [História] Descrição`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[História]**: US1–US5 (ver spec.md).
- Nenhuma tarefa exige ação manual em painel externo nem uma segunda conta. A publicação (T044)
  exige **confirmação do usuário** no chat antes do push.

## Convenções

- Projeto único Next.js na raiz (`app/`, `components/`, `lib/`, `supabase/`, `tests/`). Node fora
  do PATH do bash: rodar `npm`/`npx` pelo PowerShell.
- Domínio, colunas, views, rotas e textos em pt-BR.
- **Next.js 16**: `params` e `searchParams` são `Promise`; o antigo `middleware.ts` é o
  `proxy.ts`; ler os guias em `node_modules/next/dist/docs/` antes de escrever rotas e actions
  (T002).
- **Modelos de código a seguir à risca**:
  - actions: `app/(app)/viagens/actions.ts` (incluindo `erroDaFuncao` com SQLSTATE `CJ00x`);
  - lista com `ResponsiveTable` e "Carregar mais" por URL: `app/(app)/viagens/page.tsx` e
    `lista-viagens.tsx`;
  - detalhes e ações com `ConfirmDialog`: `app/(app)/viagens/[id]/page.tsx` e `acoes-viagem.tsx`;
  - formulário com `useActionState`: `app/(app)/passageiros/formulario-passageiro.tsx`;
  - consultas: `lib/viagens/consultas.ts`;
  - migração: `supabase/migrations/20260930172802_viagens.sql` e `20261001153855_editar_viagem.sql`;
  - e2e: `tests/e2e/viagens.spec.ts`, `tests/e2e/historico.spec.ts` (`itensDaLista`,
    `semRolagemHorizontal`) e `tests/e2e/helpers/passageiros.ts`.
- **Padrões obrigatórios**: `redirect` fora do `try/catch`; `.bind(null, id)` para actions sobre
  um registro; `motorista_id` nunca vem do formulário; `?aviso=` exibido por `AvisoUrl` dentro de
  `<Suspense>`; componentes cliente envolvem as actions com `tratarFalhaDeConexao`
  (`lib/acoes-cliente.ts`); ids conferidos com `ehUuid` (`lib/validacao.ts`).
- Nunca usar a chave `service_role`. Nunca gravar a chave PIX real do usuário em código, testes ou
  docs; nos testes, a chave é sempre `teste@exemplo.com`.

## Regras contra condições de corrida (valem para todos os e2e)

Os projetos `mobile` e `desktop` rodam em paralelo (`fullyParallel`) na **mesma** conta de teste.

1. **Nenhum teste afirma totais globais da conta** (ex.: "Total a receber" de `/pagamentos`). As
   asserções são sobre a linha, a tela ou a cobrança de um **passageiro criado pelo próprio teste**
   (`prepararCenario`, nomes únicos via `nomeDeTeste`).
2. **Cada teste cria os próprios dados** e não depende de outro teste. A limpeza
   (`limparDadosDeTeste`) apaga só o que o worker criou; a cascata de `viagens` leva as
   participações, pagas ou não (não há trigger de `delete`).
3. **Chave PIX é estado global da conta**: todo teste que precisa dela grava **sempre o mesmo
   valor** `teste@exemplo.com` (gravação idempotente). Nenhum teste apaga a chave (`null`). O fluxo
   "sem chave cadastrada" é coberto por teste unitário da decisão de destino (T011) e pelo e2e da
   tela de configurações com `?aviso=pix-necessaria`.
4. **Datas determinísticas**: viagens de teste em datas fixas no passado (setembro de 2025) e
   pagamentos com a data de hoje (`hojeEmSaoPaulo()`), sempre válida; os casos de data inválida
   usam "amanhã" e "um dia antes da viagem".
5. **Sem `test.describe.serial`** e sem estado compartilhado; cada teste faz login
   (`entrarComContaDeTeste`).
6. **Migrações**: aplicar uma vez (T005) e **nunca editar** depois de aplicadas; correções viram
   migração nova. Nunca usar `supabase migration repair --status reverted` nem `db reset`.

---

## Fase 1: Setup e banco

**Propósito**: branch, leitura das APIs do Next 16 e as migrações de que todas as histórias
dependem.

- [X] T001 Criar a branch a partir da `main` atualizada: `git checkout main`, `git pull`, `git checkout -b feature/controle-pagamentos`. Os arquivos de `specs/005-controle-pagamentos/` (não commitados) vão junto; fazer o primeiro commit só com eles: "docs: spec, plano e tarefas do slice 005".
- [X] T002 [P] Ler em `node_modules/next/dist/docs/` os guias de Server Actions/mutação de dados (`01-app/01-getting-started/07-mutating-data.md`), `redirect`, `revalidatePath` e `page.tsx` (`params`/`searchParams` como `Promise`); anotar em um comentário de uma linha no topo de `app/(app)/pagamentos/actions.ts` qualquer diferença em relação a `app/(app)/viagens/actions.ts` (AGENTS.md).
- [X] T003 Criar com `npx supabase migration new pagamentos` o arquivo `supabase/migrations/<ts>_pagamentos.sql` (timestamp maior que `20261001195736`), comentado em pt-BR, conforme [data-model.md](./data-model.md), contendo **nesta ordem**:
  1. `alter table public.viagem_passageiros add column pago_em date;` com `comment on column` ("Dia do pagamento em São Paulo; nulo = pendente.");
  2. `create index viagem_passageiros_pendentes on public.viagem_passageiros (passageiro_id) where pago_em is null;`
  3. função `public.validar_pagamento()` `returns trigger language plpgsql security invoker set search_path = ''`, que:
     - se `tg_op = 'UPDATE' and old.pago_em is not null and new.pago_em is not null and new.valor_centavos <> old.valor_centavos` → `raise exception using errcode = 'CJ007', message = 'participacao_paga'`;
     - se `new.pago_em is not null and (tg_op = 'INSERT' or new.pago_em is distinct from old.pago_em)`: lê `realizada_em` e `arquivada_em` de `public.viagens` pelo `new.viagem_id`; se `arquivada_em is not null or new.valor_centavos = 0` → `CJ009` `participacao_nao_cobravel`; se `new.pago_em > (now() at time zone 'America/Sao_Paulo')::date` → `CJ008` `data_pagamento_futura`; se `new.pago_em < (realizada_em at time zone 'America/Sao_Paulo')::date` → `CJ008` `data_pagamento_antes_da_viagem`;
     - `return new`; desfazer (`new.pago_em is null`) nunca é bloqueado;
  4. `create trigger viagem_passageiros_validar_pagamento before insert or update of pago_em, valor_centavos on public.viagem_passageiros for each row execute function public.validar_pagamento();` (**sem** regra de `delete`, research §2);
  5. `create or replace function public.editar_viagem(...)` copiando **integralmente** `supabase/migrations/20261001153855_editar_viagem.sql` (mesma assinatura, comentários e passos) e acrescentando, logo antes do passo 7 (participações por diferença), o bloqueio: se existir `vp` desta viagem com `vp.pago_em is not null` e (não houver item em `p_participacoes` com o mesmo `passageiro_id` **ou** houver com `valor_centavos <> vp.valor_centavos`) → `raise exception using errcode = 'CJ007', message = 'participacao_paga', detail = <nome do passageiro>` (`select p.nome ... limit 1`); atualizar o comentário de erros do cabeçalho com `CJ007`; repetir `comment on function`, `revoke execute ... from public, anon` e `grant execute ... to authenticated`;
  6. `create view public.participacoes_detalhe with (security_invoker = true) as select vp.id, vp.viagem_id, vp.passageiro_id, vp.valor_centavos, vp.pago_em, v.realizada_em, v.sentido, v.arquivada_em, t.origem, t.destino, p.nome as passageiro_nome, p.arquivado_em as passageiro_arquivado_em from public.viagem_passageiros vp join public.viagens v on v.id = vp.viagem_id join public.trajetos t on t.id = v.trajeto_id join public.passageiros p on p.id = vp.passageiro_id;` com `comment on view`;
  7. `create view public.pendencias_passageiros with (security_invoker = true) as select p.id as passageiro_id, p.nome, p.telefone, p.arquivado_em, count(vp.id)::integer as quantidade_pendentes, sum(vp.valor_centavos)::integer as total_pendente_centavos from public.passageiros p join public.viagem_passageiros vp on vp.passageiro_id = p.id join public.viagens v on v.id = vp.viagem_id where vp.pago_em is null and vp.valor_centavos > 0 and v.arquivada_em is null group by p.id;` com `comment on view` (definição única de dívida, FR-003/FR-004).
  Proibido: `select *`, alterar outras tabelas ou funções, criar RPC de pagamento.
- [X] T004 Criar com `npx supabase migration new chave_pix` o arquivo `supabase/migrations/<ts>_chave_pix.sql` com **apenas** `alter table public.perfis add column chave_pix text constraint perfis_chave_pix_valida check (chave_pix is null or (chave_pix = btrim(chave_pix) and char_length(chave_pix) between 1 and 77));` e `comment on column` ("Chave PIX exibida nas cobranças; nula = não cadastrada."). A política de `update` de `perfis` (slice 001) já cobre a gravação.
- [X] T005 Aplicar as duas migrações com `npx supabase db push` e conferir com `npx supabase migration list` que ambas aparecem em Local e Remote. São aditivas e seguras para o código já publicado na `main` (nenhuma participação está paga; `editar_viagem` mantém o comportamento).

**Checkpoint**: colunas, trigger, views e `editar_viagem` atualizados no banco.

---

## Fase 2: Fundação (domínio puro + consultas)

**Propósito**: regras testadas sem banco e a camada de consultas usada por todas as histórias.

**⚠️ CRÍTICO**: as histórias dependem desta fase.

### Testes primeiro

- [X] T006 [P] Escrever `tests/unit/pagamentos-validacao.test.ts` (deve falhar: módulo inexistente) com **todos** os exemplos obrigatórios de `validarDataPagamento`, `validarChavePix` e `caminhoVoltarSeguro` em [contracts/acoes.md](./contracts/acoes.md), e mais: `validarDataPagamento('2026-10-01', { hoje: '2026-10-01', minima: '2026-10-01' })` ok; `'01/10/2026'` → "Informe uma data válida."; chave com exatamente 77 caracteres aceita; `caminhoVoltarSeguro('/pagamentos/<uuid>/cobrar')` mantido, `'/pagamentos/abc/cobrar'` e `'/pagamentos/<uuid>/cobrar?x=1'` → `null`; `destinoCobranca({ chavePix: null, pendentes: 2, passageiroId })` → `'/pagamentos/configuracoes?voltar=%2Fpagamentos%2F<id>%2Fcobrar&aviso=pix-necessaria'`, com `pendentes: 0` → `'/pagamentos/<id>'`, com chave e pendentes → `null` (fica na cobrança).
- [X] T007 [P] Escrever `tests/unit/pagamentos-mensagem.test.ts` (deve falhar) com **todos** os exemplos obrigatórios de [contracts/acoes.md](./contracts/acoes.md) e, obrigatoriamente, a comparação literal com o modelo da spec: `montarMensagemCobranca({ nome: 'Duda', chavePix: 'teste@exemplo.com', itens: [volta 28/09/2026 18:00, ida 28/09/2026 07:00] (fora de ordem, 1000 centavos cada, instantes ISO em -03:00) })` igual a `'Olá, Duda!\n\nSegue o detalhamento das suas viagens pendentes (Total Devido: R$ 20,00):\n\n- 28/09/2026 (Ida): R$ 10,00\n- 28/09/2026 (Volta): R$ 10,00\n\n*Valor a ser pago: R$ 20,00*\n\nVocê pode pagar via PIX para a chave:\n*teste@exemplo.com*\n\nQualquer dúvida, estou à disposição. Obrigado!'`; nenhum ` ` no resultado; `R$ 1.234,56` com milhar; `totalItens([])` → `0`; `linkWhatsApp('11912345678', texto)` começa com `https://wa.me/5511912345678?text=` e `decodeURIComponent` do parâmetro devolve o texto original.
- [X] T008 [P] Acrescentar a `tests/unit/format.test.ts` os casos de `formatDataCampo`: `'2026-09-28'` → `'28/09/2026'`; `'2026-01-01'` → `'01/01/2026'` (sem deslocar o dia por fuso). Devem falhar.

### Implementação

- [X] T009 [P] Criar `lib/pagamentos/tipos.ts` com `ParticipacaoDetalhe`, `PendenciaPassageiro` e `ItemCobranca` exatamente como em [data-model.md](./data-model.md#tipos-typescript-resumo-detalhes-em-contractsacoesmd) (`Sentido` importado de `lib/viagens/tipos.ts`; `pago_em: string | null` no formato `AAAA-MM-DD`), mais `EstadoPagamento = { erro?: string; erroData?: string; sucesso?: string }` e `EstadoChavePix = { erro?: string; erroCampo?: string; valor?: string }`.
- [X] T010 Implementar `formatDataCampo(data: string)` em `lib/format.ts` (fatia a string `AAAA-MM-DD`, sem `Date`, devolvendo `DD/MM/AAAA`); `hojeEmSaoPaulo` já existe e não muda. T008 passa.
- [X] T011 Implementar `lib/pagamentos/validacao.ts` (puro): `validarDataPagamento(texto, { hoje, minima? })` com as mensagens "Informe a data do pagamento.", "Informe uma data válida." (formato `AAAA-MM-DD` e data real, ex.: `2026-02-30` inválida), "A data do pagamento não pode ser no futuro." e "A data do pagamento não pode ser anterior à data da viagem." (comparação de strings `AAAA-MM-DD`); `validarChavePix(texto)` (`trim`; vazio → "Informe a chave PIX."; mais de 77 → "A chave PIX pode ter no máximo 77 caracteres."); `caminhoVoltarSeguro(texto)` (regex `^/pagamentos/<uuid>/cobrar$` com `ehUuid`); `destinoCobranca({ chavePix, pendentes, passageiroId })`. T006 passa.
- [X] T012 Implementar `lib/pagamentos/mensagem.ts` (puro, importável no cliente): `primeiroNome`, `totalItens`, `montarMensagemCobranca` e `linkWhatsApp` conforme [research.md §8–§9](./research.md); itens ordenados por `realizada_em` crescente sem mutar a entrada; datas com `formatDate`; valores com `formatCurrency(...).replace(/ /g, ' ')`; linhas unidas por `\n`. T007 passa.
- [X] T013 Ajustar o slice 003 para conhecer `pago_em`: em `lib/viagens/tipos.ts`, `Participacao` ganha `pago_em: string | null`; em `lib/viagens/consultas.ts`, `obterViagem` seleciona `pago_em` e `obterDadosFormularioViagem` (edição) devolve também `viagem.pagos: Record<string, string>` (`passageiro_id → pago_em`) só com as participações pagas. Sem outra mudança de comportamento.
- [X] T014 Implementar `lib/pagamentos/consultas.ts` (servidor, `createClient` de `lib/supabase/server.ts`), conforme [contracts/acoes.md](./contracts/acoes.md#consultas-server-only-libpagamentosconsultasts): `listarPendencias()` (ordem `total_pendente_centavos desc`, depois nome com `localeCompare('pt-BR', { sensitivity: 'base' })`; `totalCentavos` somado em inteiros), `obterPagamentosPassageiro(id, limitePagas)` (`null` se `!ehUuid(id)` ou passageiro não visível; pendentes = `participacoes_detalhe` com `pago_em is null`, `valor_centavos > 0`, `arquivada_em is null`, ordem `realizada_em asc`; pagas = `pago_em not null`, `arquivada_em is null`, ordem `pago_em desc, realizada_em desc`, `limit limitePagas + 1` → `temMaisPagas`), `obterTotalDevido(id)`, `obterDadosCobranca(id)` e `obterChavePix()` (`perfis.chave_pix` do usuário logado). Colunas sempre explícitas. Erros: `throw new Error('Falha ao …: ' + error.message)` (exibidos por `app/(app)/error.tsx`).
- [X] T015 [P] Ampliar `tests/e2e/helpers/passageiros.ts` com: `marcarPagoPelaApi(participacaoIds: string[], data: string)` (`update viagem_passageiros set pago_em`), `participacoesDaViagemPelaApi(viagemId)` (`id, passageiro_id, valor_centavos, pago_em`) e `definirChavePixDeTeste()` (`update perfis set chave_pix = 'teste@exemplo.com'` na linha do usuário da sessão; nunca `null`). Todos com o cliente do worker já existente.

**Checkpoint**: `npm run test` e `npm run typecheck` passam.

---

## Fase 3: História 1 — Ver quem está devendo e marcar pagamentos (P1) 🎯 MVP

**Objetivo**: "Pagamentos" na navegação, pendências por passageiro, marcar pagas (seleção e
"Recebi tudo"), total devido na tela do passageiro e as travas de integridade nas viagens
(FR-001–FR-011, FR-013, FR-024, FR-025).

**Teste independente**: e2e de T024, isolado pelo passageiro do próprio teste.

### Implementação

- [X] T016 [P] [US1] Em `components/layout/nav-items.ts`, acrescentar `{ rotulo: 'Pagamentos', href: '/pagamentos', icone: Wallet }` depois de "Histórico" e o import de `Wallet` (`lucide-react`). Fica com 5 itens, o máximo da BottomNav.
- [X] T017 [US1] Criar `app/(app)/pagamentos/actions.ts` (`'use server'`) com `marcarPagamentos(passageiroId, estado, formData)` e `receberTudo(passageiroId, estado, formData)` conforme [contracts/acoes.md](./contracts/acoes.md#pagamentos-appapppagamentosactionsts): `obterUsuarioLogado()`; `validarDataPagamento(formData.get('data'), { hoje: hojeEmSaoPaulo() })` → `erroData`; ids de `formData.getAll('participacao')` filtrados por `ehUuid` (nenhum → `erro: 'Selecione ao menos uma viagem.'`); em `receberTudo`, ids buscados no servidor em `participacoes_detalhe` (`passageiro_id`, `pago_em is null`, `valor_centavos > 0`, `arquivada_em is null`); `update` com `.in('id', ids).eq('passageiro_id', passageiroId).is('pago_em', null).select('id')`; `CJ008` → `erroData` com a mensagem do `message` (`data_pagamento_futura`/`data_pagamento_antes_da_viagem`); `CJ009` → `erro` "Esta viagem não tem valor a pagar ou foi arquivada. Atualize a página."; outros → `erro: ERRO_CONEXAO`-equivalente "Não foi possível salvar. Tente novamente."; sucesso → `revalidatePath('/pagamentos')`, `revalidatePath('/pagamentos/' + id)`, `revalidatePath('/passageiros/' + id)` e `sucesso` "1 viagem marcada como paga"/"N viagens marcadas como pagas", acrescido de " · M já estava(m) paga(s)" quando `alteradas < selecionadas`.
- [X] T018 [US1] Criar `app/(app)/pagamentos/page.tsx` (`metadata.title = 'Pagamentos · Caronas Já'`, `await obterUsuarioLogado()`): `<h1>Pagamentos</h1>`; cartão "Total a receber" (`formatCurrency(totalCentavos)`) e "N passageiro(s) com pendências"; `ResponsiveTable` com Nome (+ `Badge` "Arquivado"), "1 viagem"/"N viagens", total devido, linha inteira clicável para `/pagamentos/{passageiro_id}` (padrão `max-md:after:absolute max-md:after:inset-0` de `lista-viagens.tsx`); vazio → `EmptyState` "Ninguém está devendo" / "Todas as viagens ativas estão pagas."; `AvisoUrl` em `<Suspense>` com `{ 'pix-salva': 'Chave PIX salva' }` (usado na Fase 4).
- [X] T019 [P] [US1] Criar `app/(app)/pagamentos/[passageiroId]/lista-pendentes.tsx` (`'use client'`) conforme [contracts/rotas.md](./contracts/rotas.md#pagamentospassageiroid-pagamentos-do-passageiro-fatia-a-cobrança-na-fatia-b): props `passageiroId`, `pendentes: ParticipacaoDetalhe[]`, `hoje`; cada item com `<input type="checkbox" name="participacao" value={id}>` rotulado (data `formatDate`, "Ida"/"Volta", `percurso` de `lib/viagens/validacao.ts`, valor), alvo ≥ 44px; "Selecionar todas"/"Limpar seleção"; com seleção, rodapé `sticky bottom-0` (acima da BottomNav no celular) com "N selecionadas · R$ x" (`totalItens`), `<input type="date" name="data">` rotulado "Data do pagamento" (`defaultValue`/`max` = `hoje`, `min` = dia em São Paulo da viagem mais recente selecionada via `paraCampoDataHora(...).slice(0, 10)`) e "Marcar como pagas"; botão "Recebi tudo" com `ConfirmDialog` "Marcar todas como pagas?" / "N viagens · R$ x. Data do pagamento: DD/MM/AAAA." / "Marcar como pagas"; `useActionState` com `tratarFalhaDeConexao` para as duas actions; `erroData` abaixo do campo e `erro` com `role="alert"`; `sucesso` → `toast.success` (sonner) e limpa a seleção. Sem pendentes: "Nenhum valor pendente".
- [X] T020 [US1] Criar `app/(app)/pagamentos/[passageiroId]/page.tsx` (`generateMetadata` "Pagamentos de {nome} · Caronas Já"; `notFound()` se `obterPagamentosPassageiro` devolver `null`; `searchParams.pagas` inteiro de 20 a 1000, múltiplo de 20, padrão 20): link de volta "Pagamentos"; `<h1>` com o nome (+ `Badge` "Arquivado") e telefone `formatPhone`; cartão "Total devido" e "N viagens pendentes"; seção "Pendentes" com `ListaPendentes` (`hoje = hojeEmSaoPaulo()`); seção "Pagas" listando as pagas (data, sentido, percurso, valor, "Pago em `formatDataCampo(pago_em)`") ou "Nenhum pagamento registrado." — as ações de cada paga entram na US4 (T034).
- [X] T021 [P] [US1] Em `app/(app)/passageiros/[id]/page.tsx`, acrescentar depois do cartão de dados um cartão "Pagamentos" com "Total devido: R$ x" (`obterTotalDevido`) e o link "Ver pagamentos" → `/pagamentos/{id}` (FR-013). Não mexer no botão "Ver histórico" nem nas demais ações.
- [X] T022 [US1] Travar participações pagas na edição de viagem (FR-025): em `app/(app)/viagens/actions.ts`, `erroDaFuncao` ganha `case 'CJ007'` → `errosCampo.passageiros = \`${detail} já pagou esta viagem. Desfaça o pagamento antes de alterar o valor ou removê-lo.\``; em `app/(app)/viagens/[id]/editar/page.tsx` repassar `viagem.pagos` (T013) ao `FormularioViagem`; em `app/(app)/viagens/formulario-viagem.tsx`, nova prop opcional `pagos?: Record<string, string>`: passageiro pago fica marcado com caixa e valor `disabled` e a etiqueta `Badge` "Pago em DD/MM/AAAA" (`formatDataCampo`); como campos `disabled` não são enviados, incluir `<input type="hidden">` com o id e o valor dele para manter a participação no envio. O registro de nova viagem não muda.
- [X] T023 [US1] Confirmação reforçada ao arquivar (FR-024): em `app/(app)/viagens/[id]/page.tsx`, calcular `pagas = participacoes.filter((p) => p.pago_em).length` e repassar a `AcoesViagem`; em `app/(app)/viagens/[id]/acoes-viagem.tsx`, com `pagas > 0` o `ConfirmDialog` usa o título "Arquivar viagem com pagamentos?", a descrição "{N} passageiro(s) já pagaram esta viagem. Esses valores deixarão de ser contados. Os pagamentos ficam guardados e voltam se você reativar a viagem." e o botão "Arquivar mesmo assim"; com `pagas = 0`, nada muda. Não alterar `hrefDeVolta` (slice 004).

### Testes

- [X] T024 [US1] Criar `tests/e2e/pagamentos.spec.ts` seguindo as **Regras contra condições de corrida** (`test.skip(!email || !senha)`, `test.afterAll(limparDadosDeTeste)`, `itensDaLista`/`semRolagemHorizontal` copiados de `tests/e2e/historico.spec.ts`, `hojeEmSaoPaulo` por caminho relativo). Cada cenário cria passageiros (R$ 10,00) e um trajeto próprios e viagens em 2025-09-28 07:00 (ida) e 18:00 (volta) com `registrarViagemPelaApi`:
  1. sem sessão, `/pagamentos` redireciona para `/entrar?proximo=%2Fpagamentos` (FR-026);
  2. em `/pagamentos`, o item "Pagamentos" está ativo e a linha **do passageiro do teste** mostra "2 viagens" e "R$ 20,00"; tocar nela abre `/pagamentos/{id}` com as duas pendentes em ordem (Ida antes de Volta), "Total devido R$ 20,00" (US1-1/2, FR-006, FR-007);
  3. selecionar a Ida, data de hoje, "Marcar como pagas" → toast "1 viagem marcada como paga", total R$ 10,00, a Ida em "Pagas" com "Pago em" hoje (US1-3, SC-004);
  4. data de amanhã → erro no campo e nada muda; data `2025-09-27` → "não pode ser anterior à data da viagem" (FR-009);
  5. "Recebi tudo" e confirmar → nenhuma pendente, "Nenhum valor pendente", e o passageiro some de `/pagamentos` (US1-4/5, FR-008);
  6. marcar pela API uma participação e depois tentar marcá-la pela tela com a página antiga aberta → mensagem "· 1 já estava paga" e `pago_em` inalterado em `participacoesDaViagemPelaApi` (FR-011);
  7. viagem com o passageiro a R$ 0,00 e outra viagem **arquivada** pela API (`arquivarPelaApi`) → nenhuma das duas aparece nas pendentes nem no total (FR-003, FR-004, SC-005);
  8. `/passageiros/{id}` mostra "Total devido" correto e "Ver pagamentos" leva a `/pagamentos/{id}` (FR-013);
  9. com uma participação paga, `/viagens/{id}/editar` mostra o passageiro travado com "Pago em"; `editarViagemPelaApi` alterando o valor dele rejeita com `CJ007`, e removendo-o também; alterar só a hora pela tela salva (FR-025);
  10. com uma participação paga, "Arquivar" em `/viagens/{id}` mostra "Arquivar viagem com pagamentos?" e "Arquivar mesmo assim"; após arquivar, a viagem sai de pendentes e pagas; reativar pela tela devolve a paga com a mesma data (FR-024);
  11. `/pagamentos` e `/pagamentos/{id}` sem rolagem horizontal (SC-008).

**Checkpoint**: US1 completa e testada; o sistema já controla pendências sem a cobrança.

---

## Fase 4: História 3 — Cadastrar a chave PIX (P1)

**Objetivo**: tela de configurações de cobrança (FR-021–FR-023). Vem antes da US2 porque a
cobrança depende da chave.

**Teste independente**: cenários de chave PIX em T032.

- [X] T025 [US3] Criar `app/(app)/pagamentos/configuracoes/actions.ts` com `salvarChavePix(estado, formData)` conforme [contracts/acoes.md](./contracts/acoes.md#chave-pix-appapppagamentosconfiguracoesactionsts-fatia-b): `validarChavePix` → `erroCampo` e `valor` preenchido; `update perfis set chave_pix` filtrando pelo `id` do usuário logado (`obterUsuarioLogado`); erro → `erro` "Não foi possível salvar. Tente novamente."; sucesso → `revalidatePath('/pagamentos', 'layout')` e `redirect` (fora do `try`) para `caminhoVoltarSeguro(formData.get('voltar'))` ou `/pagamentos`, com `?aviso=pix-salva` acrescentado preservando a query existente.
- [X] T026 [P] [US3] Criar `app/(app)/pagamentos/configuracoes/formulario-chave-pix.tsx` (`'use client'`, modelo `formulario-passageiro.tsx`): campo "Chave PIX" (`maxLength={77}`, `autoComplete="off"`, `defaultValue` = chave atual ou `estado.valor`), dica "CPF, CNPJ, telefone, e-mail ou chave aleatória, como aparecerá na mensagem.", `<input type="hidden" name="voltar">`, botão "Salvar" desabilitado durante o envio, erro do campo com `aria-describedby`, `tratarFalhaDeConexao`.
- [X] T027 [US3] Criar `app/(app)/pagamentos/configuracoes/page.tsx` (`metadata.title = 'Chave PIX · Caronas Já'`): link de volta (para `voltar` seguro, senão `/pagamentos`), `<h1>Chave PIX</h1>`, aviso "Cadastre a chave PIX para gerar cobranças." quando `aviso === 'pix-necessaria'`, e o formulário com `obterChavePix()`.
- [X] T028 [US3] Em `app/(app)/pagamentos/page.tsx`, acrescentar ao cabeçalho o link "Chave PIX" (ícone `Settings`, alvo ≥ 44px) para `/pagamentos/configuracoes`.

**Checkpoint**: chave PIX cadastrável e editável.

---

## Fase 5: História 2 — Cobrar o passageiro pelo WhatsApp (P1)

**Objetivo**: prévia da mensagem, seleção de viagens, abrir no WhatsApp e copiar
(FR-015–FR-020).

**Teste independente**: e2e de T032, com a chave fixa `teste@exemplo.com`.

- [X] T029 [US2] Criar `app/(app)/pagamentos/[passageiroId]/cobrar/page.tsx` (`metadata` "Cobrar {nome} · Caronas Já"): `obterDadosCobranca(id)` (`null` → `notFound()`); `destinoCobranca(...)` (T011) → `redirect` quando não for `null`; senão renderiza `<h1>Cobrar {nome}</h1>`, link "Voltar" para `/pagamentos/{id}`, link "Alterar chave PIX" para `/pagamentos/configuracoes?voltar=/pagamentos/{id}/cobrar` e `Cobranca`.
- [X] T030 [US2] Criar `app/(app)/pagamentos/[passageiroId]/cobrar/cobranca.tsx` (`'use client'`): props `nome`, `telefone`, `chavePix`, `itens` (com `id`); estado com os ids marcados (todos no início); lista com caixa de marcação, data, sentido e valor; total `totalItens`; prévia `montarMensagemCobranca` em um bloco `whitespace-pre-wrap break-words` com `aria-label="Prévia da mensagem"`; "Abrir no WhatsApp" = `<a>` com `href={linkWhatsApp(telefone, texto)}`, `target="_blank"`, `rel="noopener noreferrer"`, estilizado com `buttonVariants` (ícone `MessageCircle`); "Copiar mensagem" chama `navigator.clipboard.writeText` → `toast.success('Mensagem copiada')`, ou, em falha, `toast.error('Não foi possível copiar. Selecione o texto da prévia e copie.')`; nenhuma marcada → ambos desabilitados (o `<a>` sem `href` e com `aria-disabled`) e "Selecione ao menos uma viagem.". Nada é gravado (FR-020).
- [X] T031 [US2] Em `app/(app)/pagamentos/[passageiroId]/page.tsx`, acrescentar ao cartão "Total devido" o botão "Cobrar pelo WhatsApp" (`Link` para `/pagamentos/{id}/cobrar`) quando há pendentes, ou um botão `disabled` "Nada a cobrar" quando não há (FR-015).
- [X] T032 [US2] Criar `tests/e2e/cobranca.spec.ts` seguindo as **Regras contra condições de corrida** (chave sempre `teste@exemplo.com` via `definirChavePixDeTeste()` no `beforeEach`; passageiro de teste com telefone `11912345678`; viagens Ida/Volta em 2025-09-28 a R$ 10,00):
  1. em `/pagamentos/configuracoes?aviso=pix-necessaria&voltar=/pagamentos/{id}/cobrar`, o aviso aparece; salvar a chave vazia e com 78 caracteres → erro no campo; salvar `teste@exemplo.com` → volta a `/pagamentos/{id}/cobrar` com o toast "Chave PIX salva" (US3, FR-022, FR-023);
  2. `voltar=https://exemplo.com` é ignorado: após salvar, vai para `/pagamentos` (FR-026);
  3. "Cobrar pelo WhatsApp" a partir de `/pagamentos/{id}` abre a prévia; o texto da prévia é **igual** à mensagem do modelo com o primeiro nome do passageiro de teste ("E2E"), as duas linhas `- 28/09/2025 (Ida): R$ 10,00` e `(Volta)`, `R$ 20,00` nos dois totais e `*teste@exemplo.com*` (FR-017, SC-006);
  4. desmarcar a Volta → prévia e total passam a `R$ 10,00` e a linha da Volta some; desmarcar tudo → "Selecione ao menos uma viagem." e ações desabilitadas (FR-016);
  5. o `href` de "Abrir no WhatsApp" começa com `https://wa.me/5511912345678?text=` e o `text` decodificado é igual à prévia; o link tem `target="_blank"` (não clicar) (FR-018);
  6. "Copiar mensagem" (com `context.grantPermissions(['clipboard-read', 'clipboard-write'])`) → toast "Mensagem copiada" e `navigator.clipboard.readText()` igual à prévia (FR-019);
  7. depois de abrir a cobrança, `participacoesDaViagemPelaApi` continua com `pago_em` nulo (FR-020);
  8. passageiro sem pendências: "Nada a cobrar" desabilitado e `/pagamentos/{id}/cobrar` redireciona para `/pagamentos/{id}` (FR-015);
  9. cobrança e configurações sem rolagem horizontal (SC-008).

**Checkpoint**: US2 e US3 completas; o pedido central do slice está pronto.

---

## Fase 6: História 4 — Desfazer um pagamento e corrigir a data (P2)

**Objetivo**: ações sobre as viagens pagas (FR-012) e "Carregar mais" das pagas.

**Teste independente**: cenários de T035.

- [ ] T033 [US4] Acrescentar a `app/(app)/pagamentos/actions.ts` `desfazerPagamento(participacaoId, passageiroId)` e `alterarDataPagamento(participacaoId, passageiroId, estado, formData)` conforme [contracts/acoes.md](./contracts/acoes.md): `update` com `.eq('id', …).eq('passageiro_id', …).not('pago_em', 'is', null).select('id')`; nenhuma linha → `erro: 'Este pagamento já foi alterado. Atualize a página.'`; `CJ008` → `erroData`; sucesso → mesmas revalidações de T017 e `sucesso` "Pagamento desfeito" / "Data do pagamento alterada".
- [ ] T034 [US4] Criar `app/(app)/pagamentos/[passageiroId]/lista-pagas.tsx` (`'use client'`) e usá-la na seção "Pagas" de `app/(app)/pagamentos/[passageiroId]/page.tsx` no lugar da lista simples de T020: por item, "Alterar data" (`AlertDialog` de `components/ui/alert-dialog.tsx` com `<input type="date" name="data">` rotulado, `max` hoje, `min` o dia da viagem, `defaultValue` = `pago_em`, botões "Cancelar"/"Salvar", `erroData` dentro do diálogo) e "Desfazer" (`ConfirmDialog` "Desfazer pagamento?" / "A viagem de DD/MM/AAAA volta a ficar pendente." / "Desfazer"); toasts com o `sucesso`; com `temMaisPagas`, link "Carregar mais" para `?pagas={limite + 20}` com `scroll={false}`.

### Testes

- [ ] T035 [US4] Acrescentar a `tests/e2e/pagamentos.spec.ts`: (12) paga a Ida pela API com hoje; "Alterar data" para ontem → "Pago em" ontem; data anterior à viagem → erro no diálogo; (13) "Desfazer" e confirmar → a Ida volta às pendentes e o total devido sobe R$ 10,00; cancelar o diálogo não muda nada (US4-1/2/3); (14) 21 viagens pagas pela API em 2025 (mesmo passageiro) → 20 itens em "Pagas" e, após "Carregar mais", 21.

**Checkpoint**: US4 completa.

---

## Fase 7: História 5 — Situação de pagamento na viagem (P3)

**Objetivo**: situação por passageiro e marcação nos detalhes da viagem (FR-014).

**Teste independente**: cenário de T039.

- [ ] T036 [US5] Acrescentar a `app/(app)/pagamentos/actions.ts` `marcarPagamentoNaViagem(viagemId, participacaoId, estado, formData)`: mesma validação e `update` de `marcarPagamentos` para um id, filtrando também `.eq('viagem_id', viagemId)`; revalida `/viagens/{viagemId}` além das rotas de T017 (o `passageiro_id` vem do retorno `.select('id, passageiro_id')`); `sucesso` "Pagamento registrado".
- [ ] T037 [P] [US5] Criar `app/(app)/viagens/[id]/marcar-pagamento.tsx` (`'use client'`): botão "Marcar como pago" (alvo ≥ 44px) que abre `AlertDialog` "Marcar pagamento de {nome}" com `<input type="date" name="data">` (padrão e `max` hoje, `min` o dia da viagem), "Cancelar"/"Confirmar", erros no diálogo e `toast.success` no sucesso; `tratarFalhaDeConexao`.
- [ ] T038 [US5] Em `app/(app)/viagens/[id]/page.tsx`, na lista de passageiros, mostrar ao lado do valor um `Badge`: "Pago em DD/MM/AAAA" (`formatDataCampo`), "Pendente" (`variant="outline"`) ou "Sem cobrança" (valor 0); em viagem ativa, os pendentes com valor > 0 ganham `MarcarPagamento` (`hojeEmSaoPaulo()` e o dia da viagem por `paraCampoDataHora(realizada_em).slice(0, 10)`). Itens quebram em duas linhas no celular sem rolagem horizontal; não alterar `hrefDeVolta` (slice 004).

### Testes

- [ ] T039 [US5] Acrescentar a `tests/e2e/pagamentos.spec.ts`: (15) viagem com dois passageiros de teste (R$ 10,00 e R$ 0,00) e um terceiro pago pela API → badges "Pendente", "Sem cobrança" e "Pago em …"; "Marcar como pago" no pendente com hoje → toast "Pagamento registrado", badge "Pago em" hoje e o passageiro sem essa viagem em `/pagamentos/{id}`; viagem arquivada não mostra o botão (US5, FR-014); (16) detalhes da viagem sem rolagem horizontal.

**Checkpoint**: todas as histórias completas.

---

## Fase 8: Privacidade, acabamento e publicação

**Propósito**: verificações de segurança sem segunda conta, documentação, publicação e validação
em produção.

- [ ] T040 [P] Acrescentar a `tests/e2e/pagamentos.spec.ts` (17) privacidade com um cliente Supabase **sem sessão** (chave anon): `select` em `participacoes_detalhe`, `pendencias_passageiros` e `perfis` devolve 0 linhas; `update viagem_passageiros set pago_em` não altera nada; e, logado, `/pagamentos/<uuid aleatório>` e `/pagamentos/<uuid aleatório>/cobrar` respondem 404 (FR-026, SC-007).
- [ ] T041 [P] Atualizar `README.md`: incluir "[005 — Controle de pagamentos](./specs/005-controle-pagamentos/spec.md): item de navegação "Pagamentos" (`/pagamentos`), cobrança pelo WhatsApp e chave PIX" na lista de slices concluídos; na seção de padrões, documentar `pago_em`, o trigger `validar_pagamento`, as views `participacoes_detalhe`/`pendencias_passageiros` como **única** definição de dívida, os SQLSTATE `CJ007`–`CJ009` na tabela de erros, e a regra para o slice 006: o valor recebido no mês MUST usar `pago_em` e ignorar viagens arquivadas.
- [ ] T042 [P] Em `specs/001-base-login-layout/data-model.md` (Parte 2, `viagem_passageiros`) e `specs/003-registro-viagens/data-model.md` (seção `viagem_passageiros`), acrescentar uma nota apontando para `specs/005-controle-pagamentos/data-model.md`: `pago_em` criado como `date` (não `timestamptz`), validado por trigger.
- [ ] T043 Revisão e suíte completa: buscar `service_role` (só comentários/README/constituição) e chaves PIX gravadas no repositório (`git grep -n -i "pix"` e revisar: o único valor de chave deve ser `teste@exemplo.com`); confirmar que nenhuma action lê `motorista_id` do formulário; `npm run lint`, `npm run typecheck`, `npm run test` e `npm run test:e2e` (mobile e desktop) verdes. Corrigir o que falhar antes de seguir.
- [ ] T044 Publicar: commits em pt-BR por grupo lógico já feitos; **perguntar ao usuário no chat antes** (ação externa). Com a confirmação: `git fetch origin`, `git merge origin/main` (repetir T043 se vier algo), `git checkout main`, `git merge --no-ff feature/controle-pagamentos`, `git push origin main` e aguardar o deploy da Vercel (status do commit ou a página com o item "Pagamentos").
- [ ] T045 Validar em produção sem passos manuais: `npx supabase migration list` com `<ts>_pagamentos` e `<ts>_chave_pix` em Remote; rodar `npx playwright test tests/e2e/pagamentos.spec.ts tests/e2e/cobranca.spec.ts` com `E2E_BASE_URL=<url-produção>` (README, "testes contra a produção") e registrar o resultado nesta tarefa. Lembrar o usuário de cadastrar a chave PIX real pela tela "Chave PIX" na conta dele.
- [ ] T046 Marcar o slice como concluído: `**Status**: Concluído (<data>)` em `specs/005-controle-pagamentos/spec.md`; commit "docs: conclui o slice 005" e push.

**Checkpoint**: slice 005 publicado e validado em produção. O próximo passo é `/speckit-specify`
do slice 006 (Resumo Mensal).

---

## Dependências e Ordem de Execução

### Dependências entre fases

- **Fase 1** (T001–T005): sem dependências; T003/T004 antes de T005.
- **Fase 2** (T006–T015): depende de T005 (as consultas leem as views). Bloqueia as histórias.
- **Fase 3 – US1** (T016–T024): depende da Fase 2.
- **Fase 4 – US3** (T025–T028): depende de T018 (página `/pagamentos`) e da Fase 2.
- **Fase 5 – US2** (T029–T032): depende da US3 (chave PIX) e de T020.
- **Fase 6 – US4** (T033–T035): depende de T017 e T020.
- **Fase 7 – US5** (T036–T039): depende de T017 e T023 (mesmo arquivo `viagens/[id]/page.tsx`).
- **Fase 8** (T040–T046): depende de todas as anteriores; T044 exige confirmação do usuário.

### Dependências entre histórias

- US1 → base de todas (situação de pagamento, views, telas de pagamentos).
- US3 → US2 (a cobrança precisa da chave PIX).
- US4 e US5 só dependem da US1 e podem vir em qualquer ordem depois dela.

### Dentro de cada fase

- Testes unitários (T006–T008) antes das implementações correspondentes (T010–T012).
- Mesmo arquivo = sequencial: `app/(app)/pagamentos/actions.ts` (T017 → T033 → T036),
  `app/(app)/pagamentos/[passageiroId]/page.tsx` (T020 → T031 → T034),
  `app/(app)/pagamentos/page.tsx` (T018 → T028), `app/(app)/viagens/[id]/page.tsx` (T023 → T038),
  `tests/e2e/pagamentos.spec.ts` (T024 → T035 → T039 → T040).

### Oportunidades de paralelismo

- Fase 1: T002 junto com T003/T004.
- Fase 2: T006, T007, T008, T009 e T015 juntos; depois T010, T011 e T012 em paralelo (arquivos
  diferentes); T013 e T014 após T009.
- Fase 3: T016, T019 e T021 em paralelo com T017.
- Fase 4: T026 em paralelo com T025.
- Fase 7: T037 em paralelo com T036.
- Fase 8: T040, T041 e T042 juntos.

---

## Exemplo de paralelismo

```text
# Fundação, juntas (após T005):
Tarefa: "T006 tests/unit/pagamentos-validacao.test.ts"
Tarefa: "T007 tests/unit/pagamentos-mensagem.test.ts"
Tarefa: "T008 tests/unit/format.test.ts (formatDataCampo)"
Tarefa: "T009 lib/pagamentos/tipos.ts"
Tarefa: "T015 tests/e2e/helpers/passageiros.ts"

# US1, enquanto a action T017 é escrita:
Tarefa: "T016 components/layout/nav-items.ts"
Tarefa: "T019 app/(app)/pagamentos/[passageiroId]/lista-pendentes.tsx"
Tarefa: "T021 app/(app)/passageiros/[id]/page.tsx"
```

---

## Estratégia de Implementação

### MVP (só US1)

Com as Fases 1–3, o motorista já sabe quem deve e quanto e registra os pagamentos, com as viagens
protegidas contra alterações em participações pagas. É um ponto seguro de parada caso a sessão
precise ser interrompida: a suíte fica verde e nenhuma tela fica sem uso (ainda sem publicar).

### Entrega

Sessão única, em ordem T001 → T046, com uma única publicação ao final (T044), depois da suíte
completa verde. As migrações são aplicadas no início (T005) e são compatíveis com o código já
publicado, então não há janela de inconsistência em produção.

---

## Notas

- [P] = arquivos diferentes, sem dependências pendentes.
- O rótulo [US#] liga a tarefa à história da spec, para rastreabilidade.
- Nunca colocar senhas reais nem a chave PIX real no código, nos testes ou nos docs. O e2e usa
  apenas a conta de **teste** e limpa os passageiros, trajetos e viagens `E2E …` que criou.
- Fazer commit ao final de cada fase, com mensagens em pt-BR.
