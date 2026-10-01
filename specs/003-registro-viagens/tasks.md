---

description: "Lista de tarefas do slice 003: Trajetos e Registro de Viagens"
---

# Tarefas: Trajetos e Registro de Viagens

**Entrada**: Documentos de design em `specs/003-registro-viagens/`

**Pré-requisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/rotas.md](./contracts/rotas.md),
[contracts/acoes.md](./contracts/acoes.md), [quickstart.md](./quickstart.md)

**Testes**: incluídos. A constituição exige testes automatizados para regras de valores e
verificação em larguras de celular e desktop (research §16):

- Vitest para validação, total, data e formatação;
- Playwright (`mobile` 360px e `desktop` 1280px) para as telas.

**Organização**: quatro **fatias verticais**, uma por sessão de trabalho. Cada fatia termina
**publicada em produção** e utilizável, mesmo que as seguintes nunca sejam feitas. Para
referenciar uma fatia, use o nome dela, por exemplo: `/speckit-implement Fatia A`.

| Fatia | Histórias | Fases | Tarefas | Depende de |
|-------|-----------|-------|---------|------------|
| **A. Trajetos** | US1 (P1), US6 (P3) | 1–3 | T001–T025 | slices 001 e 002 concluídos |
| **B. Registrar e consultar viagens** | US2 (P1), US3 (P2) | 4–6 | T026–T046 | Fatia A |
| **C. Editar viagens** | US4 (P2) | 7 | T047–T056 | Fatia B |
| **D. Arquivar viagens e acabamento** | US5 (P3) | 8–9 | T057–T068 | Fatia C |

A US6 (gestão de trajetos, P3) entra na Fatia A, fora da ordem de prioridade, porque completa o
recurso "trajetos" na mesma sessão e não depende de viagens. A exclusão de trajetos com viagens
passa a ser bloqueada automaticamente na Fatia B, pela FK.

## Formato: `[ID] [P?] [História] Descrição`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[História]**: US1–US6 (ver spec.md).
- Tarefas marcadas **(manual)** exigem ação do usuário em um painel externo (Supabase, Vercel).
  O agente deve parar, explicar o passo e aguardar confirmação.

## Convenções

- Projeto único Next.js na raiz (`app/`, `components/`, `lib/`, `supabase/`, `tests/`).
- Domínio, tabelas, colunas, funções SQL e rotas em pt-BR. Textos da interface em pt-BR.
- **Next.js 16**:
  - `params` e `searchParams` são `Promise` e devem ser aguardados;
  - o antigo `middleware.ts` é o `proxy.ts`;
  - antes de escrever código de rota ou action, consultar
    `node_modules/next/dist/docs/01-app/01-getting-started/` (em especial `07-mutating-data.md`).
- **Modelos de código do slice 002, a seguir à risca**:
  - actions em `app/(app)/passageiros/actions.ts`;
  - formulário em `app/(app)/passageiros/formulario-passageiro.tsx`;
  - lista em `app/(app)/passageiros/page.tsx` e `lista-passageiros.tsx`;
  - detalhes em `app/(app)/passageiros/[id]/page.tsx`;
  - ações com diálogo em `app/(app)/passageiros/[id]/acoes-passageiro.tsx`;
  - consultas em `lib/passageiros/consultas.ts`;
  - migração em `supabase/migrations/20260930150321_passageiros.sql`;
  - e2e em `tests/e2e/passageiros.spec.ts` e `tests/e2e/helpers/passageiros.ts`.
- **Padrões obrigatórios**:
  - `redirect` fora do `try/catch`;
  - `.bind(null, id)` para as actions sobre um registro;
  - `motorista_id` nunca vem do formulário;
  - `?aviso=` exibido por `AvisoUrl` dentro de `<Suspense>`;
  - `?de=` do "Voltar" parseado com `URLSearchParams`, repassando só os parâmetros conhecidos.
- Nunca usar a chave `service_role`. O e2e usa apenas a conta de **teste** (`E2E_EMAIL`/`E2E_SENHA`).

---

# Fatia A — Trajetos (sessão 1)

**Resultado publicado**: o motorista acessa "Viagens" pela navegação, entra em "Trajetos",
cadastra, edita, arquiva, reativa e exclui trajetos (origem → destino).

## Fase 1: Fundação da Fatia A

**Objetivo**: criar a tabela de trajetos, extrair as regras genéricas de validação e preparar os
testes.

- [X] T001 Criar a migração com `npx supabase migration new trajetos` e escrever `supabase/migrations/<timestamp>_trajetos.sql` seguindo o [data-model.md](./data-model.md) e o modelo de `passageiros`:
  - tabela `public.trajetos` com as colunas, exatamente:
    - `id uuid primary key default gen_random_uuid()`;
    - `motorista_id uuid not null default auth.uid() references auth.users (id) on delete cascade`;
    - `origem text not null check (origem = btrim(origem) and char_length(origem) between 1 and 80)`;
    - `destino text not null check (destino = btrim(destino) and char_length(destino) between 1 and 80)`;
    - `arquivado_em timestamptz` (nulo = ativo);
    - `criado_em timestamptz not null default now()` e `atualizado_em timestamptz not null default now()`;
  - restrições:
    - `constraint trajetos_origem_diferente_destino check (lower(origem) <> lower(destino))`;
    - `constraint trajetos_id_motorista_unico unique (id, motorista_id)`;
  - `comment on table` em pt-BR;
  - trigger `trajetos_definir_atualizado_em` `before update` com `public.definir_atualizado_em()`;
  - índice único parcial `trajetos_ativo_unico on public.trajetos (motorista_id, lower(origem), lower(destino)) where arquivado_em is null`;
  - `alter table public.trajetos enable row level security`;
  - quatro políticas `to authenticated` ("trajetos: dono lê/insere/atualiza/exclui os próprios registros") com `motorista_id = (select auth.uid())` em `using` e, em `insert`/`update`, em `with check`
- [X] T002 **(manual)** Aplicar a migração com `npx supabase db push` e confirmar no painel (Table Editor → `trajetos`) que a RLS está habilitada com 4 políticas
- [X] T003 [P] Extrair as regras genéricas para `lib/validacao.ts` (research §12):
  - mover de `lib/passageiros/validacao.ts`, sem mudar o comportamento: `Resultado<T>`, `colapsarEspacos` (agora exportada), `parseValorEmCentavos`, `centavosParaCampo`, `ehUuid` e as constantes de valor (`VALOR_MAX_CENTAVOS`, regexes, `ERRO_VALOR`);
  - `parseValorEmCentavos(entrada: string, mensagemVazio = 'Informe o valor padrão.')` usa `mensagemVazio` quando o campo está vazio;
  - `lib/passageiros/validacao.ts` passa a importar essas funções e a reexportá-las (`export { ... } from '@/lib/validacao'`), para que `tests/unit/passageiros-validacao.test.ts` e as importações atuais continuem funcionando sem mudança;
  - acrescentar a `tests/unit/passageiros-validacao.test.ts` um caso de `parseValorEmCentavos('', 'Informe o valor.')` → erro "Informe o valor."
- [X] T004 [P] Criar `lib/trajetos/tipos.ts` conforme [data-model.md](./data-model.md) e [contracts/acoes.md](./contracts/acoes.md):
  - `Trajeto = { id: string; origem: string; destino: string; arquivado_em: string | null; criado_em: string; atualizado_em: string }`;
  - `SituacaoTrajeto = 'ativos' | 'arquivados'`;
  - `CamposTrajeto = 'origem' | 'destino'`;
  - `EstadoFormularioTrajeto` e `EstadoAcaoTrajeto`, no mesmo formato dos de passageiros
- [X] T005 [P] Escrever `tests/unit/trajetos-validacao.test.ts` (devem falhar antes de T006) com **todos** os exemplos obrigatórios de `normalizarPonto`, `validarTrajeto` e `rotuloTrajeto` da tabela de [contracts/acoes.md](./contracts/acoes.md), e também:
  - 80 caracteres aceitos;
  - espaços internos colapsados (`"Casa   da  Ana"` → `"Casa da Ana"`);
  - `validarTrajeto` com `FormData` vazio devolve "Informe a origem." e "Informe o destino.";
  - `rotuloTrajeto({ origem: 'Casa', destino: 'Faculdade' })` → `"Casa → Faculdade"`
