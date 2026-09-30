import type { Metadata } from 'next'
import { Suspense } from 'react'

import { obterUsuarioLogado } from '@/lib/auth/sessao'

import { AvisoSenhaAtualizada } from './aviso-senha-atualizada'

export const metadata: Metadata = { title: 'Início · Caronas Já' }

export default async function InicioPage() {
  const { nomeExibicao } = await obterUsuarioLogado()

  return (
    <>
      <h1 className="text-2xl font-semibold">{`Olá, ${nomeExibicao}`}</h1>
      <Suspense>
        <AvisoSenhaAtualizada />
      </Suspense>
    </>
  )
}
