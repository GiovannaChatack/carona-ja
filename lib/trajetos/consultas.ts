// Consultas de trajetos. Uso só no servidor: o cliente da sessão aplica a RLS, então cada
// motorista só recebe os próprios registros.

import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { ehUuid } from '@/lib/validacao'

import type { SituacaoTrajeto, Trajeto } from './tipos'

const COLUNAS = 'id, origem, destino, arquivado_em, criado_em, atualizado_em'

// Ordem alfabética do pt-BR (acentos e maiúsculas): pela origem e, em empate, pelo destino.
export function compararTrajetos(a: Trajeto, b: Trajeto) {
  const opcoes = { sensitivity: 'base' } as const
  return (
    a.origem.localeCompare(b.origem, 'pt-BR', opcoes) ||
    a.destino.localeCompare(b.destino, 'pt-BR', opcoes)
  )
}

export async function listarTrajetos(situacao: SituacaoTrajeto): Promise<Trajeto[]> {
  const supabase = await createClient()
  const consulta = supabase.from('trajetos').select(COLUNAS)
  const { data, error } = await (situacao === 'ativos'
    ? consulta.is('arquivado_em', null)
    : consulta.not('arquivado_em', 'is', null))

  // O erro é exibido por app/(app)/error.tsx.
  if (error) throw new Error(`Falha ao listar trajetos: ${error.message}`)
  return (data as Trajeto[]).sort(compararTrajetos)
}

// Compartilhada entre a página e o generateMetadata (uma consulta por requisição).
export const obterTrajeto = cache(async (id: string): Promise<Trajeto | null> => {
  if (!ehUuid(id)) return null

  const supabase = await createClient()
  // Trajeto de outra conta não é visível pela RLS: volta null.
  const { data, error } = await supabase.from('trajetos').select(COLUNAS).eq('id', id).maybeSingle()
  if (error) throw new Error(`Falha ao obter trajeto: ${error.message}`)
  return data as Trajeto | null
})