- [X] T006 Implementar `lib/trajetos/validacao.ts` (funções puras) até T005 passar:
  - `normalizarPonto(entrada, rotulo)`: `colapsarEspacos`; vazio → "Informe a origem." / "Informe o destino."; mais de 80 → "A origem deve ter até 80 caracteres." / "O destino deve ter até 80 caracteres.";
  - `validarTrajeto(formData)`: lê `origem` e `destino`; se ambos forem válidos e iguais sem diferenciar maiúsculas, devolve `errosCampo.destino` "A origem e o destino precisam ser diferentes.";
  - `rotuloTrajeto(t)`: `` `${t.origem} → ${t.destino}` ``
- [X] T007 [P] Ampliar `tests/e2e/helpers/passageiros.ts`:
  - `nomeDeTeste` continua valendo e também é usado para a origem dos trajetos de teste (prefixo `E2E `);
  - nova função `limparDadosDeTeste()`, que substitui `limparPassageirosDeTeste` nos `afterAll` (manter o nome antigo como alias). Ela faz login com a conta de teste e exclui, nesta ordem, os `trajetos` com `origem` entre os nomes criados pelo worker e os `passageiros` criados pelo worker, depois `signOut({ scope: 'local' })`. A Fatia B acrescenta as viagens no início (T032);
  - trocar o `afterAll` de `tests/e2e/passageiros.spec.ts` para `limparDadosDeTeste`

**Checkpoint**: `npm run test` passa, incluindo os testes antigos de passageiros; a tabela
existe com RLS.

## Fase 2: História de Usuário 1 — Cadastrar e listar trajetos (P1) 🎯 MVP

**Objetivo**: cadastro de trajetos com validação, lista em ordem alfabética, detalhes e acesso
pela navegação "Viagens".

**Teste independente**: entrar, abrir "Viagens" → "Trajetos", cadastrar dois trajetos e
conferir a lista (quickstart, cenários 1–5).

### Testes da História 1

- [X] T008 [P] [US1] Criar `tests/e2e/trajetos.spec.ts` (bloco `test.describe('US1 – cadastro e lista de trajetos')`, pulado sem `E2E_EMAIL`/`E2E_SENHA`, com `test.afterAll(limparDadosDeTeste)`):
  - sem sessão, `/viagens/trajetos` leva a `/entrar?proximo=%2Fviagens%2Ftrajetos`;
  - o link "Viagens" existe na navegação; em `/viagens`, o link "Trajetos" leva a `/viagens/trajetos`;
  - cadastrar origem = `nomeDeTeste('Casa')` e destino "Faculdade" leva a `/viagens/trajetos/<uuid>` com o toast "Trajeto cadastrado" e o `h1` "<origem> → Faculdade";
  - salvar vazio mostra "Informe a origem." e "Informe o destino."; salvar com o destino igual à origem em minúsculas mostra "A origem e o destino precisam ser diferentes.";
  - cadastrar de novo a mesma origem e o mesmo destino, com letras trocadas, mostra "Este trajeto já está cadastrado.";
  - cadastrar o sentido oposto (destino → origem) é aceito;
  - a lista mostra os dois trajetos; não há rolagem horizontal em `/viagens/trajetos` e em `/viagens/trajetos/novo`

### Implementação da História 1

- [X] T009 [US1] Criar `lib/trajetos/consultas.ts` (só servidor, `createClient` de `lib/supabase/server.ts`):
  - `listarTrajetos(situacao)`: filtra `arquivado_em` nulo ou não nulo e ordena no código com `localeCompare(..., 'pt-BR', { sensitivity: 'base' })` pela origem e, em empate, pelo destino;
  - `obterTrajeto(id)` com `cache()`: `!ehUuid(id)` → `null`, senão `.eq('id', id).maybeSingle()`;
  - erros de consulta lançam `Error`
- [X] T010 [US1] Criar `app/(app)/viagens/trajetos/actions.ts` (`'use server'`) com `cadastrarTrajeto(estado, formData)` conforme [contracts/acoes.md](./contracts/acoes.md):
  - `validarTrajeto`; se falhar → `{ errosCampo, valores }`;
  - `insert({ origem, destino }).select('id').single()`;
  - `23505` → `errosCampo.destino` "Este trajeto já está cadastrado."; `23514` → `errosCampo.destino` "A origem e o destino precisam ser diferentes."; outros → `erro` "Não foi possível salvar. Tente novamente." (sempre com `valores`);
  - sucesso: `revalidatePath('/viagens/trajetos')` e `redirect('/viagens/trajetos/<id>?aviso=cadastrado')`
- [X] T011 [US1] Criar `app/(app)/viagens/trajetos/formulario-trajeto.tsx` (cliente), no molde de `formulario-passageiro.tsx`:
  - props `acao`, `inicial?`, `textoEnviar` e `hrefCancelar`;
  - campos Origem e Destino (`maxLength={80}`, `autoComplete="off"`, placeholders "Ex.: Casa" e "Ex.: Faculdade", `className="h-11"`);
  - erros por campo com `aria-invalid`/`aria-describedby` e erro geral em `role="alert"`;
  - "Salvar" ("Salvando..." enquanto pendente) e "Cancelar"
- [X] T012 [US1] Criar `app/(app)/viagens/trajetos/novo/page.tsx`: `metadata.title = 'Novo trajeto · Caronas Já'`, `h1` "Novo trajeto" e `FormularioTrajeto` com `acao={cadastrarTrajeto}`, `textoEnviar="Salvar"` e `hrefCancelar="/viagens/trajetos"`
- [X] T013 [US1] Criar `app/(app)/viagens/trajetos/page.tsx` (Server Component):
  - `metadata.title = 'Trajetos · Caronas Já'`; `obterUsuarioLogado()`; `listarTrajetos('ativos')`;
  - cabeçalho com o link "Viagens" (voltar para `/viagens`), o `h1` "Trajetos" e o botão "Novo trajeto";
  - `ResponsiveTable` com a coluna "Trajeto" (`essencial`), um `Link` com `rotuloTrajeto` para `/viagens/trajetos/<id>` e `max-md:after:absolute max-md:after:inset-0` (o cartão inteiro clicável);
  - vazio: `EmptyState` com ícone `Route`, título "Nenhum trajeto cadastrado", descrição "Cadastre a origem e o destino das caronas que você faz, como Casa → Faculdade." e ação "Novo trajeto";
  - `<AvisoUrl mensagens={{ excluido: 'Trajeto excluído' }} />` em `<Suspense>`
- [X] T014 [US1] Criar `app/(app)/viagens/trajetos/[id]/page.tsx`:
  - `params` aguardado; `generateMetadata` com `'<Origem → Destino> · Caronas Já'`; `null` → `notFound()`;
  - link "Trajetos" (voltar) repassando só `situacao` lida de `?de=`;
  - `h1` com `rotuloTrajeto`; `Card` com `<dl>`: Origem, Destino, Situação (`Badge` "Ativo" ou "Arquivado em DD/MM/AAAA"), "Cadastrado em" e "Última alteração" (`formatDate`);
  - `<AvisoUrl mensagens={{ cadastrado: 'Trajeto cadastrado', atualizado: 'Trajeto atualizado', arquivado: 'Trajeto arquivado', reativado: 'Trajeto reativado' }} />`;
  - na lista (T013), o link passa `?de=<querystring atual>`
