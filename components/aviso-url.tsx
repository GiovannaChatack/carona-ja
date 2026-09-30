'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

type AvisoUrlProps = {
  parametro?: string
  mensagens: Record<string, string>
}

// Mostra um toast de sucesso a partir de um parâmetro da URL (ex.: ?aviso=cadastrado) e remove
// só esse parâmetro, para o aviso não se repetir ao recarregar. Renderizar dentro de <Suspense>.
export function AvisoUrl({ parametro = 'aviso', mensagens }: AvisoUrlProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const valor = searchParams.get(parametro)
  const mensagem = valor && Object.hasOwn(mensagens, valor) ? mensagens[valor] : undefined

  useEffect(() => {
    if (!mensagem) return
    // O id evita toast duplicado quando o efeito roda duas vezes (Strict Mode em dev).
    toast.success(mensagem, { id: `${parametro}-${valor}` })

    const restantes = new URLSearchParams(searchParams.toString())
    restantes.delete(parametro)
    const query = restantes.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [mensagem, parametro, valor, searchParams, router, pathname])

  return null
}
