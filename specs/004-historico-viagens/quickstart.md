# Quickstart / Guia de Validação: Histórico de Viagens

Este guia mostra que o slice 004 funciona de ponta a ponta. As funções SQL estão em
[data-model.md](./data-model.md), a tela em [contracts/rotas.md](./contracts/rotas.md) e as
funções de domínio em [contracts/consultas.md](./contracts/consultas.md).

## Pré-requisitos

- Slices 001, 002 e 003 publicados e funcionando.
- Branch `feature/historico-viagens`.
- `.env.local` com `E2E_EMAIL`/`E2E_SENHA` de uma conta de **teste** e as variáveis
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Nenhum dado manual: cada teste cria pela API os próprios passageiros, trajetos e viagens (nomes
  `E2E …`) e os remove no fim. Não é preciso uma segunda conta.

## Aplicar a migração

```bash
npx supabase db push
```

Esperado: `<ts>_historico.sql` aplicada sem erros. No painel do Supabase aparecem as funções
`historico_viagens` e `historico_resumo`; **nenhuma** tabela, coluna ou view muda. Se a migração
do slice 005 já tiver sido aplicada, a ordem não importa.

## Validação automatizada

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm run test
```

Esperado: `tests/unit/historico-filtros.test.ts` passa com todos os exemplos obrigatórios de
[contracts/consultas.md](./contracts/consultas.md), e os testes dos slices anteriores continuam
passando.

```bash
npm run test:e2e
```

Esperado: `tests/e2e/historico.spec.ts` passa nos projetos `mobile` (360px) e `desktop`
(1280px), junto com os testes dos slices 001–003. A limpeza remove os dados `E2E …` criados.

## Cenários e testes automatizados

Os antigos cenários de validação manual são cobertos por testes em
`tests/e2e/historico.spec.ts` (abaixo, o nome do teste), rodando em 360px e 1280px. Toda
asserção é isolada pelo trajeto ou pelo passageiro criados pelo próprio teste.

| # | Cenário | Teste automatizado | Ref. |
|---|---------|--------------------|------|
| 1 | Abrir o histórico: viagens do mês, mais recente primeiro, resumo; arquivada ausente | "este mês e mês passado, sem as arquivadas" | US1-1, FR-002 |
| 2 | Colunas no desktop e cartões no celular, sem rolagem horizontal | "cada viagem mostra data, percurso, sentido, nomes e total, sem rolagem horizontal" | US1-2/3, FR-012, SC-008 |
| 3 | Período "Mês passado" | "este mês e mês passado, sem as arquivadas" | US1-4 |
| 4 | Personalizado com "De" depois de "Até" (e datas faltando) | "período personalizado inválido no formulário e na URL" | FR-005 |
| 5 | Personalizado de um único dia | "viagem às 23:30 do último dia do mês fica nesse mês (SC-005)" | US1-5 |
| 6 | Filtrar por passageiro: valor dele na linha e no resumo | "valor do passageiro na linha e no resumo; atalho e arquivado" | US2-1/2/3, SC-003 |
| 7 | Trajeto + sentido combinados | "filtros combinados, limpar e trajeto arquivado" | US3-1/2/3 |
| 8 | "Limpar filtros" | "filtros combinados, limpar e trajeto arquivado" | US3-4, FR-008 |
| 9 | Abrir uma viagem a partir do histórico filtrado e voltar | "abrir uma viagem e voltar mantém os filtros; recarregar também" | US1-8, FR-009 |
| 10 | Recarregar a página com filtros | "abrir uma viagem e voltar mantém os filtros; recarregar também" | FR-009 |
| 11 | "Ver histórico" no detalhe do passageiro | "valor do passageiro na linha e no resumo; atalho e arquivado" | US2-5, FR-010 |
| 12 | Passageiro arquivado no filtro | "valor do passageiro na linha e no resumo; atalho e arquivado" | US2-4, FR-007 |
| 13 | Viagem às 23:30 do último dia do mês | "viagem às 23:30 do último dia do mês fica nesse mês (SC-005)" | SC-005 |
| 14 | Filtro sem resultados | "trajeto sem viagens no período mostra o estado vazio e o resumo zerado" | FR-017 |
| 15 | Viagem editada mostra os valores atuais | "viagem editada mostra os valores atuais" | Casos de borda |
| 16 | `?passageiro=`/`?trajeto=` inexistentes na URL | "passageiro ou trajeto inexistente na URL é ignorado (FR-020)" | FR-020 |
| 17 | Sem sessão: tela e funções SQL sem dados (substitui a segunda conta) | "sem sessão, /historico leva ao login…" e "sem sessão, as funções do histórico não devolvem dados (FR-020)" | SC-007, FR-020 |
| 18 | Mais de 20 viagens: "Carregar mais" e resumo = soma das linhas | "carregar mais e resumo com todas as viagens (FR-014, SC-002)" | FR-014/015, SC-002 |
| 19 | Item "Histórico" na navegação, marcado como atual | "item "Histórico" na navegação, marcado como atual" | FR-001 |
| 20 | Trajeto arquivado no filtro | "filtros combinados, limpar e trajeto arquivado" | US3-5, FR-007 |

A RLS entre contas é garantida pelas funções `security invoker` sobre tabelas com RLS por
`motorista_id` (slices 002–003); ids de outra conta não aparecem nas opções e são descartados como
no cenário 16.

Para detectar instabilidade por paralelismo:

```bash
npx playwright test tests/e2e/historico.spec.ts --repeat-each=3
```

## Validação da publicação

1. Faça o merge de `feature/historico-viagens` na `main` (resolvendo, se o slice 005 já tiver
   entrado, os conflitos dos pontos de contato listados em [research.md §9](./research.md)) e
   aguarde o deploy na Vercel.
2. Confirme que a migração está no Supabase de produção (`npx supabase migration list`: a versão
   `<ts>_historico` aparece em Local e Remote; se não, `npx supabase db push`).
3. Rode o e2e do histórico contra a produção, sem passos manuais:

   ```bash
   E2E_BASE_URL=https://<url-produção> npx playwright test tests/e2e/historico.spec.ts
   ```
