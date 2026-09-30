# Plano de Implementação: Trajetos e Registro de Viagens

**Branch**: `main` (sem branch dedicada; ver nota) | **Data**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificação em `specs/003-registro-viagens/spec.md`

> **Nota sobre a branch**: o repositório não tem hook de criação de branch, e os slices 001 e 002
> foram feitos na `main`. Se preferir isolar o slice, crie `003-registro-viagens` antes do
> `/speckit-implement`.

## Resumo

O slice permite ao motorista:

- cadastrar e gerir **trajetos**, com apenas origem e destino;
- **registrar viagens** em um trajeto, com o sentido (ida ou volta), a data e a hora, e os
  passageiros que foram, cada um com o seu valor (pré-preenchido com o valor padrão). O total da
  viagem é sempre calculado;
- listar, inspecionar, editar, arquivar e reativar as viagens. Arquivar significa desconsiderar
  a viagem: ela sai dos totais, mas nada é apagado.

Abordagem técnica:

- **Banco**:
  - três tabelas (`trajetos`, `viagens`, `viagem_passageiros`) com RLS "somente o dono" e chaves
    estrangeiras compostas com `motorista_id`, que impedem vincular registros de outra conta;
  - a view `viagens_resumo` (`security_invoker`), única fonte do total;
  - as funções SQL `registrar_viagem` e `editar_viagem`, que gravam a viagem e as participações
    em uma única transação, convertem a hora de São Paulo e avisam sobre viagens duplicadas.
- **Telas**: em `app/(app)/viagens/` (e `viagens/trajetos/`), com os mesmos componentes e
  padrões do slice 002 (`useActionState`, `AvisoUrl`, `ResponsiveTable`, `ConfirmDialog`).
- **Formulário de viagem**: componente cliente com o total em tempo real, usando a mesma regra
  de dinheiro do servidor.
- **Regras puras**: funções testadas; as regras genéricas de dinheiro saem de
  `lib/passageiros/validacao.ts` para `lib/validacao.ts`.

## Contexto Técnico

**Linguagem/Versão**: TypeScript 5 (`strict`), Node.js 20 LTS+ (ambiente local com Node 24);
SQL/PLpgSQL (Postgres do Supabase)

**Dependências Principais**: as dos slices anteriores (Next.js 16 App Router, React 19, Tailwind
CSS 4, shadcn/ui, sonner, lucide-react, @supabase/ssr). **Nenhuma dependência nova e nenhum
componente shadcn novo**: `badge`, `alert-dialog`, `card`, `input`, `label` e `table` já existem.
O `<select>`, o `datetime-local` e as caixas de marcação são nativos.

**Armazenamento**: Supabase Postgres, com três migrações:

- `<ts>_trajetos.sql` (fatia A);
- `<ts>_viagens.sql` (fatia B: tabelas, view, `registrar_viagem` e o `unique (id,
  motorista_id)` em `passageiros`);
- `<ts>_editar_viagem.sql` (fatia C).

**Testes**: Vitest (regras puras) e Playwright (`mobile` 360px e `desktop` 1280px)

**Plataforma Alvo**: navegadores modernos de celular e desktop; hospedagem na Vercel

**Tipo de Projeto**: aplicação web (projeto único Next.js, sem backend separado)

**Metas de Desempenho**:

- registrar uma viagem com até 4 passageiros em < 30 s no celular (SC-001);
- cadastrar um trajeto em < 30 s (SC-002);
- total atualizado a cada tecla, sem ida ao servidor.

**Restrições**:

- RLS em todas as tabelas; view com `security_invoker`; funções `security invoker`, com
  `execute` apenas para `authenticated`;
- dinheiro em centavos inteiros; datas em `timestamptz`, exibidas e agrupadas em
  `America/Sao_Paulo`;
- sem rolagem horizontal de 360px a 1920px; alvos ≥ 44px; WCAG AA; textos em pt-BR;
- custo R$ 0/mês.

**Escala/Escopo**:

