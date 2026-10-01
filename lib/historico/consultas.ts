// Consultas do histórico. Uso só no servidor: o cliente da sessão aplica a RLS (as funções SQL
// são security invoker), então cada motorista só recebe os próprios registros.

import { createClient } from '@/lib/supabase/server'
import { compararTrajetos } from '@/lib/trajetos/consultas'
import type { Trajeto } from '@/lib/trajetos/tipos'
import { rotuloTrajeto } from '@/lib/trajetos/validacao'

import type {
  FiltroHistorico,
  LinhaHistorico,
  OpcaoFiltro,
  Periodo,
  ResumoHistorico,
} from './tipos'

const SUFIXO_ARQUIVADO = ' (arquivado)'

function compararNomes(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
}

// Parâmetros comuns das duas funções SQL.
function parametros(periodo: Periodo, filtro: FiltroHistorico) {
  return {
    p_inicio: periodo.inicio,
    p_fim: periodo.fim,
    p_passageiro_id: filtro.passageiro ?? null,
    p_trajeto_id: filtro.trajeto ?? null,
    p_sentido: filtro.sentido ?? null,
  }
}

// Todos os passageiros e trajetos do motorista, inclusive os arquivados (FR-007).
export async function obterOpcoesFiltros(): Promise<{
  passageiros: OpcaoFiltro[]
  trajetos: OpcaoFiltro[]
}> {
  const supabase = await createClient()
  const [passageiros, trajetos] = await Promise.all([
    supabase.from('passageiros').select('id, nome, arquivado_em'),
    supabase.from('trajetos').select('id, origem, destino, arquivado_em, criado_em, atualizado_em'),
  ])
  const erro = passageiros.error ?? trajetos.error
  if (erro) throw new Error(`Falha ao carregar os filtros do histórico: ${erro.message}`)

  const listaPassageiros = passageiros.data as {
    id: string
    nome: string
    arquivado_em: string | null
  }[]
  return {
    passageiros: listaPassageiros
      .sort((a, b) => compararNomes(a.nome, b.nome))
      .map((p) => ({
        id: p.id,
        rotulo: p.arquivado_em ? `${p.nome}${SUFIXO_ARQUIVADO}` : p.nome,
        arquivado: p.arquivado_em !== null,
      })),
    trajetos: (trajetos.data as Trajeto[]).sort(compararTrajetos).map((t) => ({
      id: t.id,
      rotulo: t.arquivado_em ? `${rotuloTrajeto(t)}${SUFIXO_ARQUIVADO}` : rotuloTrajeto(t),
      arquivado: t.arquivado_em !== null,
    })),
  }
}

// As `limite` viagens mais recentes do filtro; `temMais` indica se há continuação.
export async function listarHistorico(
  periodo: Periodo,
  filtro: FiltroHistorico,
  limite: number,
): Promise<{ linhas: LinhaHistorico[]; temMais: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('historico_viagens', {
    ...parametros(periodo, filtro),
    p_limite: limite + 1,
  })
  if (error) throw new Error(`Falha ao carregar o histórico: ${error.message}`)

  // Reaplica a ordem alfabética do pt-BR (acentos e maiúsculas) nos nomes.
  const linhas = (data as LinhaHistorico[]).map((l) => ({
    ...l,
    passageiros: [...l.passageiros].sort(compararNomes),
  }))
  return { linhas: linhas.slice(0, limite), temMais: linhas.length > limite }
}

// Quantidade e total de todo o resultado, inclusive o que não foi carregado (FR-014).
export async function resumirHistorico(
  periodo: Periodo,
  filtro: FiltroHistorico,
): Promise<ResumoHistorico> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('historico_resumo', parametros(periodo, filtro))
    .single()
  if (error) throw new Error(`Falha ao resumir o histórico: ${error.message}`)

  // bigint chega como número (ou texto, conforme o tamanho); os valores cabem em number.
  const resumo = data as { quantidade: number; total_centavos: number | string }
  return { quantidade: resumo.quantidade, total_centavos: Number(resumo.total_centavos) }
}

// Distingue "nenhuma viagem registrada" de "nenhuma viagem no filtro" (FR-017).
export async function existeViagemAtiva(): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('viagens')
    .select('id')
    .is('arquivada_em', null)
    .limit(1)
  if (error) throw new Error(`Falha ao verificar as viagens: ${error.message}`)
  return data.length > 0
}
