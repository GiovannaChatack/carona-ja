import { checkSupabaseHealth } from '@/lib/supabase/health'

// Página provisória da Fatia A; será substituída por um redirecionamento na Fatia B.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const bancoOk = await checkSupabaseHealth()

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-3xl font-semibold">Caronas Já</h1>
      <p className="text-muted-foreground">Em construção: login em breve</p>
      <p>{`Conexão com o banco: ${bancoOk ? 'OK' : 'indisponível'}`}</p>
    </main>
  )
}
