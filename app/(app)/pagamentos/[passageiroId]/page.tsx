import { ArrowLeft, MessageCircle } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AvisoUrl } from '@/components/aviso-url'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { formatCurrency, formatPhone, hojeEmSaoPaulo } from '@/lib/format'
import { obterPagamentosPassageiro } from '@/lib/pagamentos/consultas'

import { ListaPagas } from './lista-pagas'
import { ListaPendentes } from './lista-pendentes'

const POR_PAGINA = 20
const PAGAS_MAX = 1000

type Props = {
  params: Promise<{ passageiroId: string }>
  searchParams: Promise<{ pagas?: string | string[] }>
}

// ?pagas=N: múltiplo de 20, de 20 a 1000; qualquer outro valor vale 20.
function lerLimitePagas(parametro: string | string[] | undefined) {
  const valor = typeof parametro === 'string' && /^\d+$/.test(parametro) ? Number(parametro) : 0
  return valor >= POR_PAGINA && valor <= PAGAS_MAX && valor % POR_PAGINA === 0 ? valor : POR_PAGINA
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { passageiroId } = await params
  const { pagas } = await searchParams
  const dados = await obterPagamentosPassageiro(passageiroId, lerLimitePagas(pagas))
  return {
    title: dados
      ? `Pagamentos de ${dados.passageiro.nome} · Caronas Já`
      : 'Pagamentos · Caronas Já',
  }
}

export default async function PagamentosPassageiroPage({ params, searchParams }: Props) {
  await obterUsuarioLogado()
  const { passageiroId } = await params
  const { pagas: parametroPagas } = await searchParams
  const limitePagas = lerLimitePagas(parametroPagas)
  const dados = await obterPagamentosPassageiro(passageiroId, limitePagas)
  if (!dados) notFound()

  const { passageiro, pendentes, pagas, temMaisPagas, totalDevidoCentavos } = dados
  const hoje = hojeEmSaoPaulo()

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <Link
        href="/pagamentos"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Pagamentos
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold break-words">
          {passageiro.nome}
          {passageiro.arquivado_em && <Badge variant="secondary">Arquivado</Badge>}
        </h1>
        <p className="text-sm text-muted-foreground">{formatPhone(passageiro.telefone)}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Total devido</p>
            <p className="text-2xl font-semibold" data-testid="total-devido">
              {formatCurrency(totalDevidoCentavos)}
            </p>
            <p className="text-sm text-muted-foreground">
              {pendentes.length === 1
                ? '1 viagem pendente'
                : `${pendentes.length} viagens pendentes`}
            </p>
          </div>
          {pendentes.length > 0 ? (
            <Button asChild>
              <Link href={`/pagamentos/${passageiro.id}/cobrar`}>
                <MessageCircle data-icon="inline-start" aria-hidden />
                Cobrar pelo WhatsApp
              </Link>
            </Button>
          ) : (
            <Button disabled>Nada a cobrar</Button>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="pendentes-titulo" className="flex flex-col gap-3">
        <h2 id="pendentes-titulo" className="text-lg font-semibold">
          Pendentes
        </h2>
        <ListaPendentes passageiroId={passageiro.id} pendentes={pendentes} hoje={hoje} />
      </section>

      <section aria-labelledby="pagas-titulo" className="flex flex-col gap-3">
        <h2 id="pagas-titulo" className="text-lg font-semibold">
          Pagas
        </h2>
        <ListaPagas
          passageiroId={passageiro.id}
          pagas={pagas}
          hoje={hoje}
          proximaPagina={
            temMaisPagas && limitePagas < PAGAS_MAX ? limitePagas + POR_PAGINA : undefined
          }
        />
      </section>

      <Suspense>
        <AvisoUrl mensagens={{ 'pix-salva': 'Chave PIX salva' }} />
      </Suspense>
    </div>
  )
}
