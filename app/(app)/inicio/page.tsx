import { Car } from 'lucide-react'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { EmptyState } from '@/components/empty-state'
import { obterUsuarioLogado } from '@/lib/auth/sessao'

import { AvisoSenhaAtualizada } from './aviso-senha-atualizada'

export const metadata: Metadata = { title: 'Início · Caronas Já' }

export default async function InicioPage() {
  const { nomeExibicao } = await obterUsuarioLogado()

  return (
    <>
      <h1 className="text-2xl font-semibold">{`Olá, ${nomeExibicao}`}</h1>
      {/* Sem botões nem links: as telas de passageiros, viagens e pagamentos ainda não existem (FR-018). */}
      <EmptyState
        icone={Car}
        titulo="Tudo pronto por aqui"
        descricao="Em breve você poderá cadastrar passageiros, registrar viagens e acompanhar pagamentos."
      />
      <Suspense>
        <AvisoSenhaAtualizada />
      </Suspense>
    </>
  )
}
