# Modelo de Dados: Registro e Gestão de Passageiros

**Funcionalidade**: `specs/002-registro-passageiros` | **Data**: 2026-09-30

Este slice cria uma única tabela, `passageiros`. Ele parte do modelo acordado no slice 001
([data-model.md, Parte 2](../001-base-login-layout/data-model.md)) e aplica as decisões da spec
002:

| Campo | Modelo do slice 001 | Este slice |
|-------|---------------------|------------|
| `telefone` | opcional | **obrigatório** (spec, Esclarecimentos) |
| `observacao` | não existia | **novo**, opcional, até 200 caracteres |
| `valor_padrao_centavos` | um valor | um valor por trajeto, para ida e volta (sem mudança) |

Convenções herdadas: tabelas e colunas em pt-BR `snake_case`, `id uuid default
gen_random_uuid()`, dinheiro em centavos inteiros, `timestamptz`, trigger
`public.definir_atualizado_em()` e RLS "somente o dono".

## Entidade: `passageiros`

Pessoa que pega carona com o motorista. Não tem conta nem acesso ao sistema.

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid | PK, `default gen_random_uuid()` |
| `motorista_id` | uuid | obrigatório; `default auth.uid()`; FK `auth.users(id) on delete cascade` |
| `nome` | text | obrigatório; `check (nome = btrim(nome) and char_length(nome) between 1 and 80)` |
| `telefone` | text | obrigatório; só dígitos; `check (telefone ~ '^[1-9]{2}(9[0-9]{8}\|[0-9]{8})$')` |
| `valor_padrao_centavos` | integer | obrigatório; `check (valor_padrao_centavos between 0 and 999999)` |
| `observacao` | text | opcional; `null` = sem observação; `check (observacao is null or (observacao = btrim(observacao) and char_length(observacao) between 1 and 200))` |
| `arquivado_em` | timestamptz | `null` = ativo; preenchido = arquivado naquele instante |
| `criado_em` | timestamptz | `not null default now()` |
| `atualizado_em` | timestamptz | `not null default now()`; mantido pelo trigger `definir_atualizado_em` |

### Índices e restrições

- `passageiros_nome_ativo_unico`: índice único parcial em `(motorista_id, lower(nome)) where
  arquivado_em is null` (FR-006, research §5). Serve também para listar os ativos por nome.
- `passageiros_motorista_nome`: índice em `(motorista_id, nome)` para a lista de arquivados.

### Regras de normalização (aplicação, antes de gravar)

| Campo | Normalização | Mensagem de erro (pt-BR) |
|-------|--------------|--------------------------|
| `nome` | remove espaços das pontas e colapsa espaços internos repetidos | vazio: "Informe o nome."; > 80: "O nome deve ter até 80 caracteres." |
| `telefone` | mantém só os dígitos; remove um `55` ou `0` inicial quando sobrarem 12–13 dígitos | vazio: "Informe o telefone."; inválido: "Informe um telefone com DDD, ex.: (11) 91234-5678." |
| `valor_padrao_centavos` | `parseValorEmCentavos` (research §4) | vazio: "Informe o valor padrão."; inválido: "Informe um valor entre R$ 0,00 e R$ 9.999,99, com até 2 casas decimais." |
| `observacao` | remove espaços das pontas; vazio vira `null` | > 200: "A observação deve ter até 200 caracteres." |

Erro de nome duplicado (`23505` no índice único): "Já existe um passageiro ativo com esse nome."

### Estados

```text
            arquivar (preenche arquivado_em)
  ┌───────┐ ───────────────────────────────▶ ┌───────────┐
  │ ativo │                                  │ arquivado │
  └───────┘ ◀─────────────────────────────── └───────────┘
       │     reativar (limpa arquivado_em;         │
       │     falha se houver ativo com o mesmo nome)│
       │                                           │
       └──────────── excluir (definitivo) ─────────┘
            só sem viagens vinculadas (slice 003: FK on delete restrict)
```

- Um passageiro arquivado não aparece na lista de ativos nem (slice 003) na seleção de novas
  viagens; continua visível no filtro "Arquivados", na tela de detalhes e no histórico.
- Editar é permitido nos dois estados.
- Alterar `valor_padrao_centavos` não afeta participações já registradas: o slice 003 copia o
  valor para `viagem_passageiros.valor_centavos` no momento do registro (Princípio V).

### RLS (Princípio VI)

`alter table public.passageiros enable row level security`, com as quatro políticas "somente o
dono" (`select`, `insert`, `update`, `delete`) `to authenticated`, comparando
`motorista_id = (select auth.uid())` em `using` e, nas escritas, em `with check`.

### Tipo na aplicação

```ts
type Passageiro = {
  id: string
  nome: string
  telefone: string // só dígitos
  valor_padrao_centavos: number
  observacao: string | null
  arquivado_em: string | null
  criado_em: string
  atualizado_em: string
}
```

## Relação com os próximos slices

```text
auth.users 1───N passageiros 1───N viagem_passageiros (slice 003) N───1 viagens
```

O slice 003 referencia `passageiros(id)` com `on delete restrict`, o que bloqueia a exclusão de
passageiros com viagens (FR-016, research §9).
