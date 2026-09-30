---

description: "Lista de tarefas do slice 002: Registro e Gestão de Passageiros"
---

# Tarefas: Registro e Gestão de Passageiros

**Entrada**: Documentos de design em `specs/002-registro-passageiros/`

**Pré-requisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/rotas.md](./contracts/rotas.md),
[contracts/acoes.md](./contracts/acoes.md), [quickstart.md](./quickstart.md)

**Testes**: incluídos. A constituição exige testes automatizados para regras de valores e
verificação em larguras de celular e desktop (research §10): Vitest para validação e formatação,
Playwright (`mobile` 360px e `desktop` 1280px) para as telas.

**Organização**: três **fatias verticais**, uma por sessão de trabalho. Cada fatia termina
**publicada em produção** e utilizável, mesmo que as seguintes nunca sejam feitas. Para referenciar
uma fatia na implementação, use o nome dela, por exemplo: `/speckit-implement Fatia A`.

| Fatia | Histórias | Fases | Tarefas | Depende de |
|-------|-----------|-------|---------|------------|
| **A. Cadastro e lista** | US1 (P1) | 1–2 | T001–T021 | slice 001 concluído |
| **B. Detalhes e edição** | US2 (P2), US3 (P2) | 3–4 | T022–T033 | Fatia A |
| **C. Arquivar, reativar, excluir e acabamento** | US4 (P3) | 5–6 | T034–T045 | Fatia B |

## Formato: `[ID] [P?] [História] Descrição`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[História]**: US1, US2, US3 ou US4 (ver spec.md)
- Tarefas marcadas **(manual)** exigem ação do usuário em um painel externo (Supabase, Vercel).
  O agente deve parar, explicar o passo e aguardar confirmação.

## Convenções

- Projeto único Next.js na raiz (`app/`, `components/`, `lib/`, `supabase/`, `tests/`).
- Domínio, tabelas, colunas e rotas em pt-BR; componentes e utilitários técnicos em inglês
  (research 001 §6). Textos da interface em pt-BR.
- **Next.js 16**: `params` e `searchParams` são `Promise` e devem ser aguardados; o antigo
  `middleware.ts` é o `proxy.ts`. Antes de escrever código de rota ou action, consultar
  `node_modules/next/dist/docs/01-app/01-getting-started/` (em especial `07-mutating-data.md`).
- Modelos de código já existentes: actions em `app/(publico)/entrar/actions.ts`, formulário em
  `app/(publico)/entrar/formulario-entrar.tsx`, página em `app/(app)/inicio/page.tsx`, migração
  em `supabase/migrations/20260930033131_perfis.sql`, e2e com login em `tests/e2e/auth.spec.ts`.
- Nunca usar a chave `service_role`; o e2e usa apenas a conta de **teste** (`E2E_EMAIL`/`E2E_SENHA`).

---

# Fatia A — Cadastro e lista (sessão 1)

**Resultado publicado**: o motorista acessa "Passageiros" pela navegação, cadastra passageiros,
vê a lista ordenada com busca e liga para eles com um toque.

## Fase 1: Fundação da Fatia A

**Objetivo**: criar a tabela, as regras de validação e os utilitários usados por todas as
histórias.

- [X] T001 Criar a migração com `npx supabase migration new passageiros` e escrever `supabase/migrations/<timestamp>_passageiros.sql` seguindo o [data-model.md](./data-model.md) e o modelo de `perfis`:
  - tabela `public.passageiros` com as colunas, exatamente:
    - `id uuid primary key default gen_random_uuid()`;
    - `motorista_id uuid not null default auth.uid() references auth.users (id) on delete cascade`;
    - `nome text not null check (nome = btrim(nome) and char_length(nome) between 1 and 80)`;
    - `telefone text not null check (telefone ~ '^[1-9]{2}(9[0-9]{8}|[0-9]{8})$')`;
    - `valor_padrao_centavos integer not null check (valor_padrao_centavos between 0 and 999999)`;
    - `observacao text check (observacao is null or (observacao = btrim(observacao) and char_length(observacao) between 1 and 200))`;
    - `arquivado_em timestamptz` (nulo = ativo);
    - `criado_em timestamptz not null default now()` e `atualizado_em timestamptz not null default now()`;
  - `comment on table` em pt-BR;
  - trigger `passageiros_definir_atualizado_em` `before update` usando `public.definir_atualizado_em()`;
  - índice único parcial `passageiros_nome_ativo_unico on public.passageiros (motorista_id, lower(nome)) where arquivado_em is null`;
  - índice `passageiros_motorista_nome on public.passageiros (motorista_id, nome)`;
  - `alter table public.passageiros enable row level security`;
  - quatro políticas `to authenticated` ("passageiros: dono lê/insere/atualiza/exclui os próprios registros") comparando `motorista_id = (select auth.uid())` em `using` e, em `insert`/`update`, em `with check`
