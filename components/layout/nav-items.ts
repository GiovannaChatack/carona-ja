import { Car, History, House, Users, Wallet, type LucideIcon } from 'lucide-react'

export type NavItem = { rotulo: string; href: string; icone: LucideIcon }

// Lista única que alimenta a Sidebar e a BottomNav. Cada slice futuro adiciona aqui o item da
// sua tela, somente quando ela existir. A BottomNav comporta no máximo 5 itens.
export const navItems: NavItem[] = [
  { rotulo: 'Início', href: '/inicio', icone: House },
  { rotulo: 'Passageiros', href: '/passageiros', icone: Users },
  { rotulo: 'Viagens', href: '/viagens', icone: Car },
  { rotulo: 'Histórico', href: '/historico', icone: History },
  { rotulo: 'Pagamentos', href: '/pagamentos', icone: Wallet },
]

export function itemAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
