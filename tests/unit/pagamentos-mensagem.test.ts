import { describe, expect, it } from 'vitest'

import {
  linkWhatsApp,
  montarMensagemCobranca,
  primeiroNome,
  totalItens,
} from '@/lib/pagamentos/mensagem'
import type { ItemCobranca } from '@/lib/pagamentos/tipos'

// Modelo da spec (FR-017), com o valor no formato pt-BR.
const MODELO =
  'Olá, Duda!\n\nSegue o detalhamento das suas viagens pendentes (Total Devido: R$ 20,00):\n\n- 28/09/2026 (Ida): R$ 10,00\n- 28/09/2026 (Volta): R$ 10,00\n\n*Valor a ser pago: R$ 20,00*\n\nVocê pode pagar via PIX para a chave:\n*teste@exemplo.com*\n\nQualquer dúvida, estou à disposição. Obrigado!'

const VOLTA: ItemCobranca = {
  realizada_em: '2026-09-28T18:00:00-03:00',
  sentido: 'volta',
  valor_centavos: 1000,
}
const IDA: ItemCobranca = {
  realizada_em: '2026-09-28T07:00:00-03:00',
  sentido: 'ida',
  valor_centavos: 1000,
}

describe('primeiroNome', () => {
  it('usa a primeira palavra', () => {
    expect(primeiroNome('Duda')).toBe('Duda')
    expect(primeiroNome('  Maria   Eduarda Silva ')).toBe('Maria')
  })
})

describe('montarMensagemCobranca', () => {
  it('reproduz o modelo da spec caractere a caractere', () => {
    const itens = [VOLTA, IDA]
    const texto = montarMensagemCobranca({ nome: 'Duda', chavePix: 'teste@exemplo.com', itens })
    expect(texto).toBe(MODELO)
    // Não altera a ordem da entrada.
    expect(itens).toEqual([VOLTA, IDA])
  })

  it('não usa espaço não separável', () => {
    const texto = montarMensagemCobranca({
      nome: 'Duda',
      chavePix: 'teste@exemplo.com',
      itens: [IDA],
    })
    expect(texto).not.toMatch(/[\u00a0\u202f]/)
  })

  it('usa o separador de milhar', () => {
    const texto = montarMensagemCobranca({
      nome: 'Duda',
      chavePix: 'teste@exemplo.com',
      itens: [{ ...IDA, valor_centavos: 123456 }],
    })
    expect(texto).toContain('- 28/09/2026 (Ida): R$ 1.234,56')
    expect(texto).toContain('*Valor a ser pago: R$ 1.234,56*')
  })

  it('usa o dia de São Paulo', () => {
    const texto = montarMensagemCobranca({
      nome: 'Duda',
      chavePix: 'teste@exemplo.com',
      itens: [{ ...IDA, realizada_em: '2026-09-30T23:30:00-03:00' }],
    })
    expect(texto).toContain('- 30/09/2026 (Ida): R$ 10,00')
  })

  it('saúda pelo primeiro nome', () => {
    const texto = montarMensagemCobranca({
      nome: 'Maria Eduarda',
      chavePix: 'teste@exemplo.com',
      itens: [IDA],
    })
    expect(texto.startsWith('Olá, Maria!\n\n')).toBe(true)
  })
})

describe('totalItens', () => {
  it('soma os centavos', () => {
    expect(totalItens([])).toBe(0)
    expect(totalItens([IDA, VOLTA, { ...IDA, valor_centavos: 5 }])).toBe(2005)
  })
})

describe('linkWhatsApp', () => {
  it('prefixa 55 e codifica o texto', () => {
    const link = linkWhatsApp('11912345678', MODELO)
    expect(link.startsWith('https://wa.me/5511912345678?text=')).toBe(true)
    const parametro = link.slice('https://wa.me/5511912345678?text='.length)
    expect(parametro).toContain('%0A')
    expect(parametro).not.toMatch(/\s/)
    expect(decodeURIComponent(parametro)).toBe(MODELO)
  })
})
