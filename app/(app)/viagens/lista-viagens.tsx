import { Car } from 'lucide-react'
import Link from 'next/link'

import { EmptyState } from '@/components/empty-state'
import { ResponsiveTable, type Coluna } from '@/components/responsive-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { ViagemResumo } from '@/lib/viagens/tipos'
import { percurso } from '@/lib/viagens/validacao'

// `de` é a querystring da lista: os detalhes a usam para o "voltar" reabrir a mesma página.
function montarColunas(de: string): Coluna<ViagemResumo>[] {
  return [
    {
      chave: 'data',
      titulo: 'Data',
      essencial: true,
      render: (v) => (
        <Link
          href={`/viagens/${v.id}${de ? `?de=${encodeURIComponent(de)}` : ''}`}
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
      render: (v) => v.quantidade_passageiros,
    },
    {
      chave: 'total',
      titulo: 'Total',
      essencial: true,
      render: (v) => <span className="whitespace-nowrap">{formatCurrency(v.total_centavos)}</span>,
    },
  ]
}

type Props = {
  viagens: ViagemResumo[]
  temMais: boolean
  pagina: number
  // Querystring atual da lista (só os parâmetros conhecidos).
  de: string
}

export function ListaViagens({ viagens, temMais, pagina, de }: Props) {
  if (viagens.length === 0) {
    return (
      <EmptyState
        icone={Car}
        titulo="Nenhuma viagem registrada"
        descricao="Registre cada ida ou volta com os passageiros que foram e quanto cada um pagou."
        acao={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/viagens/nova">Nova viagem</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/viagens/trajetos">Trajetos</Link>
            </Button>
          </div>
        }
      />
    )
  }

  const proxima = new URLSearchParams(de)
  proxima.set('pagina', String(pagina + 1))

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveTable
        colunas={montarColunas(de)}
        linhas={viagens}
        chaveLinha={(v) => v.id}
        vazio={null}
      />
      {temMais && (
        <Button asChild variant="outline" className="h-11 self-center">
          <Link href={`/viagens?${proxima.toString()}`} scroll={false}>
            Carregar mais
          </Link>
        </Button>
      )}
    </div>
  )
}
