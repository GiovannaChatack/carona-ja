// Tipos do recurso viagens (specs/003-registro-viagens/data-model.md e contracts/acoes.md).

export type Sentido = 'ida' | 'volta'

// Uma linha da view viagens_resumo.
export type ViagemResumo = {
  id: string
  trajeto_id: string
  origem: string
  destino: string
  trajeto_arquivado_em: string | null
  sentido: Sentido
  realizada_em: string
  arquivada_em: string | null
  criado_em: string
  atualizado_em: string
  quantidade_passageiros: number
  total_centavos: number
}

export type Participacao = {
  id: string
  passageiro_id: string
  valor_centavos: number
  passageiro: { nome: string; arquivado_em: string | null; valor_padrao_centavos: number }
}

// Passageiro que pode ser marcado no formulário de viagem.
export type PassageiroOpcao = {
  id: string
  nome: string
  valor_padrao_centavos: number
  arquivado_em: string | null
}

export type SituacaoViagem = 'ativas' | 'arquivadas'

export type CamposViagem = 'trajeto' | 'sentido' | 'data_hora' | 'passageiros'

export type EstadoFormularioViagem = {
  erro?: string // erro geral (ex.: conexão)
  errosCampo?: Partial<Record<CamposViagem, string>>
  errosValor?: Record<string, string> // por passageiro_id
  duplicada?: string // aviso que pede confirmação (CJ001)
  // O que foi preenchido, para repopular o formulário após um erro.
  valores?: {
    trajeto?: string
    sentido?: string
    data_hora?: string
    passageiros?: string[]
    valoresPorPassageiro?: Record<string, string>
  }
}

export type EstadoAcaoViagem = { erro?: string }
