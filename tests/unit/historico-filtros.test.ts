import { describe, expect, it } from 'vitest'

import {
  escolherEstadoVazio,
  lerFiltros,
  paraQuery,
  resolverPeriodo,
  rotuloPeriodo,
  temFiltroAlemDoPadrao,
} from '@/lib/historico/filtros'
import type { FiltroHistorico } from '@/lib/historico/tipos'

const UUID_A = '0b6f1c2e-6a8f-4c4e-9a43-2f1f7f3f6a11'
const UUID_B = '9c1d7e44-2b3a-4f5e-8d6c-1a2b3c4d5e6f'

const padrao: FiltroHistorico = { periodo: 'este-mes', pagina: 1 }

describe('resolverPeriodo', () => {
  it('este mês em fevereiro comum e bissexto', () => {
    expect(resolverPeriodo(padrao, '2026-02-10')).toEqual({
      inicio: '2026-02-01',
      fim: '2026-02-28',
    })
    expect(resolverPeriodo(padrao, '2028-02-10')).toEqual({
      inicio: '2028-02-01',
      fim: '2028-02-29',
    })
  })

  it('este mês em meses de 30 e 31 dias', () => {
    expect(resolverPeriodo(padrao, '2026-09-15')).toEqual({
      inicio: '2026-09-01',
      fim: '2026-09-30',
    })
    expect(resolverPeriodo(padrao, '2026-10-01')).toEqual({
      inicio: '2026-10-01',
      fim: '2026-10-31',
    })
    expect(resolverPeriodo(padrao, '2026-12-31')).toEqual({
      inicio: '2026-12-01',
      fim: '2026-12-31',
    })
  })

  it('mês passado atravessa a virada de ano', () => {
    expect(resolverPeriodo({ periodo: 'mes-passado', pagina: 1 }, '2026-01-15')).toEqual({
      inicio: '2025-12-01',
      fim: '2025-12-31',
    })
    expect(resolverPeriodo({ periodo: 'mes-passado', pagina: 1 }, '2026-03-31')).toEqual({
      inicio: '2026-02-01',
      fim: '2026-02-28',
    })
  })

  it('últimos 30 dias, inclusive hoje', () => {
    expect(resolverPeriodo({ periodo: '30-dias', pagina: 1 }, '2026-03-05')).toEqual({
      inicio: '2026-02-04',
      fim: '2026-03-05',
    })
    expect(resolverPeriodo({ periodo: '30-dias', pagina: 1 }, '2026-01-10')).toEqual({
      inicio: '2025-12-12',
      fim: '2026-01-10',
    })
  })

  it('personalizado usa as datas da URL, inclusive um único dia', () => {
    const filtro: FiltroHistorico = {
      periodo: 'personalizado',
      inicio: '2021-03-31',
      fim: '2021-03-31',
      pagina: 1,
    }
    expect(resolverPeriodo(filtro, '2026-10-01')).toEqual({
      inicio: '2021-03-31',
      fim: '2021-03-31',
    })
  })
})

describe('lerFiltros', () => {
  it('sem parâmetros devolve o padrão', () => {
    expect(lerFiltros({})).toEqual({ filtro: padrao, periodoInvalido: false })
    expect(lerFiltros(new URLSearchParams())).toEqual({ filtro: padrao, periodoInvalido: false })
  })

  it('personalizado com início depois do fim vira este mês com aviso', () => {
    expect(
      lerFiltros({ periodo: 'personalizado', inicio: '2026-09-10', fim: '2026-09-01' }),
    ).toEqual({ filtro: padrao, periodoInvalido: true })
  })

  it('personalizado com data inexistente vira este mês com aviso', () => {
    expect(
      lerFiltros({ periodo: 'personalizado', inicio: '2026-02-30', fim: '2026-03-01' }),
    ).toEqual({ filtro: padrao, periodoInvalido: true })
  })

  it('personalizado sem fim vira este mês com aviso', () => {
    expect(lerFiltros({ periodo: 'personalizado', inicio: '2026-09-01' })).toEqual({
      filtro: padrao,
      periodoInvalido: true,
    })
  })

  it('período desconhecido vira este mês sem aviso', () => {
    expect(lerFiltros({ periodo: 'semana' })).toEqual({ filtro: padrao, periodoInvalido: false })
  })

  it('descarta passageiro, sentido e página inválidos', () => {
    expect(lerFiltros({ passageiro: 'abc', sentido: 'lado', pagina: '99' })).toEqual({
      filtro: padrao,
      periodoInvalido: false,
    })
    for (const pagina of ['0', '51', '2.5', '-1', 'x']) {
      expect(lerFiltros({ pagina }).filtro.pagina).toBe(1)
    }
    expect(lerFiltros({ pagina: '50' }).filtro.pagina).toBe(50)
  })

  it('mantém sentido ida e volta, passageiro e trajeto válidos', () => {
    expect(lerFiltros({ sentido: 'ida' }).filtro.sentido).toBe('ida')
    expect(lerFiltros({ sentido: 'volta' }).filtro.sentido).toBe('volta')
    const { filtro } = lerFiltros({ passageiro: UUID_A, trajeto: UUID_B, pagina: '3' })
    expect(filtro).toEqual({ periodo: 'este-mes', passageiro: UUID_A, trajeto: UUID_B, pagina: 3 })
  })

  it('parâmetros repetidos usam o primeiro valor', () => {
    expect(lerFiltros({ sentido: ['volta', 'ida'], periodo: ['mes-passado', '30-dias'] })).toEqual({
      filtro: { periodo: 'mes-passado', sentido: 'volta', pagina: 1 },
      periodoInvalido: false,
    })
  })

  it('ignora início e fim fora do personalizado', () => {
    expect(
      lerFiltros({ periodo: '30-dias', inicio: '2026-01-01', fim: '2026-01-02' }).filtro,
    ).toEqual({
      periodo: '30-dias',
      pagina: 1,
    })
  })
})

