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
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { rotuloTrajeto } from '@/lib/trajetos/validacao'
import { obterViagem } from '@/lib/viagens/consultas'
import { percurso } from '@/lib/viagens/validacao'

import { AcoesViagem } from './acoes-viagem'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ de?: string | string[] }>
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { id } = await params
  const dados = await obterViagem(id)
  return {
    title: dados
      ? `Viagem de ${formatDate(dados.viagem.realizada_em)} · Caronas Já`
      : 'Viagem · Caronas Já',
  }
}

// Repassa só situacao e pagina: qualquer outro parâmetro de ?de= é descartado.
function hrefDeVolta(de: string | string[] | undefined) {
  const origem = new URLSearchParams(typeof de === 'string' ? de : '')
  const volta = new URLSearchParams()
  for (const chave of ['situacao', 'pagina']) {
    const valor = origem.get(chave)
    if (valor) volta.set(chave, valor)
  }
  const query = volta.toString()
  return query ? `/viagens?${query}` : '/viagens'
}

export default async function ViagemPage({ params, searchParams }: Props) {
  await obterUsuarioLogado()
  const { id } = await params
  const { de } = await searchParams
  const dados = await obterViagem(id)
  if (!dados) notFound()

  const { viagem, participacoes } = dados
  const arquivada = viagem.arquivada_em !== null
  const sentido = viagem.sentido === 'ida' ? 'Ida' : 'Volta'
  const itens: [string, React.ReactNode][] = [
    ['Data e hora', formatDateTime(viagem.realizada_em)],
    ['Trajeto', `${rotuloTrajeto(viagem)}${viagem.trajeto_arquivado_em ? ' (arquivado)' : ''}`],
    ['Sentido', sentido],
  ]

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <Link
        href={hrefDeVolta(de)}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Viagens
      </Link>
      <h1 className="text-2xl font-semibold break-words">
        {`${sentido}: ${percurso(viagem, viagem.sentido)}`}
      </h1>
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
      {arquivada && (
        <p className="rounded-lg border bg-muted px-4 py-3 text-sm">
          Esta viagem está arquivada e não é considerada em totais e pendências.
        </p>
      )}
      <section aria-labelledby="passageiros-titulo" className="flex flex-col gap-3">
        <h2 id="passageiros-titulo" className="text-lg font-semibold">
          Passageiros
        </h2>
        <Card>
          <CardContent>
            <ul className="flex flex-col divide-y text-sm">
              {participacoes.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="break-words">{p.passageiro.nome}</span>
                    {p.passageiro.arquivado_em && <Badge variant="secondary">Arquivado</Badge>}
                  </span>
                  <span className="shrink-0 whitespace-nowrap">
                    {formatCurrency(p.valor_centavos)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center justify-between gap-3 border-t pt-3 text-lg font-semibold">
              <span>Total</span>
              <span className="whitespace-nowrap">{formatCurrency(viagem.total_centavos)}</span>
            </p>
          </CardContent>
        </Card>
      </section>
      <div className="flex flex-wrap gap-3">
        {!arquivada && (
          <Button asChild variant="outline">
            <Link href={`/viagens/${viagem.id}/editar`}>
              <Pencil data-icon="inline-start" aria-hidden />
              Editar
            </Link>
          </Button>
        )}
        <AcoesViagem
          id={viagem.id}
          dataFormatada={formatDate(viagem.realizada_em)}
          arquivada={arquivada}
        />
      </div>
      <Suspense>
        <AvisoUrl
          mensagens={{
            atualizada: 'Viagem atualizada',
            arquivada: 'Viagem arquivada',
            reativada: 'Viagem reativada',
          }}
        />
      </Suspense>
    </div>
  )
}
