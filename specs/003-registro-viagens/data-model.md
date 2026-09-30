# Modelo de Dados: Trajetos e Registro de Viagens

**Funcionalidade**: `specs/003-registro-viagens` | **Data**: 2026-09-30

Este slice cria três tabelas (`trajetos`, `viagens`, `viagem_passageiros`), uma view
(`viagens_resumo`) e duas funções (`registrar_viagem`, `editar_viagem`). Ele parte do modelo
acordado no slice 001 ([data-model.md, Parte 2](../001-base-login-layout/data-model.md)) e
aplica as decisões da spec 003:

| Item | Modelo do slice 001 | Este slice |
|------|---------------------|------------|
| Trajeto | não existia | **nova tabela** `trajetos` (origem e destino) |
| `viagens.trajeto_id`, `viagens.sentido` | não existiam; ida/volta em `observacao` | **novas colunas**; `sentido` ∈ {`ida`, `volta`} |
| `viagens.observacao` | opcional | **removida** (fora do pedido do usuário) |
| `viagens.arquivada_em` | não existia | **nova**: viagem desconsiderada (spec, Esclarecimentos) |
| `viagem_passageiros.pago_em` | previsto | **não criado aqui**: pertence ao slice de Pagamentos |
| Chaves estrangeiras | simples | **compostas com `motorista_id`** (research §4) |

Convenções herdadas:

- tabelas e colunas em `snake_case` pt-BR;
- `id uuid default gen_random_uuid()` e `motorista_id default auth.uid()`;
- dinheiro em centavos inteiros e datas em `timestamptz`;
- trigger `public.definir_atualizado_em()`;
- RLS "somente o dono" com `(select auth.uid())`.

```text
auth.users 1───N trajetos    1───N viagens 1───N viagem_passageiros N───1 passageiros
auth.users 1───N viagens
auth.users 1───N viagem_passageiros
```

## Entidade: `trajetos` (fatia A)

Par origem → destino que o motorista percorre. Não guarda percurso nem distância.

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid | PK |
| `motorista_id` | uuid | obrigatório; `default auth.uid()`; FK `auth.users(id) on delete cascade` |
| `origem` | text | obrigatório; `check (origem = btrim(origem) and char_length(origem) between 1 and 80)` |
| `destino` | text | obrigatório; mesma regra de `origem` |
| `arquivado_em` | timestamptz | `null` = ativo; preenchido = arquivado naquele instante |
| `criado_em`, `atualizado_em` | timestamptz | `not null default now()`; trigger `definir_atualizado_em` |

**Restrições e índices**:

- `check (lower(origem) <> lower(destino))`: origem e destino diferentes (FR-002).
- `unique (id, motorista_id)`: alvo das FKs compostas.
- `trajetos_ativo_unico`: índice único parcial em `(motorista_id, lower(origem),
  lower(destino)) where arquivado_em is null` (FR-003). Bloqueia também a reativação que
  colidiria com um trajeto ativo (US6, cenário 3); o erro é o `23505`.

**Estados**: `ativo` ⇄ `arquivado`. Exclusão física só sem viagens: a FK de `viagens` gera
`23503` (FR-007).

## Entidade: `viagens` (fatia B)

Uma carona em um trajeto, em um único sentido.

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid | PK |
| `motorista_id` | uuid | obrigatório; `default auth.uid()`; FK `auth.users(id) on delete cascade` |
| `trajeto_id` | uuid | obrigatório; FK composta `(trajeto_id, motorista_id) → trajetos(id, motorista_id)`, `on delete no action` |
| `sentido` | text | obrigatório; `check (sentido in ('ida', 'volta'))` |
| `realizada_em` | timestamptz | obrigatório; data e hora da viagem; exibida em `America/Sao_Paulo` |
| `arquivada_em` | timestamptz | `null` = ativa; preenchido = arquivada (desconsiderada) |
| `criado_em`, `atualizado_em` | timestamptz | `not null default now()`; trigger `definir_atualizado_em` |

**Restrições e índices**:

- `unique (id, motorista_id)`.
- `viagens_ativas_recentes`: índice em `(motorista_id, realizada_em desc) where arquivada_em is
  null`, usado pela lista.
- `viagens_trajeto_sentido`: índice em `(motorista_id, trajeto_id, sentido, realizada_em)`,
  usado pela verificação de duplicidade e pela FK.

**Regras validadas nas funções SQL** (não em `check`, porque dependem de `now()` ou de outras
linhas):

- `realizada_em <= now() + interval '1 day'` (FR-011);
- ao menos uma participação (FR-008);
- ao registrar, o trajeto deve estar ativo; ao editar, pode continuar o trajeto atual, mesmo que
  arquivado (FR-019).

**Sentido e percurso** (FR-009): `ida` = `origem → destino`; `volta` = `destino → origem`.

**Estados**:

```text
ativa ──arquivar──▶ arquivada ──reativar──▶ ativa
```

- **Arquivar**: preenche `arquivada_em`. **Reativar**: volta para `null`.
- Viagem arquivada não é editável (`editar_viagem` rejeita com `CJ006`).
- Viagem arquivada não entra na lista de ativas, em totais, pendências nem resumos (FR-021).
  Os slices seguintes MUST filtrar por `arquivada_em is null`.
- Não há exclusão pela interface (FR-022).

## Entidade: `viagem_passageiros` (fatia B)

