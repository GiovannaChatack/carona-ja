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
import { formatCurrency, formatDate, formatPhone } from '@/lib/format'
import { obterPassageiro } from '@/lib/passageiros/consultas'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ de?: string | string[] }>
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { id } = await params
  const passageiro = await obterPassageiro(id)
  return { title: passageiro ? `${passageiro.nome} · Caronas Já` : 'Passageiro · Caronas Já' }
}

// Repassa só situacao e busca: qualquer outro parâmetro de ?de= é descartado.
function hrefDeVolta(de: string | string[] | undefined) {
  const origem = new URLSearchParams(typeof de === 'string' ? de : '')
  const volta = new URLSearchParams()
  for (const chave of ['situacao', 'busca']) {
    const valor = origem.get(chave)
    if (valor) volta.set(chave, valor)
  }
  const query = volta.toString()
  return query ? `/passageiros?${query}` : '/passageiros'
}

export default async function PassageiroPage({ params, searchParams }: Props) {
  await obterUsuarioLogado()
  const { id } = await params
  const { de } = await searchParams
  const passageiro = await obterPassageiro(id)
  if (!passageiro) notFound()

  const itens: [string, React.ReactNode][] = [
    [
      'Telefone',
      <a
        key="telefone"
        href={`tel:+55${passageiro.telefone}`}
        className="underline-offset-4 hover:underline"
      >
        {formatPhone(passageiro.telefone)}
      </a>,
    ],
    ['Valor padrão por trajeto', formatCurrency(passageiro.valor_padrao_centavos)],
    ['Observação', passageiro.observacao ?? 'Sem observação'],
    [
      'Situação',
      passageiro.arquivado_em ? (
        <Badge key="situacao" variant="secondary">
          Arquivado em {formatDate(passageiro.arquivado_em)}
        </Badge>
      ) : (
        <Badge key="situacao">Ativo</Badge>
      ),
    ],
    ['Cadastrado em', formatDate(passageiro.criado_em)],
    ['Última alteração', formatDate(passageiro.atualizado_em)],
  ]

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <Link
        href={hrefDeVolta(de)}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Passageiros
      </Link>
      <h1 className="text-2xl font-semibold break-words">{passageiro.nome}</h1>
      <Card>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
            {itens.map(([rotulo, valor]) => (
              <div key={rotulo} className="contents">
                <dt className="text-muted-foreground">{rotulo}</dt>
                <dd className="min-w-0 text-right break-words">{valor}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/passageiros/${passageiro.id}/editar`}>
            <Pencil data-icon="inline-start" aria-hidden />
            Editar
          </Link>
        </Button>
      </div>
      <Suspense>
        <AvisoUrl
          mensagens={{
            cadastrado: 'Passageiro cadastrado',
            atualizado: 'Passageiro atualizado',
            arquivado: 'Passageiro arquivado',
            reativado: 'Passageiro reativado',
          }}
        />
      </Suspense>
    </div>
  )
}
