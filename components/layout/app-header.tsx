import Link from 'next/link'

import { ThemeToggle } from '@/components/theme-toggle'

import { MenuConta } from './menu-conta'
import type { Usuario } from './usuario'

type AppHeaderProps = { titulo: React.ReactNode; usuario: Usuario }

// Cabeçalho do AppShell: marca (só no celular), título da página, tema e menu da conta.
export function AppHeader({ titulo, usuario }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4">
      <Link href="/inicio" className="shrink-0 font-semibold md:hidden">
        Caronas Já
      </Link>
      <p className="min-w-0 flex-1 truncate font-medium text-muted-foreground md:text-foreground">
        {titulo}
      </p>
      <ThemeToggle />
      <MenuConta usuario={usuario} />
    </header>
  )
}
