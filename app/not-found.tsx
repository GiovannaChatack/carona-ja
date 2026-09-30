import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Página não encontrada · Caronas Já' }

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="max-w-sm text-muted-foreground">
        O endereço que você abriu não existe ou foi removido.
      </p>
      <Button asChild>
        <Link href="/inicio">Voltar ao início</Link>
      </Button>
    </main>
  )
}
