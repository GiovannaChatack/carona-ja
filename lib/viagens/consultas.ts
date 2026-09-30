// Consultas de viagens. Uso só no servidor: o cliente da sessão aplica a RLS, então cada
// motorista só recebe os próprios registros.

import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { compararTrajetos } from '@/lib/trajetos/consultas'
import type { Trajeto } from '@/lib/trajetos/tipos'
import { ehUuid } from '@/lib/validacao'

import type { Participacao, PassageiroOpcao, SituacaoViagem, ViagemResumo } from './tipos'

const COLUNAS_TRAJETO = 'id, origem, destino, arquivado_em, criado_em, atualizado_em'

const COLUNAS_RESUMO =
  'id, trajeto_id, origem, destino, trajeto_arquivado_em, sentido, realizada_em, arquivada_em, criado_em, atualizado_em, quantidade_passageiros, total_centavos'

function compararNomes(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
}

// Dados do formulário de nova viagem: trajetos e passageiros ativos e o trajeto sugerido (FR-014).
export async function obterDadosFormularioViagem(): Promise<{
  trajetos: Trajeto[]
  passageiros: PassageiroOpcao[]
  trajetoSugeridoId: string | null
}> {
  const supabase = await createClient()
  const [trajetos, passageiros, ultima] = await Promise.all([
    supabase.from('trajetos').select(COLUNAS_TRAJETO).is('arquivado_em', null),
    supabase
      .from('passageiros')
      .select('id, nome, valor_padrao_centavos, arquivado_em')
      .is('arquivado_em', null),
    supabase
      .from('viagens')
      .select('trajeto_id')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // O erro é exibido por app/(app)/error.tsx.
  const erro = trajetos.error ?? passageiros.error ?? ultima.error
  if (erro) throw new Error(`Falha ao carregar o formulário de viagem: ${erro.message}`)

  const ativos = (trajetos.data as Trajeto[]).sort(compararTrajetos)
  const ultimoTrajeto = ultima.data?.trajeto_id as string | undefined
  const trajetoSugeridoId = ativos.some((t) => t.id === ultimoTrajeto)
    ? ultimoTrajeto!
    : ativos.length === 1
      ? ativos[0].id
      : null

  return {
    trajetos: ativos,
    passageiros: (passageiros.data as PassageiroOpcao[]).sort((a, b) =>
      compararNomes(a.nome, b.nome),
    ),
    trajetoSugeridoId,
  }
}

// As `limite` viagens mais recentes da situação; `temMais` indica se há continuação (research §10).
export async function listarViagens(
  situacao: SituacaoViagem,
  limite: number,
): Promise<{ viagens: ViagemResumo[]; temMais: boolean }> {
  const supabase = await createClient()
  const consulta = supabase.from('viagens_resumo').select(COLUNAS_RESUMO)
  const { data, error } = await (
    situacao === 'ativas'
      ? consulta.is('arquivada_em', null)
      : consulta.not('arquivada_em', 'is', null)
  )
    .order('realizada_em', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(limite + 1)

  if (error) throw new Error(`Falha ao listar viagens: ${error.message}`)
  const viagens = data as ViagemResumo[]
  return { viagens: viagens.slice(0, limite), temMais: viagens.length > limite }
}

// Compartilhada entre a página e o generateMetadata (uma consulta por requisição).
export const obterViagem = cache(
  async (id: string): Promise<{ viagem: ViagemResumo; participacoes: Participacao[] } | null> => {
    if (!ehUuid(id)) return null

    const supabase = await createClient()
    // Viagem de outra conta não é visível pela RLS: volta null.
    const { data: viagem, error } = await supabase
      .from('viagens_resumo')
      .select(COLUNAS_RESUMO)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Falha ao obter viagem: ${error.message}`)
    if (!viagem) return null

    const { data: participacoes, error: erroParticipacoes } = await supabase
      .from('viagem_passageiros')
      .select(
        'id, passageiro_id, valor_centavos, passageiro:passageiros(nome, arquivado_em, valor_padrao_centavos)',
      )
      .eq('viagem_id', id)
    if (erroParticipacoes) {
      throw new Error(`Falha ao obter os passageiros da viagem: ${erroParticipacoes.message}`)
    }

    return {
      viagem: viagem as ViagemResumo,
      participacoes: (participacoes as unknown as Participacao[]).sort((a, b) =>
        compararNomes(a.passageiro.nome, b.passageiro.nome),
      ),
    }
  },
)
