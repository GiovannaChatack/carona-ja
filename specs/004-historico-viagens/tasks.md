---

description: "Lista de tarefas do slice 004: Histórico de Viagens"
---

# Tarefas: Histórico de Viagens

**Entrada**: Documentos de design em `specs/004-historico-viagens/`

**Pré-requisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/rotas.md](./contracts/rotas.md),
[contracts/consultas.md](./contracts/consultas.md), [quickstart.md](./quickstart.md)

**Testes**: incluídos e **substituem a validação manual**. A constituição exige testes
automatizados para as regras de cálculo e verificação em larguras de celular e desktop:

- Vitest para período, filtros, URL e escolha do estado vazio;
- Playwright (`mobile` 360px e `desktop` 1280px) para a tela, com **uma única conta de teste**
  (`E2E_EMAIL`/`E2E_SENHA`). A verificação de privacidade usa um cliente **sem sessão** e ids
  inexistentes, sem segunda conta.

**Organização**: **sessão única**, sem fatias publicadas separadamente (plan.md, "Ordem de
Implementação"). Execute em ordem, de T001 a T036: `/speckit-implement`. As fases por história
existem para rastreabilidade; a publicação acontece só na Fase 6.

## Formato: `[ID] [P?] [História] Descrição`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[História]**: US1–US3 (ver spec.md).
- Nenhuma tarefa exige ação manual em painel externo nem uma segunda conta.

## Regras contra condições de corrida (valem para todas as tarefas)

Este slice roda **em paralelo ao slice 005**, em outra sessão, contra o **mesmo** projeto
Supabase e a **mesma** conta de teste. Os testes do Playwright também rodam em paralelo
(`fullyParallel`, projetos `mobile` e `desktop`). Portanto:

1. **Nenhum teste afirma totais globais da conta.** Toda asserção sobre linhas ou resumo é feita
   com um filtro que isola os dados do próprio teste: o **trajeto** criado por ele (nome único via
   `nomeDeTeste`) ou um **passageiro** criado por ele. Viagens do slice 005, de outros arquivos de
   teste ou do outro projeto do Playwright nunca aparecem no resultado filtrado.
2. **Cada teste cria os próprios dados** com `prepararCenario`/`registrarViagemPelaApi`
   (`tests/e2e/helpers/passageiros.ts`) e não depende de dados de outro teste. A limpeza
   (`limparDadosDeTeste`) apaga só os nomes criados pelo worker — não usar `delete` amplo.
3. **Datas determinísticas**: cenários de fronteira de mês usam datas fixas no passado
   (março/abril de 2021) com período personalizado. Cenários com "Este mês"/"Mês passado" usam o
   dia 1 do mês, calculado por `hojeEmSaoPaulo()`, para nunca cruzar a virada de mês durante a
   execução (dia 1 às 00:05 é, no pior caso, minutos no futuro, o que a viagem aceita).
4. **Sem `test.describe.serial` e sem estado compartilhado** entre testes; cada teste faz login
   (`entrarComContaDeTeste`).
5. **Migração**: aplicar uma única vez, no início (T001), e **nunca editar** depois de aplicada;
   correções viram uma migração nova. Se o `db push` recusar por existir no remoto uma migração
   do slice 005 que não está nesta branch, seguir o procedimento de T001 — **nunca** usar
   `supabase migration repair --status reverted` nem `db reset`.
6. **Merge**: só na Fase 6, depois de `git fetch` e `git merge origin/main`, com a suíte completa
   rodando de novo após o merge.

---

## Fase 1: Setup e banco

**Propósito**: preparar a leitura das APIs do Next 16 e criar as funções SQL de que todas as
histórias dependem.

- [X] T001 Criar `supabase/migrations/<ts>_historico.sql` (timestamp atual `AAAAMMDDHHMMSS`) conforme [data-model.md](./data-model.md), contendo **apenas**: (a) `public.historico_viagens(p_inicio date, p_fim date, p_passageiro_id uuid default null, p_trajeto_id uuid default null, p_sentido text default null, p_limite integer default 21)` retornando `table (id uuid, realizada_em timestamptz, criado_em timestamptz, sentido text, trajeto_id uuid, origem text, destino text, passageiros text[], total_centavos integer, valor_passageiro_centavos integer)`, ordenada por `realizada_em desc, criado_em desc` e `limit p_limite`; `passageiros` = `array_agg(p.nome order by p.nome)`; `total_centavos` = `coalesce(sum(vp.valor_centavos),0)::integer`; `valor_passageiro_centavos` = valor de `p_passageiro_id` na viagem ou `null` sem filtro; (b) `public.historico_resumo(mesmos filtros, sem p_limite)` retornando `table (quantidade integer, total_centavos bigint)` com **sempre uma linha** (`0`, `0` se vazio); sem passageiro soma os totais das viagens, com passageiro soma só os `valor_centavos` dele. Filtro idêntico nas duas: `v.arquivada_em is null`, `v.realizada_em >= (p_inicio::timestamp at time zone 'America/Sao_Paulo')`, `v.realizada_em < ((p_fim + 1)::timestamp at time zone 'America/Sao_Paulo')`, `(p_trajeto_id is null or v.trajeto_id = p_trajeto_id)`, `(p_sentido is null or v.sentido = p_sentido)`, `(p_passageiro_id is null or exists (select 1 from public.viagem_passageiros x where x.viagem_id = v.id and x.passageiro_id = p_passageiro_id))`. Ambas `language sql stable security invoker set search_path = ''`, com `comment on function`, `revoke execute ... from public, anon` e `grant execute ... to authenticated` (modelo: `supabase/migrations/20260930172802_viagens.sql`). Proibido: `alter table`, `create or replace view`, alterar funções existentes ou `select *`. Aplicar com `npx supabase db push`; se a CLI recusar por "Remote migration versions not found in local migrations directory" (migração do slice 005 já aplicada), rodar `git fetch`, localizar o arquivo com `git log --all --oneline -- supabase/migrations/` e copiá-lo **sem commitar** (`git show <branch>:<caminho> > <caminho>`), rodar o `db push`, e então apagar a cópia do working tree (`git status` deve mostrar só os arquivos deste slice). Conferir com `npx supabase migration list` que a versão aparece em Local e Remote.
- [X] T002 [P] Ler em `node_modules/next/dist/docs/` os guias de `page.tsx` (`searchParams` como `Promise`), `error.tsx`, `useRouter`/`useSearchParams` de `next/navigation` e `Link`, e anotar em uma linha no topo de `app/(app)/historico/page.tsx` (comentário) qualquer diferença em relação ao uso atual em `app/(app)/viagens/page.tsx` (AGENTS.md).

**Checkpoint**: funções no banco; nenhuma tabela ou view mudou.

---

## Fase 2: Fundação (domínio puro + consultas)

**Propósito**: regras de período e filtros testadas sem banco, e a camada de consultas usada por
todas as histórias.

**⚠️ CRÍTICO**: as histórias dependem desta fase.

### Testes primeiro

- [X] T003 [P] Escrever `tests/unit/historico-filtros.test.ts` com **todos** os exemplos obrigatórios de [contracts/consultas.md](./contracts/consultas.md) e mais: `resolverPeriodo` para meses de 30 e 31 dias, `este-mes` em `2026-12-31` (`2026-12-01` a `2026-12-31`), `30-dias` atravessando a virada de ano (`2026-01-10` → `2025-12-12` a `2026-01-10`), `personalizado` de um único dia; `lerFiltros` com parâmetros repetidos (`string[]` → usa o primeiro), `periodo` desconhecido → `este-mes` sem `periodoInvalido`, `personalizado` sem `fim` → `este-mes` com `periodoInvalido: true`, `pagina` `0`, `51` e `2.5` → `1`, `sentido` `ida`/`volta` mantidos; `paraQuery` do filtro padrão → `''` e ida-e-volta (`paraQuery(lerFiltros(paraQuery(f)).filtro) === paraQuery(f)`) para 4 filtros distintos; `temFiltroAlemDoPadrao`; `rotuloPeriodo` (`"01/10/2026 a 31/10/2026"` e mesmo dia `"01/10/2026"`); `escolherEstadoVazio(existeViagemAtiva, temFiltro)` → `'sem-viagens'` quando não existe viagem ativa, senão `'sem-resultado'`. Os testes devem falhar (módulo inexistente).
- [X] T004 [P] Acrescentar a `tests/unit/format.test.ts` os casos de `hojeEmSaoPaulo`: `new Date('2026-10-01T02:30:00Z')` → `'2026-09-30'`; `new Date('2026-10-01T03:00:00Z')` → `'2026-10-01'`; `new Date('2026-01-01T02:59:00Z')` → `'2025-12-31'`. Devem falhar.

### Implementação

- [X] T005 [P] Criar `lib/historico/tipos.ts` com `TipoPeriodo`, `FiltroHistorico`, `Periodo`, `LinhaHistorico`, `ResumoHistorico`, `OpcaoFiltro` e `EstadoVazio = 'sem-viagens' | 'sem-resultado'` exatamente como em [contracts/consultas.md](./contracts/consultas.md) (`Sentido` importado de `lib/viagens/tipos.ts`).
- [X] T006 Implementar `hojeEmSaoPaulo(agora = new Date())` em `lib/format.ts` reutilizando o formatador `en-CA` com `TIME_ZONE` (retorna `AAAA-MM-DD`); T004 passa.
- [X] T007 Implementar `lib/historico/filtros.ts` (puro, sem import de servidor): `lerFiltros`, `paraQuery` (ordem fixa `periodo, inicio, fim, passageiro, trajeto, sentido, pagina`; omite padrões), `resolverPeriodo` (aritmética de datas em UTC sobre `AAAA-MM-DD`, sem biblioteca), `temFiltroAlemDoPadrao`, `rotuloPeriodo` (usa `formatDate` de um `Date` UTC ao meio-dia para não deslocar o dia), `escolherEstadoVazio`. Regras: [research.md §3–§4](./research.md); datas inválidas como `2026-02-30` são rejeitadas; `passageiro`/`trajeto` só passam se `ehUuid` (`lib/validacao.ts`); `pagina` inteiro de 1 a 50. T003 passa.
- [X] T008 Implementar `lib/historico/consultas.ts` (servidor, `createClient` de `lib/supabase/server.ts`): `obterOpcoesFiltros()` (todos os passageiros e trajetos, ativos e arquivados; rótulo do trajeto via `rotuloTrajeto`, ordem `compararTrajetos`; passageiros por `localeCompare('pt-BR', { sensitivity: 'base' })`; sufixo `" (arquivado)"` no rótulo e `arquivado: boolean`), `listarHistorico(periodo, filtro, limite)` (RPC `historico_viagens` com `p_limite: limite + 1`, devolve `{ linhas, temMais }`), `resumirHistorico(periodo, filtro)` (RPC `historico_resumo`, `Number(total_centavos)`), `existeViagemAtiva()` (`viagens` com `arquivada_em is null`, `limit 1`). Erros: `throw new Error('Falha ao …: ' + error.message)`.

**Checkpoint**: `npm run test` e `npm run typecheck` passam.

---

## Fase 3: História 1 — Consultar o histórico de um período (P1) 🎯 MVP

**Objetivo**: `/historico` com período, resumo, tabela/cartões, "Carregar mais", estados vazios e
voltar dos detalhes com os filtros.

**Teste independente**: e2e de T015, isolado pelo trajeto do próprio teste.

### Implementação

- [X] T009 [P] [US1] Acrescentar a prop opcional `mensagem?: string` em `components/erro-conexao.tsx` (padrão: o texto atual "Não foi possível conectar. Tente novamente."), sem alterar os usos existentes.
- [X] T010 [P] [US1] Criar `app/(app)/historico/error.tsx` (`'use client'`) que renderiza `ErroConexao` com `mensagem="Não foi possível carregar o histórico. Tente novamente."`, seguindo a assinatura de `app/(app)/error.tsx` (FR-022).
- [X] T011 [P] [US1] Criar `app/(app)/historico/tabela-historico.tsx` com `ResponsiveTable` (`components/responsive-table.tsx`): colunas essenciais Data (link `formatDateTime`, para `/viagens/{id}?volta=historico&de=<query codificada>`, com o mesmo `max-md:after:absolute max-md:after:inset-0` de `app/(app)/viagens/lista-viagens.tsx`), Percurso (`percurso(v, v.sentido)`), Sentido (badge Ida/Volta), Passageiros (`passageiros.join(', ')`, com quebra de linha), Total (`formatCurrency`); coluna extra "Valor de {nome}" quando há passageiro filtrado. "Carregar mais" (`?<query com pagina+1>`, `scroll={false}`) quando `temMais`. Estados vazios por `EstadoVazio` com os textos de [contracts/rotas.md](./contracts/rotas.md#estados-vazios-fr-017) ("Nova viagem" → `/viagens/nova`; "Limpar filtros" → `/historico` só se `temFiltroAlemDoPadrao`).
- [X] T012 [US1] Criar `app/(app)/historico/filtros-historico.tsx` (`'use client'`), só com **Período** nesta tarefa: `<select>` rotulado "Período" (Este mês, Mês passado, Últimos 30 dias, Personalizado) que navega com `router.replace('/historico?' + paraQuery({...filtro, periodo, pagina: 1}))`; no personalizado, `<input type="date">` "De" e "Até" e botão "Aplicar" que valida no cliente (ambas preenchidas; "De" ≤ "Até") e mostra o erro "A data inicial precisa ser anterior ou igual à final." ou "Informe as duas datas." abaixo dos campos sem navegar (FR-005). Altura ≥ 44px, `<label>` associado, campos empilhados < 768px e em grade a partir de `md`.
- [X] T013 [US1] Criar `app/(app)/historico/page.tsx` (`metadata.title = 'Histórico · Caronas Já'`): `await obterUsuarioLogado()`; `lerFiltros(await searchParams)`; `obterOpcoesFiltros()`; descartar `passageiro`/`trajeto` que não estejam nas opções (FR-020); `resolverPeriodo(filtro, hojeEmSaoPaulo())`; `Promise.all([listarHistorico(periodo, filtro, filtro.pagina * 20), resumirHistorico(periodo, filtro)])`; `existeViagemAtiva()` só se vier vazio. Monta `<h1>Histórico</h1>`, `FiltrosHistorico`, cartão de resumo (`rotuloPeriodo`, "1 viagem"/"N viagens", "Total cobrado: R$ X" ou "Total cobrado de {nome}: R$ X"), aviso "Período inválido; mostrando este mês." quando `periodoInvalido`, e `TabelaHistorico`.
- [X] T014 [US1] Em `app/(app)/viagens/[id]/page.tsx`, ler também `volta` de `searchParams` e estender `hrefDeVolta`: com `volta === 'historico'`, devolver `'/historico' + (q ? '?' + q : '')` com `q = paraQuery(lerFiltros(new URLSearchParams(de)).filtro)` e rótulo do link "Histórico"; caso contrário, comportamento e rótulo atuais ("Viagens") inalterados. Mudança mínima, só nessa função e no texto do link (ponto de contato com o slice 005, [research.md §9](./research.md)).

### Testes

- [X] T015 [US1] Criar `tests/e2e/historico.spec.ts` seguindo as **Regras contra condições de corrida** (helpers de `tests/e2e/helpers/passageiros.ts`; `test.skip(!email || !senha)`; `test.afterAll(limparDadosDeTeste)`; `itensDaLista` e `semRolagemHorizontal` como em `tests/e2e/viagens.spec.ts`; datas via `hojeEmSaoPaulo` importado por caminho relativo de `lib/format.ts`). Cenários, cada um com cenário próprio e sempre com `?trajeto=<id do próprio teste>` na URL ou no filtro: (1) sem sessão, `/historico` redireciona para `/entrar?proximo=%2Fhistorico`; (2) "Este mês": viagens no dia 1 do mês atual às 00:05 e 12:00 + uma no dia 1 do mês passado + uma do mês atual **arquivada** pela API (`update viagens set arquivada_em`) → só as 2 do mês atual, mais recente primeiro, resumo "2 viagens" e soma correta; trocar para "Mês passado" → só a do mês anterior (US1-1/4/6, FR-002); (3) colunas/cartões mostram data e hora, percurso no sentido, Ida/Volta, nomes e total, sem rolagem horizontal (US1-2/3, SC-008); (4) personalizado `2021-03-31` a `2021-03-31` com viagem às `2021-03-31T23:30` (local) → aparece; personalizado `2021-04-01` a `2021-04-30` → não aparece (SC-005, US1-5); (5) personalizado com "De" depois de "Até" → mensagem de erro e URL inalterada (FR-005); (6) URL `?periodo=personalizado&inicio=2026-09-10&fim=2026-09-01&trajeto=…` → aviso "Período inválido; mostrando este mês." (research §4); (7) 21 viagens no mesmo dia em 2021 (pela API) com período personalizado → 20 itens, resumo "21 viagens" com o total das 21, "Carregar mais" → 21 itens e soma dos totais das linhas = total do resumo (FR-014, FR-015, SC-002); (8) trajeto do teste sem viagens no período → "Nenhuma viagem no período" e resumo "0 viagens" / "R$ 0,00" (FR-017); (9) a partir do histórico filtrado, abrir uma viagem, conferir o link "Histórico" e voltar → mesma URL de filtros; recarregar → filtros mantidos (US1-8, FR-009); (10) editar o valor de um passageiro de uma viagem pela API (`rpc('editar_viagem', …)`, assinatura em `supabase/migrations/20261001153855_editar_viagem.sql`; se preciso, acrescentar o helper `editarViagemPelaApi` em `tests/e2e/helpers/passageiros.ts`) e recarregar → total da linha e resumo atualizados (casos de borda).

**Checkpoint**: US1 funcional; `npx playwright test tests/e2e/historico.spec.ts` passa nos dois projetos.

---

## Fase 4: História 2 — Filtrar por passageiro (P1)

**Objetivo**: filtro por passageiro com o valor dele na linha e no resumo, e o atalho no
detalhe do passageiro.

**Teste independente**: e2e de T019, isolado por passageiros criados pelo próprio teste.

- [X] T016 [US2] Em `app/(app)/historico/filtros-historico.tsx`, acrescentar o `<select>` "Passageiro" ("Todos" + `opcoes.passageiros`, rótulos com " (arquivado)"), navegando como o período (`pagina: 1`); `page.tsx` passa as opções e o nome do passageiro filtrado para o resumo e para a coluna "Valor de {nome}" de `tabela-historico.tsx` (FR-006, FR-007, FR-011, FR-013).
- [X] T017 [US2] Em `app/(app)/passageiros/[id]/page.tsx`, acrescentar na área de ações um `Button asChild variant="outline"` com ícone `History` (`lucide-react`) e texto "Ver histórico", link para `/historico?passageiro={id}`, visível para ativos e arquivados (FR-010). Mudança mínima (ponto de contato com o slice 005).
- [X] T018 [US2] Em `components/layout/nav-items.ts`, acrescentar `{ rotulo: 'Histórico', href: '/historico', icone: History }` logo após "Viagens" e o import de `History` (FR-001). Mudança mínima (ponto de contato com o slice 005).
- [X] T019 [US2] Acrescentar a `tests/e2e/historico.spec.ts`: (1) passageiros próprios A (R$ 12,00) e B (R$ 10,00) e um trajeto próprio; viagens no dia 1 do mês atual: ida A+B, volta só A com valor R$ 15,00, ida só B → filtro por A mostra 2 viagens, coluna "Valor de {A}" com R$ 12,00 e R$ 15,00, resumo "2 viagens" e "Total cobrado de {A}: R$ 27,00"; sem filtro de passageiro, mesmo trajeto: "3 viagens" e "R$ 47,00" (US2-1/2/3, SC-003); (2) no detalhe do passageiro A, "Ver histórico" abre `/historico?passageiro=<id>` com o filtro selecionado (US2-5); (3) arquivar A pela API (`atualizarPassageiroPelaApi`) → a opção "{A} (arquivado)" existe e o filtro continua funcionando (US2-4); (4) item "Histórico" visível na navegação no celular e no desktop e marcado como atual em `/historico` (FR-001).

**Checkpoint**: US1 e US2 funcionais.

---

## Fase 5: História 3 — Filtrar por trajeto e sentido (P2)

**Objetivo**: filtros de trajeto e sentido combináveis, e "Limpar filtros".

**Teste independente**: e2e de T022, isolado pelo trajeto do próprio teste.

- [X] T020 [US3] Em `app/(app)/historico/filtros-historico.tsx`, acrescentar os `<select>` "Trajeto" ("Todos" + `opcoes.trajetos`, com " (arquivado)") e "Sentido" ("Ida e volta", "Ida", "Volta"), navegando com `pagina: 1` (FR-006, FR-007).
- [X] T021 [US3] Acrescentar o link "Limpar filtros" → `/historico`, visível só quando `temFiltroAlemDoPadrao(filtro)` (FR-008), em `app/(app)/historico/filtros-historico.tsx`.
- [X] T022 [US3] Acrescentar a `tests/e2e/historico.spec.ts`: (1) dois trajetos próprios T1 e T2 e um passageiro próprio P; no dia 1 do mês atual: T1 ida, T1 volta, T2 volta, todas com P → filtro passageiro P + trajeto T1 + sentido Volta → 1 viagem e resumo coerente; só P + sentido Volta → 2 viagens (US3-1/2/3); (2) "Limpar filtros" leva a `/historico` e o link some (US3-4); (3) arquivar T1 pela API (`update trajetos set arquivado_em`) → opção "{T1} (arquivado)" disponível e filtrável (US3-5).

**Checkpoint**: todas as histórias funcionais.

---

## Fase 6: Privacidade, acabamento e publicação

**Propósito**: verificações automáticas de segurança (sem segunda conta), documentação, merge e
validação em produção pelo próprio e2e.

- [X] T023 [P] Acrescentar a `tests/e2e/historico.spec.ts` o teste de privacidade **sem segunda conta**: um cliente `createClient(url, anonKey)` **sem login** chama `rpc('historico_viagens', …)` e `rpc('historico_resumo', …)` e recebe erro (sem dados) (FR-020, Princípio VI).
- [X] T024 [P] Acrescentar a `tests/e2e/historico.spec.ts`: logado, `?passageiro=<uuid aleatório válido>&trajeto=<id do próprio teste>` e `?trajeto=<uuid aleatório>` → página carrega sem erro, o filtro inexistente é ignorado (select em "Todos") e nenhuma viagem de fora do filtro válido aparece (FR-020, quickstart cenário 16).
- [X] T025 Atualizar [quickstart.md](./quickstart.md): substituir "Cenários de validação manual" por uma tabela que mapeia cada cenário para o teste automatizado correspondente em `tests/e2e/historico.spec.ts`; trocar o cenário 17 (segunda conta) por T023/T024; na "Validação da publicação", usar `E2E_BASE_URL` em vez de repetição manual.
- [X] T026 [P] Atualizar `README.md`: acrescentar "[004 — Histórico de viagens](./specs/004-historico-viagens/spec.md): item de navegação "Histórico" (`/historico`)" à lista de slices concluídos e mencionar as funções `historico_viagens`/`historico_resumo` onde o README lista as funções SQL.
- [X] T027 Rodar `npm run lint`, `npm run typecheck` e `npm run test`; corrigir até passarem.
- [X] T028 Rodar `npx playwright test` (suíte completa, local, dois projetos) e corrigir falhas. Se uma falha vier de dados de outra sessão (slice 005), corrigir o **teste** para isolar pelo trajeto/passageiro próprio, nunca afrouxar a asserção.
- [X] T029 Rodar `npx playwright test tests/e2e/historico.spec.ts --repeat-each=3` para detectar instabilidade por paralelismo; corrigir qualquer falha intermitente antes de seguir.
- [X] T030 Commitar o slice na branch `feature/historico-viagens` (mensagem em pt-BR, padrão `feat: histórico de viagens (slice 004)`), com a migração, o código, os testes e os documentos.
- [ ] T031 Sincronizar com a `main`: `git fetch origin` e `git merge origin/main`. Se houver conflito (esperado só em `components/layout/nav-items.ts`, `app/(app)/passageiros/[id]/page.tsx`, `app/(app)/viagens/[id]/page.tsx`, `README.md`, [research.md §9](./research.md)), manter **as duas** mudanças. Se o merge trouxer a migração do slice 005 ainda não aplicada, rodar `npx supabase db push`.
- [ ] T032 Após o merge, repetir T027 e T028 (suíte completa); só seguir com tudo verde.
- [ ] T033 Publicar: perguntar ao usuário antes (ação externa); com a confirmação, `git checkout main`, `git merge --no-ff feature/historico-viagens`, `git push origin main` e aguardar o deploy da Vercel (`gh run`/status do commit ou a página respondendo com o item "Histórico").
- [ ] T034 Validar em produção sem passos manuais: rodar `npx playwright test tests/e2e/historico.spec.ts` com `E2E_BASE_URL=<url-produção>` (README, "testes contra a produção"); confirmar com `npx supabase migration list` que `<ts>_historico` está aplicada no remoto.
- [ ] T035 [P] Marcar a spec como concluída: em `specs/004-historico-viagens/spec.md`, `**Status**: Concluído (<data>)`.
- [ ] T036 Commitar a documentação final na `main` (`docs: conclui o slice 004`) e fazer push, após confirmação do usuário.

---

## Dependências e Ordem de Execução

### Dependências entre fases

- **Fase 1** (T001–T002): sem dependências; T001 primeiro, para reduzir a janela de corrida com
  a migração do slice 005.
- **Fase 2** (T003–T008): depende de T001 apenas para T008 (as RPCs precisam existir para o e2e;
  o typecheck não depende do banco).
- **Fase 3** (US1): depende da Fase 2.
- **Fase 4** (US2) e **Fase 5** (US3): dependem da US1 (mesmos arquivos `page.tsx` e
  `filtros-historico.tsx`); executar em sequência: US2 → US3.
- **Fase 6**: depende de todas as histórias.

### Dependências entre histórias

- US1 → US2 → US3, em sequência, porque compartilham `filtros-historico.tsx`, `page.tsx` e
  `historico.spec.ts`. Não há paralelismo entre histórias nesta sessão.

### Dentro de cada fase

- Testes unitários (T003, T004) antes da implementação (T006, T007).
- `tipos.ts` → `filtros.ts` → `consultas.ts` → componentes → `page.tsx`.
- Tarefas que editam `tests/e2e/historico.spec.ts` (T015, T019, T022, T023, T024) são
  sequenciais entre si: o [P] de T023/T024 vale apenas em relação a T025/T026.

### Oportunidades de paralelismo

- T002 com T001 (leitura × migração).
- T003, T004 e T005 entre si (arquivos diferentes).
- T009, T010 e T011 entre si.
- T025 e T026 (documentação) com T023/T024 (testes).

## Exemplo de paralelismo

```text
# Fase 2, antes da implementação:
T003 tests/unit/historico-filtros.test.ts
T004 tests/unit/format.test.ts
T005 lib/historico/tipos.ts

# Fase 3, componentes independentes:
T009 components/erro-conexao.tsx
T010 app/(app)/historico/error.tsx
T011 app/(app)/historico/tabela-historico.tsx
```

## Estratégia de Implementação

### MVP (só US1)

Fases 1–3: o histórico por período, com resumo e voltar dos detalhes, já responde "quanto rodei
e quanto cobrei neste mês". Como o slice é de sessão única, o MVP não é publicado sozinho; ele é
o ponto de parada seguro se a sessão precisar ser interrompida (tudo commitado na branch, nada
na `main`).

### Entrega

Uma única publicação ao final (T033), depois do merge com a `main` e da suíte completa verde,
validada em produção pelo e2e (T034).

## Notas

- O slice é somente leitura: nenhuma tarefa cria server action, altera tabela ou view.
- Nenhuma tarefa depende do slice 005; se o 005 já estiver na `main` no momento de T031, a única
  interação é o merge dos pontos de contato.
- Não editar a migração depois de T001; correções viram nova migração.
