import { SidebarProvider } from '@/components/ui/sidebar'

import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'
import { BottomNav } from './bottom-nav'
import { TituloPagina } from './titulo-pagina'
import type { Usuario } from './usuario'

type AppShellProps = { usuario: Usuario; children: React.ReactNode }

// Layout das telas autenticadas (contracts/ui.md): Sidebar a partir de 768px, BottomNav abaixo.
export function AppShell({ usuario, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar usuario={usuario} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader titulo={<TituloPagina />} usuario={usuario} />
        {/* pb-24 no celular: espaço para a BottomNav fixa não cobrir o conteúdo. */}
        <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col p-4 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </SidebarProvider>
  )
}
