# Modelo de Dados: Histórico de Viagens

**Funcionalidade**: `specs/004-historico-viagens` | **Data**: 2026-10-01

Este slice **não cria nem altera tabelas, colunas ou views**. Ele lê `viagens`,
`viagem_passageiros`, `passageiros` e `trajetos` (slices 002 e 003; definições vigentes em
[`specs/003-registro-viagens/data-model.md`](../003-registro-viagens/data-model.md)) por meio de
duas funções SQL novas, somente leitura. Ver [research.md §1–§2](./research.md).

## Migração: `<ts>_historico.sql`

Cria apenas:

- `public.historico_viagens(...)`
- `public.historico_resumo(...)`

Ambas `language sql`, `stable`, `security invoker`, `set search_path = ''`, com
`revoke execute ... from public, anon` e `grant execute ... to authenticated` (padrão do slice
003). Nenhum `alter table`, `create or replace view` ou alteração de função existente.

## Parâmetros comuns (filtros)

| Parâmetro | Tipo | Regra |
|-----------|------|-------|
| `p_inicio` | `date` | obrigatório; primeiro dia do período (calendário de São Paulo) |
| `p_fim` | `date` | obrigatório; último dia do período, inclusive; `p_fim >= p_inicio` |
| `p_passageiro_id` | `uuid` | `null` = todos; senão, só viagens com participação desse passageiro |
| `p_trajeto_id` | `uuid` | `null` = todos |
| `p_sentido` | `text` | `null` = ambos; senão `'ida'` ou `'volta'` |

**Filtro aplicado** (idêntico nas duas funções):

```text
v.arquivada_em is null                                                    -- FR-002
and v.realizada_em >= (p_inicio::timestamp at time zone 'America/Sao_Paulo')
and v.realizada_em <  ((p_fim + 1)::timestamp at time zone 'America/Sao_Paulo')   -- FR-004
and (p_trajeto_id is null or v.trajeto_id = p_trajeto_id)
and (p_sentido is null or v.sentido = p_sentido)
and (p_passageiro_id is null or exists (participação de p_passageiro_id em v))
```

A RLS das tabelas (via `security invoker`) garante que só aparecem dados do motorista logado; um
`p_passageiro_id` ou `p_trajeto_id` de outra conta simplesmente não encontra nada.

## Função: `historico_viagens(filtros…, p_limite integer)`

Retorna `setof` linhas, ordenadas por `realizada_em desc, criado_em desc`, limitadas a
`p_limite` (o servidor pede `pagina × 20 + 1` para saber se há mais).

| Coluna | Tipo | Origem |
|--------|------|--------|
| `id` | uuid | `viagens.id` |
| `realizada_em` | timestamptz | `viagens.realizada_em` |
| `criado_em` | timestamptz | `viagens.criado_em` (desempate da ordem) |
| `sentido` | text | `viagens.sentido` |
| `trajeto_id` | uuid | `viagens.trajeto_id` |
| `origem`, `destino` | text | `trajetos` (nome atual) |
| `passageiros` | text[] | nomes atuais dos passageiros da viagem, em ordem alfabética (pt-BR é reaplicada no cliente se necessário) |
| `total_centavos` | integer | soma de `viagem_passageiros.valor_centavos` da viagem |
| `valor_passageiro_centavos` | integer \| null | valor de `p_passageiro_id` nesta viagem; `null` sem filtro de passageiro |

## Função: `historico_resumo(filtros…)`

Retorna uma única linha (sempre, mesmo sem viagens):

| Coluna | Tipo | Definição |
|--------|------|-----------|
| `quantidade` | integer | número de viagens que atendem ao filtro |
| `total_centavos` | bigint | sem passageiro: soma dos totais das viagens; com passageiro: soma dos `valor_centavos` desse passageiro nas viagens filtradas (FR-013); `0` se vazio |

**Invariante** (FR-014, SC-002, SC-003): com todas as linhas carregadas,
`quantidade = número de linhas` e `total_centavos = Σ total_centavos` (sem passageiro) ou
`Σ valor_passageiro_centavos` (com passageiro).

## Conceitos de tela (não armazenados)

### Filtro do histórico (`FiltroHistorico`)

| Campo | Valores | Padrão |
|-------|---------|--------|
| `periodo` | `este-mes` \| `mes-passado` \| `30-dias` \| `personalizado` | `este-mes` |
| `inicio`, `fim` | `AAAA-MM-DD` (só no personalizado) | — |
| `passageiro` | uuid \| ausente | ausente |
| `trajeto` | uuid \| ausente | ausente |
| `sentido` | `ida` \| `volta` \| ausente | ausente (ambos) |
| `pagina` | 1–50 | 1 |

Regras de leitura da URL e de resolução do período: [research.md §3–§4](./research.md) e
[contracts/consultas.md](./contracts/consultas.md).

### Opções dos filtros

- Passageiros: **todos** os do motorista (ativos e arquivados), ordem alfabética pt-BR,
  arquivados com o sufixo " (arquivado)" (FR-007).
- Trajetos: **todos** os do motorista, na ordem de `compararTrajetos`, arquivados com o sufixo
  " (arquivado)".

## Compatibilidade com o slice 005 (em paralelo)

- Quando `viagem_passageiros.pago_em` for criado, as funções continuam válidas: não usam
  `select *` nem dependem de colunas novas.
- Arquivar viagens com participações pagas (regra do 005) não muda o histórico: viagem arquivada
  já fica fora.
