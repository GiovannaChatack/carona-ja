# Plano de Implementação: Controle de Pagamentos e Cobrança

**Branch**: `feature/controle-pagamentos`, a criar a partir da `main` (ver nota) | **Data**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificação em `specs/005-controle-pagamentos/spec.md`

> **Nota sobre a branch**: o repositório não tem hook de criação de branch. O slice 004
> (Histórico) foi concluído e integrado à `main` (`b74903e`) durante este planejamento; o slice
> 005 parte dessa `main`, em `feature/controle-pagamentos`, e é implementado e publicado em
> **uma única sessão** (tasks.md).

## Resumo

O slice permite ao motorista:

- saber **quem está devendo** e quanto, por passageiro e no total;
- **marcar como pagas** uma, várias ou todas as viagens pendentes de um passageiro, com a data do
  pagamento, e desfazer ou corrigir essa marcação;
- **cobrar pelo WhatsApp**, com uma mensagem pronta no modelo pedido (viagens, total e chave PIX),
  aberta na conversa do passageiro;
- ver a situação de pagamento de cada passageiro nos detalhes da viagem.

Abordagem técnica:

- **Banco**:
  - coluna `viagem_passageiros.pago_em date` (nula = pendente), validada por um trigger que
    garante as regras de data, viagem arquivada, valor zero e valor de participação paga
    (`CJ007`–`CJ009`);
  - views `participacoes_detalhe` e `pendencias_passageiros` (`security_invoker`), que definem uma
    única vez o que é dívida;
  - `editar_viagem` redefinida para não remover nem alterar o valor de participação paga;
  - `perfis.chave_pix`.
- **Gravação**: marcar, desfazer e corrigir são `update` com filtro pela API (RLS); um comando
  por ação garante o "tudo ou nada". Nenhuma RPC nova.
- **Cobrança**: função pura monta a mensagem (testada contra o exemplo da spec, caractere a
  caractere) e o link `https://wa.me/55<telefone>?text=…`; o envio é do motorista, no WhatsApp.
  "Copiar mensagem" como alternativa.
- **Telas**: `app/(app)/pagamentos/` com os mesmos componentes e padrões dos slices 002 e 003;
  ajustes pequenos nas telas de passageiro e de viagem.

## Contexto Técnico

**Linguagem/Versão**: TypeScript 5 (`strict`), Node.js 20 LTS+ (ambiente local com Node 24);
SQL/PLpgSQL (Postgres do Supabase)

**Dependências Principais**: as dos slices anteriores (Next.js 16 App Router, React 19, Tailwind
CSS 4, shadcn/ui, sonner, lucide-react, @supabase/ssr). **Nenhuma dependência nova e nenhum
componente shadcn novo**: `alert-dialog`, `badge`, `card`, `input`, `label` e `table` já existem;
caixas de marcação e `<input type="date">` são nativos. Antes de escrever código, conferir em
`node_modules/next/dist/docs/` as notas de Server Actions, `redirect` e `revalidatePath` do
Next 16 (AGENTS.md).

**Armazenamento**: Supabase Postgres, duas migrações:

- `<ts>_pagamentos.sql` (fatia A): `pago_em`, índice, trigger, views e `editar_viagem`;
- `<ts>_chave_pix.sql` (fatia B): `perfis.chave_pix`.

**Testes**: Vitest (mensagem, link, validações, `hojeEmSaoPaulo`) e Playwright (`mobile` 360px e
`desktop` 1280px)

**Plataforma Alvo**: navegadores modernos de celular e desktop; hospedagem na Vercel; WhatsApp
instalado no celular ou WhatsApp Web/desktop no computador

**Tipo de Projeto**: aplicação web (projeto único Next.js, sem backend separado)

**Metas de Desempenho**:

- cobrança aberta no WhatsApp em ≤ 4 toques e < 20 s a partir de `/inicio` (SC-001);
- "Recebi tudo" em < 15 s (SC-002);
- prévia e total da cobrança atualizados a cada toque, sem ida ao servidor.

**Restrições**:

- RLS já ativa nas tabelas envolvidas; views com `security_invoker`; trigger e função
  `security invoker` com `search_path = ''`;