describe('paraQuery', () => {
  it('filtro padrão vira query vazia', () => {
    expect(paraQuery(padrao)).toBe('')
  })

  it('serializa em ordem fixa, omitindo os padrões', () => {
    expect(
      paraQuery({
        pagina: 2,
        sentido: 'volta',
        trajeto: UUID_B,
        passageiro: UUID_A,
        fim: '2026-09-15',
        inicio: '2026-09-01',
        periodo: 'personalizado',
      }),
    ).toBe(
      `periodo=personalizado&inicio=2026-09-01&fim=2026-09-15&passageiro=${UUID_A}&trajeto=${UUID_B}&sentido=volta&pagina=2`,
    )
  })

  it('ida e volta pela URL preserva o filtro', () => {
    const filtros: FiltroHistorico[] = [
      { periodo: 'mes-passado', passageiro: UUID_A, pagina: 1 },
      { periodo: '30-dias', sentido: 'ida', pagina: 4 },
      {
        periodo: 'personalizado',
        inicio: '2021-03-01',
        fim: '2021-04-30',
        trajeto: UUID_B,
        pagina: 1,
      },
      { periodo: 'este-mes', passageiro: UUID_A, trajeto: UUID_B, sentido: 'volta', pagina: 2 },
    ]
    for (const f of filtros) {
      const query = paraQuery(f)
      expect(paraQuery(lerFiltros(new URLSearchParams(query)).filtro)).toBe(query)
      expect(lerFiltros(new URLSearchParams(query)).filtro).toEqual(f)
    }
  })
})

describe('temFiltroAlemDoPadrao', () => {
  it('só o padrão (mesmo em outra página) não tem filtro', () => {
    expect(temFiltroAlemDoPadrao(padrao)).toBe(false)
    expect(temFiltroAlemDoPadrao({ ...padrao, pagina: 3 })).toBe(false)
  })

  it('qualquer filtro além do padrão conta', () => {
    expect(temFiltroAlemDoPadrao({ ...padrao, periodo: 'mes-passado' })).toBe(true)
    expect(temFiltroAlemDoPadrao({ ...padrao, passageiro: UUID_A })).toBe(true)
    expect(temFiltroAlemDoPadrao({ ...padrao, trajeto: UUID_B })).toBe(true)
    expect(temFiltroAlemDoPadrao({ ...padrao, sentido: 'ida' })).toBe(true)
  })
})

describe('rotuloPeriodo', () => {
  it('formata o intervalo em DD/MM/AAAA', () => {
    expect(rotuloPeriodo({ inicio: '2026-10-01', fim: '2026-10-31' })).toBe(
      '01/10/2026 a 31/10/2026',
    )
  })

  it('um único dia mostra só a data', () => {
    expect(rotuloPeriodo({ inicio: '2026-10-01', fim: '2026-10-01' })).toBe('01/10/2026')
  })
})

describe('escolherEstadoVazio', () => {
  it('sem viagem ativa nenhuma: convida a registrar', () => {
    expect(escolherEstadoVazio(false)).toBe('sem-viagens')
  })

  it('com viagens, mas nenhuma no filtro', () => {
    expect(escolherEstadoVazio(true)).toBe('sem-resultado')
  })
})
