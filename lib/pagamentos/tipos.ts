// Tipos do recurso pagamentos (specs/005-controle-pagamentos/data-model.md e contracts/acoes.md).

import type { Sentido } from '@/lib/viagens/tipos'

// Uma linha da view participacoes_detalhe.
export type ParticipacaoDetalhe = {
  id: string
  viagem_id: string
  passageiro_id: string
  valor_centavos: number
  pago_em: string | null // 'AAAA-MM-DD'; nulo = pendente
  realizada_em: string
  sentido: Sentido
  arquivada_em: string | null
  origem: string
  destino: string
  passageiro_nome: string
  passageiro_arquivado_em: string | null
}

// Uma linha da view pendencias_passageiros.
export type PendenciaPassageiro = {
  passageiro_id: string
  nome: string
  telefone: string
  arquivado_em: string | null
  quantidade_pendentes: number
  total_pendente_centavos: number
}

// Uma viagem na mensagem de cobrança.
export type ItemCobranca = {
  realizada_em: string
  sentido: Sentido
  valor_centavos: number
}

export type EstadoPagamento = {
  erro?: string // erro geral (conexão, CJ009, falha inesperada)
  erroData?: string // erro no campo de data (validação ou CJ008)
  sucesso?: string // texto do toast quando a tela não redireciona
}

export type EstadoChavePix = {
  erro?: string
  erroCampo?: string
  valor?: string // o que foi digitado, para repopular
}
