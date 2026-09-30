import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

// "/" não tem conteúdo próprio: leva para a tela certa conforme a sessão.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  redirect(user ? '/inicio' : '/entrar')
}
