import { describe, expect, it } from 'vitest'

import {
  caminhoVoltarSeguro,
  destinoCobranca,
  validarChavePix,
  validarDataPagamento,
} from '@/lib/pagamentos/validacao'

const UUID = '0b6f8a52-3c1e-4c2a-9d4e-5f6a7b8c9d0e'

describe('validarDataPagamento', () => {
  const hoje = '2026-10-01'

  it('aceita hoje', () => {
    expect(validarDataPagamento('2026-10-01', { hoje })).toEqual({ ok: true, valor: '2026-10-01' })
  })

  it('aceita a data igual à mínima e a hoje', () => {
    expect(validarDataPagamento('2026-10-01', { hoje, minima: '2026-10-01' })).toEqual({
      ok: true,
      valor: '2026-10-01',
    })
  })

  it('aceita uma data entre a mínima e hoje', () => {
    expect(validarDataPagamento(' 2026-09-29 ', { hoje, minima: '2026-09-28' })).toEqual({
      ok: true,
      valor: '2026-09-29',
    })
  })

  it('exige a data', () => {
    expect(validarDataPagamento('', { hoje })).toEqual({
      ok: false,
      erro: 'Informe a data do pagamento.',
    })
    expect(validarDataPagamento('   ', { hoje })).toEqual({
      ok: false,
      erro: 'Informe a data do pagamento.',
    })
  })

  it('rejeita datas inexistentes ou fora do formato', () => {
    for (const texto of ['2026-02-30', '01/10/2026', '2026-13-01', '2026-1-01', 'ontem']) {
      expect(validarDataPagamento(texto, { hoje })).toEqual({
        ok: false,
        erro: 'Informe uma data válida.',
      })
    }
  })

  it('rejeita data no futuro', () => {
    expect(validarDataPagamento('2026-10-02', { hoje })).toEqual({
      ok: false,
      erro: 'A data do pagamento não pode ser no futuro.',
    })
  })

  it('rejeita data anterior à da viagem', () => {
    expect(validarDataPagamento('2026-09-27', { hoje, minima: '2026-09-28' })).toEqual({
      ok: false,
      erro: 'A data do pagamento não pode ser anterior à data da viagem.',
    })
  })
})

describe('validarChavePix', () => {
  it('exige a chave', () => {
    expect(validarChavePix('')).toEqual({ ok: false, erro: 'Informe a chave PIX.' })
    expect(validarChavePix('   ')).toEqual({ ok: false, erro: 'Informe a chave PIX.' })
  })

  it('apara os espaços', () => {
    expect(validarChavePix(' teste@exemplo.com ')).toEqual({
      ok: true,
      valor: 'teste@exemplo.com',
    })
  })

  it('aceita até 77 caracteres', () => {
    const chave = 'a'.repeat(77)
    expect(validarChavePix(chave)).toEqual({ ok: true, valor: chave })
  })

  it('rejeita mais de 77 caracteres', () => {
    expect(validarChavePix('a'.repeat(78))).toEqual({
      ok: false,
      erro: 'A chave PIX pode ter no máximo 77 caracteres.',
    })
  })
})

describe('caminhoVoltarSeguro', () => {
  it('mantém o caminho da cobrança', () => {
    expect(caminhoVoltarSeguro(`/pagamentos/${UUID}/cobrar`)).toBe(`/pagamentos/${UUID}/cobrar`)
  })

  it('descarta qualquer outro valor', () => {
    for (const texto of [
      'https://x.com',
      '//x.com',
      '/pagamentos/abc/cobrar',
      `/pagamentos/${UUID}/cobrar?x=1`,
      `/pagamentos/${UUID}`,
      '/pagamentos',
      '',
    ]) {
      expect(caminhoVoltarSeguro(texto)).toBeNull()
    }
  })
})

describe('destinoCobranca', () => {
  it('sem chave PIX, vai para as configurações e volta para a cobrança', () => {
    expect(destinoCobranca({ chavePix: null, pendentes: 2, passageiroId: UUID })).toBe(
      `/pagamentos/configuracoes?voltar=%2Fpagamentos%2F${UUID}%2Fcobrar&aviso=pix-necessaria`,
    )
  })

  it('sem pendências, volta para os pagamentos do passageiro', () => {
    expect(destinoCobranca({ chavePix: null, pendentes: 0, passageiroId: UUID })).toBe(
      `/pagamentos/${UUID}`,
    )
    expect(
      destinoCobranca({ chavePix: 'teste@exemplo.com', pendentes: 0, passageiroId: UUID }),
    ).toBe(`/pagamentos/${UUID}`)
  })

  it('com chave e pendências, fica na cobrança', () => {
    expect(
      destinoCobranca({ chavePix: 'teste@exemplo.com', pendentes: 2, passageiroId: UUID }),
    ).toBeNull()
  })
})
