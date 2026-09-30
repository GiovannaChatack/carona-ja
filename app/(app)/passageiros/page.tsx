import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { AvisoUrl } from '@/components/aviso-url'
import { Button } from '@/components/ui/button'
import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { listarPassageiros } from '@/lib/passageiros/consultas'
import type { SituacaoPassageiro } from '@/lib/passageiros/tipos'

import { ListaPassageiros } from './lista-passageiros'

export const metadata: Metadata = { title: 'Passageiros · Caronas Já' }

type Props = { searchParams: Promise<{ situacao?: string | string[] }> }

export default async function PassageirosPage({ searchParams }: Props) {
  // Defesa em profundidade: o proxy.ts já exige sessão.
  await obterUsuarioLogado()
  const { situacao: parametro } = await searchParams
  const situacao: SituacaoPassageiro = parametro === 'arquivados' ? 'arquivados' : 'ativos'
  const passageiros = await listarPassageiros(situacao)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Passageiros</h1>
        <Button asChild>
          <Link href="/passageiros/novo">
            <Plus data-icon="inline-start" aria-hidden />
            Novo passageiro
          </Link>
        </Button>
      </div>
      <Suspense>
        <ListaPassageiros passageiros={passageiros} situacao={situacao} />
        <AvisoUrl mensagens={{ excluido: 'Passageiro excluído' }} />
      </Suspense>
    </div>
  )
}