- [X] T002 **(manual)** Aplicar a migração com `npx supabase db push` no projeto Supabase vinculado e confirmar no painel (Table Editor → `passageiros`) que a RLS está habilitada com 4 políticas; se o projeto de produção for outro, aplicar também nele antes do deploy da fatia
- [X] T003 [P] Criar `lib/passageiros/tipos.ts` com os tipos de [data-model.md](./data-model.md) ("Tipo na aplicação") e de [contracts/acoes.md](./contracts/acoes.md): `Passageiro`, `SituacaoPassageiro = 'ativos' | 'arquivados'`, `CamposPassageiro`, `EstadoFormularioPassageiro` e `EstadoAcaoPassageiro`
- [X] T004 [P] Escrever `tests/unit/passageiros-validacao.test.ts` (devem falhar antes de T006) cobrindo **todos** os exemplos obrigatórios da tabela de [contracts/acoes.md](./contracts/acoes.md) e também:
  - limites: nome com 80 caracteres aceito e com 81 rejeitado; observação com 200 aceita e com 201 rejeitada; `"9.999,99"` → `999999`; `"10.000"` e `"10000"` rejeitados;
  - `validarPassageiro` com `FormData` vazio devolve `errosCampo` com as mensagens exatas da tabela "Regras de normalização" do data-model ("Informe o nome.", "Informe o telefone.", "Informe o valor padrão.");
  - `centavosParaCampo(1250)` → `"12,50"`, `centavosParaCampo(0)` → `"0,00"`, `centavosParaCampo(123456)` → `"1234,56"`;
  - `ehUuid` aceita um UUID v4 válido e rejeita `"abc"` e `""`
- [X] T005 [P] Acrescentar a `tests/unit/format.test.ts` os casos de `formatPhone`: `"11912345678"` → `"(11) 91234-5678"`; `"1131234567"` → `"(11) 3123-4567"`; `"123"` → `"123"` (entrada fora do formato volta sem alteração)
- [X] T006 Implementar `lib/passageiros/validacao.ts` (funções puras, sem acesso ao banco) até T004 passar:
  - `normalizarNome`: remove espaços das pontas e colapsa espaços internos; vazio → "Informe o nome."; mais de 80 → "O nome deve ter até 80 caracteres.";
  - `normalizarTelefone`: mantém só os dígitos; com 12–13 dígitos, remove um `55` ou `0` inicial; aceita apenas `^[1-9]{2}(9[0-9]{8}|[0-9]{8})$`; vazio → "Informe o telefone."; inválido → "Informe um telefone com DDD, ex.: (11) 91234-5678.";
  - `parseValorEmCentavos`: aceita `12`, `12,5`, `12,50`, `12.50` e `1.234,56` (ponto como milhar só com grupos de 3 dígitos seguidos de vírgula; um único ponto seguido de 1–2 dígitos é decimal); converte separando parte inteira e decimal, **sem ponto flutuante**; vazio → "Informe o valor padrão."; negativo, mais de 2 casas, não numérico ou acima de `999999` → "Informe um valor entre R$ 0,00 e R$ 9.999,99, com até 2 casas decimais.";
  - `normalizarObservacao`: remove espaços das pontas; vazio → `null`; mais de 200 → "A observação deve ter até 200 caracteres.";
  - `validarPassageiro(formData)`: lê os campos `nome`, `telefone`, `valor` e `observacao` e devolve `{ ok: true, dados }` (com `valor_padrao_centavos`) ou `{ ok: false, errosCampo }`;
  - `normalizarParaBusca`: minúsculas, remove acentos (`normalize('NFD')` + remoção de diacríticos) e colapsa espaços;
  - `centavosParaCampo(centavos)`: texto para o campo de edição, com vírgula e 2 casas, sem "R$" e sem separador de milhar;
  - `ehUuid(texto)`: regex de UUID (8-4-4-4-12 hexadecimais)
- [X] T007 Implementar `formatPhone(digitos: string)` em `lib/format.ts` até T005 passar: 11 dígitos → `(DD) 9XXXX-XXXX`; 10 dígitos → `(DD) XXXX-XXXX`; qualquer outra entrada volta sem alteração
- [X] T008 [P] Criar `components/aviso-url.tsx` (cliente), generalizando `app/(app)/inicio/aviso-senha-atualizada.tsx`:
  - props `parametro` (padrão `'aviso'`) e `mensagens: Record<string, string>`;
  - quando o valor do parâmetro existe em `mensagens`, mostra `toast.success(mensagem, { id: \`${parametro}-${valor}\` })` (o id evita toast duplicado no Strict Mode);
  - remove **apenas** esse parâmetro da URL com `router.replace` (mantendo `busca`, `situacao` etc.) e `{ scroll: false }`;
  - deve ser renderizado dentro de `<Suspense>` por usar `useSearchParams`
