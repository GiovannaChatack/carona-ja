import { ArrowLeft, Pencil } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AvisoUrl } from '@/components/aviso-url'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { formatDate } from '@/lib/format'
import { obterTrajeto } from '@/lib/trajetos/consultas'
import { rotuloTrajeto } from '@/lib/trajetos/validacao'

import { AcoesTrajeto } from './acoes-trajeto'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ de?: string | string[] }>
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { id } = await params
  const trajeto = await obterTrajeto(id)
  return { title: trajeto ? `${rotuloTrajeto(trajeto)} · Caronas Já` : 'Trajeto · Caronas Já' }
}

// Repassa só situacao: qualquer outro parâmetro de ?de= é descartado.
function hrefDeVolta(de: string | string[] | undefined) {
  const origem = new URLSearchParams(typeof de === 'string' ? de : '')
  const volta = new URLSearchParams()
  const situacao = origem.get('situacao')
  if (situacao) volta.set('situacao', situacao)
  const query = volta.toString()
  return query ? `/viagens/trajetos?${query}` : '/viagens/trajetos'
}

export default async function TrajetoPage({ params, searchParams }: Props) {
  await obterUsuarioLogado()
  const { id } = await params
  const { de } = await searchParams
  const trajeto = await obterTrajeto(id)
  if (!trajeto) notFound()

  const rotulo = rotuloTrajeto(trajeto)
  const itens: [string, React.ReactNode][] = [
    ['Origem', trajeto.origem],
    ['Destino', trajeto.destino],
    ['Viagens registradas', trajeto.quantidade_viagens],
    [
      'Situação',
      trajeto.arquivado_em ? (
        <Badge key="situacao" variant="secondary">
          Arquivado em {formatDate(trajeto.arquivado_em)}
        </Badge>
      ) : (
        <Badge key="situacao">Ativo</Badge>
      ),
    ],
    ['Cadastrado em', formatDate(trajeto.criado_em)],
    ['Última alteração', formatDate(trajeto.atualizado_em)],
  ]

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <Link
        href={hrefDeVolta(de)}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Trajetos
      </Link>
      <h1 className="text-2xl font-semibold break-words">{rotulo}</h1>
      <Card>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
            {itens.map(([titulo, valor]) => (
              <div key={titulo} className="contents">
                <dt className="text-muted-foreground">{titulo}</dt>
                <dd className="min-w-0 text-right break-words">{valor}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {trajeto.arquivado_em && (
        <p className="rounded-lg border bg-muted px-4 py-3 text-sm">
          Este trajeto está arquivado e não aparece ao registrar novas viagens.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/viagens/trajetos/${trajeto.id}/editar`}>
            <Pencil data-icon="inline-start" aria-hidden />
            Editar
          </Link>
        </Button>
        <AcoesTrajeto id={trajeto.id} rotulo={rotulo} arquivado={trajeto.arquivado_em !== null} />
      </div>
      <Suspense>
        <AvisoUrl
          mensagens={{
            cadastrado: 'Trajeto cadastrado',
            atualizado: 'Trajeto atualizado',
            arquivado: 'Trajeto arquivado',
            reativado: 'Trajeto reativado',
          }}
        />
      </Suspense>
    </div>
  )
}
