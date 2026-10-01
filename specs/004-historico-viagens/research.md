# Pesquisa e Decisões: Histórico de Viagens

**Funcionalidade**: `specs/004-historico-viagens` | **Data**: 2026-10-01

Não havia "NEEDS CLARIFICATION" no contexto técnico: a stack, os padrões de lista e os
formatadores vêm dos slices 001–003. As decisões abaixo fixam como o histórico se encaixa neles,
sob duas restrições da spec: **paralelo ao slice 005** e **sessão única**.

## 1. Consultas e resumo: duas funções SQL somente leitura

- **Decisão**: uma migração nova, `<ts>_historico.sql`, cria apenas duas funções
  `language sql stable security invoker set search_path = ''`:
  - `historico_viagens(filtros…, p_limite)`: as linhas da tabela, já filtradas e ordenadas;
  - `historico_resumo(filtros…)`: uma linha com `quantidade` e `total_centavos`.

  As duas aplicam exatamente o mesmo `where`. O filtro é curto e fica repetido nas duas, sem
  função auxiliar; a igualdade é coberta pelo e2e "resumo bate com as linhas".
- **Justificativa**:
  - o resumo precisa somar **todas** as viagens do resultado, inclusive as não carregadas
    (FR-014); fazer isso no servidor Next exigiria baixar tudo;
  - agregados do PostgREST (`sum()` no `select`) ficam desligados por padrão no Supabase;
  - o filtro por passageiro precisa de um `exists` em `viagem_passageiros` e do valor do
    passageiro na linha — difícil de expressar só com o query builder sobre a view;
  - `security invoker` mantém a RLS de `viagens`, `viagem_passageiros`, `passageiros` e
    `trajetos` (Princípio VI), como `registrar_viagem` no slice 003.
- **Alternativas consideradas**:
  - nova view com uma linha por participação + filtros pelo query builder: resolve as linhas,
    mas não o resumo sem agregados;
  - habilitar `db_aggregates_enabled`: muda configuração global do projeto por causa de uma tela;
  - somar no Next a partir de todas as linhas: viola o objetivo de carregar progressivamente.

## 2. Nenhuma alteração em tabelas, view ou funções existentes

- **Decisão**: a migração não faz `alter`/`create or replace` em nada dos slices 001–003. Ela
  só cria as duas funções novas e os `grant`/`revoke` delas.
- **Justificativa**: o slice 005 vai alterar `viagem_passageiros` (coluna `pago_em`) em paralelo.
  Com objetos disjuntos, as duas migrações podem ser aplicadas em qualquer ordem, e o histórico
  não quebra quando `pago_em` aparecer (as funções listam colunas explicitamente).
- **Alternativa**: reescrever `viagens_resumo` para incluir nomes de passageiros — tocaria um
  objeto que o slice 005 pode querer alterar também.

## 3. Período: resolvido em TypeScript para datas; convertido para instantes no banco

- **Decisão**: a URL guarda o tipo do período e, no personalizado, as datas (`AAAA-MM-DD`). Uma
  função pura `resolverPeriodo(filtro, hoje)` transforma isso em `{ inicio, fim }` (datas
  inclusivas, calendário de São Paulo):
  - `este-mes`: dia 1 até o último dia do mês de `hoje`;
  - `mes-passado`: dia 1 até o último dia do mês anterior;
  - `30-dias`: `hoje − 29` até `hoje`;
  - `personalizado`: as datas da URL.

  As funções SQL recebem `date` e comparam
  `realizada_em >= (p_inicio::timestamp at time zone 'America/Sao_Paulo')` e
  `realizada_em < ((p_fim + 1)::timestamp at time zone 'America/Sao_Paulo')`.
- **Justificativa**:
  - a regra de calendário (último dia do mês, 30 dias) fica testável sem banco;
  - a conversão de fuso fica no Postgres, como no slice 003 (research §6), cumprindo FR-004 e
    SC-005 independentemente do fuso do aparelho ou do servidor da Vercel;
  - `hoje` é calculado com `Intl` no fuso `America/Sao_Paulo` (helper novo em `lib/format.ts`).
- **Alternativas**: mandar instantes ISO prontos (conversão de fuso em JS, sem biblioteca, é
  frágil no horário de verão histórico); `date_trunc` no SQL para cada preset (espalha a regra).

## 4. Estado dos filtros na URL

- **Decisão**: `/historico?periodo=&inicio=&fim=&passageiro=&trajeto=&sentido=&pagina=`.
  Parâmetros ausentes ou inválidos assumem o padrão; nada é persistido no banco nem no navegador.
  A leitura e a escrita ficam em `lib/historico/filtros.ts` (`lerFiltros`, `paraQuery`), funções
  puras com testes.
- **Regras de leitura**:
  - `periodo` fora da lista → `este-mes`;
  - `personalizado` com data ausente, inválida ou `inicio > fim` → `este-mes`, e a tela mostra o
    aviso "Período inválido; mostrando este mês.";
  - `passageiro`/`trajeto` que não é uuid ou não está entre as opções do motorista (carregadas
    sob RLS) → filtro ignorado (FR-020);
  - `sentido` fora de `ida`/`volta` → ambos;
  - `pagina`: inteiro de 1 a 50, como em `/viagens`.
