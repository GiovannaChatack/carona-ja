// Filtros do histórico na URL e resolução do período (research §3–§4).
// Funções puras, sem acesso ao servidor: usadas pela página e pelo formulário de filtros.

import { formatDate } from '@/lib/format'
import { ehUuid } from '@/lib/validacao'

import type { EstadoVazio, FiltroHistorico, Periodo, TipoPeriodo } from './tipos'

const PERIODOS: TipoPeriodo[] = ['este-mes', 'mes-passado', '30-dias', 'personalizado']

const PAGINA_MAX = 50

const DATA = /^(\d{4})-(\d{2})-(\d{2})$/

const UM_DIA_MS = 24 * 60 * 60 * 1000

type Parametros = URLSearchParams | Record<string, string | string[] | undefined>

// Primeiro valor do parâmetro, se houver.
function obter(params: Parametros, chave: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(chave) ?? undefined
  const valor = params[chave]
  return Array.isArray(valor) ? valor[0] : valor
}

// "AAAA-MM-DD" → milissegundos em UTC, só para fazer contas; null se a data não existir.
function paraMs(texto: string) {
  const partes = DATA.exec(texto)
  if (!partes) return null
  const [ano, mes, dia] = partes.slice(1, 4).map(Number)
  const ms = Date.UTC(ano, mes - 1, dia)
  const data = new Date(ms)
  const confere =
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  return confere ? ms : null
}

function paraTexto(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

export function lerFiltros(params: Parametros): {
  filtro: FiltroHistorico
  periodoInvalido: boolean
} {
  const filtro: FiltroHistorico = { periodo: 'este-mes', pagina: 1 }
  let periodoInvalido = false

  const periodo = obter(params, 'periodo')
  if (periodo === 'personalizado') {
    const inicio = obter(params, 'inicio') ?? ''
    const fim = obter(params, 'fim') ?? ''
    if (paraMs(inicio) !== null && paraMs(fim) !== null && inicio <= fim) {
      Object.assign(filtro, { periodo, inicio, fim })
    } else {
      periodoInvalido = true
    }
  } else if (PERIODOS.includes(periodo as TipoPeriodo)) {
    filtro.periodo = periodo as TipoPeriodo
  }

  // A checagem contra as opções do motorista é feita na página (FR-020).
  const passageiro = obter(params, 'passageiro')
  if (passageiro && ehUuid(passageiro)) filtro.passageiro = passageiro
  const trajeto = obter(params, 'trajeto')
  if (trajeto && ehUuid(trajeto)) filtro.trajeto = trajeto

  const sentido = obter(params, 'sentido')
  if (sentido === 'ida' || sentido === 'volta') filtro.sentido = sentido

  // Inteiro de 1 a 50, como em /viagens; qualquer outro valor vale 1.
  const pagina = obter(params, 'pagina')
  if (pagina && /^\d+$/.test(pagina) && Number(pagina) >= 1 && Number(pagina) <= PAGINA_MAX) {
    filtro.pagina = Number(pagina)
  }

  return { filtro, periodoInvalido }
}

// Só os campos diferentes do padrão, em ordem fixa (a mesma URL para o mesmo filtro).
export function paraQuery(filtro: FiltroHistorico) {
  const query = new URLSearchParams()
  if (filtro.periodo !== 'este-mes') query.set('periodo', filtro.periodo)
  if (filtro.periodo === 'personalizado') {
    if (filtro.inicio) query.set('inicio', filtro.inicio)
    if (filtro.fim) query.set('fim', filtro.fim)
  }
  if (filtro.passageiro) query.set('passageiro', filtro.passageiro)
  if (filtro.trajeto) query.set('trajeto', filtro.trajeto)
  if (filtro.sentido) query.set('sentido', filtro.sentido)
  if (filtro.pagina > 1) query.set('pagina', String(filtro.pagina))
  return query.toString()
}

// Datas inclusivas do período, a partir de `hoje` ("AAAA-MM-DD" em São Paulo).
export function resolverPeriodo(filtro: FiltroHistorico, hoje: string): Periodo {
  if (filtro.periodo === 'personalizado' && filtro.inicio && filtro.fim) {
    return { inicio: filtro.inicio, fim: filtro.fim }
  }

  const [ano, mes] = hoje.split('-').map(Number)
  switch (filtro.periodo) {
    case 'mes-passado':
      // Dia 0 de um mês = último dia do mês anterior.
      return {
        inicio: paraTexto(Date.UTC(ano, mes - 2, 1)),
        fim: paraTexto(Date.UTC(ano, mes - 1, 0)),
      }
    case '30-dias':
      return { inicio: paraTexto(paraMs(hoje)! - 29 * UM_DIA_MS), fim: hoje }
    default:
      return {
        inicio: paraTexto(Date.UTC(ano, mes - 1, 1)),
        fim: paraTexto(Date.UTC(ano, mes, 0)),
      }
  }
}

// Decide se "Limpar filtros" aparece; a página não conta como filtro.
export function temFiltroAlemDoPadrao(filtro: FiltroHistorico) {
  return (
    filtro.periodo !== 'este-mes' ||
    filtro.passageiro !== undefined ||
    filtro.trajeto !== undefined ||
    filtro.sentido !== undefined
  )
}

// "01/10/2026 a 31/10/2026"; um único dia → "01/10/2026".
// Meio-dia UTC é 09:00 em São Paulo: o formatador não desloca o dia.
export function rotuloPeriodo(periodo: Periodo) {
  const formatar = (data: string) => formatDate(new Date(`${data}T12:00:00Z`))
  return periodo.inicio === periodo.fim
    ? formatar(periodo.inicio)
    : `${formatar(periodo.inicio)} a ${formatar(periodo.fim)}`
}

// Estado vazio (FR-017): sem nenhuma viagem ativa, convida a registrar; senão, o filtro não achou.
export function escolherEstadoVazio(existeViagemAtiva: boolean): EstadoVazio {
  return existeViagemAtiva ? 'sem-resultado' : 'sem-viagens'
}
