# Plano de Implementação: Registro e Gestão de Passageiros

**Branch**: `main` (sem branch dedicada; ver nota) | **Data**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificação em `specs/002-registro-passageiros/spec.md`

> **Nota sobre a branch**: o repositório não tem hook de criação de branch, e o trabalho do slice
> 001 foi feito na `main`. Se preferir isolar o slice, crie `002-registro-passageiros` antes do
> `/speckit-implement`.

## Resumo

Permitir que o motorista cadastre e gerencie os passageiros das caronas: listar (com busca por nome
e filtro ativos/arquivados), cadastrar, inspecionar os detalhes, editar, arquivar, reativar e
excluir. Passageiros não têm conta; são registros do motorista.

Abordagem técnica:

- uma migração `passageiros`, com RLS "somente o dono", checks que espelham a validação e um
  índice único parcial para o nome entre os ativos;
- quatro telas em `app/(app)/passageiros/`, reutilizando `AppShell`, `ResponsiveTable`,
  `EmptyState`, `ConfirmDialog`, `sonner` e `lib/format`;
- server actions com `useActionState`, no mesmo padrão do login;
- validação em funções puras testadas (sem biblioteca nova) e o formatador `formatPhone`.

## Contexto Técnico

**Linguagem/Versão**: TypeScript 5 (`strict`), Node.js 20 LTS+ (ambiente local com Node 24)

**Dependências Principais**: as do slice 001 (Next.js 16 App Router, React 19, Tailwind CSS 4,
shadcn/ui, sonner, lucide-react, @supabase/ssr). **Nenhuma dependência nova.** Componentes
shadcn/ui a gerar se ainda não existirem: `textarea` e `badge`.

**Armazenamento**: Supabase Postgres; nova migração `supabase/migrations/<timestamp>_passageiros.sql`

**Testes**: Vitest (validação e formatação) e Playwright (`mobile` 360px e `desktop` 1280px)

**Plataforma Alvo**: navegadores modernos de celular e desktop; hospedagem na Vercel

**Tipo de Projeto**: aplicação web (projeto único Next.js, sem backend separado)

**Metas de Desempenho**: cadastro em < 1 min no celular (SC-001); encontrar e abrir um
passageiro entre 100 em < 10 s (SC-002), com busca instantânea no cliente

**Restrições**:

- RLS em `passageiros`; nenhuma chave secreta no cliente;
- valores em centavos inteiros;
- sem rolagem horizontal de 360px a 1920px; alvos ≥ 44px; WCAG AA;
- textos em pt-BR; custo R$ 0/mês.

**Escala/Escopo**: 1 motorista; dezenas a poucas centenas de passageiros; 4 telas novas; 1 tabela

Todas as decisões estão em [research.md](./research.md); não há "NEEDS CLARIFICATION" pendente.

## Constitution Check

*GATE: deve passar antes da Fase 0. Reavaliado após a Fase 1.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Documentação pt-BR | Artefatos em pt-BR. Tabela, colunas e rotas em pt-BR; componentes em inglês (research 001 §6). Valores `R$`, datas `DD/MM/AAAA`. | ✅ |
| II. Vertical slices | Depende só do slice 001. Cria apenas a tabela que usa (`passageiros`). Entrega uma agenda de passageiros útil mesmo sem os próximos slices. Bloqueio de exclusão com viagens fica a cargo da FK do slice 003 (research §9), sem criar tabela alheia. Item de navegação adicionado junto com a tela. | ✅ |
| III. Simplicidade | Só Supabase e Vercel. Server actions + RLS, sem API própria. Nenhuma dependência nova (validação em funções puras). | ✅ |
| IV. Interface mobile-first | `ResponsiveTable` (cartões < 768px), formulário em coluna única, `inputMode` adequado para telefone e valor, telefone clicável, alvos ≥ 44px. | ✅ |
| V. Integridade dos dados | `valor_padrao_centavos integer` com check; conversão de texto sem ponto flutuante (research §4). Valor padrão não altera viagens passadas (cópia na participação, slice 003). Exclusão só com confirmação explícita. | ✅ |
| VI. Privacidade e segurança | RLS com 4 políticas "somente o dono"; `motorista_id` preenchido pelo banco; `id` de outra conta → 404; verificação com segunda conta no quickstart. | ✅ |
| Fluxo de desenvolvimento | Testes unitários para as regras de valor/telefone; e2e em celular e desktop; slice concluído só após deploy e migração em produção. | ✅ |

