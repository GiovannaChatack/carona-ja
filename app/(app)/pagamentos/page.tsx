import { Settings, Wallet } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { AvisoUrl } from '@/components/aviso-url'
import { EmptyState } from '@/components/empty-state'
import { ResponsiveTable, type Coluna } from '@/components/responsive-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { formatCurrency } from '@/lib/format'
import { listarPendencias } from '@/lib/pagamentos/consultas'
import type { PendenciaPassageiro } from '@/lib/pagamentos/tipos'

export const metadata: Metadata = { title: 'Pagamentos · Caronas Já' }

const COLUNAS: Coluna<PendenciaPassageiro>[] = [
  {
    chave: 'nome',
    titulo: 'Nome',
    essencial: true,
    render: (p) => (
      <span className="inline-flex flex-wrap items-center justify-end gap-2 md:justify-start">
        {/* A linha inteira é clicável no celular (o ::after cobre o card). */}
        <Link
          href={`/pagamentos/${p.passageiro_id}`}
          className="font-medium break-words underline-offset-4 hover:underline max-md:after:absolute max-md:after:inset-0"
        >
          {p.nome}
        </Link>
        {p.arquivado_em && <Badge variant="secondary">Arquivado</Badge>}
      </span>
    ),
  },
  {
    chave: 'viagens',
    titulo: 'Viagens',
    essencial: true,
    render: (p) =>
      p.quantidade_pendentes === 1 ? '1 viagem' : `${p.quantidade_pendentes} viagens`,
  },
  {
    chave: 'total',
    titulo: 'Total devido',
    essencial: true,
    render: (p) => (
      <span className="font-medium whitespace-nowrap">
        {formatCurrency(p.total_pendente_centavos)}
      </span>
    ),
  },
]

export default async function PagamentosPage() {
  // Defesa em profundidade: o proxy.ts já exige sessão.
  await obterUsuarioLogado()
  const { pendencias, totalCentavos } = await listarPendencias()
  const quantidade = pendencias.length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Pagamentos</h1>
        <Button asChild variant="outline">
          <Link href="/pagamentos/configuracoes">
            <Settings data-icon="inline-start" aria-hidden />
            Chave PIX
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Total a receber</p>
          <p className="text-2xl font-semibold">{formatCurrency(totalCentavos)}</p>
          <p className="text-sm text-muted-foreground">
            {quantidade === 1
              ? '1 passageiro com pendências'
              : `${quantidade} passageiros com pendências`}
          </p>
        </CardContent>
      </Card>
      <ResponsiveTable
        colunas={COLUNAS}
        linhas={pendencias}
        chaveLinha={(p) => p.passageiro_id}
        vazio={
          <EmptyState
            icone={Wallet}
            titulo="Ninguém está devendo"
            descricao="Todas as viagens ativas estão pagas."
          />
        }
      />
      <Suspense>
        <AvisoUrl mensagens={{ 'pix-salva': 'Chave PIX salva' }} />
      </Suspense>
    </div>
  )
}
