import { describe, expect, it } from 'vitest'

import { normalizarPonto, rotuloTrajeto, validarTrajeto } from '@/lib/trajetos/validacao'

function formulario(campos: Record<string, string>) {
  const formData = new FormData()
  for (const [chave, valor] of Object.entries(campos)) formData.set(chave, valor)
  return formData
}

describe('normalizarPonto', () => {
  it('remove espaços das pontas', () => {
    expect(normalizarPonto('  Casa  ', 'origem')).toEqual({ ok: true, valor: 'Casa' })
  })

  it('colapsa espaços internos', () => {
    expect(normalizarPonto('Casa   da  Ana', 'destino')).toEqual({
      ok: true,
      valor: 'Casa da Ana',
    })
  })

  it('vazio pede a origem ou o destino', () => {
    expect(normalizarPonto('   ', 'origem')).toEqual({ ok: false, erro: 'Informe a origem.' })
    expect(normalizarPonto('   ', 'destino')).toEqual({ ok: false, erro: 'Informe o destino.' })
  })

  it('aceita 80 caracteres e rejeita 81', () => {
    expect(normalizarPonto('a'.repeat(80), 'origem')).toEqual({ ok: true, valor: 'a'.repeat(80) })
    expect(normalizarPonto('a'.repeat(81), 'origem')).toEqual({
      ok: false,
      erro: 'A origem deve ter até 80 caracteres.',
    })
    expect(normalizarPonto('a'.repeat(81), 'destino')).toEqual({
      ok: false,
      erro: 'O destino deve ter até 80 caracteres.',
    })
  })
})

describe('validarTrajeto', () => {
  it('FormData vazio pede a origem e o destino', () => {
    expect(validarTrajeto(new FormData())).toEqual({
      ok: false,
      errosCampo: { origem: 'Informe a origem.', destino: 'Informe o destino.' },
    })
  })

  it('origem igual ao destino, sem diferenciar maiúsculas, é rejeitada', () => {
    expect(validarTrajeto(formulario({ origem: 'Casa', destino: ' casa ' }))).toEqual({
      ok: false,
      errosCampo: { destino: 'A origem e o destino precisam ser diferentes.' },
    })
  })

  it('dados válidos são normalizados', () => {
    expect(validarTrajeto(formulario({ origem: ' Casa ', destino: 'Faculdade  X' }))).toEqual({
      ok: true,
      dados: { origem: 'Casa', destino: 'Faculdade X' },
    })
  })
})

describe('rotuloTrajeto', () => {
  it('une origem e destino com seta', () => {
    expect(rotuloTrajeto({ origem: 'Casa', destino: 'Faculdade' })).toBe('Casa → Faculdade')
  })
})