- dinheiro em centavos inteiros; `pago_em` é um dia de `America/Sao_Paulo`;
- nenhum serviço externo pago; o WhatsApp é aberto por link (Princípio III);
- a chave PIX real nunca entra no repositório nem nos testes;
- sem rolagem horizontal de 360px a 1920px; alvos ≥ 44px; WCAG AA; textos em pt-BR;
- custo R$ 0/mês.

**Escala/Escopo**:

- 1 motorista, dezenas de passageiros, poucas centenas de participações por ano (até ~60
  pendentes por passageiro);
- 4 telas novas e 3 ajustadas (`/passageiros/[id]`, `/viagens/[id]`, `/viagens/[id]/editar`);
- 2 colunas, 1 trigger, 2 views e 1 função redefinida.

Todas as decisões estão em [research.md](./research.md); não há "NEEDS CLARIFICATION" pendente.

## Constitution Check

*GATE: deve passar antes da Fase 0. Reavaliado após a Fase 1.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Documentação pt-BR | Artefatos, colunas, views, rotas e mensagens em pt-BR. Valores `R$ 1.234,56` (inclusive na mensagem de cobrança, que padroniza o `R$ 20.00` do exemplo), datas `DD/MM/AAAA`. | ✅ |
| II. Vertical slices | Depende dos slices 001–003, declarados na spec; não depende do 004 (já publicado; só reaproveita `hojeEmSaoPaulo`). As migrações pertencem às fatias que as usam (`pago_em` na A, `chave_pix` na B). O slice é feito e publicado em uma única sessão; as fatias A, B e C só ordenam o trabalho, e cada uma deixa o sistema funcionando caso a seguinte não seja feita. Telas já alteradas pelo 004 recebem só acréscimos (research §13). | ✅ |
| III. Simplicidade | Só Supabase e Vercel; WhatsApp por link, sem API paga. Sem RPC nova: `update` + trigger. Sem tabela nova: colunas em tabelas existentes. Nenhuma dependência nova. | ✅ |
| IV. Interface mobile-first | Marcar pagamentos em poucos toques (seleção + rodapé fixo, ou "Recebi tudo"); cobrança em uma tela com prévia e botão grande; `ResponsiveTable` em cartões < 768px; alvos ≥ 44px. | ✅ |
| V. Integridade dos dados | Situação rastreável por passageiro e viagem com a data do pagamento (`pago_em`). Totais devidos derivados por view, nunca digitados; total da mensagem somado em centavos. Viagens arquivadas fora de pendências e totais. Arquivar viagem com pagamentos exige confirmação explícita reforçada. Valor de participação paga protegido pelo banco. Datas no fuso de São Paulo. | ✅ |
| VI. Privacidade e segurança | Todas as leituras e gravações sob RLS; views `security_invoker`; ids de outra conta não casam; `?voltar=` restrito a caminho interno; chave PIX só no banco, por conta; verificação com segunda conta (quickstart, cenário 21). | ✅ |
| Fluxo de desenvolvimento | Testes unitários para mensagem, totais, datas e chave PIX; e2e em celular e desktop; slice concluído só após deploy e migrações em produção. | ✅ |

**Reavaliação pós-design (Fase 1)**: sem violações. Divergências em relação a planos anteriores,
todas registradas em [research.md](./research.md):

- `pago_em` é `date`, e não `timestamptz` (research §1);
- a exclusão de participação paga é barrada em `editar_viagem`, não no trigger (research §2);
- a confirmação de arquivamento com pagamentos é reforçada no diálogo, sem passo extra no
  servidor (research §5).

Obrigação registrada para o slice 006: o valor recebido no mês MUST usar `pago_em` e ignorar
viagens arquivadas, como as views deste slice.

## Fatias de Implementação (dentro deste slice)

O slice é implementado em **uma única sessão** e publicado uma vez, ao final (pedido do usuário
em `/speckit-tasks`). As fatias definem a ordem do trabalho; cada uma termina com a suíte verde,
sem telas sem uso (Princípio II).

