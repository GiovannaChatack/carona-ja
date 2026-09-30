import { describe, expect, it } from 'vitest'

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMonth,
  formatPhone,
  formatTime,
} from '@/lib/format'

// O Intl usa espaço não separável entre "R$" e o número; normaliza para comparar.
function normalizarEspacos(texto: string) {
  return texto.replace(/[\u00a0\u202f]/g, ' ')
}

describe('formatCurrency', () => {
  it('formata centavos em reais', () => {
    expect(normalizarEspacos(formatCurrency(123456))).toBe('R$ 1.234,56')
    expect(normalizarEspacos(formatCurrency(0))).toBe('R$ 0,00')
    expect(normalizarEspacos(formatCurrency(5))).toBe('R$ 0,05')
  })

  it('rejeita valores que não são centavos inteiros', () => {
    expect(() => formatCurrency(1.5)).toThrow('Valor em centavos deve ser inteiro')
  })
})

describe('formatPhone', () => {
  it('formata celular e fixo com DDD', () => {
    expect(formatPhone('11912345678')).toBe('(11) 91234-5678')
    expect(formatPhone('1131234567')).toBe('(11) 3123-4567')
  })

  it('devolve sem alteração a entrada fora do formato', () => {
    expect(formatPhone('123')).toBe('123')
  })
})

describe('datas no fuso America/Sao_Paulo', () => {
  const instante = '2026-09-28T10:45:00Z'

  it('formatDate', () => {
    expect(formatDate(instante)).toBe('28/09/2026')
    expect(formatDate(new Date(instante))).toBe('28/09/2026')
  })

  it('formatTime', () => {
    expect(formatTime(instante)).toBe('07:45')
  })

  it('formatDateTime', () => {
    expect(normalizarEspacos(formatDateTime(instante))).toBe('28/09/2026 07:45')
  })

  it('formatMonth', () => {
    expect(formatMonth('2026-09-15T12:00:00Z')).toBe('setembro de 2026')
  })

  it('usa a data local de São Paulo na virada do dia', () => {
    expect(formatDate('2026-10-01T02:00:00Z')).toBe('30/09/2026')
  })
})
