import { AppShell } from '@/components/layout/app-shell'
import { obterUsuarioLogado } from '@/lib/auth/sessao'

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { nomeExibicao, email, criadoEm } = await obterUsuarioLogado()

  return (
    <AppShell usuario={{ nome: nomeExibicao, email, membroDesde: criadoEm }}>{children}</AppShell>
  )
}
