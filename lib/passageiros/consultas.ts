// Consultas de passageiros. Uso só no servidor: o cliente da sessão aplica a RLS, então cada
// motorista só recebe os próprios registros.

import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

import type { Passageiro, SituacaoPassageiro } from './tipos'
import { ehUuid } from './validacao'

const COLUNAS =
  'id, nome, telefone, valor_padrao_centavos, observacao, arquivado_em, criado_em, atualizado_em'

export async function listarPassageiros(situacao: SituacaoPassageiro): Promise<Passageiro[]> {
  const supabase = await createClient()
  const consulta = supabase.from('passageiros').select(COLUNAS)
  const { data, error } = await (situacao === 'ativos'
    ? consulta.is('arquivado_em', null)
    : consulta.not('arquivado_em', 'is', null))

  // O erro é exibido por app/(app)/error.tsx.
  if (error) throw new Error(`Falha ao listar passageiros: ${error.message}`)

  // Ordena no código para seguir a ordem alfabética do pt-BR (acentos e maiúsculas).
  return (data as Passageiro[]).sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
  )
}

// Compartilhada entre a página e o generateMetadata (uma consulta por requisição).
export const obterPassageiro = cache(async (id: string): Promise<Passageiro | null> => {
  if (!ehUuid(id)) return null

  const supabase = await createClient()
  // Passageiro de outra conta não é visível pela RLS: volta null.
  const { data, error } = await supabase
    .from('passageiros')
    .select(COLUNAS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Falha ao obter passageiro: ${error.message}`)
  return data as Passageiro | null
})
