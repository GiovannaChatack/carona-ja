import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { obterTrajeto } from '@/lib/trajetos/consultas'

import { editarTrajeto } from '../../actions'
import { FormularioTrajeto } from '../../formulario-trajeto'

export const metadata: Metadata = { title: 'Editar trajeto · Caronas Já' }

export default async function EditarTrajetoPage({ params }: { params: Promise<{ id: string }> }) {
  await obterUsuarioLogado()
  const { id } = await params
  const trajeto = await obterTrajeto(id)
  if (!trajeto) notFound()

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Editar trajeto</h1>
      <FormularioTrajeto
        acao={editarTrajeto.bind(null, id)}
        inicial={{ origem: trajeto.origem, destino: trajeto.destino }}
        textoEnviar="Salvar"
        hrefCancelar={`/viagens/trajetos/${id}`}
      />
    </div>
  )
}
