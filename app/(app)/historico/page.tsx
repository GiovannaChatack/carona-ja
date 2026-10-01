// Next 16 (node_modules/next/dist/docs): searchParams é Promise, como em /viagens; o error.tsx
// recebe `retry` (não `reset`), já tratado por ErroConexao. Nenhuma outra diferença.
import type { Metadata } from 'next'

import { Card, CardContent } from '@/components/ui/card'
import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { formatCurrency, hojeEmSaoPaulo } from '@/lib/format'
import {
  existeViagemAtiva,
  listarHistorico,
  obterOpcoesFiltros,
  resumirHistorico,
} from '@/lib/historico/consultas'
import {
  escolherEstadoVazio,
  lerFiltros,
  paraQuery,
  resolverPeriodo,
  rotuloPeriodo,
} from '@/lib/historico/filtros'

import { FiltrosHistorico } from './filtros-historico'
import { TabelaHistorico } from './tabela-historico'

export const metadata: Metadata = { title: 'Histórico · Caronas Já' }

const POR_PAGINA = 20
const PAGINA_MAX = 50

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function HistoricoPage({ searchParams }: Props) {
  // Defesa em profundidade: o proxy.ts já exige sessão.
  await obterUsuarioLogado()
  const { filtro, periodoInvalido } = lerFiltros(await searchParams)
  const opcoes = await obterOpcoesFiltros()

  // Passageiro ou trajeto fora das opções do motorista (inexistente ou de outra conta): o filtro
  // é ignorado (FR-020).
  const passageiro = opcoes.passageiros.find((p) => p.id === filtro.passageiro)
  if (!passageiro) delete filtro.passageiro
  if (!opcoes.trajetos.some((t) => t.id === filtro.trajeto)) delete filtro.trajeto
  const nomePassageiro = passageiro?.rotulo.replace(/ \(arquivado\)$/, '')

  const periodo = resolverPeriodo(filtro, hojeEmSaoPaulo())
  const [{ linhas, temMais }, resumo] = await Promise.all([
    listarHistorico(periodo, filtro, filtro.pagina * POR_PAGINA),
    resumirHistorico(periodo, filtro),
  ])
  const estadoVazio = linhas.length === 0 ? escolherEstadoVazio(await existeViagemAtiva()) : null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Histórico</h1>
      {/* key: remonta os filtros quando a URL muda (limpar, voltar, recarregar). */}
      <FiltrosHistorico key={paraQuery(filtro)} filtro={filtro} opcoes={opcoes} />
      {periodoInvalido && (
        <p role="status" className="rounded-lg border bg-muted px-4 py-3 text-sm">
          Período inválido; mostrando este mês.
        </p>
      )}
      <section aria-label="Resumo">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{rotuloPeriodo(periodo)}</p>
            <p className="text-lg font-semibold">
              {resumo.quantidade === 1 ? '1 viagem' : `${resumo.quantidade} viagens`}
            </p>
            <p className="break-words">
              {nomePassageiro ? `Total cobrado de ${nomePassageiro}: ` : 'Total cobrado: '}
              <span className="font-semibold whitespace-nowrap">
                {formatCurrency(resumo.total_centavos)}
              </span>
            </p>
          </CardContent>
        </Card>
      </section>
      <TabelaHistorico
        linhas={linhas}
        temMais={temMais && filtro.pagina < PAGINA_MAX}
        filtro={filtro}
        estadoVazio={estadoVazio}
        nomePassageiro={nomePassageiro}
      />
    </div>
  )
}
