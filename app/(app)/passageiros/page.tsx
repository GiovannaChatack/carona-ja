import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { AvisoUrl } from '@/components/aviso-url'
import { Button } from '@/components/ui/button'
import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { listarPassageiros } from '@/lib/passageiros/consultas'

import { ListaPassageiros } from './lista-passageiros'

export const metadata: Metadata = { title: 'Passageiros · Caronas Já' }

export default async function PassageirosPage() {
  // Defesa em profundidade: o proxy.ts já exige sessão.
  await obterUsuarioLogado()
  const passageiros = await listarPassageiros('ativos')

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
        <ListaPassageiros passageiros={passageiros} />
        <AvisoUrl mensagens={{ cadastrado: 'Passageiro cadastrado' }} />
      </Suspense>
    </div>
  )
}
