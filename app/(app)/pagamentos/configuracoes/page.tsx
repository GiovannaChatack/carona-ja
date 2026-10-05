import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { obterChavePix } from '@/lib/pagamentos/consultas'
import { caminhoVoltarSeguro } from '@/lib/pagamentos/validacao'

import { FormularioChavePix } from './formulario-chave-pix'

export const metadata: Metadata = { title: 'Chave PIX · Caronas Já' }

type Props = {
  searchParams: Promise<{ voltar?: string | string[]; aviso?: string | string[] }>
}

export default async function ChavePixPage({ searchParams }: Props) {
  await obterUsuarioLogado()
  const { voltar: parametroVoltar, aviso } = await searchParams
  // ?voltar= só no formato /pagamentos/<uuid>/cobrar (FR-026).
  const voltar = typeof parametroVoltar === 'string' ? caminhoVoltarSeguro(parametroVoltar) : null
  const chaveAtual = await obterChavePix()

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <Link
        href={voltar ?? '/pagamentos'}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {voltar ? 'Cobrança' : 'Pagamentos'}
      </Link>
      <h1 className="text-2xl font-semibold">Chave PIX</h1>
      {aviso === 'pix-necessaria' && (
        <p role="status" className="rounded-lg border bg-muted px-4 py-3 text-sm">
          Cadastre a chave PIX para gerar cobranças.
        </p>
      )}
      <FormularioChavePix chaveAtual={chaveAtual} voltar={voltar} />
    </div>
  )
}
