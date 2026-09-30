# Contrato: Rotas e Telas de Passageiros

Todas as rotas ficam no grupo `(app)`: exigem sessão (`proxy.ts` + `obterUsuarioLogado()`) e usam
o `AppShell` do slice 001 ([contracts/ui.md](../../001-base-login-layout/contracts/ui.md)). Sem
sessão, levam a `/entrar?proximo=<rota>`.

## Navegação

`components/layout/nav-items.ts` ganha o item
`{ rotulo: 'Passageiros', href: '/passageiros', icone: Users }`, depois de "Início". O item fica
ativo em `/passageiros` e em todas as sub-rotas.

## `/passageiros` — lista

| Item | Contrato |
|------|----------|
| Título | `metadata.title = 'Passageiros · Caronas Já'`; `h1` "Passageiros" |
| Parâmetros | `?situacao=arquivados` (qualquer outro valor ou ausente = ativos); `?busca=<texto>`; `?aviso=excluido` |
| Dados | passageiros do motorista na situação escolhida, ordenados por nome (`lower(nome)`) |
| Ações | botão primário "Novo passageiro" → `/passageiros/novo`; campo "Buscar por nome" (`type="search"`); alternância "Ativos" / "Arquivados" |
| Colunas (`ResponsiveTable`) | Nome (essencial, link para os detalhes), Telefone (essencial, link `tel:`), Valor padrão (essencial, `formatCurrency`) |
| Vazio (ativos, sem nenhum passageiro) | `EmptyState` ícone `Users`, título "Nenhum passageiro cadastrado", descrição "Cadastre as pessoas que pegam carona com você para registrar viagens e cobranças.", ação "Novo passageiro" |
| Vazio (arquivados) | `EmptyState` título "Nenhum passageiro arquivado" |
| Busca sem resultado | texto "Nenhum passageiro encontrado" + botão "Limpar busca" |

No celular, cada cartão inteiro leva aos detalhes; o telefone continua sendo um link próprio de
ligação.

## `/passageiros/novo` — cadastro

| Item | Contrato |
|------|----------|
| Título | "Novo passageiro · Caronas Já" |
| Campos | Nome (`autoComplete="off"`, `maxLength=80`); Telefone (`type="tel"`, `inputMode="tel"`, placeholder `(11) 91234-5678`); Valor padrão por trajeto (texto, `inputMode="decimal"`, prefixo "R$", placeholder `0,00`); Observação (`textarea`, opcional, `maxLength=200`, contador de caracteres) |
| Ações | "Salvar" (primário; "Salvando..." enquanto pendente) e "Cancelar" (volta a `/passageiros`) |
| Sucesso | redireciona para `/passageiros/<id>?aviso=cadastrado` → toast "Passageiro cadastrado" |
| Erro | mensagem abaixo de cada campo inválido (`aria-invalid`, `aria-describedby`); erro geral em `role="alert"`; os valores digitados permanecem |

## `/passageiros/[id]` — detalhes

| Item | Contrato |
|------|----------|
| Título | "<nome> · Caronas Já"; `h1` com o nome |
| `id` inválido, inexistente ou de outra conta | `notFound()` → "Página não encontrada" do slice 001 |
| Dados exibidos | Telefone (`formatPhone`, link `tel:+55…`); Valor padrão (`formatCurrency`); Observação (ou "Sem observação"); Situação ("Ativo" ou "Arquivado em DD/MM/AAAA"); Cadastrado em `DD/MM/AAAA`; Última alteração em `DD/MM/AAAA` |
| Aviso | se arquivado, faixa "Este passageiro está arquivado e não aparece na seleção de novas viagens." |
| Ações (ativo) | "Editar" → `/passageiros/<id>/editar`; "Arquivar" (secundário, com `ConfirmDialog`); "Excluir" (`destructive`, com `ConfirmDialog`) |
| Ações (arquivado) | "Editar"; "Reativar" (sem confirmação); "Excluir" |
| Voltar | link "Passageiros" que retorna à lista com a mesma `situacao` e `busca` de origem (repassadas como `?de=<querystring codificada>`) |
| Avisos | `?aviso=cadastrado \| atualizado \| arquivado \| reativado` → toast correspondente |

## `/passageiros/[id]/editar` — edição

Mesmo formulário do cadastro, preenchido com os dados atuais; título "Editar passageiro · Caronas
Já". "Cancelar" volta aos detalhes sem salvar. Sucesso → `/passageiros/<id>?aviso=atualizado`.
`id` inválido/inexistente → `notFound()`.

## Diálogos de confirmação

| Ação | Título | Descrição | Botão |
|------|--------|-----------|-------|
| Arquivar | "Arquivar passageiro?" | "<nome> sairá da lista de ativos e da seleção de novas viagens. O histórico continua disponível e você pode reativá-lo depois." | "Arquivar" |
| Excluir | "Excluir passageiro?" | "<nome> será excluído definitivamente. Esta ação não pode ser desfeita." | "Excluir" |

## Toasts (sonner)

| Situação | Texto |
|----------|-------|
| Cadastro | "Passageiro cadastrado" |
| Edição | "Passageiro atualizado" |
| Arquivamento | "Passageiro arquivado" |
| Reativação | "Passageiro reativado" |
| Exclusão | "Passageiro excluído" (na lista) |
| Falha de conexão | "Não foi possível salvar. Tente novamente." |
