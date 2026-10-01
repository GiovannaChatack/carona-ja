import { Car, SearchX } from 'lucide-react'
import Link from 'next/link'

import { EmptyState } from '@/components/empty-state'
import { ResponsiveTable, type Coluna } from '@/components/responsive-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { paraQuery, temFiltroAlemDoPadrao } from '@/lib/historico/filtros'
import type { EstadoVazio, FiltroHistorico, LinhaHistorico } from '@/lib/historico/tipos'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { percurso } from '@/lib/viagens/validacao'

// `de` é a query atual do histórico: os detalhes a usam para o "voltar" (research §7).
function montarColunas(de: string, nomePassageiro?: string): Coluna<LinhaHistorico>[] {
  const volta = new URLSearchParams({ volta: 'historico' })
  if (de) volta.set('de', de)
  const colunas: Coluna<LinhaHistorico>[] = [
    {
      chave: 'data',
      titulo: 'Data',
      essencial: true,
      render: (v) => (
        <Link
          href={`/viagens/${v.id}?${volta.toString()}`}
          className="font-medium whitespace-nowrap underline-offset-4 hover:underline max-md:after:absolute max-md:after:inset-0"
        >
          {formatDateTime(v.realizada_em)}
        </Link>
      ),
    },
    {
      chave: 'percurso',
      titulo: 'Percurso',
      essencial: true,
      render: (v) => <span className="break-words">{percurso(v, v.sentido)}</span>,
    },
    {
      chave: 'sentido',
      titulo: 'Sentido',
      essencial: true,
      render: (v) => (
        <Badge variant={v.sentido === 'ida' ? 'default' : 'secondary'}>
          {v.sentido === 'ida' ? 'Ida' : 'Volta'}
        </Badge>
      ),
    },
    {
      chave: 'passageiros',
      titulo: 'Passageiros',
      essencial: true,
      render: (v) => (
        <span className="break-words whitespace-normal">{v.passageiros.join(', ')}</span>
      ),
    },
    {
      chave: 'total',
      titulo: 'Total',
      essencial: true,
      render: (v) => <span className="whitespace-nowrap">{formatCurrency(v.total_centavos)}</span>,
    },
  ]
  if (nomePassageiro !== undefined) {
    colunas.push({
      chave: 'valor-passageiro',
      titulo: `Valor de ${nomePassageiro}`,
      essencial: true,
      render: (v) => (
        <span className="whitespace-nowrap">
          {formatCurrency(v.valor_passageiro_centavos ?? 0)}
        </span>
      ),
    })
  }
  return colunas
}

function Vazio({ estado, filtro }: { estado: EstadoVazio; filtro: FiltroHistorico }) {
  if (estado === 'sem-viagens') {
    return (
      <EmptyState
        icone={Car}
        titulo="Nenhuma viagem registrada"
        descricao="As viagens que você registrar aparecem aqui, com filtros por período e passageiro."
        acao={
          <Button asChild className="h-11">
            <Link href="/viagens/nova">Nova viagem</Link>
          </Button>
        }
      />
    )
  }
  return (
    <EmptyState
      icone={SearchX}
      titulo="Nenhuma viagem no período"
      descricao="Não há viagens com os filtros escolhidos."
      acao={
        temFiltroAlemDoPadrao(filtro) ? (
          <Button asChild variant="outline" className="h-11">
            <Link href="/historico">Limpar filtros</Link>
          </Button>
        ) : undefined
      }
    />
  )
}

type Props = {
  linhas: LinhaHistorico[]
  temMais: boolean
  filtro: FiltroHistorico
  // Só quando não há linhas.
  estadoVazio: EstadoVazio | null
  // Nome do passageiro filtrado: acrescenta a coluna com o valor dele.
  nomePassageiro?: string
}

export function TabelaHistorico({ linhas, temMais, filtro, estadoVazio, nomePassageiro }: Props) {
  if (linhas.length === 0) return <Vazio estado={estadoVazio ?? 'sem-resultado'} filtro={filtro} />

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveTable
        colunas={montarColunas(paraQuery(filtro), nomePassageiro)}
        linhas={linhas}
        chaveLinha={(v) => v.id}
        vazio={null}
      />
      {temMais && (
        <Button asChild variant="outline" className="h-11 self-center">
          <Link
            href={`/historico?${paraQuery({ ...filtro, pagina: filtro.pagina + 1 })}`}
            scroll={false}
          >
            Carregar mais
          </Link>
        </Button>
      )}
    </div>
  )
}
