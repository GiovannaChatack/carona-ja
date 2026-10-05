// Consultas de pagamentos. Uso só no servidor: o cliente da sessão aplica a RLS, então cada
// motorista só recebe os próprios registros. As pendências vêm das views do slice 005, que
// definem uma única vez o que é dívida (research §6).

import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { ehUuid } from '@/lib/validacao'

import type { ItemCobranca, ParticipacaoDetalhe, PendenciaPassageiro } from './tipos'

const COLUNAS_PENDENCIA =
  'passageiro_id, nome, telefone, arquivado_em, quantidade_pendentes, total_pendente_centavos'

const COLUNAS_PARTICIPACAO =
  'id, viagem_id, passageiro_id, valor_centavos, pago_em, realizada_em, sentido, arquivada_em, origem, destino, passageiro_nome, passageiro_arquivado_em'

type PassageiroPagamentos = {
  id: string
  nome: string
  telefone: string
  arquivado_em: string | null
}

function compararNomes(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
}

// Passageiros com pendências, do maior para o menor total (empate: nome), e o total geral.
export async function listarPendencias(): Promise<{
  pendencias: PendenciaPassageiro[]
  totalCentavos: number
}> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('pendencias_passageiros').select(COLUNAS_PENDENCIA)
  // O erro é exibido por app/(app)/error.tsx.
  if (error) throw new Error(`Falha ao listar pendências: ${error.message}`)

  const pendencias = (data as PendenciaPassageiro[]).sort(
    (a, b) =>
      b.total_pendente_centavos - a.total_pendente_centavos || compararNomes(a.nome, b.nome),
  )
  const totalCentavos = pendencias.reduce((total, p) => total + p.total_pendente_centavos, 0)
  return { pendencias, totalCentavos }
}

async function obterPassageiroVisivel(id: string): Promise<PassageiroPagamentos | null> {
  const supabase = await createClient()
  // Passageiro de outra conta não é visível pela RLS: volta null.
  const { data, error } = await supabase
    .from('passageiros')
    .select('id, nome, telefone, arquivado_em')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Falha ao obter passageiro: ${error.message}`)
  return data as PassageiroPagamentos | null
}

// Pendentes (de valor > 0) da viagem mais antiga para a mais recente, só de viagens ativas.
async function listarPendentes(passageiroId: string): Promise<ParticipacaoDetalhe[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('participacoes_detalhe')
    .select(COLUNAS_PARTICIPACAO)
    .eq('passageiro_id', passageiroId)
    .is('pago_em', null)
    .gt('valor_centavos', 0)
    .is('arquivada_em', null)
    .order('realizada_em', { ascending: true })
  if (error) throw new Error(`Falha ao listar pendências: ${error.message}`)
  return data as ParticipacaoDetalhe[]
}

// Pendentes e pagas de um passageiro (FR-007, FR-012); null se o passageiro não for visível.
export const obterPagamentosPassageiro = cache(
  async (
    id: string,
    limitePagas: number,
  ): Promise<{
    passageiro: PassageiroPagamentos
    pendentes: ParticipacaoDetalhe[]
    pagas: ParticipacaoDetalhe[]
    temMaisPagas: boolean
    totalDevidoCentavos: number
  } | null> => {
    if (!ehUuid(id)) return null
    const passageiro = await obterPassageiroVisivel(id)
    if (!passageiro) return null

    const supabase = await createClient()
    const [pendentes, pagas] = await Promise.all([
      listarPendentes(id),
      supabase
        .from('participacoes_detalhe')
        .select(COLUNAS_PARTICIPACAO)
        .eq('passageiro_id', id)
        .not('pago_em', 'is', null)
        .is('arquivada_em', null)
        .order('pago_em', { ascending: false })
        .order('realizada_em', { ascending: false })
        .limit(limitePagas + 1),
    ])
    if (pagas.error) throw new Error(`Falha ao listar pagamentos: ${pagas.error.message}`)

    const listaPagas = pagas.data as ParticipacaoDetalhe[]
    return {
      passageiro,
      pendentes,
      pagas: listaPagas.slice(0, limitePagas),
      temMaisPagas: listaPagas.length > limitePagas,
      totalDevidoCentavos: pendentes.reduce((total, p) => total + p.valor_centavos, 0),
    }
  },
)

// Total devido de um passageiro (FR-013); sem linha na view = nada pendente.
export async function obterTotalDevido(passageiroId: string): Promise<number> {
  if (!ehUuid(passageiroId)) return 0
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pendencias_passageiros')
    .select('total_pendente_centavos')
    .eq('passageiro_id', passageiroId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao obter o total devido: ${error.message}`)
  return (data?.total_pendente_centavos as number | undefined) ?? 0
}

// Chave PIX do motorista logado; null enquanto não cadastrada.
export async function obterChavePix(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('perfis')
    .select('chave_pix')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw new Error(`Falha ao obter a chave PIX: ${error.message}`)
  return (data?.chave_pix as string | null | undefined) ?? null
}

// Dados da cobrança (FR-015–FR-017); null se o passageiro não for visível.
export const obterDadosCobranca = cache(
  async (
    passageiroId: string,
  ): Promise<{
    nome: string
    telefone: string
    chavePix: string | null
    itens: (ItemCobranca & { id: string })[]
  } | null> => {
    if (!ehUuid(passageiroId)) return null
    const passageiro = await obterPassageiroVisivel(passageiroId)
    if (!passageiro) return null

    const [pendentes, chavePix] = await Promise.all([
      listarPendentes(passageiroId),
      obterChavePix(),
    ])
    return {
      nome: passageiro.nome,
      telefone: passageiro.telefone,
      chavePix,
      itens: pendentes.map(({ id, realizada_em, sentido, valor_centavos }) => ({
        id,
        realizada_em,
        sentido,
        valor_centavos,
      })),
    }
  },
)