- 1 motorista, alguns trajetos, dezenas de passageiros e poucas centenas de viagens por ano;
- 8 telas novas e 1 ajustada (`/inicio`);
- 3 tabelas, 1 view e 2 funções SQL.

Todas as decisões estão em [research.md](./research.md); não há "NEEDS CLARIFICATION" pendente.

## Constitution Check

*GATE: deve passar antes da Fase 0. Reavaliado após a Fase 1.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Documentação pt-BR | Artefatos em pt-BR; tabelas, colunas, funções SQL e rotas em pt-BR; componentes em inglês/pt-BR como no slice 002. Valores `R$`, datas `DD/MM/AAAA`, horas `HH:mm`. | ✅ |
| II. Vertical slices | Depende dos slices 001 e 002, declarados na spec. Cria só as tabelas que usa; `pago_em` fica para o slice de Pagamentos (research §1). Cada uma das 4 fatias internas termina publicada e utilizável; na fatia A, `/viagens` mostra um estado vazio que leva a Trajetos, e não uma tela sem uso. O único ajuste em tabela de outro slice é o `unique (id, motorista_id)` em `passageiros`, aditivo e exigido por este slice. | ✅ |
| III. Simplicidade | Só Supabase e Vercel. Funções SQL e uma view no lugar de backend próprio (preferência explícita do princípio). Nenhuma dependência nova; conversão de fuso feita pelo Postgres, sem biblioteca de datas. | ✅ |
| IV. Interface mobile-first | Registro em uma tela: trajeto pré-selecionado, sentido em dois botões grandes, passageiros por caixa de marcação com valor pré-preenchido e total fixo no rodapé. `ResponsiveTable` em cartões < 768px. Alvos ≥ 44px. | ✅ |
| V. Integridade dos dados | `valor_centavos integer` com check por participação (valor individual por viagem). Total derivado pela view, nunca digitado nem guardado. `realizada_em timestamptz` convertida de `America/Sao_Paulo` pelo Postgres. Gravação atômica. Edição por diferença para preservar o futuro `pago_em`. Viagens nunca excluídas pela interface; arquivadas saem dos totais. | ✅ |
| VI. Privacidade e segurança | RLS com 4 políticas em cada tabela; view `security_invoker`; funções `security invoker` negadas a `anon`; FKs compostas impedem vincular dados de outra conta mesmo pela API (research §4); verificação com segunda conta no quickstart (cenários 25–27). | ✅ |
| Fluxo de desenvolvimento | Testes unitários para as regras de valor, total, data e percurso; e2e em celular e desktop; slice concluído só após deploy e migrações em produção. | ✅ |

**Reavaliação pós-design (Fase 1)**: sem violações. Divergências em relação ao modelo do slice
001, todas registradas em [data-model.md](./data-model.md) e [research.md](./research.md):

- nova tabela `trajetos`;
- `viagens.observacao` removida e substituída por `sentido`;
- novo `arquivada_em`;
- `pago_em` adiado para o slice de Pagamentos;
- FKs compostas.

Obrigação registrada para os slices 004–006: toda consulta de totais, pendências e resumos MUST
filtrar `viagens.arquivada_em is null` (FR-021).

## Fatias de Implementação (dentro deste slice)

Cada fatia termina publicada e demonstrável sozinha (Princípio II).

| Fatia | Entrega | Histórias | Depende de |
|-------|---------|-----------|------------|
| **A. Trajetos** | Migração `trajetos` + RLS; `lib/validacao.ts` (extração) + `lib/trajetos/*` com testes; item "Viagens" na navegação; `/viagens` provisória (estado vazio → Trajetos); `/viagens/trajetos` (lista, filtro), `novo`, `[id]`, `[id]/editar`; actions de cadastrar, editar, arquivar, reativar e excluir; `/inicio` com "Cadastrar trajetos"; e2e `trajetos.spec.ts` | US1, US6 | slices 001 e 002 |
| **B. Registrar e consultar viagens** | Migração `viagens` (tabelas, FKs compostas, `unique` em `passageiros`, view, `registrar_viagem`); `lib/viagens/*` + `paraCampoDataHora` com testes; `/viagens` (lista com "Carregar mais"), `/viagens/nova` (`FormularioViagem`, duplicidade), `/viagens/[id]`; `/inicio` com "Registrar viagem"; helper e2e de limpeza ampliado; e2e de registro, total, duplicidade, detalhes, SC-004 e FR-023 | US2, US3 | A |
| **C. Editar viagens** | Migração `editar_viagem`; `/viagens/[id]/editar` reutilizando `FormularioViagem`; action `editarViagem`; e2e de edição (valores preservados, passageiro novo com valor padrão, passageiro arquivado mantido) | US4 | B |
| **D. Arquivar e reativar viagens** | Filtro "Ativas/Arquivadas" na lista; actions `arquivarViagem` e `reativarViagem`; aviso e ações nos detalhes; bloqueio da edição de viagem arquivada; e2e do ciclo | US5 | C |

