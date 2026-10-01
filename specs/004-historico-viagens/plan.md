# Plano de Implementação: Histórico de Viagens

**Branch**: `feature/historico-viagens` | **Data**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificação em `specs/004-historico-viagens/spec.md`

## Resumo

O slice cria a tela **Histórico** (`/historico`): as viagens ativas de um período (padrão: este
mês), em tabela no computador e em cartões no celular, com filtros combináveis por período,
passageiro, trajeto e sentido e um resumo com o número de viagens e o total cobrado do resultado
(ou do passageiro filtrado). O detalhe do passageiro ganha o atalho "Ver histórico".

Abordagem técnica:

- **Banco**: uma migração que só **cria** duas funções SQL somente leitura,
  `historico_viagens` (linhas) e `historico_resumo` (totais), `security invoker`, com a conversão
  do período para o fuso `America/Sao_Paulo` feita no Postgres. Nenhuma tabela, view ou função
  existente é alterada.
- **Domínio**: `lib/historico/filtros.ts`, funções puras para ler/escrever os filtros na URL e
  resolver o período, com testes unitários.
- **Tela**: página servidor que lê a URL, chama as duas funções em paralelo e reutiliza
  `ResponsiveTable`, `EmptyState` e os formatadores; um componente cliente pequeno para os
  filtros.

**Restrições da spec**: implementado **em paralelo ao slice 005**, sem depender de pagamentos e
com o mínimo de arquivos em comum ([research.md §9](./research.md)); **sessão única**, sem
fatias internas.

## Contexto Técnico

**Linguagem/Versão**: TypeScript 5 (strict), Node.js 20+; SQL (Postgres 15 do Supabase)

**Dependências principais**: Next.js 16.3 (App Router, `proxy.ts`), React 19.2, Tailwind 4,
shadcn/ui, `@supabase/ssr`, `lucide-react`. **Nenhuma dependência nova.**

**Armazenamento**: Supabase Postgres; leitura de `viagens`, `viagem_passageiros`, `passageiros`,
`trajetos` via RPC

**Testes**: Vitest (unitários), Playwright (e2e, projetos `mobile` 360px e `desktop` 1280px)

**Plataforma**: Vercel (frontend) + Supabase (banco/auth)

**Tipo de projeto**: aplicação web única (Next.js full-stack)

**Metas de desempenho**: primeiras viagens e resumo em ≤ 2 s com 500 viagens no período
(SC-006); uma ida ao banco por consulta (linhas e resumo em paralelo)

**Restrições**: somente leitura; fuso `America/Sao_Paulo`; sem rolagem horizontal de 360 a
1920px; filtros na URL; nenhum objeto de banco dos slices anteriores alterado

**Escala/Escopo**: um motorista, centenas de viagens por ano; 1 tela nova, 3 telas com ajustes
de poucas linhas

## Constitution Check

*GATE: deve passar antes da Fase 0. Reavaliado após a Fase 1.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Documentação pt-BR | Artefatos em pt-BR; funções SQL, rotas e parâmetros em pt-BR (`historico_viagens`, `/historico`, `?periodo=`), como nos slices anteriores. `R$`, `DD/MM/AAAA`, `HH:mm`. | ✅ |
| II. Vertical slices | Depende de 001–003, declarados na spec; independente do 005. A única migração pertence a este slice e só cria o que ele usa. Entrega completa (banco → lógica → tela) em uma sessão; se os slices seguintes nunca vierem, a tela continua útil. | ✅ |
| III. Simplicidade | Só Supabase e Vercel; funções SQL no lugar de backend próprio; nenhuma dependência nova; estado na URL, sem store de cliente. | ✅ |
| IV. Interface mobile-first | `ResponsiveTable` em cartões < 768px com todas as informações essenciais; filtros empilhados no celular; alvos ≥ 44px; descobrir "quanto deu fulano este mês" em 2 toques (menu + passageiro). | ✅ |
| V. Integridade dos dados | Resumo **derivado** no banco das mesmas linhas filtradas (nunca digitado), em centavos inteiros; período convertido em `America/Sao_Paulo` no Postgres; arquivadas fora (obrigação do slice 003). Invariante resumo = soma das linhas testada no e2e. Sem exclusões. | ✅ |
| VI. Privacidade e segurança | Funções `security invoker` (RLS das tabelas vale), `execute` revogado de `anon`/`public`; filtros com ids de outra conta ignorados; verificação com segunda conta no quickstart (cenário 17). | ✅ |
| Fluxo de desenvolvimento | Testes unitários das regras de período e filtros; e2e em celular e desktop; slice concluído só após merge, deploy e migração em produção. | ✅ |