- [X] T015 [US1] Criar `app/(app)/viagens/page.tsx` **provisória** (substituída em T038): `metadata.title = 'Viagens · Caronas Já'`, `h1` "Viagens" e `EmptyState` com ícone `Route`, título "Cadastre seus trajetos", descrição "Os trajetos são a origem e o destino das suas caronas. Em seguida você poderá registrar as viagens." e ação "Trajetos" (`/viagens/trajetos`)
- [X] T016 [P] [US1] Adicionar `{ rotulo: 'Viagens', href: '/viagens', icone: Car }` depois de "Passageiros" em `components/layout/nav-items.ts` (importar `Car` de `lucide-react`)
- [X] T017 [P] [US1] Atualizar `app/(app)/inicio/page.tsx`:
  - a descrição do `EmptyState` passa a convidar a cadastrar passageiros e trajetos;
  - ações "Cadastrar trajetos" (primária, `/viagens/trajetos`) e "Passageiros" (`variant="outline"`, `/passageiros`), lado a lado a partir de `sm` e empilhadas no celular;
  - atualizar o comentário sobre telas inexistentes;
  - ajustar `tests/e2e/layout.spec.ts` se ele verificar o texto antigo

**Checkpoint**: trajetos podem ser cadastrados e consultados a partir da navegação.

## Fase 3: História de Usuário 6 — Editar, arquivar, reativar e excluir trajetos (P3)

**Objetivo**: gestão completa de trajetos, igual à de passageiros.

**Teste independente**: editar a origem, arquivar, conferir o filtro, reativar e excluir um
trajeto sem viagens (quickstart, cenários 20 e 21; o 19 fica para a Fatia B).

### Testes da História 6

- [X] T018 [P] [US6] Acrescentar a `tests/e2e/trajetos.spec.ts` o bloco `US6 – gestão de trajetos`:
  - "Editar" abre `/viagens/trajetos/<id>/editar` preenchido; salvar uma nova origem volta aos detalhes com o toast "Trajeto atualizado";
  - "Arquivar" abre "Arquivar trajeto?"; ao confirmar, aparecem o toast "Trajeto arquivado", "Arquivado em DD/MM/AAAA" e o aviso; o trajeto some dos ativos e aparece em `?situacao=arquivados`;
  - com um trajeto ativo igual, "Reativar" mostra "Já existe um trajeto ativo com essa origem e esse destino."; sem conflito, reativa com o toast "Trajeto reativado";
  - "Excluir" abre "Excluir trajeto?"; ao confirmar, a lista mostra o toast "Trajeto excluído"; "Cancelar" não altera nada;
  - `/viagens/trajetos/abc` e `/viagens/trajetos/00000000-0000-4000-8000-000000000000` mostram "Página não encontrada"

### Implementação da História 6

- [X] T019 [US6] Acrescentar a `app/(app)/viagens/trajetos/actions.ts`, conforme [contracts/acoes.md](./contracts/acoes.md):
  - `editarTrajeto(id, estado, formData)`: mesmas validações e erros do cadastro; nenhuma linha → "Trajeto não encontrado."; revalida `/viagens/trajetos`, `/viagens/trajetos/<id>` e `/viagens`; `redirect('/viagens/trajetos/<id>?aviso=atualizado')`;
  - `arquivarTrajeto(id, estado)`: `update({ arquivado_em: new Date().toISOString() }).eq('id', id).is('arquivado_em', null)`;
  - `reativarTrajeto(id, estado)`: `update({ arquivado_em: null })`; `23505` → "Já existe um trajeto ativo com essa origem e esse destino.";
  - `excluirTrajeto(id, estado)`: `delete()`; `23503` → "Este trajeto tem viagens registradas e não pode ser excluído. Arquive-o."; sucesso → `/viagens/trajetos?aviso=excluido`;
  - todas: `!ehUuid(id)` → "Trajeto não encontrado."; outros erros → "Não foi possível salvar. Tente novamente."; `revalidatePath` + `redirect` fora do `try/catch`, com a mesma função auxiliar `concluirAcao` do slice 002
- [X] T020 [US6] Criar `app/(app)/viagens/trajetos/[id]/editar/page.tsx`: `obterTrajeto`, e `null` → `notFound()`; título "Editar trajeto · Caronas Já"; `FormularioTrajeto` com `acao={editarTrajeto.bind(null, id)}`, `inicial={{ origem, destino }}` e `hrefCancelar="/viagens/trajetos/<id>"`
- [X] T021 [US6] Criar `app/(app)/viagens/trajetos/[id]/acoes-trajeto.tsx` (cliente), no molde de `acoes-passageiro.tsx`, com props `id`, `rotulo` e `arquivado`:
  - ativo: "Arquivar" com `ConfirmDialog`;
  - arquivado: "Reativar", sem confirmação;
  - ambos: "Excluir" (`destructive`) com `ConfirmDialog`;
  - textos da tabela "Diálogos de confirmação" de [contracts/rotas.md](./contracts/rotas.md); erro em `role="alert"`
- [X] T022 [US6] Em `app/(app)/viagens/trajetos/[id]/page.tsx`: botão "Editar" (ícone `Pencil`), `AcoesTrajeto` e, quando arquivado, a faixa "Este trajeto está arquivado e não aparece ao registrar novas viagens."
- [X] T023 [US6] Em `app/(app)/viagens/trajetos/page.tsx`:
  - ler `?situacao` (`'arquivados'`; qualquer outro valor = ativos) e carregar `listarTrajetos(situacao)`;
  - alternância "Ativos" / "Arquivados" (dois links com `aria-current`, alvos ≥ 44px);
  - vazio dos arquivados: `EmptyState` "Nenhum trajeto arquivado"
- [X] T024 Rodar `npm run lint`, `npm run typecheck`, `npm run test` e `npm run test:e2e` e corrigir as falhas
- [X] T025 Fechar a Fatia A:
  - commit em pt-BR e push na `main`; aguardar o deploy na Vercel;
  - **(manual)** confirmar a migração no Supabase de produção (T002);
  - validar em produção os cenários 1–5, 20, 21 e 24 (telas de trajetos) do [quickstart.md](./quickstart.md) e registrar o resultado nesta tarefa
  - **Resultado (2026-09-30)**: migração `20260930164900_trajetos.sql` aplicada pelo usuário com
    `db push` no projeto vinculado. Local (T024): lint, typecheck, 80/80 unitários e 74/74 e2e
    (11 falhas de rede/suspensão na primeira execução paralela, todas aprovadas ao repetir com 2
    workers). Commit `a76284e` publicado em `https://carona-ja-theta.vercel.app`.
    `trajetos.spec.ts` + `layout.spec.ts` com `E2E_BASE_URL` de produção: 29/30 em paralelo; a
    falha (mensagem de duplicado não apareceu em 5 s, no mobile) passou 4/4 ao repetir em série
    (mobile e desktop). Cobre os cenários 1–5 (navegação, cadastro, validação, duplicado, sentido
    oposto, lista), 20 e 21 (editar, arquivar/filtro, reativar com e sem conflito, excluir, 404) e
    24 (sem rolagem horizontal em 360/1280px).

**Checkpoint da Fatia A**: gestão de trajetos publicada e utilizável sozinha.

---

# Fatia B — Registrar e consultar viagens (sessão 2)

**Resultado publicado**: o motorista registra viagens (trajeto, sentido, data, passageiros e
valores, com total automático), vê a lista das mais recentes e abre os detalhes de cada uma.

## Fase 4: Fundação da Fatia B

**Objetivo**: tabelas de viagens e participações, view do total, função de registro e regras
puras.

