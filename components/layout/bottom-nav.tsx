'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

import { itemAtivo, navItems } from './nav-items'

// Navegação inferior fixa do celular (< 768px). Comporta até 5 itens.
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {navItems.map(({ rotulo, href, icone: Icone }) => {
          const ativo = itemAtivo(pathname, href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 px-2 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  ativo && 'text-primary',
                )}
              >
                <Icone className="size-5" aria-hidden />
                <span>{rotulo}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
