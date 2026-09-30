// Tipos do recurso trajetos (specs/003-registro-viagens/data-model.md e contracts/acoes.md).

export type Trajeto = {
  id: string
  origem: string
  destino: string
  arquivado_em: string | null
  criado_em: string
  atualizado_em: string
}

export type SituacaoTrajeto = 'ativos' | 'arquivados'

export type CamposTrajeto = 'origem' | 'destino'

export type EstadoFormularioTrajeto = {
  erro?: string // erro geral (ex.: conexão)
  errosCampo?: Partial<Record<CamposTrajeto, string>>
  valores?: Partial<Record<CamposTrajeto, string>> // o que foi digitado, para repopular
}

export type EstadoAcaoTrajeto = { erro?: string }
