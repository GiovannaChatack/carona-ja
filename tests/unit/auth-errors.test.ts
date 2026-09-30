import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { mapAuthError, MENSAGENS_AUTH } from '@/lib/auth/errors'

describe('mapAuthError', () => {
  it('credencial inválida', () => {
    const erro = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials')
    expect(mapAuthError(erro)).toBe('E-mail ou senha inválidos.')
  })

  it('limite de tentativas (429)', () => {
    const erro = new AuthApiError('Too many requests', 429, 'over_request_rate_limit')
    expect(mapAuthError(erro)).toBe('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
  })

  it('status 429 em objeto simples', () => {
    expect(mapAuthError({ status: 429, message: 'rate limit' })).toBe(MENSAGENS_AUTH.limite)
  })

  it.each([
    new TypeError('Failed to fetch'),
    new Error('fetch failed'),
    new AuthRetryableFetchError('Failed to fetch', 0),
  ])('erro de rede: %s', (erro) => {
    expect(mapAuthError(erro)).toBe('Não foi possível conectar. Tente novamente.')
  })

  it.each([
    new AuthApiError('User not found', 400, 'user_not_found'),
    new AuthApiError('Email not confirmed', 400, 'email_not_confirmed'),
    new Error('qualquer coisa'),
    'texto solto',
    null,
    undefined,
  ])('qualquer outro erro vira a mensagem genérica de credencial (%s)', (erro) => {
    expect(mapAuthError(erro)).toBe('E-mail ou senha inválidos.')
  })
})
