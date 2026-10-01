# Contrato: Consultas e Funções de Domínio do Histórico

**Funcionalidade**: `specs/004-historico-viagens`

Este slice é somente leitura (FR-018): **não há server actions**. Tudo roda no servidor, com o
cliente Supabase da sessão (RLS).

## Funções SQL (RPC)

Definição completa em [../data-model.md](../data-model.md).

```text
historico_viagens(p_inicio date, p_fim date, p_passageiro_id uuid, p_trajeto_id uuid,
                  p_sentido text, p_limite integer) → setof linha
historico_resumo (p_inicio date, p_fim date, p_passageiro_id uuid, p_trajeto_id uuid,
                  p_sentido text) → { quantidade integer, total_centavos bigint }
```

Executáveis apenas por `authenticated`.

## `lib/historico/tipos.ts`

```ts
type TipoPeriodo = 'este-mes' | 'mes-passado' | '30-dias' | 'personalizado'

type FiltroHistorico = {
  periodo: TipoPeriodo
  inicio?: string        // 'AAAA-MM-DD', só no personalizado
  fim?: string
  passageiro?: string    // uuid
  trajeto?: string       // uuid
  sentido?: Sentido      // de lib/viagens/tipos
  pagina: number         // 1–50
}

type Periodo = { inicio: string; fim: string } // datas inclusivas, 'AAAA-MM-DD'

type LinhaHistorico = {
  id: string
  realizada_em: string
  criado_em: string
  sentido: Sentido
  trajeto_id: string
  origem: string
  destino: string
  passageiros: string[]
  total_centavos: number
  valor_passageiro_centavos: number | null
}

type ResumoHistorico = { quantidade: number; total_centavos: number }
```

## `lib/historico/filtros.ts` (puro, testado)

| Função | Contrato |
|--------|----------|
| `lerFiltros(params: URLSearchParams \| Record<string, string \| string[] \| undefined>): { filtro: FiltroHistorico; periodoInvalido: boolean }` | aplica as regras de [research.md §4](../research.md); `passageiro`/`trajeto` só passam se forem uuid (a checagem contra as opções do motorista é feita na página) |
| `paraQuery(filtro: FiltroHistorico): string` | serializa só os campos diferentes do padrão, em ordem fixa; `pagina` só se > 1; `inicio`/`fim` só no personalizado |
| `resolverPeriodo(filtro: FiltroHistorico, hoje: string): Periodo` | regras de [research.md §3](../research.md) |
| `temFiltroAlemDoPadrao(filtro): boolean` | decide se "Limpar filtros" aparece |
| `rotuloPeriodo(periodo: Periodo): string` | `"01/10/2026 a 31/10/2026"`; mesmo dia → `"01/10/2026"` |

**Exemplos obrigatórios nos testes**:

| Entrada | Esperado |
|---------|----------|
| `resolverPeriodo({periodo:'este-mes'}, '2026-02-10')` | `2026-02-01` a `2026-02-28` |
| `resolverPeriodo({periodo:'este-mes'}, '2028-02-10')` | `2028-02-01` a `2028-02-29` |
| `resolverPeriodo({periodo:'mes-passado'}, '2026-01-15')` | `2025-12-01` a `2025-12-31` |
| `resolverPeriodo({periodo:'30-dias'}, '2026-03-05')` | `2026-02-04` a `2026-03-05` |
| `lerFiltros({periodo:'personalizado', inicio:'2026-09-10', fim:'2026-09-01'})` | `periodo: 'este-mes'`, `periodoInvalido: true` |
| `lerFiltros({periodo:'personalizado', inicio:'2026-02-30', fim:'2026-03-01'})` | `periodo: 'este-mes'`, `periodoInvalido: true` |
| `lerFiltros({passageiro:'abc', sentido:'lado', pagina:'99'})` | sem passageiro, sem sentido, `pagina: 1` |
| `paraQuery(lerFiltros(q).filtro)` para uma query válida | mesma query (ida e volta) |

## `lib/format.ts` (acréscimo)

| Função | Contrato |
|--------|----------|
| `hojeEmSaoPaulo(agora?: Date): string` | data `AAAA-MM-DD` de `agora` no fuso `America/Sao_Paulo`; ex.: `2026-10-01T02:30:00Z` → `2026-09-30` |

## `lib/historico/consultas.ts` (servidor)

| Função | Contrato |
|--------|----------|
| `obterOpcoesFiltros(): Promise<{ passageiros: OpcaoFiltro[]; trajetos: OpcaoFiltro[] }>` | todos os passageiros e trajetos do motorista, com `arquivado: boolean`; ordenação de [data-model.md](../data-model.md#opções-dos-filtros) |
| `listarHistorico(periodo: Periodo, filtro: FiltroHistorico, limite: number): Promise<{ linhas: LinhaHistorico[]; temMais: boolean }>` | chama `historico_viagens` com `limite + 1` |
| `resumirHistorico(periodo: Periodo, filtro: FiltroHistorico): Promise<ResumoHistorico>` | chama `historico_resumo`; converte `total_centavos` para `number` |
| `existeViagemAtiva(): Promise<boolean>` | distingue os dois estados vazios (FR-017); só é chamada quando o resultado vem vazio |

Erros do Supabase viram `throw new Error('Falha ao …: ' + mensagem)`, tratados pelo `error.tsx`
(padrão do slice 003). A página executa `listarHistorico` e `resumirHistorico` em paralelo.

`OpcaoFiltro = { id: string; rotulo: string; arquivado: boolean }`.
