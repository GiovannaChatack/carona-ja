# Quickstart / Guia de Validação: Controle de Pagamentos e Cobrança

Este guia mostra que o slice 005 funciona de ponta a ponta. O modelo está em
[data-model.md](./data-model.md), as telas em [contracts/rotas.md](./contracts/rotas.md) e as
actions, consultas e regras em [contracts/acoes.md](./contracts/acoes.md).

## Pré-requisitos

- Slices 001 a 004 publicados e funcionando (o 004 não é usado por este slice).
- `.env.local` com `E2E_EMAIL`/`E2E_SENHA` de uma conta de **teste**.
- Uma segunda conta de teste, usada só na verificação de RLS.
- Na conta principal: passageiros "Duda" (telefone `(11) 91234-5678`, `R$ 10,00`) e "Maria
  Eduarda" (`R$ 12,00`); um trajeto "Casa → Faculdade".
- Use uma chave PIX **fictícia** nos testes (ex.: `teste@exemplo.com`).

## Aplicar as migrações

```bash
npx supabase db push
```

Esperado: aplicadas sem erros `<ts>_pagamentos.sql` (fatia A) e `<ts>_chave_pix.sql` (fatia B).
No painel do Supabase:

- `viagem_passageiros.pago_em` (`date`) e o trigger `viagem_passageiros_validar_pagamento`;
- as views `participacoes_detalhe` e `pendencias_passageiros`;
- `perfis.chave_pix` (`text`).

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

Esperado: passam `pagamentos-mensagem.test.ts`, `pagamentos-validacao.test.ts` e `format.test.ts`
com os exemplos obrigatórios de [contracts/acoes.md](./contracts/acoes.md), além dos testes dos
slices anteriores.

```bash
npm run test:e2e
```

Esperado: `pagamentos.spec.ts` e `cobranca.spec.ts` passam em `mobile` (360px) e `desktop`
(1280px), junto com os testes dos slices 001–003.

## Cenários de validação manual

Registre antes: em 28/09/2026, uma Ida e uma Volta com Duda (R$ 10,00 cada) e Maria Eduarda
(R$ 12,00 cada).

| # | Cenário | Resultado esperado | Ref. |
|---|---------|--------------------|------|
| 1 | Abrir `/pagamentos` em uma aba anônima | Redireciona para `/entrar?proximo=…` | FR-026 |
| 2 | Tocar em "Pagamentos" na navegação | Maria Eduarda "2 viagens · R$ 24,00" acima de Duda "2 viagens · R$ 20,00"; "Total a receber R$ 44,00" | FR-005, FR-006, SC-004 |
| 3 | Abrir Duda | Pendentes: 28/09/2026 Ida e Volta, R$ 10,00 cada; "Total devido R$ 20,00"; "Nenhum pagamento" em Pagas | FR-007 |
| 4 | Selecionar a Ida e marcar como paga com a data de hoje | Toast "1 viagem marcada como paga"; total devido R$ 10,00; a Ida aparece em Pagas com "Pago em" hoje | FR-008, US1 |
| 5 | Tentar marcar a Volta com data de amanhã e com 27/09/2026 | Mensagem no campo de data em cada caso; nada muda | FR-009 |
| 6 | Em duas abas na tela de Duda, marcar a Volta na primeira e depois na segunda | A segunda informa "1 viagem já estava paga"; a data registrada é a da primeira | FR-011 |
| 7 | Na Ida paga, "Alterar data" para ontem; depois "Desfazer" | A data muda; ao desfazer, volta às pendentes e o total sobe | FR-012, US4 |
| 8 | Em Maria Eduarda, "Recebi tudo" | Todas as pendentes viram pagas; ela some de `/pagamentos` | FR-008 |
| 9 | Abrir `/passageiros/[Duda]` | Cartão "Pagamentos" com o total devido e "Ver pagamentos" | FR-013 |
| 10 | Editar a viagem de Ida: tentar mudar o valor de Maria Eduarda (paga) e removê-la | Campos dela desabilitados com "Pago em …"; via requisição forçada, erro `CJ007` com a mensagem orientando desfazer; mudar a hora da viagem é aceito | FR-025 |
| 11 | Arquivar a viagem de Ida | Diálogo "Arquivar viagem com pagamentos?" com a contagem; ao confirmar, a Ida some das pendências e das pagas; reativar devolve as situações anteriores | FR-024, FR-004 |
| 12 | Registrar uma viagem com Duda a R$ 0,00 | Não aparece em pendências nem na cobrança | FR-003, SC-005 |
| 13 | Sem chave PIX, tocar em "Cobrar pelo WhatsApp" em Duda | Vai para "Chave PIX" com o aviso; ao salvar `teste@exemplo.com`, volta à cobrança | FR-023, US3 |
| 14 | Tentar salvar a chave vazia e com 78 caracteres | Mensagem no campo; a chave anterior é mantida | FR-022 |
| 15 | Na cobrança de Duda (Ida e Volta pendentes), "Copiar mensagem" e colar em um editor | Texto idêntico ao modelo da spec, com `R$ 20,00` e `*teste@exemplo.com*` | FR-017, SC-006 |
| 16 | Desmarcar a Volta | Prévia e totais passam a `R$ 10,00`, só com a linha da Ida | FR-016 |
| 17 | No celular, "Abrir no WhatsApp", cronometrando desde `/inicio` | WhatsApp abre na conversa de `+55 11 91234-5678` com a mensagem; ≤ 4 toques e < 20 s; voltar ao sistema: viagens ainda pendentes | FR-018, FR-020, SC-001 |
| 18 | No computador, "Abrir no WhatsApp" | Abre o WhatsApp Web ou de desktop com a mensagem | FR-018 |
| 19 | Passageiro sem pendências | "Nada a cobrar", botão desabilitado | FR-015 |
| 20 | Fatia C: em `/viagens/[id]`, conferir as situações e marcar um pendente | Badges "Pago em …"/"Pendente"/"Sem cobrança"; toast "Pagamento registrado"; o passageiro sai das pendências daquela viagem | FR-014, US5 |
| 21 | Com a segunda conta, abrir `/pagamentos/[id de Duda]` e `/pagamentos/[id]/cobrar` | 404; `/pagamentos` vazio; nenhuma chave PIX da outra conta aparece | FR-026, SC-007 |
| 22 | Desligar a rede e marcar um pagamento | "Não foi possível salvar. Tente novamente."; seleção mantida | FR-028 |
| 23 | Telas de pagamentos, cobrança e chave PIX em 360px, 768px, 1280px e 1920px | Sem rolagem horizontal | SC-008 |

## Validação da publicação

1. `git push` → deploy da Vercel concluído.
2. `npx supabase db push` no projeto de produção.
3. Repetir os cenários 2, 4, 13, 15 e 17 em produção, com dados de teste, e apagar esses dados
   depois. Cadastrar então a chave PIX real pela tela (nunca no repositório).
