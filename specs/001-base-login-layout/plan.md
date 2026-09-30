# Plano de Implementação: Base do Projeto (Login, Layout Responsivo e Deploy Inicial)

**Branch**: `001-base-login-layout` | **Data**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificação em `specs/001-base-login-layout/spec.md`

## Resumo

Criar a fundação do Caronas Já:

- uma aplicação web Next.js publicada na Vercel e conectada ao Supabase;
- login por e-mail e senha, sem cadastro público e com recuperação de senha por e-mail;
- rotas protegidas no servidor;
- layout responsivo baseado no dashboard do shadcn/ui: barra lateral no desktop, navegação
  inferior no celular e tema claro/escuro automático com alternância manual;
- componentes e formatadores pt-BR reutilizáveis;
- a primeira migração do banco (`perfis`), que estabelece o padrão de RLS e de migrações dos
  próximos slices.

## Contexto Técnico

**Linguagem/Versão**: TypeScript 5 (modo `strict`), Node.js 20 LTS+

**Dependências Principais**: Next.js (App Router), React, Tailwind CSS, shadcn/ui (Radix +
lucide-react), next-themes, sonner, @supabase/supabase-js, @supabase/ssr

**Armazenamento**: Supabase Postgres (migrações SQL em `supabase/migrations/`) + Supabase Auth

**Testes**: Vitest (unitários), Playwright (ponta a ponta de fumaça e responsividade)

**Plataforma Alvo**: navegadores modernos de celular (Android/iOS) e desktop; hospedagem na
Vercel

**Tipo de Projeto**: aplicação web (projeto único Next.js, sem backend separado)

**Metas de Desempenho**: tela inicial em ≤ 3s no 4G (SC-003); publicação em ≤ 10 min (SC-005)

**Restrições**:

- custo de R$ 0/mês (planos gratuitos);
- nenhuma chave secreta no cliente;
- RLS em todas as tabelas;
- sem rolagem horizontal de 360px a 1920px;
- alvos de toque ≥ 44px;
- WCAG AA.

**Escala/Escopo**: 1 usuário; 8 rotas neste slice; volume de dados mínimo (apenas `perfis`)

Todas as decisões estão justificadas em [research.md](./research.md); não há "NEEDS
CLARIFICATION" pendente.

## Constitution Check

*GATE: deve passar antes da Fase 0. Reavaliado após a Fase 1.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Documentação pt-BR | Artefatos em pt-BR. Convenção de nomes registrada (domínio em pt-BR, código técnico em inglês — research §6). Datas `DD/MM/AAAA`, `R$`. | ✅ |
| II. Vertical slices | Slice 001 sem pré-requisitos. Entrega login + layout + deploy utilizáveis sozinhos. Só cria a migração que usa (`perfis`). Navegação sem itens de telas inexistentes. Implementação interna também fatiada (ver abaixo). | ✅ |
| III. Simplicidade (Supabase + Vercel) | Somente Supabase e Vercel. Auth, RLS e e-mails nativos. Sem backend próprio nem ORM. Dependências mínimas e justificadas. | ✅ |
| IV. Interface responsiva mobile-first | BottomNav < 768px, Sidebar ≥ 768px. Alvos ≥ 44px. `ResponsiveTable` definido para os próximos slices. | ✅ |
| V. Integridade dos dados | Neste slice não há dados financeiros. Formatadores de centavos/fuso preparados e testados. Modelo futuro já prevê centavos, `timestamptz` e resumo derivado. | ✅ |
| VI. Privacidade e segurança | Rotas protegidas no servidor. RLS em `perfis`. Cadastro público desligado. Sem `service_role` no cliente. Proteção contra redirect aberto. | ✅ |
| Fluxo de desenvolvimento | Testes unitários (formatadores) + e2e em larguras de celular e desktop. Slice só é concluído com o deploy em produção. | ✅ |

**Reavaliação pós-design (Fase 1)**: sem violações. O `data-model.md` mantém as tabelas futuras
apenas como referência, sem migrá-las agora.

## Fatias de Implementação (dentro deste slice)

Para respeitar o Princípio II também dentro da fundação, a implementação é dividida em três
fatias verticais. Cada uma pode ser feita em uma sessão separada e termina publicada.

