import { describe, expect, it } from 'vitest'

import { ERRO_VALOR } from '@/lib/validacao'
import {
  percurso,
  somarCentavos,
  validarDataHoraLocal,
  validarViagem,
} from '@/lib/viagens/validacao'

const ANA = '11111111-1111-4111-8111-111111111111'
const BRUNO = '22222222-2222-4222-8222-222222222222'
const TRAJETO = '33333333-3333-4333-8333-333333333333'
const AGORA = '2026-09-30T08:00'

// Campos simples com set; "passageiros" repetido com append.
function formulario(campos: Record<string, string>, passageiros: string[] = []) {
  const formData = new FormData()
  for (const [chave, valor] of Object.entries(campos)) formData.set(chave, valor)
  for (const id of passageiros) formData.append('passageiros', id)
  return formData
}

const VALIDO = { trajeto: TRAJETO, sentido: 'ida', data_hora: '2026-09-30T07:40' }

describe('percurso', () => {
  const trajeto = { origem: 'Casa', destino: 'Faculdade' }

  it('ida segue origem → destino', () => {
    expect(percurso(trajeto, 'ida')).toBe('Casa → Faculdade')
  })

  it('volta inverte', () => {
    expect(percurso(trajeto, 'volta')).toBe('Faculdade → Casa')
  })
})

describe('validarDataHoraLocal', () => {
  it('aceita uma data no passado', () => {
    expect(validarDataHoraLocal('2026-09-30T07:40', AGORA)).toEqual({
      ok: true,
      valor: '2026-09-30T07:40',
    })
  })

  it('aceita exatamente agora + 24h e rejeita um minuto depois', () => {
    expect(validarDataHoraLocal('2026-10-01T08:00', AGORA)).toEqual({
      ok: true,
      valor: '2026-10-01T08:00',
    })
    expect(validarDataHoraLocal('2026-10-01T08:01', AGORA)).toEqual({
      ok: false,
      erro: 'A data e a hora não podem passar de 1 dia no futuro.',
    })
  })

  it('limite atravessa a virada do mês e do ano', () => {
    expect(validarDataHoraLocal('2027-01-01T23:30', '2026-12-31T23:30').ok).toBe(true)
    expect(validarDataHoraLocal('2027-01-01T23:31', '2026-12-31T23:30').ok).toBe(false)
  })

  it('descarta os segundos', () => {
    expect(validarDataHoraLocal('2026-09-30T07:40:00', AGORA)).toEqual({
      ok: true,
      valor: '2026-09-30T07:40',
    })
  })

  it('vazio pede a data', () => {
    expect(validarDataHoraLocal('', AGORA)).toEqual({
      ok: false,
      erro: 'Informe a data e a hora.',
    })
  })

  it('formato inválido ou data inexistente', () => {
    const invalida = { ok: false, erro: 'Data e hora inválidas.' }
    expect(validarDataHoraLocal('30/09/2026', AGORA)).toEqual(invalida)
    expect(validarDataHoraLocal('2026-02-30T10:00', AGORA)).toEqual(invalida)
    expect(validarDataHoraLocal('2026-09-30T24:00', AGORA)).toEqual(invalida)
  })
})

describe('validarViagem', () => {
  it('caso válido completo', () => {
    const formData = formulario(
      {
        ...VALIDO,
        data_hora: '2026-09-30T07:40:00',
        [`valor_${ANA}`]: '12',
        [`valor_${BRUNO}`]: '8,5',
      },
      [ANA, BRUNO],
    )
    expect(validarViagem(formData, AGORA)).toEqual({
      ok: true,
      dados: {
        trajeto_id: TRAJETO,
        sentido: 'ida',
        data_hora_local: '2026-09-30T07:40',
        participacoes: [
          { passageiro_id: ANA, valor_centavos: 1200 },
          { passageiro_id: BRUNO, valor_centavos: 850 },
        ],
      },
    })
  })

  it('sem passageiros', () => {
    const resultado = validarViagem(formulario(VALIDO), AGORA)
    expect(resultado).toEqual({
      ok: false,
      errosCampo: { passageiros: 'Marque ao menos um passageiro.' },
      errosValor: {},
    })
  })

  it('sentido inválido', () => {
    const formData = formulario({ ...VALIDO, sentido: 'outro', [`valor_${ANA}`]: '12' }, [ANA])
    expect(validarViagem(formData, AGORA)).toEqual({
      ok: false,
      errosCampo: { sentido: 'Escolha Ida ou Volta.' },
      errosValor: {},
    })
  })

  it('trajeto que não é UUID', () => {
    const formData = formulario({ ...VALIDO, trajeto: 'abc', [`valor_${ANA}`]: '12' }, [ANA])
    expect(validarViagem(formData, AGORA)).toEqual({
      ok: false,
      errosCampo: { trajeto: 'Escolha um trajeto.' },
      errosValor: {},
    })
  })

  it('valor fora da faixa', () => {
    const formData = formulario({ ...VALIDO, [`valor_${ANA}`]: '-1' }, [ANA])
    expect(validarViagem(formData, AGORA)).toEqual({
      ok: false,
      errosCampo: {},
      errosValor: { [ANA]: ERRO_VALOR },
    })
  })

  it('valor vazio ou ausente', () => {
    const formData = formulario({ ...VALIDO, [`valor_${ANA}`]: '' }, [ANA, BRUNO])
    expect(validarViagem(formData, AGORA)).toEqual({
      ok: false,
      errosCampo: {},
      errosValor: { [ANA]: 'Informe o valor.', [BRUNO]: 'Informe o valor.' },
    })
  })

  it('passageiro repetido vira uma única participação', () => {
    const formData = formulario({ ...VALIDO, [`valor_${ANA}`]: '12' }, [ANA, ANA])
    const resultado = validarViagem(formData, AGORA)
    expect(resultado.ok && resultado.dados.participacoes).toEqual([
      { passageiro_id: ANA, valor_centavos: 1200 },
    ])
  })

  it('id de passageiro que não é UUID é ignorado', () => {
    const formData = formulario(VALIDO, ['abc'])
    expect(validarViagem(formData, AGORA)).toEqual({
      ok: false,
      errosCampo: { passageiros: 'Marque ao menos um passageiro.' },
      errosValor: {},
    })
  })

  it('reúne os erros de todos os campos', () => {
    const resultado = validarViagem(new FormData(), AGORA)
    expect(resultado).toEqual({
      ok: false,
      errosCampo: {
        trajeto: 'Escolha um trajeto.',
        sentido: 'Escolha Ida ou Volta.',
        data_hora: 'Informe a data e a hora.',
        passageiros: 'Marque ao menos um passageiro.',
      },
      errosValor: {},
    })
  })
})

describe('somarCentavos', () => {
  it('soma inteiros', () => {
    expect(somarCentavos([1200, 1000, 0])).toBe(2200)
    expect(somarCentavos([])).toBe(0)
  })
})