**Reavaliação pós-design (Fase 1)**: sem violações. Pontos de atenção registrados:

- a BottomNav chega a 5 itens com o "Pagamentos" do slice 005 (limite documentado em
  `nav-items.ts`); o slice 006 precisará rever a navegação;
- três arquivos existentes recebem ajustes pequenos e aditivos, potenciais conflitos de merge
  com o slice 005 ([research.md §9](./research.md)).

## Ordem de Implementação (sessão única)

Sem fatias publicadas separadamente; a ordem abaixo mantém o sistema compilando a cada passo.

1. **Migração** `<ts>_historico.sql` (duas funções + grants) e `npx supabase db push` no banco de
   desenvolvimento.
2. **Domínio**: `lib/historico/tipos.ts`, `lib/historico/filtros.ts`, `hojeEmSaoPaulo` em
   `lib/format.ts`; testes unitários primeiro.
3. **Consultas**: `lib/historico/consultas.ts`.
4. **Tela**: `app/(app)/historico/page.tsx`, `filtros-historico.tsx`, `tabela-historico.tsx`,
   `error.tsx`; prop opcional `mensagem` em `ErroConexao`.
5. **Pontos de contato**: item na navegação, "voltar" em `/viagens/[id]`, botão "Ver histórico"
   em `/passageiros/[id]`.
6. **E2E** `tests/e2e/historico.spec.ts` (helpers existentes, ampliados se preciso).
7. **Fechamento**: README, lint/typecheck/testes, validação manual (quickstart), merge na `main`,
   deploy e migração em produção.

## Estrutura do Projeto

### Documentação (esta funcionalidade)

```text
specs/004-historico-viagens/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1 (funções SQL; nenhuma tabela nova)
├── quickstart.md        # Fase 1 (guia de validação)
├── contracts/
│   ├── rotas.md         # Tela, navegação, voltar e atalho do passageiro
│   └── consultas.md     # Funções SQL, lib/historico/* e exemplos de teste
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Código-fonte (raiz do repositório)

Arquivos novos (➕) e alterados (✏️):

```text
app/(app)/
├── historico/
│   ├── ➕ page.tsx                      # lê filtros, consulta linhas + resumo, monta a tela
│   ├── ➕ filtros-historico.tsx         # cliente: selects, período personalizado, limpar
│   ├── ➕ tabela-historico.tsx          # ResponsiveTable, colunas dinâmicas, "Carregar mais", vazios
│   └── ➕ error.tsx                     # "Não foi possível carregar o histórico…"
├── passageiros/[id]/✏️ page.tsx         # botão "Ver histórico"  (ponto de contato com 005)
└── viagens/[id]/✏️ page.tsx             # hrefDeVolta com volta=historico (ponto de contato)

components/
├── ✏️ erro-conexao.tsx                  # prop opcional `mensagem`
└── layout/✏️ nav-items.ts               # item "Histórico"  (ponto de contato com 005)

lib/
├── ✏️ format.ts                         # hojeEmSaoPaulo
└── historico/
    ├── ➕ tipos.ts
    ├── ➕ filtros.ts                    # lerFiltros, paraQuery, resolverPeriodo, rotuloPeriodo
    └── ➕ consultas.ts                  # opções, listarHistorico, resumirHistorico, existeViagemAtiva

supabase/migrations/
└── ➕ <ts>_historico.sql                # só cria historico_viagens e historico_resumo

tests/
├── unit/➕ historico-filtros.test.ts, ✏️ format.test.ts
└── e2e/➕ historico.spec.ts

✏️ README.md                              # slice 004 na lista de concluídos
```

**Decisão de estrutura**: mesma organização dos slices anteriores (rota em `app/(app)/`,
domínio em `lib/<recurso>/`, uma migração por slice). Todo código novo fica em pastas próprias
do histórico para reduzir conflitos com o slice 005.

## Rastreamento de Complexidade

Sem violações da constituição a justificar.
