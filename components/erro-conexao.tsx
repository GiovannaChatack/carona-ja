'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

type ErroConexaoProps = { error: Error & { digest?: string }; retry: () => void }

// Conteúdo compartilhado dos error.tsx dos grupos (app) e (publico).
export function ErroConexao({ error, retry }: ErroConexaoProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div role="alert" className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <p className="text-lg font-semibold">Não foi possível conectar. Tente novamente.</p>
      <Button onClick={() => retry()}>Tentar novamente</Button>
    </div>
  )
}