- [X] T009 [P] Gerar o componente `textarea` com `npx shadcn@latest add textarea` (se `components/ui/textarea.tsx` ainda não existir)
- [X] T010 [P] Criar `tests/e2e/helpers/passageiros.ts` com:
  - `nomeDeTeste(base)` → `` `E2E ${base} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` `` (nomes únicos por execução e por projeto);
  - `entrarComContaDeTeste(page, destino)`: abre `destino`, preenche E-mail/Senha com `E2E_EMAIL`/`E2E_SENHA`, clica em "Entrar" e espera a URL de destino;
  - `limparPassageirosDeTeste()`: cria um cliente `@supabase/supabase-js` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, faz `signInWithPassword` com a conta de teste e exclui os passageiros com `nome` `ilike 'E2E %'` (a RLS limita à conta de teste)

**Checkpoint**: `npm run test` passa; a tabela existe com RLS.

## Fase 2: História de Usuário 1 — Cadastrar e listar passageiros (P1) 🎯 MVP

**Objetivo**: cadastro com validação, lista em ordem alfabética com busca, telefone clicável e
item "Passageiros" na navegação.

**Teste independente**: entrar, abrir "Passageiros", cadastrar dois passageiros e conferir a
lista formatada no celular e no desktop (quickstart, cenários 1–7 e 16).

### Testes da História 1

- [X] T011 [P] [US1] Escrever `tests/e2e/passageiros.spec.ts` (bloco `test.describe('US1 – cadastro e lista')`, pulado sem `E2E_EMAIL`/`E2E_SENHA`, com `test.afterAll(limparPassageirosDeTeste)`), usando os helpers de T010:
  - sem sessão, `/passageiros` leva a `/entrar?proximo=%2Fpassageiros`;
  - o link "Passageiros" existe na navegação e leva a `/passageiros`;
  - cadastro válido (nome de teste, `(11) 91234-5678`, `12,5`) mostra o toast "Passageiro cadastrado" e o passageiro aparece na lista com `(11) 91234-5678` e `R$ 12,50` (normalizar espaço não separável ao comparar moeda);
  - salvar com nome e telefone vazios e valor `-1` mostra as mensagens de cada campo, não navega e mantém o valor digitado no campo;
  - cadastrar o mesmo nome com letras trocadas e espaços nas pontas mostra "Já existe um passageiro ativo com esse nome.";
  - a busca filtra ignorando maiúsculas e acentos (cadastrar `E2E José…` e buscar por `jose`) e mostra "Nenhum passageiro encontrado" com "Limpar busca" quando não há resultado;
  - o telefone da lista tem `href` `tel:+5511912345678`;
  - não há rolagem horizontal em `/passageiros` e `/passageiros/novo` (`scrollWidth <= clientWidth` do documento)

### Implementação da História 1

- [X] T012 [US1] Criar `lib/passageiros/consultas.ts` (uso só no servidor, com `createClient` de `lib/supabase/server.ts`) com `listarPassageiros(situacao: SituacaoPassageiro)`: seleciona as colunas do tipo `Passageiro`; filtra `arquivado_em` nulo (ativos) ou não nulo (arquivados); ordena no código com `localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })`; lança erro se a consulta falhar (tratado por `app/(app)/error.tsx`)
- [X] T013 [US1] Criar `app/(app)/passageiros/actions.ts` (`'use server'`) com `cadastrarPassageiro(estado: EstadoFormularioPassageiro, formData)` conforme [contracts/acoes.md](./contracts/acoes.md):
  - `validarPassageiro`; se falhar → `{ errosCampo, valores }` (valores = texto digitado de cada campo);
  - `insert` de `nome`, `telefone`, `valor_padrao_centavos` e `observacao` (nunca `motorista_id`) com `.select('id').single()`;
  - erro `23505` → `errosCampo.nome` "Já existe um passageiro ativo com esse nome."; outro erro ou exceção → `erro` "Não foi possível salvar. Tente novamente.", sempre com `valores`;
  - sucesso: `revalidatePath('/passageiros')` e, **fora do try/catch**, `redirect('/passageiros?aviso=cadastrado')` (a Fatia B muda o destino para os detalhes em T027)
