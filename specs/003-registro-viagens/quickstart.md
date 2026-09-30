# Quickstart / Guia de Validação: Trajetos e Registro de Viagens

Este guia mostra que o slice 003 funciona de ponta a ponta. O modelo está em
[data-model.md](./data-model.md), as telas em [contracts/rotas.md](./contracts/rotas.md) e as
actions, funções SQL e regras em [contracts/acoes.md](./contracts/acoes.md).

## Pré-requisitos

- Slices 001 e 002 publicados e funcionando.
- `.env.local` com `E2E_EMAIL`/`E2E_SENHA` de uma conta de **teste**.
- Uma segunda conta de teste, usada só na verificação de RLS.
- Na conta principal, ao menos dois passageiros ativos (ex.: Ana, `R$ 12,00`; Bruno,
  `R$ 10,00`).

## Aplicar as migrações

```bash
npx supabase db push
```

Esperado: as migrações do slice são aplicadas sem erros:

- `<ts>_trajetos.sql` (fatia A);
- `<ts>_viagens.sql` (fatia B);
- `<ts>_editar_viagem.sql` (fatia C).

No painel do Supabase devem aparecer:

- `trajetos`, `viagens` e `viagem_passageiros`, com RLS habilitada e 4 políticas cada;
- a view `viagens_resumo`;
- as funções `registrar_viagem` e `editar_viagem`.

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

Esperado: passam os testes unitários das funções de [contracts/acoes.md](./contracts/acoes.md),
com todos os exemplos obrigatórios, e os testes dos slices anteriores continuam passando.

```bash
npm run test:e2e
```

Esperado: `tests/e2e/trajetos.spec.ts` e `tests/e2e/viagens.spec.ts` passam nos projetos
`mobile` (360px) e `desktop` (1280px), junto com os testes dos slices 001 e 002. A limpeza exclui
as viagens, os trajetos e os passageiros `E2E …` criados.

## Cenários de validação manual