- [X] T026 Criar a migração com `npx supabase migration new viagens` e escrever `supabase/migrations/<timestamp>_viagens.sql` conforme [data-model.md](./data-model.md) e [research.md](./research.md) §2–§9:
  - `alter table public.passageiros add constraint passageiros_id_motorista_unico unique (id, motorista_id)`;
  - tabela `public.viagens`:
    - `id uuid primary key default gen_random_uuid()`;
    - `motorista_id uuid not null default auth.uid() references auth.users (id) on delete cascade`;
    - `trajeto_id uuid not null`;
    - `sentido text not null check (sentido in ('ida', 'volta'))`;
    - `realizada_em timestamptz not null`;
    - `arquivada_em timestamptz` (nulo = ativa);
    - `criado_em`/`atualizado_em timestamptz not null default now()`;
    - `constraint viagens_id_motorista_unico unique (id, motorista_id)`;
    - `constraint viagens_trajeto_fk foreign key (trajeto_id, motorista_id) references public.trajetos (id, motorista_id)` (sem `on delete`, ou seja, `no action`; research §5);
  - tabela `public.viagem_passageiros`:
    - `id uuid primary key default gen_random_uuid()`;
    - `motorista_id uuid not null default auth.uid() references auth.users (id) on delete cascade`;
    - `viagem_id uuid not null` e `passageiro_id uuid not null`;
    - `valor_centavos integer not null check (valor_centavos between 0 and 999999)`;
    - `criado_em`/`atualizado_em`;
    - `constraint viagem_passageiros_viagem_fk foreign key (viagem_id, motorista_id) references public.viagens (id, motorista_id) on delete cascade`;
    - `constraint viagem_passageiros_passageiro_fk foreign key (passageiro_id, motorista_id) references public.passageiros (id, motorista_id)` (`no action`);
    - `constraint viagem_passageiros_unico unique (viagem_id, passageiro_id)`;
  - triggers `definir_atualizado_em` nas duas tabelas; `comment on table` em pt-BR;
  - índices:
    - `viagens_ativas_recentes on public.viagens (motorista_id, realizada_em desc) where arquivada_em is null`;
    - `viagens_trajeto_sentido on public.viagens (motorista_id, trajeto_id, sentido, realizada_em)`;
    - `viagem_passageiros_passageiro on public.viagem_passageiros (passageiro_id)`;
  - RLS habilitada e quatro políticas "somente o dono" em cada tabela (a de `delete` em `viagens` existe para a limpeza dos testes; research §15);
  - view `public.viagens_resumo with (security_invoker = true)` com as colunas da tabela do data-model: `viagens` join `trajetos` left join `viagem_passageiros`, `group by` viagem e trajeto, `count(vp.id)::integer as quantidade_passageiros`, `coalesce(sum(vp.valor_centavos), 0)::integer as total_centavos`;
  - função `public.registrar_viagem(p_trajeto_id uuid, p_sentido text, p_data_hora_local timestamp, p_participacoes jsonb, p_confirmar_duplicada boolean default false) returns uuid`, `language plpgsql security invoker set search_path = ''`, com os passos 1–5 do data-model:
    - `v_realizada_em := p_data_hora_local at time zone 'America/Sao_Paulo'`; se `> now() + interval '1 day'` → `raise exception using errcode = 'CJ005', message = 'data_futura'`;
    - trajeto ativo (`select ... from public.trajetos where id = p_trajeto_id and arquivado_em is null`), senão `CJ002`;
    - `sentido` fora de `ida`/`volta` → `CJ004`;
    - participações com `jsonb_to_recordset(p_participacoes) as x(passageiro_id uuid, valor_centavos integer)`: vazio, valor nulo ou fora de `0..999999` → `CJ004`; a quantidade de passageiros distintos encontrados em `public.passageiros` com `arquivado_em is null` diferente da quantidade enviada → `CJ003`;
    - sem `p_confirmar_duplicada`, uma viagem ativa com o mesmo `trajeto_id` e `sentido` e `(realizada_em at time zone 'America/Sao_Paulo')::date` igual → `raise exception using errcode = 'CJ001', message = 'viagem_duplicada', detail = to_char(<data local>, 'DD/MM/YYYY')`;
    - `insert` da viagem (`returning id`) e das participações;
  - `revoke execute on function public.registrar_viagem(uuid, text, timestamp, jsonb, boolean) from public, anon;` e `grant execute ... to authenticated;`
- [X] T027 **(manual)** Aplicar a migração com `npx supabase db push` e conferir no painel as duas tabelas com RLS e 4 políticas cada, a view `viagens_resumo` e a função `registrar_viagem`
- [X] T028 [P] Criar `lib/viagens/tipos.ts` com `Sentido`, `ViagemResumo`, `Participacao` ([data-model.md](./data-model.md) → "Tipos TypeScript"), `SituacaoViagem = 'ativas' | 'arquivadas'`, `CamposViagem`, `EstadoFormularioViagem` e `EstadoAcaoViagem` ([contracts/acoes.md](./contracts/acoes.md)), e `PassageiroOpcao = { id; nome; valor_padrao_centavos; arquivado_em }`
- [X] T029 [P] Escrever `tests/unit/viagens-validacao.test.ts` (devem falhar antes de T030) com **todos** os exemplos obrigatórios de `percurso`, `validarDataHoraLocal`, `validarViagem` e `somarCentavos` de [contracts/acoes.md](./contracts/acoes.md), e também:
  - `validarDataHoraLocal` aceita exatamente agora + 24h e aceita segundos (`"2026-09-30T07:40:00"` → `"2026-09-30T07:40"`); rejeita `"2026-02-30T10:00"` (data inexistente);
  - `validarViagem` com `trajeto` que não é UUID → `errosCampo.trajeto` "Escolha um trajeto.";
  - um caso válido completo que devolve `participacoes` com `valor_centavos` inteiros e `data_hora_local` normalizada;
  - acrescentar a `tests/unit/format.test.ts`: `paraCampoDataHora('2026-09-30T10:40:00Z')` → `"2026-09-30T07:40"` e `paraCampoDataHora('2026-01-01T02:59:00Z')` → `"2025-12-31T23:59"`
- [X] T030 Implementar `lib/viagens/validacao.ts` (funções puras) até T029 passar:
  - `percurso(t, sentido)`: `ida` → `rotuloTrajeto(t)`; `volta` → `` `${t.destino} → ${t.origem}` ``;
  - `validarDataHoraLocal(entrada, agoraLocal)`: aceita `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$` e descarta os segundos. Confere que a data existe (`Date.UTC` com as partes e comparação de volta). Limite: `agoraLocal` + 24h, calculado com `Date.UTC` e formatado de volta como `AAAA-MM-DDTHH:mm`, com comparação de strings. Mensagens: vazio → "Informe a data e a hora."; formato ou data inválida → "Data e hora inválidas."; acima do limite → "A data e a hora não podem passar de 1 dia no futuro.";
  - `validarViagem(formData, agoraLocal)`:
    - `trajeto` com `ehUuid`, senão "Escolha um trajeto.";
    - `sentido` ∈ `ida`/`volta`, senão "Escolha Ida ou Volta.";
    - `data_hora` com `validarDataHoraLocal`;
    - `formData.getAll('passageiros')` sem repetições e só UUIDs; nenhum → "Marque ao menos um passageiro.";
    - para cada passageiro, `parseValorEmCentavos(valor_<id>, 'Informe o valor.')`, com erro em `errosValor[id]`;
  - `somarCentavos(valores)`: soma de inteiros
- [X] T031 Implementar `paraCampoDataHora(valor)` em `lib/format.ts` até T029 passar: `Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })` com `formatToParts`, montando `AAAA-MM-DDTHH:mm`
- [X] T032 [P] Ampliar `tests/e2e/helpers/passageiros.ts`:
  - `limparDadosDeTeste()` passa a excluir **primeiro** as `viagens` cujo `trajeto_id` pertence aos trajetos de teste do worker (a cascata remove as participações), e depois trajetos e passageiros;
  - novo helper `prepararCenario({ passageiros: { base, valorCentavos }[], trajeto: { origemBase, destino } })`, que cria pela API (cliente anon com login da conta de teste, sob a RLS) os passageiros (telefone `11912345678`) e o trajeto com nomes de `nomeDeTeste` e devolve os ids e nomes;
  - novo helper `registrarViagemPelaApi({ trajetoId, sentido, dataHoraLocal, participacoes })`, que chama `rpc('registrar_viagem', { ..., p_confirmar_duplicada: true })`

**Checkpoint**: `npm run test` passa; tabelas, view e função existem com RLS.

## Fase 5: História de Usuário 2 — Registrar uma viagem (P1)

**Objetivo**: formulário de nova viagem com total em tempo real, aviso de duplicidade e a
viagem aparecendo no topo da lista.

**Teste independente**: com dois passageiros e um trajeto, registrar uma ida, ajustar um valor e
conferir a lista (quickstart, cenários 6–11).

### Testes da História 2

