import { isAuthRetryableFetchError } from '@supabase/supabase-js'

// Mensagens pt-BR (contracts/rotas.md, "Mensagens de erro").
export const MENSAGENS_AUTH = {
  credencial: 'E-mail ou senha inválidos.',
  limite: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  rede: 'Não foi possível conectar. Tente novamente.',
  linkInvalido: 'Este link é inválido ou expirou. Solicite um novo.',
  senhasDiferentes: 'As senhas não conferem.',
} as const

function ehErroDeRede(error: unknown): boolean {
  // supabase-js embrulha falhas de rede em AuthRetryableFetchError.
  if (isAuthRetryableFetchError(error) || error instanceof TypeError) return true
  if (!(error instanceof Error)) return false
  const texto = `${error.name} ${error.message}`.toLowerCase()
  return (
    texto.includes('fetch failed') || texto.includes('failed to fetch') || texto.includes('network')
  )
}

// Nunca revela se o e-mail existe (FR-007): tudo que não é limite ou rede vira a mensagem genérica.
export function mapAuthError(error: unknown): string {
  if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
    return MENSAGENS_AUTH.limite
  }
  if (ehErroDeRede(error)) return MENSAGENS_AUTH.rede
  return MENSAGENS_AUTH.credencial
}