| Fatia | Entrega | Histórias | Depende de |
|-------|---------|-----------|------------|
| **A. Pendências e pagamentos** | Migração `pagamentos` (coluna, índice, trigger, views, `editar_viagem`); `lib/pagamentos/{tipos,validacao,consultas}.ts` e `formatDataCampo` com testes; item "Pagamentos" na navegação; `/pagamentos` e `/pagamentos/[passageiroId]` (marcar, "Recebi tudo", desfazer, alterar data, "Carregar mais"); cartão na tela do passageiro; travas no formulário de edição e `CJ007`; diálogo reforçado de arquivar; e2e `pagamentos.spec.ts` | US1, US4 | slices 001–003 |
| **B. Chave PIX e cobrança** | Migração `chave_pix`; `lib/pagamentos/mensagem.ts` com testes; `/pagamentos/configuracoes`; `/pagamentos/[id]/cobrar` (prévia, desmarcar, WhatsApp, copiar); botão "Cobrar pelo WhatsApp" e link "Chave PIX"; e2e `cobranca.spec.ts` | US2, US3 | A |
| **C. Situação na viagem** | Badges de situação e "Marcar como pago" em `/viagens/[id]`; action `marcarPagamentoNaViagem`; e2e no `pagamentos.spec.ts` | US5 | A |

## Estrutura do Projeto

### Documentação (esta funcionalidade)

```text
specs/005-controle-pagamentos/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1 (guia de validação)
├── contracts/
│   ├── rotas.md         # Telas, navegação, diálogos e toasts
│   └── acoes.md         # Server actions, consultas, trigger e funções de domínio
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Código-fonte (raiz do repositório)

Arquivos novos (➕) e alterados (✏️):

```text
app/(app)/
├── pagamentos/
│   ├── ➕ page.tsx                         # pendências por passageiro e total geral
│   ├── ➕ actions.ts                       # marcar, receber tudo, desfazer, alterar data, marcar na viagem
│   ├── [passageiroId]/
│   │   ├── ➕ page.tsx                     # pendentes, pagas, total devido
│   │   ├── ➕ lista-pendentes.tsx          # cliente: seleção, data, "Recebi tudo"
│   │   ├── ➕ lista-pagas.tsx              # cliente: alterar data, desfazer
│   │   └── cobrar/
│   │       ├── ➕ page.tsx                 # fatia B
│   │       └── ➕ cobranca.tsx             # cliente: prévia, WhatsApp, copiar
│   └── configuracoes/
│       ├── ➕ page.tsx                     # fatia B: chave PIX
│       ├── ➕ actions.ts
│       └── ➕ formulario-chave-pix.tsx
├── passageiros/[id]/✏️ page.tsx            # cartão "Pagamentos" (total devido)
└── viagens/
    ├── ✏️ actions.ts                       # CJ007 em erroDaFuncao
    ├── ✏️ formulario-viagem.tsx            # passageiros pagos travados
    └── [id]/
        ├── ✏️ page.tsx                     # contagem de pagas (A); situação e marcar (C)
        ├── ✏️ acoes-viagem.tsx             # diálogo reforçado de arquivar
        └── ➕ marcar-pagamento.tsx         # fatia C: diálogo com data

components/layout/✏️ nav-items.ts           # item "Pagamentos"

lib/
├── ✏️ format.ts                            # formatDataCampo (hojeEmSaoPaulo já existe)
├── pagamentos/
│   ├── ➕ tipos.ts
│   ├── ➕ validacao.ts                     # validarDataPagamento, validarChavePix, caminhoVoltarSeguro
│   ├── ➕ mensagem.ts                      # primeiroNome, montarMensagemCobranca, linkWhatsApp, totalItens
│   └── ➕ consultas.ts
└── viagens/
    ├── ✏️ tipos.ts                         # Participacao.pago_em
    └── ✏️ consultas.ts                     # pago_em em obterViagem; pagos no formulário

supabase/migrations/
├── ➕ <ts>_pagamentos.sql
└── ➕ <ts>_chave_pix.sql

tests/
├── unit/➕ pagamentos-mensagem.test.ts, ➕ pagamentos-validacao.test.ts, ✏️ format.test.ts
└── e2e/
    ├── ➕ pagamentos.spec.ts
    └── ➕ cobranca.spec.ts

✏️ README.md                                 # navegação, erros CJ007–CJ009, views de pendências
```

**Decisão de estrutura**: segue o padrão dos slices 002 e 003. A pasta de cada rota concentra a
página, os componentes cliente e as actions; regras puras e consultas ficam em
`lib/pagamentos/`. Arquivos já alterados pelo slice 004 (`nav-items.ts`,
`passageiros/[id]/page.tsx`, `viagens/[id]/page.tsx`) recebem apenas acréscimos, preservando o
"Ver histórico" e o retorno ao Histórico.

## Rastreamento de Complexidade

Não há violações da constituição a justificar.
