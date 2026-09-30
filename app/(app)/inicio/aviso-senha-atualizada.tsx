'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

// Mostra "Senha atualizada" ao chegar de /redefinir-senha e limpa o parâmetro da URL,
// para o aviso não se repetir ao recarregar.
export function AvisoSenhaAtualizada() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const senhaAtualizada = searchParams.get('senha') === 'atualizada'

  useEffect(() => {
    if (!senhaAtualizada) return
    // O id evita toast duplicado quando o efeito roda duas vezes (Strict Mode em dev).
    toast.success('Senha atualizada', { id: 'senha-atualizada' })
    router.replace(pathname)
  }, [senhaAtualizada, router, pathname])

  return null
}
