import { Route, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { paraCampoDataHora } from '@/lib/format'
import { obterDadosFormularioViagem } from '@/lib/viagens/consultas'

import { registrarViagem } from '../actions'
import { FormularioViagem } from '../formulario-viagem'

export const metadata: Metadata = { title: 'Nova viagem · Caronas Já' }

const UM_DIA_MS = 24 * 60 * 60 * 1000

export default async function NovaViagemPage() {
  await obterUsuarioLogado()
  const { trajetos, passageiros, trajetoSugeridoId } = await obterDadosFormularioViagem()
  const agora = new Date()

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nova viagem</h1>
      {trajetos.length === 0 ? (
        <EmptyState
          icone={Route}
          titulo="Cadastre um trajeto primeiro"
          descricao="A viagem é registrada em um trajeto, como Casa → Faculdade."
          acao={
            <Button asChild>
              <Link href="/viagens/trajetos/novo">Novo trajeto</Link>
            </Button>
          }
        />
      ) : passageiros.length === 0 ? (
        <EmptyState
          icone={Users}
          titulo="Cadastre um passageiro primeiro"
          descricao="A viagem registra quem foi com você e quanto cada um pagou."
          acao={
            <Button asChild>
              <Link href="/passageiros/novo">Novo passageiro</Link>
            </Button>
          }
        />
      ) : (
        <FormularioViagem
          acao={registrarViagem}
          trajetos={trajetos}
          passageiros={passageiros}
          inicial={{
            trajeto: trajetoSugeridoId ?? undefined,
            data_hora: paraCampoDataHora(agora),
          }}
          maxDataHora={paraCampoDataHora(new Date(agora.getTime() + UM_DIA_MS))}
          textoEnviar="Registrar viagem"
          hrefCancelar="/viagens"
        />
      )}
    </div>
  )
}
