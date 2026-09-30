import { Button } from '@/components/ui/button'
import { obterUsuarioLogado } from '@/lib/auth/sessao'

// Cabeçalho mínimo provisório; será substituído pelo AppShell na Fatia C.
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { nomeExibicao, email } = await obterUsuarioLogado()

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <span className="font-semibold">Caronas Já</span>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 flex-col text-right text-sm">
            <span className="truncate font-medium">{nomeExibicao}</span>
            <span className="truncate text-muted-foreground">{email}</span>
          </div>
          <form action="/sair" method="post">
            <Button type="submit" variant="outline" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col p-4">{children}</main>
    </>
  )
}