| Fatia | Entrega | História | Depende de |
|-------|---------|----------|------------|
| **A. Esqueleto publicado** | Projeto Next.js + Tailwind + shadcn/ui; página pública provisória; `.env.example`; projeto Supabase criado e conectado; deploy automático na Vercel; README com guia de publicação | US3 | — |
| **B. Login e sessão** | Migração `perfis` + RLS; middleware; `/entrar`, `/esqueci-senha`, `/auth/confirmar`, `/redefinir-senha`, `/sair`; `/inicio` mínima protegida; testes e2e de autenticação | US1 | A |
| **C. Layout e padrões visuais** | `AppShell` (Sidebar/BottomNav/Header), `ThemeToggle`, componentes base, formatadores + testes, estado vazio de `/inicio`, página 404, testes de responsividade | US2 | B |

> A ordem difere da prioridade da spec (P1 = login) porque o deploy é pré-requisito técnico para
> validar o login em produção. Cada fatia é demonstrável sozinha.

## Roteiro Geral de Slices do Projeto

| Slice | Nome | Depende de | Tabelas/objetos que cria |
|-------|------|-----------|--------------------------|
| 001 | Base (este) | — | `perfis` |
| 002 | Passageiros | 001 | `passageiros` |
| 003 | Registro de viagens | 002 | `viagens`, `viagem_passageiros` |
| 004 | Histórico em tabela | 003 | (consultas/filtros) |
| 005 | Controle de pagamentos | 003 | (usa `viagem_passageiros.pago_em`) |
| 006 | Resumo mensal | 003 (005 para o "recebido") | view `resumo_mensal` |

Os slices 004 e 005 são independentes entre si e podem ser feitos em qualquer ordem. O modelo
completo está em [data-model.md](./data-model.md) (Parte 2).

## Estrutura do Projeto

### Documentação (esta funcionalidade)

```text
specs/001-base-login-layout/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1 (slice atual + visão do modelo completo)
├── quickstart.md        # Fase 1 (guia de validação)
├── contracts/
│   ├── rotas.md         # Rotas, middleware e mensagens de erro
│   ├── ambiente.md      # Variáveis de ambiente e configuração Supabase/Vercel
│   └── ui.md            # AppShell, componentes base e formatadores
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Código-fonte (raiz do repositório)

```text
app/
├── layout.tsx                 # ThemeProvider, Toaster, fonte, lang="pt-BR"
├── page.tsx                   # redireciona para /inicio ou /entrar
├── not-found.tsx              # 404 em pt-BR
├── (publico)/
│   ├── layout.tsx             # layout centralizado das telas de acesso
│   ├── entrar/page.tsx
│   ├── esqueci-senha/page.tsx
│   └── redefinir-senha/page.tsx
├── (app)/
│   ├── layout.tsx             # AppShell (exige sessão)
│   └── inicio/page.tsx
├── auth/confirmar/route.ts
└── sair/route.ts

components/
├── ui/                        # componentes shadcn/ui gerados
├── layout/                    # app-shell, app-sidebar, bottom-nav, app-header, nav-items.ts
├── theme-toggle.tsx
├── empty-state.tsx
├── responsive-table.tsx
└── confirm-dialog.tsx

lib/
├── supabase/                  # client.ts, server.ts, middleware.ts
├── auth/redirect.ts           # validação de "proximo"
├── format.ts                  # formatadores pt-BR
└── utils.ts                   # cn() do shadcn

middleware.ts

supabase/
├── config.toml                # enable_signup = false
└── migrations/
    └── <timestamp>_perfis.sql

tests/
├── unit/                      # format.test.ts, redirect.test.ts
└── e2e/                       # auth.spec.ts, layout.spec.ts

.env.example
README.md                      # guia pt-BR de configuração e publicação
```

**Decisão de estrutura**: projeto único Next.js na raiz. Os grupos de rotas `(publico)` e
`(app)` separam as telas de acesso das telas autenticadas; os próximos slices adicionam páginas em
`app/(app)/<recurso>/` e migrações em `supabase/migrations/`.

## Rastreamento de Complexidade

Não há violações da constituição a justificar.