- [X] T033 [P] [US2] Criar `tests/e2e/viagens.spec.ts` (bloco `US2 – registrar viagem`, pulado sem credenciais, `afterAll(limparDadosDeTeste)`, cenário com `prepararCenario` de 2 passageiros, R$ 12,00 e R$ 10,00, e 1 trajeto):
  - em `/inicio`, "Registrar viagem" leva a `/viagens/nova`;
  - o trajeto de teste é escolhido no `<select>` "Trajeto"; escolher "Ida" mostra "Percurso: <origem> → <destino>" e "Volta" mostra o inverso;
  - marcar os dois passageiros mostra os valores `12,00` e `10,00` e "Total: R$ 22,00 · 2 passageiros" (normalizar o espaço não separável); mudar um valor para `8,5` atualiza o total para R$ 18,50;
  - "Registrar viagem" leva a `/viagens` com o toast "Viagem registrada", e o primeiro item da lista mostra o percurso, "Ida", `2` e `R$ 18,50`;
  - ao reabrir `/viagens/nova`, o trajeto de teste vem selecionado;
  - registrar outra ida no mesmo trajeto e dia abre "Registrar mesmo assim?"; "Cancelar" mantém o formulário preenchido; "Registrar" salva;
  - salvar sem passageiros e sem sentido mostra "Marque ao menos um passageiro." e "Escolha Ida ou Volta."; valor `-1` mostra a mensagem de faixa no campo do passageiro;
  - não há rolagem horizontal em `/viagens` e `/viagens/nova`, e a barra do total não cobre o botão de envio (o botão está visível após rolar até o fim)

### Implementação da História 2

- [X] T034 [US2] Criar `lib/viagens/consultas.ts` (só servidor) com `obterDadosFormularioViagem()` (modo nova viagem):
  - trajetos ativos, ordenados como em `listarTrajetos`;
  - passageiros ativos (`id, nome, valor_padrao_centavos, arquivado_em`) em ordem alfabética pt-BR;
  - `trajetoSugeridoId`: o `trajeto_id` da viagem mais recente (`order('criado_em', { ascending: false }).limit(1)`), se estiver entre os ativos; senão, o único trajeto ativo, se houver só um; senão, `null`
- [X] T035 [US2] Criar `app/(app)/viagens/actions.ts` (`'use server'`) com `registrarViagem(estado, formData)` conforme [contracts/acoes.md](./contracts/acoes.md):
  - `agoraLocal = paraCampoDataHora(new Date())`; `validarViagem(formData, agoraLocal)`; se falhar → `{ errosCampo, errosValor, valores }`, com os `valores` de cada campo, a lista de passageiros marcados e `valoresPorPassageiro`;
  - `rpc('registrar_viagem', { p_trajeto_id, p_sentido, p_data_hora_local, p_participacoes, p_confirmar_duplicada: formData.get('confirmar_duplicada') === '1' })`;
  - traduzir `error.code` pela tabela de [contracts/acoes.md](./contracts/acoes.md): `CJ001` → `duplicada` "Já existe uma viagem de <ida|volta> neste trajeto em <error.details>."; `CJ002`–`CJ005` → campo e mensagem da tabela; outros → "Não foi possível salvar. Tente novamente."; sempre com `valores`;
  - sucesso: `revalidatePath('/viagens')` e `redirect('/viagens?aviso=registrada')` fora do `try/catch`
- [X] T036 [US2] Criar `app/(app)/viagens/formulario-viagem.tsx` (cliente) conforme [contracts/rotas.md](./contracts/rotas.md) e research §11:
  - **props**: `acao`, `trajetos: Trajeto[]`, `passageiros: PassageiroOpcao[]`, `inicial?: { trajeto?; sentido?; data_hora; participacoes?: Record<string, string> }`, `maxDataHora`, `textoEnviar`, `textoDuplicada` ("Registrar") e `hrefCancelar`;
  - **estado controlado** (`useState`), inicializado com `estado.valores ?? inicial`, e reinicializado quando a action devolve novos `valores`: trajeto, sentido, passageiros marcados e o texto do valor de cada um;
  - **Trajeto**: `<select name="trajeto">` com a opção vazia "Escolha o trajeto" e `rotuloTrajeto`, mais o sufixo " (arquivado)" quando `arquivado_em`;
  - **Sentido**: `fieldset` com `legend` "Sentido" e dois `input type="radio" name="sentido"` estilizados como botões grandes (≥ 44px) "Ida"/"Volta"; abaixo, "Percurso: …" com `percurso` quando trajeto e sentido estão escolhidos;
  - **Data e hora**: `input type="datetime-local" name="data_hora"` com `max={maxDataHora}` e `className="h-11"`;
  - **Passageiros**: `fieldset` "Passageiros"; para cada passageiro, `input type="checkbox" name="passageiros" value={id}` com o nome (e `Badge` "Arquivado" quando for o caso). Marcado, mostra o campo `name={\`valor_${id}\`}` (`inputMode="decimal"`, prefixo "R$"), preenchido na primeira marcação com `centavosParaCampo(valor_padrao_centavos)`. Erros de `errosValor[id]` ficam abaixo do campo;
  - **Total**: barra `sticky bottom-0` (no celular, acima da `BottomNav`, com fundo e borda) com "Total: <formatCurrency(somarCentavos(...))> · N passageiro(s)", usando `parseValorEmCentavos` e contando valor inválido como 0; botões "Cancelar" e enviar ("Salvando..." enquanto pendente) na mesma barra;
  - **Duplicidade**: quando `estado.duplicada` chega, abre `ConfirmDialog` ("Registrar mesmo assim?", descrição = `estado.duplicada`, botão `textoDuplicada`). Confirmar grava `1` em um `input type="hidden" name="confirmar_duplicada"` e chama `form.requestSubmit()`. Cancelar fecha o diálogo e mantém os dados;
  - **Erros**: por campo (`aria-invalid`/`aria-describedby`) e geral em `role="alert"`
- [X] T037 [US2] Criar `app/(app)/viagens/nova/page.tsx`:
  - `metadata.title = 'Nova viagem · Caronas Já'` e `h1` "Nova viagem"; `obterDadosFormularioViagem()`;
  - sem trajeto ativo: `EmptyState` "Cadastre um trajeto primeiro" com ação "Novo trajeto" (`/viagens/trajetos/novo`); sem passageiro ativo: `EmptyState` "Cadastre um passageiro primeiro" com ação "Novo passageiro" (FR-016);
  - senão, `FormularioViagem` com `acao={registrarViagem}`, `inicial={{ trajeto: trajetoSugeridoId ?? undefined, data_hora: paraCampoDataHora(new Date()) }}`, `maxDataHora` = agora + 1 dia em `paraCampoDataHora`, `textoEnviar="Registrar viagem"` e `hrefCancelar="/viagens"`
- [X] T038 [US2] Substituir a página provisória `app/(app)/viagens/page.tsx` (T015) pela lista real:
  - acrescentar `listarViagens(situacao, limite)` a `lib/viagens/consultas.ts`: `from('viagens_resumo')`, filtro por `arquivada_em`, `order('realizada_em', { ascending: false }).order('criado_em', { ascending: false })`, `limit(limite + 1)`; devolve `{ viagens, temMais }`;
  - a página chama `listarViagens('ativas', 20)`; o cabeçalho tem o `h1` "Viagens", "Nova viagem" (primário) e "Trajetos" (`outline`);
  - criar `app/(app)/viagens/lista-viagens.tsx` com `ResponsiveTable` e as colunas Data (`formatDateTime`), Percurso (`percurso`), Sentido (`Badge` "Ida"/"Volta"), Passageiros e Total (`formatCurrency`), todas `essencial`;
  - vazio: `EmptyState` ícone `Car`, "Nenhuma viagem registrada", a descrição de [contracts/rotas.md](./contracts/rotas.md) e as ações "Nova viagem" e "Trajetos";
  - `<AvisoUrl mensagens={{ registrada: 'Viagem registrada' }} />`
- [X] T039 [P] [US2] Atualizar `app/(app)/inicio/page.tsx`: ação primária "Registrar viagem" (`/viagens/nova`) e secundária "Passageiros"; a descrição cita registrar viagens (research §14). Ajustar `tests/e2e/layout.spec.ts` se necessário

