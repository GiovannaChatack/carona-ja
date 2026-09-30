'use client'

import { usePathname } from 'next/navigation'

import { itemAtivo, navItems } from './nav-items'

// Título exibido no cabeçalho: o rótulo do item de navegação da rota atual.
export function TituloPagina() {
  const pathname = usePathname()
  return navItems.find(({ href }) => itemAtivo(pathname, href))?.rotulo ?? null
}
