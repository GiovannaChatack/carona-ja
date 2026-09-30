import type { Metadata } from 'next'

import { cadastrarPassageiro } from '../actions'
import { FormularioPassageiro } from '../formulario-passageiro'

export const metadata: Metadata = { title: 'Novo passageiro · Caronas Já' }

export default function NovoPassageiroPage() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Novo passageiro</h1>
      <FormularioPassageiro
        acao={cadastrarPassageiro}
        textoEnviar="Salvar"
        hrefCancelar="/passageiros"
      />
    </div>
  )
}