**Checkpoint**: registrar uma viagem funciona de ponta a ponta, com o total correto.

## Fase 6: História de Usuário 3 — Listar e inspecionar viagens (P2)

**Objetivo**: detalhes da viagem, navegação a partir da lista, "Carregar mais" e a contagem de
viagens no trajeto.

**Teste independente**: registrar três viagens em datas diferentes, conferir a ordem e abrir uma
delas (quickstart, cenários 12, 13, 16, 19, 22 e 23).

### Testes da História 3

- [X] T040 [P] [US3] Acrescentar a `tests/e2e/viagens.spec.ts` o bloco `US3 – lista e detalhes` (viagens criadas com `registrarViagemPelaApi`):
  - três viagens em datas diferentes aparecem da mais recente para a mais antiga;
  - abrir uma leva a `/viagens/<uuid>` com o `h1` "Ida: <origem> → <destino>", a data `DD/MM/AAAA HH:mm`, cada passageiro com o seu valor e o total;
  - alterar o valor padrão de um passageiro (pela API) não muda o valor dele nos detalhes (SC-004);
  - excluir pela interface um passageiro com viagem mostra "Este passageiro tem viagens registradas e não pode ser excluído. Arquive-o." (FR-023), e excluir o trajeto mostra a mensagem equivalente;
  - com 21 viagens, a lista mostra 20 e "Carregar mais"; clicar mostra a 21ª;
  - arquivar um passageiro (pela API) mantém o nome dele nos detalhes, com "Arquivado";
  - `/viagens/abc` e `/viagens/00000000-0000-4000-8000-000000000000` mostram "Página não encontrada"

### Implementação da História 3

- [X] T041 [US3] Acrescentar `obterViagem(id)` a `lib/viagens/consultas.ts`, com `cache()`:
  - `!ehUuid` → `null`;
  - `viagens_resumo` `.eq('id', id).maybeSingle()`;
  - participações com `from('viagem_passageiros').select('id, passageiro_id, valor_centavos, passageiro:passageiros(nome, arquivado_em, valor_padrao_centavos)').eq('viagem_id', id)`, ordenadas por nome (pt-BR)
- [X] T042 [US3] Criar `app/(app)/viagens/[id]/page.tsx` conforme [contracts/rotas.md](./contracts/rotas.md):
  - `generateMetadata` "Viagem de DD/MM/AAAA · Caronas Já"; `null` → `notFound()`;
  - link "Viagens" (voltar) repassando só `situacao` e `pagina` de `?de=`;
  - `h1` "Ida: …" / "Volta: …" com `percurso`;
  - `Card` com Data e hora, Trajeto (`rotuloTrajeto` e "(arquivado)" quando for o caso) e Sentido;
  - lista de passageiros: nome, `Badge` "Arquivado" e valor à direita;
  - Total em destaque (`formatCurrency(total_centavos)`);
  - `<AvisoUrl mensagens={{ atualizada: 'Viagem atualizada', arquivada: 'Viagem arquivada', reativada: 'Viagem reativada' }} />`
- [X] T043 [US3] Em `app/(app)/viagens/page.tsx` e `lista-viagens.tsx`:
  - a coluna Data vira um `Link` para `/viagens/<id>?de=<querystring atual>`, com o cartão inteiro clicável no celular;
  - ler `?pagina` (inteiro de 1 a 50; inválido → 1) e usar `limite = pagina × 20`;
  - quando `temMais`, mostrar o link "Carregar mais" para a mesma URL com `pagina + 1` (`scroll={false}`, altura ≥ 44px)
- [X] T044 [US3] Em `lib/trajetos/consultas.ts`, `obterTrajeto` passa a devolver `quantidade_viagens` (viagens ativas do trajeto, via `select('id', { count: 'exact', head: true })` em `viagens` com `trajeto_id` e `arquivada_em is null`), e `app/(app)/viagens/trajetos/[id]/page.tsx` mostra "Viagens registradas: N"
- [X] T045 Rodar `npm run lint`, `npm run typecheck`, `npm run test` e `npm run test:e2e` e corrigir as falhas
- [X] T046 Fechar a Fatia B:
  - commit em pt-BR e push na `main`; aguardar o deploy;
  - **(manual)** confirmar a migração em produção (T027);
  - validar em produção os cenários 6–13, 16, 19, 22–24, 26 e 27 do [quickstart.md](./quickstart.md) e registrar o resultado nesta tarefa
  - **Resultado (2026-09-30)**: migração `20260930172802_viagens.sql` aplicada pelo usuário com
    `db push` (`--dry-run` confirma o banco em dia). Local (T045): lint, typecheck, 101/101
    unitários e 92/92 e2e (2 workers), sem falhas. Commit `ad0d12a` publicado em
    `https://carona-ja-theta.vercel.app`. `viagens`, `trajetos`, `layout` e `passageiros` com
    `E2E_BASE_URL` de produção: 68/82 em paralelo; as 14 falhas (tempo esgotado de 5 s, inclusive
    em telas de passageiros não alteradas) passaram 14/14 ao repetir em série. Cobre os cenários
    6–12 (registro, percurso, total ao vivo, sugestão de trajeto, duplicidade, validação, detalhes),
    13 (valor padrão alterado pela API não muda a viagem), 16 e 19 (exclusão bloqueada de passageiro
    e trajeto com viagens), 22 ("Carregar mais"), 23 (404) e 24 (sem rolagem horizontal; barra do
    total acima da navegação). Cenário 27 pela API com a chave anon: 0 linhas em `trajetos`,
    `viagens`, `viagem_passageiros` e `viagens_resumo`, e `registrar_viagem` negada (`42501`).
    Cenário 26 aproximado com a conta de teste e ids que não são dela: `CJ002` (trajeto), `CJ003`
    (passageiro) e `23503` no `insert` direto em `viagem_passageiros`. A verificação com a segunda
    conta real fica para a revisão de segurança (T065).

**Checkpoint da Fatia B**: registro e consulta de viagens publicados (o núcleo do sistema).

---

# Fatia C — Editar viagens (sessão 3)

**Resultado publicado**: o motorista corrige data, trajeto, sentido, passageiros e valores de uma
viagem.

## Fase 7: História de Usuário 4 — Editar uma viagem (P2)

**Objetivo**: edição atômica por diferença, preservando as participações e os valores já
registrados.

**Teste independente**: editar uma viagem trocando o sentido, removendo um passageiro e mudando
um valor (quickstart, cenários 14 e 15).

- [X] T047 Criar a migração com `npx supabase migration new editar_viagem` e escrever `supabase/migrations/<timestamp>_editar_viagem.sql` com `public.editar_viagem(p_viagem_id uuid, p_trajeto_id uuid, p_sentido text, p_data_hora_local timestamp, p_participacoes jsonb, p_confirmar_duplicada boolean default false) returns void`, `language plpgsql security invoker set search_path = ''`, conforme [data-model.md](./data-model.md) e research §3:
  - `select ... from public.viagens where id = p_viagem_id for update`; inexistente ou `arquivada_em is not null` → `CJ006`;
  - mesmas regras de `registrar_viagem`, com duas exceções:
    - o trajeto pode ser o `trajeto_id` atual mesmo arquivado; outro trajeto precisa estar ativo, senão `CJ002`;
    - os passageiros que já estão na viagem podem estar arquivados; os novos precisam estar ativos, senão `CJ003`;
  - a verificação de duplicidade (`CJ001`) exclui `p_viagem_id`;
  - `update` de `trajeto_id`, `sentido` e `realizada_em`;
  - participações por diferença: `delete` das que não estão em `p_participacoes`; `update` de `valor_centavos` das que continuam (só quando mudou); `insert` das novas;
  - `revoke ... from public, anon` e `grant execute ... to authenticated`
- [X] T048 **(manual)** Aplicar a migração com `npx supabase db push` e conferir a função no painel
  - **Resultado (2026-10-01)**: `20261001153855_editar_viagem.sql` aplicada pelo agente com
    `db push`, com autorização do usuário. Conferido pela API: `editar_viagem` negada a `anon`
    (`42501`) e devolvendo `CJ002`–`CJ006` para a conta de teste.
