import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { formatPhone } from '@/lib/format'
import { obterPassageiro } from '@/lib/passageiros/consultas'
import { centavosParaCampo } from '@/lib/passageiros/validacao'

import { editarPassageiro } from '../../actions'
import { FormularioPassageiro } from '../../formulario-passageiro'

export const metadata: Metadata = { title: 'Editar passageiro · Caronas Já' }

export default async function EditarPassageiroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await obterUsuarioLogado()
  const { id } = await params
  const passageiro = await obterPassageiro(id)
  if (!passageiro) notFound()

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Editar passageiro</h1>
      <FormularioPassageiro
        acao={editarPassageiro.bind(null, id)}
        inicial={{
          nome: passageiro.nome,
          telefone: formatPhone(passageiro.telefone),
          valor: centavosParaCampo(passageiro.valor_padrao_centavos),
          observacao: passageiro.observacao ?? '',
        }}
        textoEnviar="Salvar"
        hrefCancelar={`/passageiros/${id}`}
      />
    </div>
  )
}
