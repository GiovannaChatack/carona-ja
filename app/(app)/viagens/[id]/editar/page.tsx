import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { paraCampoDataHora } from '@/lib/format'
import { obterDadosFormularioViagem, obterViagem } from '@/lib/viagens/consultas'

import { editarViagem } from '../../actions'
import { FormularioViagem } from '../../formulario-viagem'

export const metadata: Metadata = { title: 'Editar viagem · Caronas Já' }

const UM_DIA_MS = 24 * 60 * 60 * 1000

export default async function EditarViagemPage({ params }: { params: Promise<{ id: string }> }) {
  await obterUsuarioLogado()
  const { id } = await params
  const dados = await obterViagem(id)
  if (!dados) notFound()
  // Viagem arquivada não é editável: volta aos detalhes, onde pode ser reativada.
  if (dados.viagem.arquivada_em) redirect(`/viagens/${id}`)

  const formulario = await obterDadosFormularioViagem(id)
  if (!formulario?.viagem) notFound()
  const agora = new Date()

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Editar viagem</h1>
      <FormularioViagem
        acao={editarViagem.bind(null, id)}
        trajetos={formulario.trajetos}
        passageiros={formulario.passageiros}
        inicial={formulario.viagem}
        maxDataHora={paraCampoDataHora(new Date(agora.getTime() + UM_DIA_MS))}
        textoEnviar="Salvar alterações"
        textoDuplicada="Salvar"
        hrefCancelar={`/viagens/${id}`}
      />
    </div>
  )
}