- [X] T014 [US1] Criar `app/(app)/passageiros/formulario-passageiro.tsx` (cliente) usado no cadastro e na edição:
  - props `acao` (server action compatível com `useActionState`), `inicial?: Partial<Record<CamposPassageiro, string>>`, `textoEnviar` e `hrefCancelar`;
  - campos com `Label` visível, conforme [contracts/rotas.md](./contracts/rotas.md): Nome (`maxLength={80}`, `autoComplete="off"`); Telefone (`type="tel"`, `inputMode="tel"`, placeholder `(11) 91234-5678`); "Valor padrão por trajeto" (texto, `inputMode="decimal"`, prefixo visual "R$", placeholder `0,00`); Observação (`Textarea`, opcional, `maxLength={200}`, contador "N/200");
  - `defaultValue={estado.valores?.campo ?? inicial?.campo}` para não perder o que foi digitado (o React 19 reseta o formulário após a action);
  - erro de campo abaixo do campo, com `aria-invalid` e `aria-describedby`; erro geral em `<p role="alert">`;
  - botões "Salvar" (desabilitado e com o texto "Salvando..." enquanto `pending`) e "Cancelar" (link para `hrefCancelar`), com altura ≥ 44px
- [X] T015 [US1] Criar `app/(app)/passageiros/novo/page.tsx`: `metadata.title = 'Novo passageiro · Caronas Já'`, `h1` "Novo passageiro" e `FormularioPassageiro` com `acao={cadastrarPassageiro}`, `textoEnviar="Salvar"` e `hrefCancelar="/passageiros"`, em coluna única e largura máxima confortável no desktop
- [X] T016 [US1] Criar `app/(app)/passageiros/lista-passageiros.tsx` (cliente) com props `passageiros: Passageiro[]`:
  - campo `type="search"` com rótulo "Buscar por nome", valor inicial de `?busca=`, que filtra enquanto se digita com `normalizarParaBusca(nome).includes(normalizarParaBusca(busca))` e espelha o texto em `?busca=` com `router.replace(..., { scroll: false })` (remove o parâmetro quando vazio);
  - `ResponsiveTable` com as colunas Nome, Telefone (link `tel:+55<dígitos>` com `formatPhone`) e "Valor padrão" (`formatCurrency`), todas `essencial: true`;
  - sem passageiros: `EmptyState` ícone `Users`, título "Nenhum passageiro cadastrado", descrição "Cadastre as pessoas que pegam carona com você para registrar viagens e cobranças." e ação "Novo passageiro";
  - busca sem resultado: texto "Nenhum passageiro encontrado" e botão "Limpar busca"
- [X] T017 [US1] Criar `app/(app)/passageiros/page.tsx` (Server Component):
  - `metadata.title = 'Passageiros · Caronas Já'`; chama `obterUsuarioLogado()` (defesa em profundidade);
  - carrega `listarPassageiros('ativos')`;
  - cabeçalho com `h1` "Passageiros" e botão primário "Novo passageiro" (link para `/passageiros/novo`);
  - renderiza `ListaPassageiros` e `<AvisoUrl mensagens={{ cadastrado: 'Passageiro cadastrado' }} />`, ambos dentro de `<Suspense>` (usam `useSearchParams`)
- [X] T018 [P] [US1] Adicionar `{ rotulo: 'Passageiros', href: '/passageiros', icone: Users }` depois de "Início" em `components/layout/nav-items.ts`
- [X] T019 [P] [US1] Atualizar `app/(app)/inicio/page.tsx`:
  - trocar a descrição do `EmptyState` para convidar a cadastrar passageiros e adicionar a ação "Cadastrar passageiros" (link para `/passageiros`); viagens e pagamentos continuam como "em breve";
  - substituir `AvisoSenhaAtualizada` por `<AvisoUrl parametro="senha" mensagens={{ atualizada: 'Senha atualizada' }} />` e apagar `app/(app)/inicio/aviso-senha-atualizada.tsx`;
  - ajustar `tests/e2e/layout.spec.ts` e `tests/e2e/auth.spec.ts` se verificarem o texto antigo da tela inicial
- [X] T020 [US1] Rodar `npm run lint`, `npm run typecheck`, `npm run test` e `npm run test:e2e` e corrigir as falhas
- [ ] T021 [US1] Fechar a Fatia A:
  - commit em pt-BR e push na `main`; aguardar o deploy na Vercel;
  - **(manual)** confirmar que a migração está aplicada no Supabase de produção (T002);
  - validar em produção os cenários 1–7, 9 (telefone na lista), 16 (lista e formulário), 17 e 18 do [quickstart.md](./quickstart.md) (a segunda conta vê a lista vazia; a API anon não retorna linhas)
  - **Resultado (2026-09-30)**: commit `4e68030` publicado. Migração aplicada com `db push` no
    projeto vinculado (`kvsnosinltdcqwogfmpk`). `passageiros.spec.ts` + `layout.spec.ts` com
    `E2E_BASE_URL` de produção: 22/22 (mobile e desktop), cobrindo os cenários 1–7, 9 (`href`
    `tel:`) e 16 (360/1280px). Cenário 18: sem sessão, a API anon retorna `[]` na leitura e `42501`
    no insert. **Pendente**: cenário 17 (segunda conta de teste), manual.

