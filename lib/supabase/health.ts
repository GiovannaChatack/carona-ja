import { env } from '@/lib/env'

// Verifica se o Supabase responde. Usado apenas pela página provisória da Fatia A.
export async function checkSupabaseHealth(): Promise<boolean> {
  const url = `${env.supabaseUrl}/auth/v1/health`
  const apikey = env.supabaseAnonKey

  try {
    const res = await fetch(url, { headers: { apikey }, cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}
