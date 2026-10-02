import { ArrowLeft, Settings } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { AvisoUrl } from '@/components/aviso-url'
import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { obterDadosCobranca } from '@/lib/pagamentos/consultas'
import { destinoCobranca } from '@/lib/pagamentos/validacao'

import { Cobranca } from './cobranca'

type Props = { params: Promise<{ passageiroId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { passageiroId } = await params
  const dados = await obterDadosCobranca(passageiroId)
  return { title: dados ? `Cobrar ${dados.nome} · Caronas Já` : 'Cobrar · Caronas Já' }
}

// Cobrança pelo WhatsApp (FR-015–FR-020). Nada é gravado nesta tela.
export default async function CobrarPage({ params }: Props) {
  await obterUsuarioLogado()
  const { passageiroId } = await params
  const dados = await obterDadosCobranca(passageiroId)
  if (!dados) notFound()

  // Sem chave PIX → configurações (e volta para cá); sem pendências → pagamentos do passageiro.
  const destino = destinoCobranca({
    chavePix: dados.chavePix,
    pendentes: dados.itens.length,
    passageiroId,
  })
  if (destino) redirect(destino)

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <Link
        href={`/pagamentos/${passageiroId}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold break-words">Cobrar {dados.nome}</h1>
        <Link
          href={`/pagamentos/configuracoes?voltar=/pagamentos/${passageiroId}/cobrar`}
          className="inline-flex min-h-11 items-center gap-1 text-sm underline-offset-4 hover:underline"
        >
          <Settings className="size-4" aria-hidden />
          Alterar chave PIX
        </Link>
      </div>
      <Cobranca
        nome={dados.nome}
        telefone={dados.telefone}
        chavePix={dados.chavePix!}
        itens={dados.itens}
      />
      <Suspense>
        <AvisoUrl mensagens={{ 'pix-salva': 'Chave PIX salva' }} />
      </Suspense>
    </div>
  )
}