- [X] T049 [P] [US4] Acrescentar a `tests/e2e/viagens.spec.ts` o bloco `US4 – editar viagem`:
  - "Editar" nos detalhes abre `/viagens/<id>/editar` com o trajeto, o sentido, a data e os passageiros marcados com os **valores registrados** (não os padrões atuais);
  - trocar para "Volta", desmarcar um passageiro, marcar um terceiro (vem com o valor padrão dele) e salvar leva aos detalhes com o toast "Viagem atualizada", "Volta: …" e o total recalculado; o valor do passageiro mantido não mudou;
  - com um passageiro da viagem arquivado (pela API), ele aparece marcado com "Arquivado" no formulário e continua após salvar; passageiros arquivados que não estavam na viagem não aparecem;
  - "Cancelar" volta aos detalhes sem alterar nada;
  - `/viagens/<uuid-inexistente>/editar` mostra "Página não encontrada"
- [X] T050 [US4] Estender `obterDadosFormularioViagem(viagemId?)` em `lib/viagens/consultas.ts`: com `viagemId`, carrega `obterViagem(viagemId)` e inclui:
  - o trajeto atual, mesmo arquivado;
  - os passageiros já vinculados, mesmo arquivados (sem duplicar os ativos);
  - `viagem` com `sentido`, `data_hora = paraCampoDataHora(realizada_em)` e `participacoes` (`passageiro_id` → `centavosParaCampo(valor_centavos)`);
  - a viagem ausente devolve `null`
- [X] T051 [US4] Acrescentar `editarViagem(id, estado, formData)` a `app/(app)/viagens/actions.ts`:
  - `!ehUuid(id)` → "Viagem não encontrada.";
  - mesma validação e tradução de erros de `registrarViagem`, mais `CJ006` → `erro` "Viagem não encontrada.";
  - `rpc('editar_viagem', { p_viagem_id: id, ... })`;
  - sucesso: revalida `/viagens` e `/viagens/<id>`; `redirect('/viagens/<id>?aviso=atualizada')`
- [X] T052 [US4] Ajustar `app/(app)/viagens/formulario-viagem.tsx` para a edição: `inicial.participacoes` marca os passageiros e usa os valores registrados (o valor padrão só entra quando um passageiro é marcado pela primeira vez nesta tela); sentido e trajeto pré-selecionados. Não deve haver nenhuma mudança de comportamento na nova viagem
  - **Nota**: o formulário da Fatia B já tratava `inicial.participacoes` dessa forma; nenhuma
    alteração foi necessária.
- [X] T053 [US4] Criar `app/(app)/viagens/[id]/editar/page.tsx`:
  - `null` → `notFound()`; viagem arquivada → `redirect('/viagens/<id>')`;
  - título "Editar viagem · Caronas Já" e `h1` "Editar viagem";
  - `FormularioViagem` com `acao={editarViagem.bind(null, id)}`, `inicial` de T050, `textoEnviar="Salvar alterações"`, `textoDuplicada="Salvar"` e `hrefCancelar="/viagens/<id>"`
- [X] T054 [US4] Em `app/(app)/viagens/[id]/page.tsx`, adicionar o botão "Editar" (ícone `Pencil`, link para `/viagens/<id>/editar`), exibido somente para viagem ativa
- [X] T055 Rodar `npm run lint`, `npm run typecheck`, `npm run test` e `npm run test:e2e` e corrigir as falhas
- [X] T056 Fechar a Fatia C:
  - commit em pt-BR, push e deploy;
  - **(manual)** migração em produção (T048);
  - validar em produção os cenários 14 e 15 do [quickstart.md](./quickstart.md) e registrar o resultado
  - **Resultado (2026-10-01)**: Fatias C e D publicadas juntas (compartilham `actions.ts` e a tela
    de detalhes). Migração aplicada em T048. Local (T055/T062): lint, typecheck, Prettier, 101/101
    unitários e 104/104 e2e (20 falhas de `ConnectTimeoutError`/`fetch failed` com o Supabase na
    execução paralela, todas aprovadas ao repetir em série). Commit `11fec61` publicado em
    `https://carona-ja-theta.vercel.app`. Suíte e2e completa com `E2E_BASE_URL` de produção:
    104/104 na primeira execução (2 workers). Cobre os cenários 14 (editar: sentido, remover e
    acrescentar passageiro com valor padrão, valor registrado preservado, total recalculado) e 15
    (passageiro arquivado da viagem continua marcado com "Arquivado"; outros arquivados não aparecem).

**Checkpoint da Fatia C**: viagens podem ser corrigidas sem perder dados.

---

# Fatia D — Arquivar viagens e acabamento (sessão 4)

**Resultado publicado**: o motorista desconsidera viagens registradas por engano e as reativa se
necessário. O slice 003 é validado e encerrado.

## Fase 8: História de Usuário 5 — Arquivar e reativar viagens (P3)

**Objetivo**: ciclo ativa ⇄ arquivada, filtro de arquivadas e bloqueio da edição de viagens
arquivadas.

**Teste independente**: arquivar uma viagem, conferir que ela some da lista e aparece em
"Arquivadas", e reativá-la (quickstart, cenários 17 e 18).

- [X] T057 [P] [US5] Acrescentar a `tests/e2e/viagens.spec.ts` o bloco `US5 – arquivar e reativar viagem`:
  - "Arquivar" abre "Arquivar viagem?"; ao confirmar, os detalhes mostram o toast "Viagem arquivada", o aviso "Esta viagem está arquivada e não é considerada em totais e pendências." e apenas o botão "Reativar";
  - a viagem some da lista padrão e aparece em `?situacao=arquivadas`;
  - `/viagens/<id>/editar` de uma viagem arquivada redireciona para os detalhes;
  - "Reativar" mostra o toast "Viagem reativada" e a viagem volta à lista de ativas;
  - uma viagem arquivada não dispara o aviso de duplicidade ao registrar outra no mesmo trajeto, sentido e dia
- [X] T058 [US5] Acrescentar a `app/(app)/viagens/actions.ts` as actions `arquivarViagem(id, estado)` e `reativarViagem(id, estado)`:
  - arquivar: `update({ arquivada_em: new Date().toISOString() }).eq('id', id).is('arquivada_em', null)`;
  - reativar: `update({ arquivada_em: null }).eq('id', id)`;
  - nenhuma linha → "Viagem não encontrada."; outros erros → genérico;
  - revalidam `/viagens` e `/viagens/<id>`; `redirect('/viagens/<id>?aviso=arquivada|reativada')` fora do `try/catch`
- [X] T059 [US5] Criar `app/(app)/viagens/[id]/acoes-viagem.tsx` (cliente) com props `id`, `dataFormatada` e `arquivada`:
  - ativa: "Arquivar" (`secondary`, ícone `Archive`) com `ConfirmDialog` "Arquivar viagem?" e a descrição de [contracts/rotas.md](./contracts/rotas.md);
  - arquivada: "Reativar" (ícone `ArchiveRestore`), sem confirmação;
  - erro em `role="alert"`
- [X] T060 [US5] Em `app/(app)/viagens/[id]/page.tsx`: renderizar `AcoesViagem` e, quando arquivada, a faixa de aviso, escondendo "Editar" (T054)
- [X] T061 [US5] Adicionar o filtro por situação à lista:
  - `app/(app)/viagens/page.tsx` lê `?situacao` (`'arquivadas'`; qualquer outro valor = ativas) e passa para `listarViagens`;
  - `lista-viagens.tsx` mostra a alternância "Ativas" / "Arquivadas" (links com `aria-current`, alvos ≥ 44px, voltando `pagina` para 1) e o `EmptyState` "Nenhuma viagem arquivada";
  - o "Carregar mais" preserva `situacao`
- [X] T062 Rodar `npm run lint`, `npm run typecheck`, `npm run test` e `npm run test:e2e` e corrigir as falhas

**Checkpoint**: gestão completa de viagens funcionando.

## Fase 9: Acabamento e encerramento do slice

