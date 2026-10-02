# Modelo de Dados: Controle de Pagamentos e Cobrança

**Funcionalidade**: `specs/005-controle-pagamentos` | **Data**: 2026-10-01

Este slice **não cria tabelas**. Ele acrescenta duas colunas, um trigger, duas views e redefine
uma função:

| Item | Antes | Este slice | Fatia |
|------|-------|------------|-------|
| `viagem_passageiros.pago_em` | não existia (adiado pelo slice 003) | **nova** `date`: nula = pendente | A |
| `public.validar_pagamento()` + trigger | — | **novo**: regras de pagamento (`CJ007`–`CJ009`) | A |
| `public.participacoes_detalhe` | — | **nova view** | A |
| `public.pendencias_passageiros` | — | **nova view** | A |
| `public.editar_viagem` | slice 003 | **redefinida**: bloqueia remover ou mudar o valor de participação paga (`CJ007`) | A |
| `perfis.chave_pix` | não existia | **nova** `text`: nula = não cadastrada | B |

Convenções herdadas: `snake_case` pt-BR, dinheiro em centavos inteiros, datas exibidas em
`America/Sao_Paulo`, funções com `set search_path = ''` e nomes qualificados com `public.`, views
com `security_invoker = true`, RLS "somente o dono" (já ativa em todas as tabelas envolvidas).

## Alteração: `viagem_passageiros` (fatia A)

| Campo | Tipo | Regras |
|-------|------|--------|
| `pago_em` | date | `null` = pendente; preenchido = paga naquele dia (São Paulo). Validado pelo trigger. |

**Índice**: `viagem_passageiros_pendentes` em `(passageiro_id) where pago_em is null`, para as
pendências por passageiro.

**Situação derivada de uma participação**:

| Situação | Condição |
|----------|----------|
| Sem cobrança | `valor_centavos = 0` (FR-003) |
| Pendente | `valor_centavos > 0 and pago_em is null` |
| Paga | `pago_em is not null` |
| Ignorada em pendências e totais | viagem com `arquivada_em is not null` (FR-004), seja qual for a situação acima |

**Transições** (todas por `update` com RLS; research §3):

```text
pendente ──marcar (data)──▶ paga ──desfazer──▶ pendente
                            paga ──corrigir data──▶ paga
```

- **Marcar**: `set pago_em = :data where id in (:ids) and pago_em is null`.
- **Desfazer**: `set pago_em = null where id = :id and pago_em is not null`.
- **Corrigir data**: `set pago_em = :data where id = :id and pago_em is not null`.
- Arquivar ou reativar a viagem não altera `pago_em`.

## Trigger: `viagem_passageiros_validar_pagamento` (fatia A)

`before insert or update of pago_em, valor_centavos on public.viagem_passageiros for each row
execute function public.validar_pagamento()`. A função é `plpgsql`, `security invoker`,
`set search_path = ''`.

| Situação | Erro |
|----------|------|
| `tg_op = 'UPDATE'`, `old.pago_em is not null`, `new.pago_em is not null` e `new.valor_centavos <> old.valor_centavos` | `CJ007` `participacao_paga` |
| `new.pago_em` preenchida e diferente da anterior, e `new.pago_em > (now() at time zone 'America/Sao_Paulo')::date` | `CJ008` `data_pagamento_futura` |
| idem, e `new.pago_em < (viagem.realizada_em at time zone 'America/Sao_Paulo')::date` | `CJ008` `data_pagamento_antes_da_viagem` |
| idem, e a viagem está arquivada **ou** `new.valor_centavos = 0` | `CJ009` `participacao_nao_cobravel` |

- Desfazer (`pago_em` → `null`) nunca é bloqueado.
- Um `update` de várias linhas é um único comando: se qualquer linha falhar, nenhuma é alterada
  (FR-010).
- Não há regra de `delete` no trigger (research §2); a remoção de participação paga é bloqueada
  em `editar_viagem`.