| # | Cenário | Resultado esperado | Ref. |
|---|---------|--------------------|------|
| 1 | Abrir `/viagens` e `/viagens/trajetos` em uma aba anônima | Redireciona para `/entrar?proximo=…` | FR-026 |
| 2 | Tocar em "Viagens" na navegação e depois em "Trajetos" | Estado vazio "Nenhum trajeto cadastrado" com "Novo trajeto" | FR-024, US1 |
| 3 | Cadastrar "Casa" → "Faculdade", cronometrando | Detalhes com o toast "Trajeto cadastrado"; tempo < 30 s | FR-001, SC-002 |
| 4 | Tentar salvar com origem vazia; com "Casa"/" casa "; e "casa"/"faculdade" de novo | Mensagem no campo em cada caso; nada salvo | FR-002, FR-003, SC-005 |
| 5 | Cadastrar "Faculdade" → "Casa" | Aceito (sentido oposto é outro trajeto) | Casos de borda |
| 6 | Em `/inicio`, tocar em "Registrar viagem"; escolher "Casa → Faculdade", "Ida", marcar Ana e Bruno e salvar, cronometrando | Os valores vêm R$ 12,00 e R$ 10,00; total "R$ 22,00 · 2 passageiros"; toast "Viagem registrada"; a viagem aparece no topo; tempo < 30 s | FR-008–FR-013, SC-001 |
| 7 | Em "Nova viagem", trocar o sentido entre Ida e Volta | O percurso muda entre "Casa → Faculdade" e "Faculdade → Casa" | FR-009 |
| 8 | Abrir "Nova viagem" de novo | "Casa → Faculdade" já vem selecionado | FR-014 |
| 9 | Registrar outra ida no mesmo trajeto e dia | Diálogo "Registrar mesmo assim?"; "Registrar" salva; cancelar mantém o formulário | FR-015 |
| 10 | Tentar salvar sem passageiros, sem sentido, com data em 3 dias e com valor `-1` | Mensagem no campo correspondente; nada salvo; o preenchido permanece | SC-005 |
| 11 | Marcar Ana, mudar o valor para `8,5` e desmarcar/marcar Bruno | O total acompanha em tempo real (R$ 8,50 → R$ 18,50) | FR-013 |
| 12 | Abrir a viagem do cenário 6 | Data e hora, "Ida: Casa → Faculdade", Ana R$ 12,00, Bruno R$ 10,00, Total R$ 22,00 | FR-018 |
| 13 | Editar o valor padrão de Ana para R$ 15,00 (em Passageiros) e reabrir a viagem | Ana continua com R$ 12,00 na viagem | FR-020, SC-004 |
| 14 | Editar a viagem: trocar para "Volta", remover Bruno e adicionar outro passageiro | O novo passageiro vem com o valor padrão; Ana mantém R$ 12,00; o total é recalculado; toast "Viagem atualizada" | FR-019, SC-003 |
| 15 | Arquivar Ana (Passageiros) e editar a viagem em que ela está | Ana continua marcada, com "Arquivado"; ela não aparece em "Nova viagem" | FR-019, Casos de borda |
| 16 | Tentar excluir Ana (Passageiros) | "Este passageiro tem viagens registradas e não pode ser excluído. Arquive-o." | FR-023 |
| 17 | Arquivar a viagem (confirmar) | Sai de "Ativas" e aparece em "Arquivadas"; nos detalhes, o aviso e só "Reativar"; `/viagens/<id>/editar` volta aos detalhes | FR-021, US5 |
| 18 | Reativar a viagem | Volta a "Ativas" com os mesmos dados; toast "Viagem reativada" | FR-021 |
| 19 | Tentar excluir "Casa → Faculdade" | "Este trajeto tem viagens registradas…"; arquivar funciona e ele some de "Nova viagem", mas as viagens continuam mostrando-o | FR-006, FR-007 |
| 20 | Editar a origem do trajeto para "Casa (Centro)" | A viagem registrada passa a mostrar "Casa (Centro) → Faculdade" | FR-005 |
| 21 | Excluir o trajeto "Faculdade → Casa" (sem viagens) | Toast "Trajeto excluído" | FR-007 |
| 22 | Registrar mais de 20 viagens (ou usar dados de teste) e rolar a lista | "Carregar mais" traz as próximas; a ordem é da mais recente para a mais antiga | FR-017 |
| 23 | Abrir `/viagens/abc`, `/viagens/<uuid-aleatório>` e `/viagens/trajetos/<uuid-aleatório>` | "Página não encontrada" | US3 cen. 5 |
| 24 | Redimensionar listas, detalhes e formulários para 360, 768, 1280 e 1920px | Sem rolagem horizontal; alvos ≥ 44px; a barra de total não cobre campos nem a navegação | SC-008 |
| 25 | Entrar com a **segunda** conta e abrir `/viagens`, `/viagens/<id>` e `/viagens/trajetos/<id>` da primeira | Listas vazias e "Página não encontrada" | FR-026, SC-007 |
| 26 | Com a sessão da segunda conta, chamar pela API `rpc('registrar_viagem')` com o trajeto ou o passageiro da primeira conta, e também inserir direto em `viagem_passageiros` | `CJ002`/`CJ003` na função; o `insert` direto falha na FK composta (`23503`) | Research §4, SC-007 |
| 27 | Com a chave anon e sem sessão, consultar `trajetos`, `viagens`, `viagem_passageiros`, `viagens_resumo` e chamar `rpc('registrar_viagem')` | Nenhuma linha; a função é negada a `anon` | FR-026 |
| 28 | Desligar a rede e tentar registrar uma viagem | "Não foi possível salvar. Tente novamente."; tudo permanece preenchido | FR-025 |

## Validação da publicação

1. Faça push na `main` e aguarde o deploy na Vercel.
2. Aplique as migrações no Supabase de produção (`npx supabase db push` com o projeto de produção
   vinculado).
3. Repita os cenários 3, 6, 12, 13 e 17 na URL de produção, no celular.