**Checkpoint da Fatia A**: agenda de passageiros publicada e utilizável sozinha (MVP).

---

# Fatia B — Detalhes e edição (sessão 2)

**Resultado publicado**: tocar em um passageiro abre seus detalhes, de onde é possível ligar,
voltar à lista com a mesma busca e editar os dados.

## Fase 3: História de Usuário 2 — Inspecionar um passageiro (P2)

**Objetivo**: tela de detalhes com todos os dados e navegação de ida e volta a partir da lista.

**Teste independente**: tocar em um passageiro da lista e conferir nome, telefone, valor,
observação, situação e datas (quickstart, cenários 8, 9 e 15).

### Testes da História 2

- [X] T022 [P] [US2] Acrescentar a `tests/e2e/passageiros.spec.ts` o bloco `US2 – detalhes`:
  - após o cadastro, a URL é `/passageiros/<uuid>` com o toast "Passageiro cadastrado" (atualizar a expectativa do bloco US1, que antes esperava a lista);
  - clicar no nome na lista (desktop) ou no cartão (celular) abre os detalhes com telefone formatado, `R$ 12,50`, "Sem observação", situação "Ativo", "Cadastrado em" e "Última alteração" no formato `DD/MM/AAAA`;
  - o telefone dos detalhes tem `href` `tel:+5511912345678`;
  - com `?busca=` ativa, abrir um passageiro e clicar em "Passageiros" (voltar) retorna à lista com a mesma busca no campo;
  - `/passageiros/abc` e `/passageiros/00000000-0000-4000-8000-000000000000` mostram "Página não encontrada"

### Implementação da História 2

- [X] T023 [P] [US2] Gerar o componente `badge` com `npx shadcn@latest add badge` (se `components/ui/badge.tsx` ainda não existir)
- [X] T024 [US2] Acrescentar `obterPassageiro(id: string)` a `lib/passageiros/consultas.ts`, envolvido em `cache()` do React (a página e o `generateMetadata` compartilham a consulta): se `!ehUuid(id)` retorna `null` sem consultar o banco; senão `select` das colunas do tipo com `.eq('id', id).maybeSingle()` (outra conta → `null` pela RLS); lança erro se a consulta falhar
- [X] T025 [US2] Criar `app/(app)/passageiros/[id]/page.tsx`:
  - `params: Promise<{ id: string }>` e `searchParams: Promise<...>` aguardados; `generateMetadata` com título `'<nome> · Caronas Já'`; passageiro `null` → `notFound()`;
  - link "Passageiros" (voltar) para `/passageiros`, repassando **apenas** `situacao` e `busca` lidos de `?de=` (fazer o parse com `URLSearchParams` e descartar o resto, para evitar redirecionamento aberto);
  - `h1` com o nome e um `Card` com `<dl>`: Telefone (`formatPhone`, link `tel:+55…`), "Valor padrão por trajeto" (`formatCurrency`), Observação (ou "Sem observação"), Situação (`Badge` "Ativo" ou "Arquivado em DD/MM/AAAA"), "Cadastrado em" e "Última alteração" (`formatDate`);
  - `<AvisoUrl mensagens={{ cadastrado: 'Passageiro cadastrado', atualizado: 'Passageiro atualizado', arquivado: 'Passageiro arquivado', reativado: 'Passageiro reativado' }} />` dentro de `<Suspense>`
- [X] T026 [US2] Tornar os passageiros da lista navegáveis:
  - em `app/(app)/passageiros/lista-passageiros.tsx`, a coluna Nome vira um `Link` para `/passageiros/<id>?de=<querystring atual codificada>`, com `max-md:after:absolute max-md:after:inset-0` (o cartão inteiro vira clicável no celular) e o link do telefone recebe `relative z-10` (continua ligando);
  - em `components/responsive-table.tsx`, o `Card` do celular recebe a classe `relative`, sem mudar a API do componente
- [X] T027 [US2] Em `app/(app)/passageiros/actions.ts`, mudar o destino do sucesso de `cadastrarPassageiro` para `redirect('/passageiros/<id>?aviso=cadastrado')` e remover `cadastrado` das mensagens do `AvisoUrl` em `app/(app)/passageiros/page.tsx`

**Checkpoint**: os detalhes funcionam sozinhos, a partir da lista e depois do cadastro.

## Fase 4: História de Usuário 3 — Editar os dados de um passageiro (P2)

**Objetivo**: editar nome, telefone, valor e observação com as mesmas validações do cadastro.

