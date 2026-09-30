# Contrato: Layout e Componentes de Interface Reutilizáveis

Este é o padrão que os slices 002–006 **devem** reutilizar (FR-010 a FR-019). Nomes de
componentes em inglês e textos em pt-BR (ver [research.md §6](../research.md)).

## Estrutura do layout (`AppShell`)

```text
Celular (< 768px)                 Desktop (≥ 768px)
┌───────────────────────┐        ┌──────────┬──────────────────────────┐
│ Header                │        │ Sidebar  │ Header                   │
├───────────────────────┤        │ (nav)    ├──────────────────────────┤
│                       │        │          │                          │
│ Conteúdo              │        │          │ Conteúdo (máx. 1200px)   │
│                       │        │          │                          │
├───────────────────────┤        │          │                          │
│ BottomNav (fixa)      │        │ Conta    │                          │
└───────────────────────┘        └──────────┴──────────────────────────┘
```

- **Header**: nome "Caronas Já" (no celular), título da página, `ThemeToggle` e o menu da conta
  (nome, e-mail, "Sair").
- **Navegação**: uma única lista de itens (`navItems`: rótulo, ícone, rota) alimenta a Sidebar e a
  BottomNav. Cada slice adiciona o seu item. Neste slice existe apenas `Início`. A BottomNav
  comporta até 5 itens.
- O conteúdo tem padding inferior igual à altura da BottomNav no celular, para não ficar coberto.
- A página ativa fica destacada na navegação (`aria-current="page"`).

## Componentes base (shadcn/ui, adaptados)

| Componente | Uso previsto | Regras |
|------------|--------------|--------|
| `Button` | ações | variantes `default` (primária), `secondary`, `destructive`, `ghost`; altura mínima de 44px |
| `Input`, `Label`, `Form` (campo com mensagem de erro) | formulários | rótulo sempre visível; erro abaixo do campo, em pt-BR |
| `Card` | blocos de conteúdo e itens de lista no celular | — |
| `ResponsiveTable` | histórico e listagens | `Table` a partir de 768px; lista de `Card` abaixo disso, com as mesmas colunas essenciais |
| `EmptyState` | listas vazias e tela inicial | ícone + título + descrição + ação opcional |
| `Spinner`/`Skeleton` | carregamento | — |
| `Toaster` (sonner) | confirmações rápidas | ex.: "Senha atualizada" |
| `ConfirmDialog` (AlertDialog) | ações destrutivas | botão de confirmação `destructive`, com texto explícito |
| `ThemeToggle` | cabeçalho | alterna claro/escuro; ícone sol/lua; `aria-label="Alternar tema"` |

## Padrões visuais

- Tema base do shadcn/ui "neutral", com **uma** cor de destaque (`--primary`) em todo o sistema.
- Fonte sem serifa (Geist ou Inter), com tamanho base de 16px no celular.
- Contraste WCAG AA nos dois temas; foco visível em todos os elementos interativos.
- Nenhuma rolagem horizontal da página entre 360px e 1920px.

## Formatadores (`lib/format`)

| Função | Entrada | Saída |
|--------|---------|-------|
| `formatCurrency(centavos: number)` | `123456` | `"R$ 1.234,56"` |
| `formatDate(d: Date \| string)` | ISO/Date | `"28/09/2026"` (fuso `America/Sao_Paulo`) |
| `formatTime(d)` | ISO/Date | `"07:45"` |
| `formatDateTime(d)` | ISO/Date | `"28/09/2026 07:45"` |
| `formatMonth(d)` | ISO/Date | `"setembro de 2026"` |
