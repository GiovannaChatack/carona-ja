import type { Metadata } from 'next'

import { cadastrarTrajeto } from '../actions'
import { FormularioTrajeto } from '../formulario-trajeto'

export const metadata: Metadata = { title: 'Novo trajeto · Caronas Já' }

export default function NovoTrajetoPage() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Novo trajeto</h1>
      <FormularioTrajeto
        acao={cadastrarTrajeto}
        textoEnviar="Salvar"
        hrefCancelar="/viagens/trajetos"
      />
    </div>
  )
}