- [X] T063 [P] Atualizar o `README.md`:
  - citar o item de navegação "Viagens" e a rota `/viagens/trajetos`;
  - na seção de padrões para os próximos slices, documentar as funções SQL com `security invoker`, os SQLSTATE `CJ001`–`CJ006` e a regra de que totais, pendências e resumos MUST filtrar `viagens.arquivada_em is null` (plan, Constitution Check);
  - citar `supabase/migrations/<timestamp>_viagens.sql` como modelo de FK composta com `motorista_id`
- [X] T064 [P] Acrescentar em `specs/001-base-login-layout/data-model.md` (Parte 2, seções `viagens` e `viagem_passageiros`) uma nota apontando para `specs/003-registro-viagens/data-model.md`, que:
  - criou `trajetos`;
  - trocou `observacao` por `trajeto_id` e `sentido`;
  - acrescentou `arquivada_em`;
  - adiou `pago_em` para o slice de Pagamentos;
  - usa FKs compostas com `on delete no action`
- [ ] T065 Revisão de segurança (Princípio VI):
  - buscar `service_role` no repositório (nenhum resultado fora de comentários/`.env.example`);
  - confirmar que nenhuma action lê `motorista_id` do formulário;
  - confirmar no painel que `registrar_viagem` e `editar_viagem` não podem ser executadas por `anon`;
  - repetir os cenários 25–27 do [quickstart.md](./quickstart.md) (o 25 exige a segunda conta: **manual**)
  - **Resultado (2026-10-01)**: `service_role` só aparece em comentários, no README e na
    constituição; `motorista_id` não é lido de nenhum formulário (só comentários nas actions).
    Cenário 27 pela API com a chave anon: 0 linhas em `trajetos`, `viagens`,
    `viagem_passageiros`, `viagens_resumo` e `passageiros`; `registrar_viagem` e `editar_viagem`
    negadas (`42501`). Cenário 26 aproximado com a conta de teste e ids que não são dela:
    `editar_viagem` → `CJ006` (viagem), `CJ002` (trajeto), `CJ003` (passageiro), além de `CJ004`
    e `CJ005`; `insert` direto em `viagem_passageiros` → `23503`. **Pendente (manual)**: cenários
    25 e 26 com a segunda conta real.
- [X] T066 Commit em pt-BR, push na `main` e aguardar o deploy na Vercel
- [ ] T067 Executar a validação completa do [quickstart.md](./quickstart.md) em produção (cenários 1–28, no celular e no desktop, com os tempos de SC-001 e SC-002 cronometrados) e registrar o resultado nesta tarefa
  - **Parcial (2026-10-01)**: automatizados em produção, 104/104 e2e (mobile 360px e desktop
    1280px) cobrem os cenários 1–24, além de 27 e 26 (aproximado, ver T065). **Pendentes
    (manual)**: cronometrar SC-001 (registrar viagem < 30 s no celular) e SC-002 (trajeto < 30 s),
    cenário 25 com a segunda conta e cenário 28 (sem rede), além de conferir 768 e 1920px.
- [ ] T068 Marcar o slice como concluído: `**Status**: Concluído (<data>)` em `specs/003-registro-viagens/spec.md`; commit e push

**Checkpoint da Fatia D**: slice 003 concluído. O próximo passo é `/speckit-specify` do slice 004
(Histórico).

---

## Dependências e Ordem de Execução

### Entre fatias

- **Fatia A**: depende dos slices 001 e 002 concluídos. Bloqueia as demais.
- **Fatia B**: depende da Fatia A (trajetos, `lib/validacao.ts`, helpers de e2e e a página
  provisória de `/viagens`).
- **Fatia C**: depende da Fatia B (formulário, consultas, detalhes e a função de registro, cujas
  regras são repetidas).
- **Fatia D**: depende da Fatia C (a tela de detalhes esconde "Editar" nas arquivadas; a edição
  redireciona).

### Dentro das fatias

- **Fatia A**:
  - T001 → T002;
  - T003 → T006 (usa `colapsarEspacos`); T004 e T005 antes de T006; T007 é independente;
  - T006 + T009 → T010 → T011 → T012; T009 → T013 → T014; T015, T016 e T017 são independentes;
  - T008 pode ser escrito junto com T009–T017;
  - US6: T019 → T020, T021 → T022; T023 depende só de T013; T018 pode ser escrito junto;
  - T024 → T025.
- **Fatia B**:
  - T026 → T027;
  - T028 → T030; T029 antes de T030 e T031; T032 depende de T027;
  - T030 + T031 → T034 → T035 → T036 → T037; T038 depende de T028 e T027; T039 é independente;
  - US3: T041 → T042 → T043; T044 é independente;
  - T045 → T046.
- **Fatia C**: T047 → T048 → T050 → T051 → T052 → T053 → T054; T049 pode ser escrito junto;
  T055 → T056.
- **Fatia D**: T058 → T059 → T060; T061 é independente de T059/T060; T057 pode ser escrito
  junto; T063–T065 em paralelo; T066 → T067 → T068.

### Oportunidades de paralelismo

- **Fatia A**: T003, T004, T005 e T007 juntos; T016 e T017 em paralelo com T009–T015; T018
  junto com T019.
- **Fatia B**: T028, T029 e T032 juntos; T033 e T039 em paralelo com T034–T038; T040 e T044 em
  paralelo com T041–T043.
- **Fatia C**: T049 junto com T047–T050.
- **Fatia D**: T057 junto com T058; T063, T064 e T065 juntos.

## Exemplo de Paralelismo: Fatia A (US1)

```text
# Fundação, juntas:
Tarefa: "T003 lib/validacao.ts (extração)"
Tarefa: "T004 lib/trajetos/tipos.ts"
Tarefa: "T005 tests/unit/trajetos-validacao.test.ts"
Tarefa: "T007 tests/e2e/helpers/passageiros.ts"

# Enquanto as telas de trajetos são feitas:
Tarefa: "T016 components/layout/nav-items.ts"
Tarefa: "T017 app/(app)/inicio/page.tsx"
```

## Exemplo de Paralelismo: Fatia B (US2 + US3)

```text
# Fundação, juntas (após T027):
Tarefa: "T028 lib/viagens/tipos.ts"
Tarefa: "T029 tests/unit/viagens-validacao.test.ts + format.test.ts"
Tarefa: "T032 tests/e2e/helpers/passageiros.ts (viagens, prepararCenario)"

# Enquanto o formulário é feito:
Tarefa: "T033 tests/e2e/viagens.spec.ts (US2)"
Tarefa: "T039 app/(app)/inicio/page.tsx"
```

---

## Estratégia de Implementação

### Uma fatia por sessão

| Sessão | Comando sugerido | Resultado publicado |
|--------|------------------|---------------------|
| 1 | `/speckit-implement Fatia A (T001–T025)` | Gestão de trajetos |
| 2 | `/speckit-implement Fatia B (T026–T046)` | Registro, lista e detalhes de viagens (**MVP do slice**) |
| 3 | `/speckit-implement Fatia C (T047–T056)` | Edição de viagens |
| 4 | `/speckit-implement Fatia D (T057–T068)` | Arquivar e reativar viagens; slice 003 validado e concluído |

Ao final de cada sessão: **PARAR e VALIDAR** pelo checkpoint da fatia antes de seguir.

### MVP

- A Fatia A já entrega valor sozinha (a lista de trajetos), mas o valor central do slice chega
  na Fatia B: registrar as viagens com os passageiros e o total.
- As Fatias C e D completam a correção de erros (editar e desconsiderar viagens) e são
  necessárias antes do slice de Pagamentos, que depende de viagens confiáveis.

---

## Notas

- [P] = arquivos diferentes, sem dependências pendentes.
- O rótulo [US#] liga a tarefa à história da spec, para rastreabilidade.
- Nunca colocar senhas reais no código ou nos testes. O e2e usa apenas a conta de **teste** e
  limpa as viagens, trajetos e passageiros `E2E …` que criou.
- Fazer commit ao final de cada tarefa ou grupo lógico, com mensagens em pt-BR.
