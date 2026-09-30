# Quickstart / Guia de Validação: Registro e Gestão de Passageiros

Este guia mostra que o slice 002 funciona de ponta a ponta. A tabela está descrita em
[data-model.md](./data-model.md), as telas em [contracts/rotas.md](./contracts/rotas.md) e as
actions e regras de validação em [contracts/acoes.md](./contracts/acoes.md).

## Pré-requisitos

- Slice 001 publicado e funcionando (login, layout e deploy).
- `.env.local` configurado, inclusive `E2E_EMAIL`/`E2E_SENHA` de uma conta de **teste**.
- Uma segunda conta de teste no Supabase (Auth → Users), usada só na verificação de RLS.

## Aplicar a migração

```bash
npx supabase db push
```

Esperado: a migração `<timestamp>_passageiros.sql` é aplicada sem erros, e a tabela
`passageiros` aparece no painel com RLS habilitada e 4 políticas.

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

Esperado: passam os testes unitários de `parseValorEmCentavos`, `normalizarTelefone`,
`normalizarNome`, `normalizarObservacao`, `normalizarParaBusca` e `formatPhone`, com os exemplos
obrigatórios de [contracts/acoes.md](./contracts/acoes.md).

```bash
npm run test:e2e
```

Esperado: `tests/e2e/passageiros.spec.ts` passa nos projetos `mobile` (360px) e `desktop`
(1280px), e os testes do slice 001 continuam passando. Os passageiros criados pelos testes são
excluídos ao final.

## Cenários de validação manual

| # | Cenário | Resultado esperado | Ref. |
|---|---------|--------------------|------|
| 1 | Abrir `/passageiros` em uma aba anônima | Redireciona para `/entrar?proximo=%2Fpassageiros` | FR-019 |
| 2 | Entrar e tocar em "Passageiros" na navegação (celular e desktop) | Estado vazio "Nenhum passageiro cadastrado" com "Novo passageiro" | FR-009, FR-017 |
| 3 | Cadastrar "Ana", `(11) 91234-5678`, `12,5`, sem observação, cronometrando a partir de `/inicio` | Detalhes de Ana com toast "Passageiro cadastrado", valor `R$ 12,50`; tempo < 1 min | FR-001–FR-005, SC-001 |
| 4 | Tentar salvar com nome e telefone vazios, telefone `1234` e valor `-1` | Mensagens abaixo de cada campo; nada salvo; os valores digitados permanecem | SC-004 |
| 5 | Cadastrar outro passageiro chamado " ana " | Erro no campo nome: "Já existe um passageiro ativo com esse nome." | FR-006 |
| 6 | Cadastrar mais passageiros e abrir a lista | Ordem alfabética; telefone e valor formatados; cartões no celular | FR-007 |
| 7 | Buscar "ANA" e depois "jose" (passageiro "José") | Filtra enquanto digita, ignorando maiúsculas e acentos; "Nenhum passageiro encontrado" quando não há resultado | FR-008, SC-002 |
| 8 | Com uma busca ativa, abrir um passageiro e tocar em "Passageiros" (voltar) | Volta à lista com a mesma busca e filtro | US2 cen. 4 |
| 9 | Nos detalhes, no celular, tocar no telefone | O discador abre com o número | FR-011 |
| 10 | Editar Ana: valor para `12`, observação "Paga por Pix" | Toast "Passageiro atualizado"; detalhes com `R$ 12,00`, a observação e a data da última alteração atualizada | FR-012 |
| 11 | Abrir a edição e tocar em "Cancelar" | Volta aos detalhes sem alterar nada | US3 cen. 3 |
| 12 | Arquivar Ana (confirmar no diálogo) | Some dos ativos; aparece em "Arquivados"; detalhes mostram "Arquivado em DD/MM/AAAA" | FR-014 |
| 13 | Cadastrar nova "Ana" ativa e tentar reativar a arquivada | Erro "Já existe um passageiro ativo com esse nome. Renomeie um deles antes de reativar." | FR-015 |
| 14 | Excluir a nova "Ana" (confirmar) e reativar a arquivada | Exclusão com toast "Passageiro excluído"; reativação com "Passageiro reativado" | FR-015, FR-016 |
| 15 | Abrir `/passageiros/abc` e `/passageiros/<uuid-aleatório>` | "Página não encontrada" | US2 cen. 5 |
| 16 | Redimensionar lista, detalhes e formulário para 360, 768, 1280 e 1920px | Sem rolagem horizontal; alvos ≥ 44px | SC-006 |
| 17 | Entrar com a **segunda** conta de teste e abrir `/passageiros` e `/passageiros/<id-de-Ana>` | Lista vazia e "Página não encontrada" | FR-019, SC-005 |
| 18 | Com a chave anon e sem sessão, consultar `passageiros` pela API REST | Nenhuma linha retornada | FR-019, SC-005 |
| 19 | Desligar a rede e tentar salvar uma edição | "Não foi possível salvar. Tente novamente."; os dados digitados permanecem | FR-018 |

> SC-007 (valores de viagens antigas não mudam após editar o valor padrão) só pode ser verificado
> a partir do slice 003; ele fica registrado no quickstart daquele slice.

## Validação da publicação

1. Faça push na `main` e aguarde o deploy na Vercel.
2. Aplique a migração no Supabase de produção (`npx supabase db push` com o projeto de produção
   vinculado).
3. Repita os cenários 2, 3, 10 e 12 na URL de produção, no celular.