**Teste independente**: editar telefone e valor de um passageiro e conferir os novos dados nos
detalhes e na lista (quickstart, cenários 10 e 11).

### Testes da História 3

- [X] T028 [P] [US3] Acrescentar a `tests/e2e/passageiros.spec.ts` o bloco `US3 – edição`:
  - "Editar" nos detalhes abre `/passageiros/<id>/editar` com os campos preenchidos (valor como `12,50`);
  - mudar o valor para `12` e a observação para "Paga por Pix" e salvar volta aos detalhes com o toast "Passageiro atualizado", `R$ 12,00` e a observação;
  - "Cancelar" volta aos detalhes sem alterar nada;
  - renomear para o nome de outro passageiro ativo mostra "Já existe um passageiro ativo com esse nome."

### Implementação da História 3

- [X] T029 [US3] Acrescentar `editarPassageiro(id: string, estado: EstadoFormularioPassageiro, formData)` a `app/(app)/passageiros/actions.ts` (usado com `.bind(null, id)`), conforme [contracts/acoes.md](./contracts/acoes.md):
  - `!ehUuid(id)` → `erro` "Passageiro não encontrado.";
  - mesmas validações e mensagens de `cadastrarPassageiro`, incluindo `23505` e `valores`;
  - `update(...).eq('id', id).select('id')`; nenhuma linha → `erro` "Passageiro não encontrado.";
  - sucesso: `revalidatePath('/passageiros')`, `revalidatePath('/passageiros/<id>')` e `redirect('/passageiros/<id>?aviso=atualizado')` fora do try/catch
- [X] T030 [US3] Criar `app/(app)/passageiros/[id]/editar/page.tsx`: `params` aguardado; `obterPassageiro`, e `null` → `notFound()`; `metadata`/`generateMetadata` "Editar passageiro · Caronas Já"; `h1` "Editar passageiro"; `FormularioPassageiro` com `acao={editarPassageiro.bind(null, id)}`, `inicial` = `{ nome, telefone: formatPhone(telefone), valor: centavosParaCampo(valor_padrao_centavos), observacao: observacao ?? '' }`, `textoEnviar="Salvar"` e `hrefCancelar="/passageiros/<id>"`
- [X] T031 [US3] Adicionar o botão "Editar" (link para `/passageiros/<id>/editar`, ícone `Pencil`) na área de ações de `app/(app)/passageiros/[id]/page.tsx`
- [X] T032 [US3] Rodar `npm run lint`, `npm run typecheck`, `npm run test` e `npm run test:e2e` e corrigir as falhas
- [X] T033 [US3] Fechar a Fatia B: commit em pt-BR, push na `main`, aguardar o deploy e validar em produção os cenários 8–11, 15 e 16 (detalhes e edição) do [quickstart.md](./quickstart.md)
  - **Resultado (2026-09-30)**: commit `c934fb3` publicado em `https://carona-ja-theta.vercel.app`.
    `passageiros.spec.ts` + `layout.spec.ts` com `E2E_BASE_URL` de produção: 34/34 (mobile e desktop),
    cobrindo os cenários 8–11, 15 e 16 (detalhes, voltar com a busca, edição, 360/1280px).

**Checkpoint da Fatia B**: cadastro completo de ponta a ponta (listar, inspecionar e editar).

---

# Fatia C — Arquivar, reativar, excluir e acabamento (sessão 3)

**Resultado publicado**: o motorista mantém a lista enxuta, arquivando e reativando passageiros e
excluindo cadastros feitos por engano. O slice 002 é validado e encerrado.

## Fase 5: História de Usuário 4 — Arquivar, reativar e excluir (P3)

**Objetivo**: ciclo ativo ⇄ arquivado, exclusão com confirmação e filtro de arquivados.

**Teste independente**: arquivar, conferir em "Arquivados", reativar, e excluir um passageiro
após confirmação (quickstart, cenários 12–14).

### Testes da História 4

- [X] T034 [P] [US4] Acrescentar a `tests/e2e/passageiros.spec.ts` o bloco `US4 – arquivar, reativar e excluir`:
  - "Arquivar" abre o diálogo "Arquivar passageiro?"; ao confirmar, os detalhes mostram o toast "Passageiro arquivado", "Arquivado em DD/MM/AAAA" e o aviso de arquivado;
  - o passageiro some da lista de ativos e aparece com o filtro "Arquivados" (`?situacao=arquivados`);
  - com outro passageiro ativo de mesmo nome, "Reativar" mostra "Já existe um passageiro ativo com esse nome. Renomeie um deles antes de reativar.";
  - "Excluir" abre "Excluir passageiro?"; ao confirmar, a lista mostra o toast "Passageiro excluído" e o passageiro não aparece em nenhum filtro;
  - "Cancelar" nos diálogos não altera nada

