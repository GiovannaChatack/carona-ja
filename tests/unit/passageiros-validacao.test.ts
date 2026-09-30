import { describe, expect, it } from 'vitest'

import {
  centavosParaCampo,
  ehUuid,
  normalizarNome,
  normalizarObservacao,
  normalizarParaBusca,
  normalizarTelefone,
  parseValorEmCentavos,
  validarPassageiro,
} from '@/lib/passageiros/validacao'

const ERRO_VALOR = 'Informe um valor entre R$ 0,00 e R$ 9.999,99, com até 2 casas decimais.'
const ERRO_TELEFONE = 'Informe um telefone com DDD, ex.: (11) 91234-5678.'

describe('parseValorEmCentavos', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12,50', 1250],
    ['12.50', 1250],
    ['1.234,56', 123456],
    ['0', 0],
    ['9.999,99', 999999],
    [' 7,05 ', 705],
  ])('%j → %i', (entrada, centavos) => {
    expect(parseValorEmCentavos(entrada)).toEqual({ ok: true, valor: centavos })
  })

  it('vazio pede o valor', () => {
    expect(parseValorEmCentavos('')).toEqual({ ok: false, erro: 'Informe o valor padrão.' })
    expect(parseValorEmCentavos('   ')).toEqual({ ok: false, erro: 'Informe o valor padrão.' })
  })

  it.each(['-1', '12,345', '10000', '10.000', 'abc', '1.23,4', '12,', ',5', '1,2,3'])(
    '%j é rejeitado',
    (entrada) => {
      expect(parseValorEmCentavos(entrada)).toEqual({ ok: false, erro: ERRO_VALOR })
    },
  )
})

describe('normalizarTelefone', () => {
  it.each([
    ['(11) 91234-5678', '11912345678'],
    ['11 3123 4567', '1131234567'],
    ['+55 11 91234-5678', '11912345678'],
    ['011 91234-5678', '11912345678'],
  ])('%j → %j', (entrada, digitos) => {
    expect(normalizarTelefone(entrada)).toEqual({ ok: true, valor: digitos })
  })

  it('vazio pede o telefone', () => {
    expect(normalizarTelefone('')).toEqual({ ok: false, erro: 'Informe o telefone.' })
  })

  it.each(['91234-5678', '(01) 91234-5678', '11812345678', '1234'])('%j é rejeitado', (entrada) => {
    expect(normalizarTelefone(entrada)).toEqual({ ok: false, erro: ERRO_TELEFONE })
  })
})

describe('normalizarNome', () => {
  it('remove espaços das pontas e colapsa os internos', () => {
    expect(normalizarNome('  Ana   Paula ')).toEqual({ ok: true, valor: 'Ana Paula' })
  })

  it('vazio pede o nome', () => {
    expect(normalizarNome('   ')).toEqual({ ok: false, erro: 'Informe o nome.' })
  })

  it('aceita 80 caracteres e rejeita 81', () => {
    expect(normalizarNome('a'.repeat(80))).toEqual({ ok: true, valor: 'a'.repeat(80) })
    expect(normalizarNome('a'.repeat(81))).toEqual({
      ok: false,
      erro: 'O nome deve ter até 80 caracteres.',
    })
  })
})

describe('normalizarObservacao', () => {
  it('vazia vira null', () => {
    expect(normalizarObservacao('   ')).toEqual({ ok: true, valor: null })
  })

  it('remove espaços das pontas', () => {
    expect(normalizarObservacao('  Paga por Pix ')).toEqual({ ok: true, valor: 'Paga por Pix' })
  })

  it('aceita 200 caracteres e rejeita 201', () => {
    expect(normalizarObservacao('a'.repeat(200))).toEqual({ ok: true, valor: 'a'.repeat(200) })
    expect(normalizarObservacao('a'.repeat(201))).toEqual({
      ok: false,
      erro: 'A observação deve ter até 200 caracteres.',
    })
  })
})

describe('validarPassageiro', () => {
  function formulario(campos: Record<string, string>) {
    const formData = new FormData()
    for (const [chave, valor] of Object.entries(campos)) formData.set(chave, valor)
    return formData
  }

  it('FormData vazio devolve a mensagem de cada campo obrigatório', () => {
    expect(validarPassageiro(new FormData())).toEqual({
      ok: false,
      errosCampo: {
        nome: 'Informe o nome.',
        telefone: 'Informe o telefone.',
        valor: 'Informe o valor padrão.',
      },
    })
  })

  it('dados válidos são normalizados', () => {
    expect(
      validarPassageiro(
        formulario({
          nome: ' Ana  Paula ',
          telefone: '(11) 91234-5678',
          valor: '12,5',
          observacao: '',
        }),
      ),
    ).toEqual({
      ok: true,
      dados: {
        nome: 'Ana Paula',
        telefone: '11912345678',
        valor_padrao_centavos: 1250,
        observacao: null,
      },
    })
  })
})

describe('normalizarParaBusca', () => {
  it('minúsculas, sem acentos e com espaços colapsados', () => {
    expect(normalizarParaBusca('  JOSÉ  da Silva')).toBe('jose da silva')
  })
})

describe('centavosParaCampo', () => {
  it.each([
    [1250, '12,50'],
    [0, '0,00'],
    [123456, '1234,56'],
    [5, '0,05'],
  ])('%i → %j', (centavos, texto) => {
    expect(centavosParaCampo(centavos)).toBe(texto)
  })
})

describe('ehUuid', () => {
  it('aceita UUID válido e rejeita outros textos', () => {
    expect(ehUuid('3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e')).toBe(true)
    expect(ehUuid('abc')).toBe(false)
    expect(ehUuid('')).toBe(false)
  })
})
