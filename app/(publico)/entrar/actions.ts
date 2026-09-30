'use server'

import { redirect } from 'next/navigation'

import { mapAuthError } from '@/lib/auth/errors'
import { sanitizeNext } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/server'

export type EstadoEntrar = { erro?: string }

export async function entrar(_estado: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const email = String(formData.get('email') ?? '').trim()
  const senha = String(formData.get('senha') ?? '')

  if (!email || !senha) return { erro: 'Informe o e-mail e a senha.' }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) return { erro: mapAuthError(error) }
  } catch (error) {
    return { erro: mapAuthError(error) }
  }

  redirect(sanitizeNext(formData.get('proximo')))
}
