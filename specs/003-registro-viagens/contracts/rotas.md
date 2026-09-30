# Contrato: Rotas e Telas de Trajetos e Viagens

Todas as rotas ficam no grupo `(app)`, exigem sessão e usam o `AppShell` do slice 001
([contracts/ui.md](../../001-base-login-layout/contracts/ui.md)). Os padrões do slice 002 valem
aqui também ([rotas.md](../../002-registro-passageiros/contracts/rotas.md)):

- `?aviso=` gera um toast por meio de `AvisoUrl`;
- `?de=` guarda a querystring da lista, para o "Voltar";
- `id` inválido, inexistente ou de outra conta chama `notFound()`;
- formulários com `useActionState` preservam o que foi digitado quando há erro.

## Navegação

`components/layout/nav-items.ts` ganha o item
`{ rotulo: 'Viagens', href: '/viagens', icone: Car }`, depois de "Passageiros". Ele fica ativo em
`/viagens` e em todas as sub-rotas, inclusive `/viagens/trajetos`.

## `/inicio`: ajuste

- O `EmptyState` passa a ter a ação primária "Registrar viagem" (`/viagens/nova`) e a secundária
  "Passageiros" (`/passageiros`).
- A descrição deixa de dizer que viagens virão "em breve".
- Na fatia A, antes de existirem viagens, a ação primária é "Cadastrar trajetos"
  (`/viagens/trajetos`).

## Trajetos

### `/viagens/trajetos`: lista

| Item | Contrato |
|------|----------|
| Título | "Trajetos · Caronas Já"; `h1` "Trajetos" |
| Parâmetros | `?situacao=arquivados` (qualquer outro valor = ativos); `?aviso=excluido` |
| Dados | trajetos da situação escolhida, ordenados por origem e depois destino (`localeCompare` pt-BR) |
| Ações | "Novo trajeto" → `/viagens/trajetos/novo`; alternância "Ativos" / "Arquivados"; link "Viagens" (volta) |
| Colunas (`ResponsiveTable`) | Trajeto (essencial; texto "Origem → Destino", link para os detalhes) |
| Vazio (ativos) | `EmptyState` ícone `Route`, título "Nenhum trajeto cadastrado", descrição "Cadastre a origem e o destino das caronas que você faz, como Casa → Faculdade.", ação "Novo trajeto" |
| Vazio (arquivados) | título "Nenhum trajeto arquivado" |

### `/viagens/trajetos/novo` e `/viagens/trajetos/[id]/editar`

| Item | Contrato |
|------|----------|
| Título | "Novo trajeto · Caronas Já" / "Editar trajeto · Caronas Já" |
| Campos | Origem (`maxLength=80`, placeholder "Ex.: Casa"); Destino (`maxLength=80`, placeholder "Ex.: Faculdade") |
| Ações | "Salvar" ("Salvando..." enquanto pendente); "Cancelar" (volta à lista ou aos detalhes) |
| Sucesso | `/viagens/trajetos/<id>?aviso=cadastrado` ou `?aviso=atualizado` |
| Erros | no campo: vazio, longo demais, "A origem e o destino precisam ser diferentes." (no Destino), "Este trajeto já está cadastrado." (no Destino) |

### `/viagens/trajetos/[id]`: detalhes

| Item | Contrato |
|------|----------|
| Título | "<Origem → Destino> · Caronas Já"; `h1` com o trajeto |
| Dados | Origem; Destino; Viagens registradas (quantidade de viagens ativas); Situação ("Ativo" ou "Arquivado em DD/MM/AAAA"); Cadastrado em; Última alteração |
| Aviso (arquivado) | "Este trajeto está arquivado e não aparece ao registrar novas viagens." |
| Ações (ativo) | "Editar"; "Arquivar" (com `ConfirmDialog`); "Excluir" (`destructive`, com `ConfirmDialog`) |
| Ações (arquivado) | "Editar"; "Reativar" (sem confirmação); "Excluir" |
| Avisos | `?aviso=cadastrado \| atualizado \| arquivado \| reativado` |

## Viagens

### `/viagens`: lista

| Item | Contrato |
|------|----------|
| Título | "Viagens · Caronas Já"; `h1` "Viagens" |
| Parâmetros | `?situacao=arquivadas` (qualquer outro valor = ativas); `?pagina=N` (inteiro ≥ 1, padrão 1, máx. 50); `?aviso=` |
| Dados | `viagens_resumo` da situação escolhida, `realizada_em desc, criado_em desc`, limite `N × 20` |
| Ações | "Nova viagem" (primário) → `/viagens/nova`; "Trajetos" (secundário) → `/viagens/trajetos`; alternância "Ativas" / "Arquivadas" |
| Colunas (`ResponsiveTable`) | Data (essencial, `DD/MM/AAAA HH:mm`, link para os detalhes); Percurso (essencial, no sentido da viagem); Sentido (essencial, `Badge` "Ida"/"Volta"); Passageiros (essencial, número); Total (essencial, `formatCurrency`) |
| Mais resultados | link "Carregar mais" → mesma URL com `pagina=N+1` (`scroll={false}`) |
| Vazio (ativas) | `EmptyState` ícone `Car`, título "Nenhuma viagem registrada", descrição "Registre cada ida ou volta com os passageiros que foram e quanto cada um pagou.", ações "Nova viagem" e "Trajetos" |
| Vazio (arquivadas) | título "Nenhuma viagem arquivada" |