Participação de um passageiro em uma viagem, com o valor cobrado dele naquela viagem. É a
unidade que o slice de Pagamentos marcará como paga (ele acrescentará `pago_em`).

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid | PK |
| `motorista_id` | uuid | obrigatório; `default auth.uid()`; FK `auth.users(id) on delete cascade` |
| `viagem_id` | uuid | obrigatório; FK composta `(viagem_id, motorista_id) → viagens(id, motorista_id) on delete cascade` |
| `passageiro_id` | uuid | obrigatório; FK composta `(passageiro_id, motorista_id) → passageiros(id, motorista_id)`, `on delete no action` |
| `valor_centavos` | integer | obrigatório; `check (valor_centavos between 0 and 999999)`; pré-preenchido com `valor_padrao_centavos` e editável |
| `criado_em`, `atualizado_em` | timestamptz | `not null default now()`; trigger `definir_atualizado_em` |

**Restrições e índices**:

- `unique (viagem_id, passageiro_id)`: cada passageiro no máximo uma vez por viagem.
- `viagem_passageiros_passageiro`: índice em `(passageiro_id)`. Serve à FK (exclusão de
  passageiro) e ao Histórico por passageiro.

**Regra de cópia** (FR-020, SC-004): `valor_centavos` é um valor próprio da participação. Alterar
`passageiros.valor_padrao_centavos` não altera nenhuma participação existente.

## Alteração em `passageiros` (fatia B)

- Acrescenta `unique (id, motorista_id)` (`passageiros_id_motorista_unico`), exigida pela FK
  composta. É aditiva e não muda nenhum comportamento do slice 002.

## View: `viagens_resumo` (fatia B)

`create view public.viagens_resumo with (security_invoker = true)`. Uma linha por viagem:

| Coluna | Origem |
|--------|--------|
| `id`, `trajeto_id`, `sentido`, `realizada_em`, `arquivada_em`, `criado_em`, `atualizado_em` | `viagens` |
| `origem`, `destino`, `trajeto_arquivado_em` | `trajetos` |
| `quantidade_passageiros` | `count(vp.id)::integer` |
| `total_centavos` | `coalesce(sum(vp.valor_centavos), 0)::integer` |

Com `security_invoker`, a view aplica a RLS das tabelas de origem, ou seja, apenas as viagens do
motorista logado. É a única fonte do total exibido (FR-013, SC-003).

## Funções SQL

Ambas são `language plpgsql`, `security invoker` e `set search_path = ''` (nomes sempre
qualificados com `public.`). A permissão `execute` fica só com `authenticated`: é revogada de
`public` e `anon`. Os erros usam os SQLSTATE `CJ001`–`CJ006` (research §8).

### `public.registrar_viagem` (fatia B)

```text
registrar_viagem(
  p_trajeto_id uuid,
  p_sentido text,
  p_data_hora_local timestamp,        -- hora de São Paulo, sem fuso
  p_participacoes jsonb,              -- [{"passageiro_id": uuid, "valor_centavos": int}, ...]
  p_confirmar_duplicada boolean default false
) returns uuid                        -- id da viagem criada
```

Passos, em uma transação:

1. Converte `p_data_hora_local at time zone 'America/Sao_Paulo'` → `realizada_em`. Se passar de
   `now() + 1 dia`, levanta `CJ005`.
2. Confere que o trajeto existe, é do motorista (a RLS filtra) e está ativo; senão, `CJ002`.
3. Confere que `p_participacoes` não está vazio e que cada valor está em `0..999999`; senão,
   `CJ004`. Confere que cada passageiro existe, é do motorista e está ativo; senão, `CJ003`.
4. Sem `p_confirmar_duplicada`, se existir viagem ativa com o mesmo trajeto e sentido no mesmo
   dia de `America/Sao_Paulo`, levanta `CJ001`.
5. Insere a viagem e as participações e retorna o `id`.

### `public.editar_viagem` (fatia C)

```text
editar_viagem(
  p_viagem_id uuid,
  p_trajeto_id uuid,
  p_sentido text,
  p_data_hora_local timestamp,
  p_participacoes jsonb,
  p_confirmar_duplicada boolean default false
) returns void
```

1. Trava a viagem (`select ... for update`). Se ela não existir, não for do motorista ou estiver
   arquivada, levanta `CJ006`.
2. Aplica as mesmas regras do registro, com duas exceções (FR-019):
   - o trajeto pode ser o trajeto atual, mesmo arquivado;
   - passageiros já vinculados podem permanecer, mesmo arquivados; os novos precisam estar
     ativos.
3. A verificação de duplicidade ignora a própria viagem.
4. Atualiza a viagem, e depois as participações por diferença (research §3):
   - `update` do valor das que continuam;
   - `insert` das novas;
   - `delete` das que saíram.

## RLS

Todas as tabelas com `enable row level security` e quatro políticas "somente o dono"
(`select`, `insert`, `update`, `delete`) para `authenticated`, no padrão de `passageiros`:
`using (motorista_id = (select auth.uid()))` e o mesmo em `with check`.

A política de `delete` em `viagens` existe apenas para a limpeza dos testes (research §15). A
interface não a usa.

## Tipos TypeScript (resumo; detalhes em [contracts/acoes.md](./contracts/acoes.md))

```ts
type Sentido = 'ida' | 'volta'
type Trajeto = { id; origem; destino; arquivado_em; criado_em; atualizado_em }
type ViagemResumo = {
  id; trajeto_id; origem; destino; trajeto_arquivado_em; sentido: Sentido;
  realizada_em; arquivada_em; criado_em; atualizado_em;
  quantidade_passageiros: number; total_centavos: number
}
type Participacao = {
  id; passageiro_id; valor_centavos: number;
  passageiro: { nome: string; arquivado_em: string | null; valor_padrao_centavos: number }
}
```
