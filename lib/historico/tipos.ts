// Tipos do histórico de viagens (specs/004-historico-viagens/contracts/consultas.md).

import type { Sentido } from '@/lib/viagens/tipos'

export type TipoPeriodo = 'este-mes' | 'mes-passado' | '30-dias' | 'personalizado'

// Estado da tela, lido da URL (research §4).
export type FiltroHistorico = {
  periodo: TipoPeriodo
  inicio?: string // 'AAAA-MM-DD', só no personalizado
  fim?: string
  passageiro?: string // uuid
  trajeto?: string // uuid
  sentido?: Sentido
  pagina: number // 1–50
}

// Datas inclusivas do calendário de São Paulo, 'AAAA-MM-DD'.
export type Periodo = { inicio: string; fim: string }

// Uma linha da função historico_viagens.
export type LinhaHistorico = {
  id: string
  realizada_em: string
  criado_em: string
  sentido: Sentido
  trajeto_id: string
  origem: string
  destino: string
  passageiros: string[]
  total_centavos: number
  valor_passageiro_centavos: number | null
}

export type ResumoHistorico = { quantidade: number; total_centavos: number }

export type OpcaoFiltro = { id: string; rotulo: string; arquivado: boolean }

export type EstadoVazio = 'sem-viagens' | 'sem-resultado'
