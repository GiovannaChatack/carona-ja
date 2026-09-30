import type { EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

import { sanitizeNext } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/server'

// Destino dos links enviados por e-mail (ex.: recuperação de senha).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = sanitizeNext(searchParams.get('next'))

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) redirect(next)
  }

  redirect('/entrar?erro=link-invalido')
}