### Implementação da História 4

- [X] T035 [US4] Acrescentar a `app/(app)/passageiros/actions.ts`, conforme [contracts/acoes.md](./contracts/acoes.md), as actions `arquivarPassageiro`, `reativarPassageiro` e `excluirPassageiro`, todas com a assinatura `(id: string, estado: EstadoAcaoPassageiro): Promise<EstadoAcaoPassageiro>` para uso com `.bind(null, id)` e `useActionState`:
  - `!ehUuid(id)` → `erro` "Passageiro não encontrado.";
  - arquivar: `update({ arquivado_em: new Date().toISOString() }).eq('id', id).is('arquivado_em', null)` → `redirect('/passageiros/<id>?aviso=arquivado')`;
  - reativar: `update({ arquivado_em: null }).eq('id', id)`; `23505` → "Já existe um passageiro ativo com esse nome. Renomeie um deles antes de reativar." → sucesso `redirect('/passageiros/<id>?aviso=reativado')`;
  - excluir: `delete().eq('id', id)`; `23503` → "Este passageiro tem viagens registradas e não pode ser excluído. Arquive-o." → sucesso `redirect('/passageiros?aviso=excluido')`;
  - outros erros → "Não foi possível salvar. Tente novamente."; sempre `revalidatePath('/passageiros')` e `revalidatePath('/passageiros/<id>')` antes do `redirect`, que fica fora do try/catch
- [X] T036 [US4] Criar `app/(app)/passageiros/[id]/acoes-passageiro.tsx` (cliente) com props `id`, `nome` e `arquivado: boolean`:
  - ativo: "Arquivar" (`secondary`, ícone `Archive`) com `ConfirmDialog` (título "Arquivar passageiro?", descrição e botão conforme a tabela "Diálogos de confirmação" de [contracts/rotas.md](./contracts/rotas.md));
  - arquivado: "Reativar" (ícone `ArchiveRestore`), sem confirmação;
  - ambos: "Excluir" (`destructive`, ícone `Trash2`) com `ConfirmDialog` "Excluir passageiro?";
  - cada action via `useActionState(acao.bind(null, id), {})`, disparada em `startTransition` no `onConfirmar`; botões desabilitados enquanto `pending`; `estado.erro` exibido em `<p role="alert">`
- [X] T037 [US4] Em `app/(app)/passageiros/[id]/page.tsx`: renderizar `AcoesPassageiro` junto do botão "Editar" e, quando arquivado, a faixa "Este passageiro está arquivado e não aparece na seleção de novas viagens."
- [X] T038 [US4] Adicionar o filtro por situação à lista:
  - `app/(app)/passageiros/page.tsx` lê `?situacao` (`'arquivados'` ou, qualquer outro valor, ativos), carrega `listarPassageiros(situacao)`, passa `situacao` para a lista e adiciona `excluido: 'Passageiro excluído'` às mensagens do `AvisoUrl`;
  - `app/(app)/passageiros/lista-passageiros.tsx` mostra a alternância "Ativos" / "Arquivados" (dois links com `aria-current`, preservando `busca`, alvos ≥ 44px) e, nos arquivados sem resultado, o `EmptyState` "Nenhum passageiro arquivado"
- [X] T039 [US4] Rodar `npm run lint`, `npm run typecheck`, `npm run test` e `npm run test:e2e` e corrigir as falhas

**Checkpoint**: gestão completa de passageiros funcionando.

## Fase 6: Acabamento e encerramento do slice

- [X] T040 [P] Corrigir o `README.md` na seção "Padrões para os próximos slices": no exemplo de migração, trocar `usuario_id` por `motorista_id` (coluna e políticas) e citar `supabase/migrations/<timestamp>_passageiros.sql` como modelo de tabela de domínio; no exemplo de `nav-items.ts`, manter "Passageiros" como item real (research §1)
- [X] T041 [P] Acrescentar em `specs/001-base-login-layout/data-model.md` (Parte 2, seção `passageiros`) uma nota apontando para `specs/002-registro-passageiros/data-model.md`, que tornou o telefone obrigatório e adicionou `observacao`
- [X] T042 Revisão de segurança (Princípio VI): buscar por `service_role` no repositório (nenhum resultado fora de comentários/`.env.example`); confirmar que nenhuma action lê `motorista_id` do formulário; repetir os cenários 17 e 18 do [quickstart.md](./quickstart.md)
- [X] T043 Commit em pt-BR, push na `main` e aguardar o deploy na Vercel
- [ ] T044 Executar a validação completa do [quickstart.md](./quickstart.md) em produção (cenários 1–19, no celular e no desktop) e registrar o resultado nesta tarefa
  - **Resultado parcial (2026-09-30)**: commit `d7f9419` publicado em `https://carona-ja-theta.vercel.app`. `passageiros.spec.ts` + `layout.spec.ts` com `E2E_BASE_URL` de produção: cenários de detalhes, edição, arquivar, reativar (com conflito de nome), excluir e 360/1280px passam (mobile e desktop; 4 falhas em execução paralela, todas aprovadas ao repetir em série — concorrência da mesma conta de teste). Revisão de segurança (T042): `service_role` só em comentários/config; nenhuma action lê `motorista_id` do formulário. **Pendente, manual**: cenário 17 (segunda conta de teste) e conferência visual dos cenários no celular real.
