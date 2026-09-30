import { redirect } from 'next/navigation'
import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

// Usuário e perfil da requisição atual. cache() evita buscar duas vezes quando o layout e a
// página precisam dos mesmos dados.
export const obterUsuarioLogado = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Defesa em profundidade: o proxy.ts já bloqueia, mas a página não confia só nele.
  if (!user) redirect('/entrar')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome_exibicao')
    .eq('id', user.id)
    .maybeSingle()

  return {
    email: user.email ?? '',
    nomeExibicao: perfil?.nome_exibicao ?? user.email?.split('@')[0] ?? 'Motorista',
  }
})
