// Tipos do recurso passageiros (specs/002-registro-passageiros/data-model.md e contracts/acoes.md).

export type Passageiro = {
  id: string
  nome: string
  telefone: string // só dígitos
  valor_padrao_centavos: number
  observacao: string | null
  arquivado_em: string | null
  criado_em: string
  atualizado_em: string
}

export type SituacaoPassageiro = 'ativos' | 'arquivados'

export type CamposPassageiro = 'nome' | 'telefone' | 'valor' | 'observacao'

export type EstadoFormularioPassageiro = {
  erro?: string // erro geral (ex.: conexão)
  errosCampo?: Partial<Record<CamposPassageiro, string>>
  valores?: Partial<Record<CamposPassageiro, string>> // o que foi digitado, para repopular
}

export type EstadoAcaoPassageiro = { erro?: string }