**Reavaliação pós-design (Fase 1)**: sem violações. Duas divergências com o slice 001 foram
tratadas explicitamente: o telefone passa a ser obrigatório e ganha-se `observacao`
([data-model.md](./data-model.md)); a coluna de dono é `motorista_id`, e o exemplo do README que
usa `usuario_id` será corrigido (research §1).

## Fatias de Implementação (dentro deste slice)

Cada fatia termina publicada e demonstrável sozinha (Princípio II).

| Fatia | Entrega | Histórias | Depende de |
|-------|---------|-----------|------------|
| **A. Cadastro e lista** | Migração `passageiros` + RLS; `lib/passageiros/validacao.ts` + `formatPhone` com testes unitários; item "Passageiros" na navegação; `/passageiros` (lista, estado vazio, busca); `/passageiros/novo`; `components/aviso-url.tsx`; e2e de cadastro, validação, duplicidade e busca | US1 | slice 001 |
| **B. Detalhes e edição** | `/passageiros/[id]` (dados, telefone clicável, voltar com a busca); `/passageiros/[id]/editar`; action `editarPassageiro`; nome da lista passa a ser link; e2e de detalhes, edição e 404 | US2, US3 | A |
| **C. Arquivar, reativar e excluir** | Filtro "Ativos/Arquivados"; actions `arquivarPassageiro`, `reativarPassageiro` e `excluirPassageiro`; diálogos de confirmação; aviso de arquivado nos detalhes; e2e do ciclo completo; correção do exemplo `usuario_id` → `motorista_id` no README | US4 | B |

Antes da fatia A estar no ar, a lista ainda não tem link para os detalhes. Na fatia A, o sucesso
do cadastro redireciona para `/passageiros?aviso=cadastrado`; a fatia B troca o destino para os
detalhes, como no contrato.

## Estrutura do Projeto

### Documentação (esta funcionalidade)

```text
specs/002-registro-passageiros/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1 (guia de validação)
├── contracts/
│   ├── rotas.md         # Telas, navegação, diálogos e toasts
│   └── acoes.md         # Server actions, funções de validação e formatPhone
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Código-fonte (raiz do repositório)

Arquivos novos (➕) e alterados (✏️):

```text
app/(app)/passageiros/
├── ➕ page.tsx                        # lista (Server Component, lê situacao)
├── ➕ lista-passageiros.tsx           # cliente: busca, filtro, ResponsiveTable
├── ➕ actions.ts                      # server actions (contracts/acoes.md)
├── ➕ formulario-passageiro.tsx       # cliente: formulário compartilhado (novo/editar)
├── novo/
│   └── ➕ page.tsx
└── [id]/
    ├── ➕ page.tsx                    # detalhes
    ├── ➕ acoes-passageiro.tsx        # cliente: arquivar/reativar/excluir + ConfirmDialog
    └── editar/
        └── ➕ page.tsx

components/
├── ➕ aviso-url.tsx                   # toast a partir de ?aviso= (generaliza o aviso de senha)
├── ui/➕ textarea.tsx, ➕ badge.tsx     # gerados pelo shadcn, se ausentes
└── layout/✏️ nav-items.ts            # item "Passageiros"

lib/
├── passageiros/
│   ├── ➕ validacao.ts                # normalização e validação (funções puras)
│   ├── ➕ consultas.ts                # listar/obter passageiro (server-only)
│   └── ➕ tipos.ts                    # tipo Passageiro
└── ✏️ format.ts                       # formatPhone

supabase/migrations/
└── ➕ <timestamp>_passageiros.sql

tests/
├── unit/➕ passageiros-validacao.test.ts, ✏️ format.test.ts
└── e2e/➕ passageiros.spec.ts

✏️ README.md                            # exemplo de migração com motorista_id; item de navegação
```

**Decisão de estrutura**: segue o padrão do slice 001. A pasta da rota concentra página,
componentes cliente e actions do recurso; regras puras e consultas ficam em `lib/passageiros/`
para serem reutilizadas pelo slice 003 (seleção de passageiros ativos ao registrar viagens).

## Rastreamento de Complexidade

Não há violações da constituição a justificar.