- **Justificativa**: recarregar e voltar preservam os filtros (FR-009), o atalho do passageiro é
  só um link (FR-010) e não há estado de cliente para sincronizar. O nome `inicio`/`fim` evita
  colidir com `?de=`, já usado pelas telas de detalhes para o "voltar".

## 5. Formulário de filtros: componente cliente pequeno

- **Decisão**: `FiltrosHistorico` (`'use client'`) com `<select>` nativos para período,
  passageiro, trajeto e sentido, aplicados ao mudar (`router.replace` com a nova query, `pagina`
  volta a 1). No "Personalizado" aparecem dois `<input type="date">` e o botão "Aplicar", que valida
  no cliente (FR-005) e só então navega — o período anterior continua valendo até lá. "Limpar
  filtros" é um link para `/historico`.
- **Justificativa**: selects nativos são acessíveis, têm alvo ≥ 44px com a classe existente e
  funcionam bem no celular; a lógica de URL é a mesma função pura usada no servidor.
- **Alternativa**: `<form method="get">` sem JavaScript — exige botão "Filtrar" para cada
  mudança e não esconde as datas fora do personalizado.

## 6. Tabela: `ResponsiveTable` com colunas dinâmicas

- **Decisão**: reutilizar `components/responsive-table.tsx` (tabela ≥ 768px, cartões abaixo).
  Colunas: Data/hora (link para os detalhes), Percurso, Sentido, Passageiros (nomes), Total; com
  filtro por passageiro, acrescenta "Valor de {nome}". "Carregar mais" igual a `/viagens`.
- **Justificativa**: mesmo visual e mesma regra mobile-first do slice 003 (Princípio IV).

## 7. Voltar dos detalhes da viagem para o histórico

- **Decisão**: o link da linha abre `/viagens/{id}?de=<query do histórico>&volta=historico`. Em
  `app/(app)/viagens/[id]/page.tsx`, `hrefDeVolta` ganha um ramo: com `volta=historico`, devolve
  `/historico?<parâmetros conhecidos do histórico>` e o rótulo "Histórico"; sem ele, nada muda.
  Os parâmetros aceitos são filtrados por `paraQuery(lerFiltros(...))`, como hoje (só chaves
  conhecidas são repassadas).
- **Justificativa**: cumpre FR-009 com uma alteração de poucas linhas, isolada na função do
  "voltar". É um dos três pontos de contato com o slice 005 (ver §9).
- **Alternativa**: confiar só no botão "voltar" do navegador — o link visível "← Viagens" levaria
  para outra tela, contrariando o cenário 8 da US1.

## 8. Navegação

- **Decisão**: item `{ rotulo: 'Histórico', href: '/historico', icone: History }` em
  `components/layout/nav-items.ts`, depois de "Viagens". Com o "Pagamentos" do slice 005, a
  BottomNav chega a 5 itens, o máximo documentado; o slice 006 terá de rever a navegação.
- **Tela inicial**: sem alterações (evita mais um arquivo em comum com o slice 005).

## 9. Paralelismo com o slice 005 e sessão única

- **Pontos de contato** (arquivos que os dois slices provavelmente alteram):

  | Arquivo | Mudança deste slice | Conflito esperado |
  |---------|---------------------|-------------------|
  | `components/layout/nav-items.ts` | +1 item no array e +1 ícone no import | trivial (linhas vizinhas) |
  | `app/(app)/passageiros/[id]/page.tsx` | +1 botão "Ver histórico" na área de ações | baixo |
  | `app/(app)/viagens/[id]/page.tsx` | ramo novo em `hrefDeVolta` e no rótulo do link | baixo |
  | `README.md` | +1 linha na lista de slices concluídos | trivial |

  Todo o resto é arquivo novo (`app/(app)/historico/*`, `lib/historico/*`, testes, migração).
- **Ordem de junção**: quem terminar por último faz `merge` da `main` e resolve os conflitos
  acima mantendo as duas mudanças. A migração deste slice não depende da do 005, e vice-versa.
- **Sessão única**: sem fatias internas publicadas separadamente. O `tasks.md` deve seguir uma
  ordem linear (migração → lib + testes → tela → pontos de contato → e2e → publicação), com um
  único deploy de validação no fim.

## 10. Testes

- **Unitários (Vitest)** em `tests/unit/historico-filtros.test.ts`: `resolverPeriodo` (meses de
  28, 29, 30 e 31 dias, virada de ano, 30 dias atravessando meses), `lerFiltros`/`paraQuery`
  (padrões, valores inválidos, ida e volta da URL) e `hojeEmSaoPaulo` (instante às 02:30 UTC é
  ainda o dia anterior em São Paulo).
- **E2E (Playwright)** em `tests/e2e/historico.spec.ts`, nos projetos `mobile` e `desktop`:
  período padrão e mês passado, arquivada fora, filtro por passageiro com valor dele no resumo,
  trajeto + sentido, limpar filtros, voltar dos detalhes com filtros, atalho do passageiro, viagem
  às 23:30 do último dia do mês e ausência de rolagem horizontal. Reutiliza os helpers de
  criação/limpeza de `tests/e2e/helpers/`.
- A verificação com a segunda conta (RLS) fica no quickstart, como nos slices anteriores.