Na fatia A, `/viagens` mostra apenas um `EmptyState` com o título "Cadastre seus trajetos" e a
ação "Trajetos".

### `/viagens/nova` e `/viagens/[id]/editar`: formulário de viagem

| Item | Contrato |
|------|----------|
| Título | "Nova viagem · Caronas Já" / "Editar viagem · Caronas Já" |
| Pré-condição (nova) | sem trajeto ativo → `EmptyState` "Cadastre um trajeto primeiro" com a ação "Novo trajeto"; sem passageiro ativo → `EmptyState` "Cadastre um passageiro primeiro" com a ação "Novo passageiro" (FR-016) |
| Trajeto | `<select>` nativo (`h-11`) com os trajetos ativos ("Origem → Destino"). Na nova viagem, vem pré-selecionado o trajeto da viagem mais recente, se estiver ativo, ou o único trajeto, se houver só um (FR-014). Na edição, inclui o trajeto atual mesmo arquivado, com o sufixo " (arquivado)" |
| Sentido | grupo de rádio com dois botões grandes, "Ida" e "Volta" (`role="radiogroup"`, cada um ≥ 44px); sem valor pré-selecionado na nova viagem. Abaixo, o texto "Percurso: Casa → Faculdade" conforme o sentido |
| Data e hora | `<input type="datetime-local">`, rótulo "Data e hora"; padrão: agora (fuso de São Paulo); `max` = agora + 1 dia |
| Passageiros | `fieldset` "Passageiros"; uma linha por passageiro ativo (na edição, também os já vinculados, mesmo arquivados, com `Badge` "Arquivado"), em ordem alfabética: caixa de marcação com o nome e, quando marcada, o campo "Valor" (`inputMode="decimal"`, prefixo "R$") pré-preenchido com o valor padrão |
| Total | barra fixa no rodapé do formulário (no celular, acima da barra de navegação): "Total: R$ 22,00 · 2 passageiros", atualizada a cada mudança; valor inválido conta como R$ 0,00 e o campo mostra o erro |
| Ações | "Registrar viagem" / "Salvar alterações" ("Salvando..." enquanto pendente); "Cancelar" (volta à lista ou aos detalhes) |
| Duplicidade | se a action devolver `duplicada`, abre `ConfirmDialog` com o título "Registrar mesmo assim?", a descrição da mensagem e o botão "Registrar"; confirmar reenvia com `confirmar_duplicada=1` |
| Sucesso | nova → `/viagens?aviso=registrada` (a viagem aparece no topo); edição → `/viagens/<id>?aviso=atualizada` |
| Erros | mensagem no campo (trajeto, sentido, data, "Marque ao menos um passageiro.", valor de cada passageiro) e erro geral em `role="alert"`; tudo o que foi preenchido permanece |
| Edição de viagem arquivada | `/viagens/<id>/editar` de uma viagem arquivada redireciona para os detalhes |

### `/viagens/[id]`: detalhes

| Item | Contrato |
|------|----------|
| Título | "Viagem de DD/MM/AAAA · Caronas Já"; `h1` "Ida: Casa → Faculdade" ou "Volta: Faculdade → Casa" |
| Dados | Data e hora (`DD/MM/AAAA HH:mm`); Trajeto (com "(arquivado)", se for o caso); Sentido; lista de passageiros (nome, `Badge` "Arquivado" se for o caso, valor nesta viagem), em ordem alfabética; Total em destaque |
| Aviso (arquivada) | "Esta viagem está arquivada e não é considerada em totais e pendências." |
| Ações (ativa) | "Editar" → `/viagens/<id>/editar`; "Arquivar" (secundário, com `ConfirmDialog`) |
| Ações (arquivada) | "Reativar" (sem confirmação) |
| Voltar | link "Viagens" para a lista com a `situacao` e a `pagina` de origem (`?de=`) |
| Avisos | `?aviso=atualizada \| arquivada \| reativada` |

## Diálogos de confirmação

| Ação | Título | Descrição | Botão |
|------|--------|-----------|-------|
| Arquivar trajeto | "Arquivar trajeto?" | "<Origem → Destino> não aparecerá ao registrar novas viagens. As viagens já registradas continuam iguais e você pode reativá-lo depois." | "Arquivar" |
| Excluir trajeto | "Excluir trajeto?" | "<Origem → Destino> será excluído definitivamente. Esta ação não pode ser desfeita." | "Excluir" |
| Arquivar viagem | "Arquivar viagem?" | "A viagem de DD/MM/AAAA deixará de ser considerada em totais e pendências. Você pode reativá-la depois." | "Arquivar" |
| Viagem duplicada | "Registrar mesmo assim?" | "Já existe uma viagem de <ida\|volta> neste trajeto em DD/MM/AAAA." | "Registrar" |

## Toasts (sonner)

| Situação | Texto |
|----------|-------|
| Trajeto cadastrado / atualizado / arquivado / reativado / excluído | "Trajeto cadastrado" / "Trajeto atualizado" / "Trajeto arquivado" / "Trajeto reativado" / "Trajeto excluído" |
| Viagem registrada / atualizada / arquivada / reativada | "Viagem registrada" / "Viagem atualizada" / "Viagem arquivada" / "Viagem reativada" |
| Falha de conexão | "Não foi possível salvar. Tente novamente." |
