'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

import { itemAtivo, navItems } from './nav-items'
import type { Usuario } from './usuario'

// Navegação lateral fixa, visível a partir de 768px (no celular, a BottomNav assume).
export function AppSidebar({ usuario }: { usuario: Usuario }) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="none" className="sticky top-0 hidden h-svh border-r md:flex">
      <SidebarHeader className="h-14 justify-center px-4">
        <Link href="/inicio" className="text-lg font-semibold">
          Caronas Já
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Navegação lateral">
              <SidebarMenu>
                {navItems.map(({ rotulo, href, icone: Icone }) => {
                  const ativo = itemAtivo(pathname, href)
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild size="lg" isActive={ativo}>
                        <Link href={href} aria-current={ativo ? 'page' : undefined}>
                          <Icone />
                          <span>{rotulo}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex min-w-0 flex-col text-sm">
          <span className="truncate font-medium">{usuario.nome}</span>
          <span className="truncate text-muted-foreground">{usuario.email}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