- [ ] T045 Marcar o slice como concluído: `**Status**: Concluído (<data>)` em `specs/002-registro-passageiros/spec.md`; commit e push

**Checkpoint da Fatia C**: slice 002 concluído; o próximo passo é `/speckit-specify` do slice 003
(Viagens), que referencia `passageiros(id)` com `on delete restrict`.

---

## Dependências e Ordem de Execução

### Entre fatias

- **Fatia A**: depende do slice 001 concluído. Bloqueia as demais.
- **Fatia B**: depende da Fatia A (lista, formulário, actions e consultas).
- **Fatia C**: depende da Fatia B (a tela de detalhes recebe as ações de arquivar, reativar e
  excluir).

### Dentro das fatias

- **Fatia A**: T001 → T002; T003 → T006; T004 antes de T006; T005 antes de T007; T008, T009 e T010
  são independentes; T011 pode ser escrito junto com T012–T019; T012 → T017; T006 → T013 → T014 →
  T015; T006 + T007 → T016 → T017; T018 e T019 dependem só de T008 (T019); T020 → T021.
- **Fatia B**: T022 e T023 primeiro; T024 → T025 → T026 e T027; T028 pode ser escrito junto;
  T029 → T030; T025 → T031; T032 → T033.
- **Fatia C**: T034 primeiro; T035 → T036 → T037; T038 é independente de T036/T037; T039 fecha a
  história; T040–T042 em paralelo; T043 → T044 → T045.

### Oportunidades de paralelismo

- **Fatia A**: T003, T004, T005, T008, T009 e T010 juntos; depois T018 e T019 em paralelo com
  T012–T017.
- **Fatia B**: T022, T023 e T028 juntos.
- **Fatia C**: T034 junto com T035; T040, T041 e T042 juntos.

## Exemplo de Paralelismo: Fatia A (US1)

```text
# Fundação, juntas:
Tarefa: "T003 lib/passageiros/tipos.ts"
Tarefa: "T004 tests/unit/passageiros-validacao.test.ts"
Tarefa: "T005 tests/unit/format.test.ts"
Tarefa: "T008 components/aviso-url.tsx"
Tarefa: "T009 components/ui/textarea.tsx"
Tarefa: "T010 tests/e2e/helpers/passageiros.ts"

# Enquanto a lista e o formulário são feitos:
Tarefa: "T018 components/layout/nav-items.ts"
Tarefa: "T019 app/(app)/inicio/page.tsx"
```

## Exemplo de Paralelismo: Fatia B (US2 + US3)

```text
Tarefa: "T022 tests/e2e/passageiros.spec.ts (US2)"
Tarefa: "T023 components/ui/badge.tsx"
```

T028 (testes US3) edita o mesmo arquivo que T022; pode ser escrito na mesma passada.

---

## Estratégia de Implementação

### Uma fatia por sessão

| Sessão | Comando sugerido | Resultado publicado |
|--------|------------------|---------------------|
| 1 | `/speckit-implement Fatia A (T001–T021)` | Cadastro e lista de passageiros com busca (**MVP**) |
| 2 | `/speckit-implement Fatia B (T022–T033)` | Detalhes do passageiro e edição |
| 3 | `/speckit-implement Fatia C (T034–T045)` | Arquivar, reativar e excluir; slice 002 validado e concluído |

Ao final de cada sessão: **PARAR e VALIDAR** pelo checkpoint da fatia antes de seguir.

### MVP

A Fatia A já entrega valor sozinha: uma agenda de passageiros com valores, publicada e protegida.
As Fatias B e C completam a gestão pedida na spec e são necessárias antes do slice 003, que
precisa de passageiros arquiváveis e da tela de detalhes para exibir as viagens de cada um.

---

## Notas

- [P] = arquivos diferentes, sem dependências pendentes.
- O rótulo [US#] liga a tarefa à história da spec, para rastreabilidade.
- Nunca colocar senhas reais no código ou nos testes; o e2e usa apenas a conta de **teste** e
  limpa os passageiros `E2E …` que criou.
- Fazer commit ao final de cada tarefa ou grupo lógico, com mensagens em pt-BR.