## Estrutura do Projeto

### Documentação (esta funcionalidade)

```text
specs/003-registro-viagens/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1 (guia de validação)
├── contracts/
│   ├── rotas.md         # Telas, navegação, formulário de viagem, diálogos e toasts
│   └── acoes.md         # Server actions, funções SQL, consultas e funções de domínio
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Código-fonte (raiz do repositório)

Arquivos novos (➕) e alterados (✏️):

```text
app/(app)/
├── inicio/✏️ page.tsx                     # ações "Registrar viagem" e "Passageiros"
└── viagens/
    ├── ➕ page.tsx                        # lista (situacao, pagina)
    ├── ➕ lista-viagens.tsx               # cliente: filtro, ResponsiveTable, "Carregar mais"
    ├── ➕ actions.ts                      # registrar/editar/arquivar/reativar viagem
    ├── ➕ formulario-viagem.tsx           # cliente: trajeto, sentido, data, passageiros, total
    ├── nova/
    │   └── ➕ page.tsx
    ├── [id]/
    │   ├── ➕ page.tsx                    # detalhes
    │   ├── ➕ acoes-viagem.tsx            # cliente: arquivar/reativar + ConfirmDialog
    │   └── editar/
    │       └── ➕ page.tsx
    └── trajetos/
        ├── ➕ page.tsx                    # lista (situacao)
        ├── ➕ actions.ts
        ├── ➕ formulario-trajeto.tsx
        ├── novo/
        │   └── ➕ page.tsx
        └── [id]/
            ├── ➕ page.tsx
            ├── ➕ acoes-trajeto.tsx
            └── editar/
                └── ➕ page.tsx

components/layout/✏️ nav-items.ts          # item "Viagens"

lib/
├── ➕ validacao.ts                        # Resultado, parseValorEmCentavos, centavosParaCampo, ehUuid
├── ✏️ format.ts                           # paraCampoDataHora
├── passageiros/✏️ validacao.ts            # passa a importar/reexportar de lib/validacao.ts
├── trajetos/
│   ├── ➕ tipos.ts
│   ├── ➕ validacao.ts
│   └── ➕ consultas.ts
└── viagens/
    ├── ➕ tipos.ts
    ├── ➕ validacao.ts
    └── ➕ consultas.ts

supabase/migrations/
├── ➕ <ts>_trajetos.sql
├── ➕ <ts>_viagens.sql
└── ➕ <ts>_editar_viagem.sql

tests/
├── unit/➕ trajetos-validacao.test.ts, ➕ viagens-validacao.test.ts, ✏️ format.test.ts
└── e2e/
    ├── ➕ trajetos.spec.ts
    ├── ➕ viagens.spec.ts
    └── helpers/✏️ passageiros.ts → limpeza de viagens, trajetos e passageiros de teste

✏️ README.md                                # navegação e funções SQL/erros CJ00x
```

**Decisão de estrutura**: segue o padrão do slice 002. A pasta de cada rota concentra a página,
os componentes cliente e as actions; regras puras e consultas ficam em `lib/<recurso>/`. Os
trajetos ficam aninhados em `viagens/` porque são acessados a partir dali (research §13).

## Rastreamento de Complexidade

Não há violações da constituição a justificar.