## Função redefinida: `public.editar_viagem` (fatia A)

Mesma assinatura e mesmas regras do slice 003. Acrescenta, depois de travar a viagem e antes de
alterar as participações:

- se existir participação desta viagem com `pago_em is not null` cujo passageiro **não está** em
  `p_participacoes`, ou está com `valor_centavos` diferente, levanta
  `CJ007` (`participacao_paga`), com `detail` = nome do passageiro.

A migração usa `create or replace function` e mantém `revoke`/`grant` como no slice 003.

## View: `participacoes_detalhe` (fatia A)

`with (security_invoker = true)`. Uma linha por participação:

| Coluna | Origem |
|--------|--------|
| `id`, `viagem_id`, `passageiro_id`, `valor_centavos`, `pago_em` | `viagem_passageiros` |
| `realizada_em`, `sentido`, `arquivada_em` | `viagens` |
| `origem`, `destino` | `trajetos` |
| `passageiro_nome`, `passageiro_arquivado_em` | `passageiros` |

Usos: pendentes e pagas de um passageiro (filtrando `arquivada_em is null`), itens da cobrança e
situação na tela da viagem.

## View: `pendencias_passageiros` (fatia A)

`with (security_invoker = true)`. Uma linha por passageiro **que tem** pendência:

| Coluna | Origem |
|--------|--------|
| `passageiro_id`, `nome`, `telefone`, `arquivado_em` | `passageiros` |
| `quantidade_pendentes` | `count(vp.id)::integer` |
| `total_pendente_centavos` | `sum(vp.valor_centavos)::integer` |

Filtro (definição única de "dívida", FR-003 e FR-004): `vp.pago_em is null and vp.valor_centavos
> 0 and v.arquivada_em is null`, com `join` (passageiros sem pendência não aparecem).

- **Total geral pendente** (FR-006) = soma de `total_pendente_centavos` das linhas.
- **Total devido de um passageiro** (FR-013) = `total_pendente_centavos` da linha dele, ou
  `0` se não houver linha.

## Alteração: `perfis` (fatia B)

| Campo | Tipo | Regras |
|-------|------|--------|
| `chave_pix` | text | `null` = não cadastrada; `check (chave_pix is null or (chave_pix = btrim(chave_pix) and char_length(chave_pix) between 1 and 77))` |

A política de `update` de `perfis` (slice 001) já permite ao dono alterar a própria linha.

## Erros novos

| SQLSTATE | Mensagem | Quando | Texto na interface |
|----------|----------|--------|--------------------|
| `CJ007` | `participacao_paga` | mudar o valor ou remover passageiro já pago | "{Nome} já pagou esta viagem. Desfaça o pagamento antes de alterar o valor ou removê-lo." |
| `CJ008` | `data_pagamento_futura` / `data_pagamento_antes_da_viagem` | data inválida | "A data do pagamento não pode ser no futuro." / "A data do pagamento não pode ser anterior à data da viagem." |
| `CJ009` | `participacao_nao_cobravel` | viagem arquivada ou valor zero | "Esta viagem não tem valor a pagar ou foi arquivada. Atualize a página." |

## Tipos TypeScript (resumo; detalhes em [contracts/acoes.md](./contracts/acoes.md))

```ts
type ParticipacaoDetalhe = {
  id; viagem_id; passageiro_id; valor_centavos: number; pago_em: string | null // 'AAAA-MM-DD'
  realizada_em; sentido: Sentido; arquivada_em: string | null; origem; destino
  passageiro_nome; passageiro_arquivado_em: string | null
}
type PendenciaPassageiro = {
  passageiro_id; nome; telefone; arquivado_em: string | null
  quantidade_pendentes: number; total_pendente_centavos: number
}
type ItemCobranca = { realizada_em: string; sentido: Sentido; valor_centavos: number }
```

`Participacao` (slice 003, `lib/viagens/tipos.ts`) ganha `pago_em: string | null`.
