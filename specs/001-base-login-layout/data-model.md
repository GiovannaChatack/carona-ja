# Modelo de Dados: Base do Projeto

**Funcionalidade**: `specs/001-base-login-layout` | **Data**: 2026-09-28

Este documento tem duas partes:

1. **Escopo deste slice**: o que é criado agora (migrações do slice 001).
2. **Visão do modelo completo**: o modelo acordado para os próximos slices. Ele serve de
   referência para que a base já nasça compatível, mas **não** é implementado aqui (Princípio II:
   cada migração pertence ao slice que a usa).

## Decisões do modelo (sessão 2026-09-28)

| Tema | Decisão |
|------|---------|
| Valor cobrado | O passageiro tem um **valor padrão**, pré-preenchido na viagem e ajustável nela. O valor efetivo fica gravado na participação, e alterar o padrão não muda o histórico. |
| Ida e volta | **Registros separados**: cada trajeto é uma viagem com horário e passageiros próprios. |
| Pagamento | **Por participação em viagem**: pago/pendente, com a data do pagamento; um acerto de vários dias é feito marcando várias participações de uma vez. |
| Passageiro inativo | **Arquivar**: sai das listas de seleção, e o histórico e os pagamentos ficam intactos; pode ser reativado. |

## Convenções gerais

- Tabelas e colunas em português, `snake_case`, no plural para tabelas (ver
  [research.md §6](./research.md)).
- Chave primária `id uuid default gen_random_uuid()`, exceto `perfis`, que usa o id do usuário.
- Toda tabela de domínio tem `motorista_id uuid not null references auth.users(id)` e RLS
  habilitada com a política "somente o dono" (Princípio VI).
- Datas e horas em `timestamptz`; agregações mensais em `America/Sao_Paulo` (Princípio V).
- Dinheiro em `integer` de centavos com `check (>= 0)` (Princípio V).
- `criado_em` / `atualizado_em` `timestamptz not null default now()`; `atualizado_em` é mantido
  por um trigger.

---

## Parte 1: Escopo deste slice (001)

### Entidade: Usuário (gerenciada pelo Supabase Auth)

Tabela `auth.users`, que não é criada pelo projeto. Campos usados: `id`, `email`, `created_at`.
Não há cadastro público; a conta é criada manualmente no painel (FR-003).

### Entidade: `perfis`

Dados de exibição do motorista (saudação e cabeçalho, FR-012/FR-018).

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid | PK; `references auth.users(id) on delete cascade` |
| `nome_exibicao` | text | obrigatório; 1–60 caracteres (após trim); padrão = parte do e-mail antes do `@` |
| `criado_em` | timestamptz | `default now()` |
| `atualizado_em` | timestamptz | `default now()`, trigger de atualização |

- **Criação automática**: um trigger `after insert on auth.users` cria o perfil com o nome
  padrão. O trigger é `security definer` com `search_path` fixo.
- **RLS**: `select` e `update` somente onde `id = auth.uid()`. Sem `insert` nem `delete` pelo
  cliente.
- **Uso na interface**: saudação "Olá, {nome_exibicao}" na tela inicial; o cabeçalho mostra o
  nome e o e-mail. A edição do nome está fora do escopo deste slice (o valor pode ser ajustado
  no painel).

### Entidade: Sessão

É gerenciada pelo Supabase Auth, com cookies HTTP-only renovados pelo middleware. Não há tabela
própria.

### Objetos auxiliares criados neste slice (reutilizados pelos próximos)

- Função `public.definir_atualizado_em()`: trigger genérico que preenche `atualizado_em = now()`.

---

## Parte 2: Visão do modelo completo (slices futuros, não implementar agora)

```text
auth.users 1───1 perfis
auth.users 1───N passageiros
auth.users 1───N viagens
viagens    1───N viagem_passageiros N───1 passageiros
```

### `passageiros` (slice 002: Passageiros)

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid | PK |
| `motorista_id` | uuid | FK `auth.users`, `default auth.uid()` |
| `nome` | text | obrigatório, 1–80 caracteres; único por motorista entre os não arquivados (case-insensitive) |
| `telefone` | text | opcional |
| `valor_padrao_centavos` | integer | obrigatório, `>= 0` |
| `arquivado_em` | timestamptz | `null` = ativo; preenchido = arquivado |
| `criado_em`, `atualizado_em` | timestamptz | padrão |

**Estados**: `ativo` ⇄ `arquivado` (arquivar preenche `arquivado_em`; reativar volta para
`null`). Um passageiro arquivado não aparece na seleção de novas viagens, mas continua visível no
histórico. Não há exclusão física se houver participações.

### `viagens` (slice 003: Viagens)

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid | PK |
| `motorista_id` | uuid | FK `auth.users`, `default auth.uid()` |
| `realizada_em` | timestamptz | obrigatório; padrão = agora; não pode estar mais de 1 dia no futuro |
| `observacao` | text | opcional, até 200 caracteres (ex.: "ida", "volta", "trânsito") |
| `criado_em`, `atualizado_em` | timestamptz | padrão |

Ida e volta são **duas viagens**. Uma viagem precisa de pelo menos 1 passageiro (regra de
aplicação validada ao salvar).

### `viagem_passageiros` (slice 003 cria; slice 005 usa o pagamento)

É a participação de um passageiro em uma viagem, e a unidade de cobrança e pagamento.

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid | PK |
| `motorista_id` | uuid | FK `auth.users`, `default auth.uid()` (para a RLS) |
| `viagem_id` | uuid | FK `viagens`, `on delete cascade` |
| `passageiro_id` | uuid | FK `passageiros`, `on delete restrict` |
| `valor_centavos` | integer | obrigatório, `>= 0`; copiado de `valor_padrao_centavos` e editável |
| `pago_em` | timestamptz | `null` = pendente; preenchido = pago naquela data |
| `criado_em`, `atualizado_em` | timestamptz | padrão |

- Restrição única `(viagem_id, passageiro_id)`.
- **Estados de pagamento**: `pendente` → `pago` (preenche `pago_em`); `pago` → `pendente`
  (desfazer, limpa `pago_em`). Marcar em lote atualiza várias participações com o mesmo `pago_em`.
- Excluir uma viagem com alguma participação paga exige confirmação explícita (Princípio V).

### `resumo_mensal` (slice 006: view, `security_invoker = true`)

É derivada; nada é digitado manualmente.

| Coluna | Definição |
|--------|-----------|
| `mes` | início do mês em `America/Sao_Paulo` |
| `total_viagens` | quantidade de `viagens` com `realizada_em` no mês |
| `total_cobrado_centavos` | soma de `valor_centavos` das participações de viagens do mês |
| `total_recebido_centavos` | soma de `valor_centavos` com `pago_em` no mês (regime de caixa) |
| `total_pendente_centavos` | soma de `valor_centavos` de participações do mês ainda sem `pago_em` |

> Ponto a confirmar no slice 006: "valor recebido por mês" considera o mês **do pagamento**
> (proposto acima) ou o mês **da viagem**. A decisão não afeta as tabelas, apenas a view.
