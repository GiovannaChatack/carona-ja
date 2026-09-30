import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// Encerra a sessão (FR-005). 303 faz o navegador seguir com GET para /entrar.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  // 'local' encerra só esta sessão, sem derrubar o usuário em outros aparelhos.
  await supabase.auth.signOut({ scope: 'local' })

  return NextResponse.redirect(new URL('/entrar', request.url), 303)
}
