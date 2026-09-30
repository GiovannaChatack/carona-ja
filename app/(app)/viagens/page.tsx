import { Route } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { obterUsuarioLogado } from '@/lib/auth/sessao'

export const metadata: Metadata = { title: 'Viagens · Caronas Já' }

// Provisória (fatia A): a lista de viagens chega na fatia B (tasks.md, T038).
export default async function ViagensPage() {
  await obterUsuarioLogado()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Viagens</h1>
      <EmptyState
        icone={Route}
        titulo="Cadastre seus trajetos"
        descricao="Os trajetos são a origem e o destino das suas caronas. Em seguida você poderá registrar as viagens."
        acao={
          <Button asChild>
            <Link href="/viagens/trajetos">Trajetos</Link>
          </Button>
        }
      />
    </div>
  )
}
