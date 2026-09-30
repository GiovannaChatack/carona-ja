import { describe, expect, it } from 'vitest'

import { sanitizeNext } from '@/lib/auth/redirect'

describe('sanitizeNext', () => {
  it.each([
    ['/inicio', '/inicio'],
    ['/inicio?x=1', '/inicio?x=1'],
  ])('aceita o caminho interno %s', (valor, esperado) => {
    expect(sanitizeNext(valor)).toBe(esperado)
  })

  it.each([null, undefined, ''])('usa /inicio quando o valor é %j', (valor) => {
    expect(sanitizeNext(valor)).toBe('/inicio')
  })

  it.each(['//evil.com', 'https://evil.com', '/a\\b', 'inicio'])(
    'rejeita o valor inseguro %s',
    (valor) => {
      expect(sanitizeNext(valor)).toBe('/inicio')
    },
  )
})
