'use server'

// Next 16 (T002): mesmas APIs de app/(app)/viagens/actions.ts; aqui não há redirect, e o revalidatePath na action já atualiza a tela aberta.

import { revalidatePath } from 'next/cache'

import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { hojeEmSaoPaulo } from '@/lib/format'
import type { EstadoPagamento } from '@/lib/pagamentos/tipos'
import { validarDataPagamento } from '@/lib/pagamentos/validacao'
import { createClient } from '@/lib/supabase/server'
import { ehUuid } from '@/lib/validacao'

const ERRO_GENERICO = 'Não foi possível salvar. Tente novamente.'
const ERRO_NAO_COBRAVEL = 'Esta viagem não tem valor a pagar ou foi arquivada. Atualize a página.'
const ERRO_JA_ALTERADO = 'Este pagamento já foi alterado. Atualize a página.'

// Mensagens do trigger validar_pagamento (CJ008), pelo message do erro.
const ERROS_DATA: Record<string, string> = {
  data_pagamento_futura: 'A data do pagamento não pode ser no futuro.',
  data_pagamento_antes_da_viagem: 'A data do pagamento não pode ser anterior à data da viagem.',
}

// Erros do banco no lugar certo (data-model.md → "Erros novos").
function erroDoBanco(erro: { code?: string; message?: string }): EstadoPagamento {
  switch (erro.code) {
    case 'CJ008':
      return { erroData: ERROS_DATA[erro.message ?? ''] ?? 'Informe uma data válida.' }
    case 'CJ009':
      return { erro: ERRO_NAO_COBRAVEL }
    default:
      return { erro: ERRO_GENERICO }
  }
}

function revalidarPagamentos(passageiroId: string) {
  revalidatePath('/pagamentos')
  revalidatePath(`/pagamentos/${passageiroId}`)
  revalidatePath(`/passageiros/${passageiroId}`)
}

function viagens(n: number) {
  return n === 1 ? '1 viagem' : `${n} viagens`
}

// "N viagens marcadas como pagas", e quantas já estavam pagas (FR-011).
function textoMarcadas(alteradas: number, selecionadas: number) {
  const base =
    alteradas === 0
      ? 'Nenhuma viagem foi marcada'
      : `${viagens(alteradas)} ${alteradas === 1 ? 'marcada como paga' : 'marcadas como pagas'}`
  const jaPagas = selecionadas - alteradas
  if (jaPagas <= 0) return base
  return `${base} · ${jaPagas} ${jaPagas === 1 ? 'já estava paga' : 'já estavam pagas'}`
}

// Data do formulário validada com o dia de São Paulo; o trigger confere o dia da viagem.
function lerData(formData: FormData) {
  return validarDataPagamento(String(formData.get('data') ?? ''), { hoje: hojeEmSaoPaulo() })
}

// Marca como pagas as participações pendentes do passageiro. As já pagas não casam com o
// filtro e mantêm a data original. Um único update: tudo ou nada (FR-010).
async function gravarPagamentos(
  passageiroId: string,
  ids: string[],
  data: string,
): Promise<EstadoPagamento> {
  try {
    const supabase = await createClient()
    const { data: alteradas, error } = await supabase
      .from('viagem_passageiros')
      .update({ pago_em: data })
      .in('id', ids)
      .eq('passageiro_id', passageiroId)
      .is('pago_em', null)
      .select('id')
    if (error) return erroDoBanco(error)
    revalidarPagamentos(passageiroId)
    return { sucesso: textoMarcadas(alteradas?.length ?? 0, ids.length) }
  } catch {
    return { erro: ERRO_GENERICO }
  }
}

export async function marcarPagamentos(
  passageiroId: string,
  _estado: EstadoPagamento,
  formData: FormData,
): Promise<EstadoPagamento> {
  await obterUsuarioLogado()
  const data = lerData(formData)
  if (!data.ok) return { erroData: data.erro }

  const ids = [...new Set(formData.getAll('participacao').map(String))].filter(ehUuid)
  if (!ehUuid(passageiroId) || ids.length === 0) {
    return { erro: 'Selecione ao menos uma viagem.' }
  }
  return gravarPagamentos(passageiroId, ids, data.valor)
}

// "Recebi tudo": os ids pendentes são lidos no servidor agora, e não os que a tela mostrava,
// para incluir uma viagem registrada em outra aba (research §3).
export async function receberTudo(
  passageiroId: string,
  _estado: EstadoPagamento,
  formData: FormData,
): Promise<EstadoPagamento> {
  await obterUsuarioLogado()
  const data = lerData(formData)
  if (!data.ok) return { erroData: data.erro }
  if (!ehUuid(passageiroId)) return { erro: 'Nenhuma viagem pendente.' }

  let ids: string[]
  try {
    const supabase = await createClient()
    const { data: pendentes, error } = await supabase
      .from('participacoes_detalhe')
      .select('id')
      .eq('passageiro_id', passageiroId)
      .is('pago_em', null)
      .gt('valor_centavos', 0)
      .is('arquivada_em', null)
    if (error) return { erro: ERRO_GENERICO }
    ids = (pendentes ?? []).map((p) => p.id as string)
  } catch {
    return { erro: ERRO_GENERICO }
  }
  if (ids.length === 0) return { erro: 'Nenhuma viagem pendente.' }
  return gravarPagamentos(passageiroId, ids, data.valor)
}

// Desfazer volta a participação a pendente; nunca é bloqueado pelo trigger (FR-012).
export async function desfazerPagamento(
  participacaoId: string,
  passageiroId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _estado: EstadoPagamento,
): Promise<EstadoPagamento> {
  await obterUsuarioLogado()
  if (!ehUuid(participacaoId) || !ehUuid(passageiroId)) return { erro: ERRO_JA_ALTERADO }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('viagem_passageiros')
      .update({ pago_em: null })
      .eq('id', participacaoId)
      .eq('passageiro_id', passageiroId)
      .not('pago_em', 'is', null)
      .select('id')
    if (error) return erroDoBanco(error)
    // Nenhuma linha: já desfeito em outra aba, inexistente ou de outra conta.
    if (!data || data.length === 0) return { erro: ERRO_JA_ALTERADO }
  } catch {
    return { erro: ERRO_GENERICO }
  }
  revalidarPagamentos(passageiroId)
  return { sucesso: 'Pagamento desfeito' }
}

// Corrige a data de uma participação já paga (FR-012).
export async function alterarDataPagamento(
  participacaoId: string,
  passageiroId: string,
  _estado: EstadoPagamento,
  formData: FormData,
): Promise<EstadoPagamento> {
  await obterUsuarioLogado()
  const data = lerData(formData)
  if (!data.ok) return { erroData: data.erro }
  if (!ehUuid(participacaoId) || !ehUuid(passageiroId)) return { erro: ERRO_JA_ALTERADO }

  try {
    const supabase = await createClient()
    const { data: alteradas, error } = await supabase
      .from('viagem_passageiros')
      .update({ pago_em: data.valor })
      .eq('id', participacaoId)
      .eq('passageiro_id', passageiroId)
      .not('pago_em', 'is', null)
      .select('id')
    if (error) return erroDoBanco(error)
    if (!alteradas || alteradas.length === 0) return { erro: ERRO_JA_ALTERADO }
  } catch {
    return { erro: ERRO_GENERICO }
  }
  revalidarPagamentos(passageiroId)
  return { sucesso: 'Data do pagamento alterada' }
}

// Marca uma participação a partir dos detalhes da viagem (FR-014).
export async function marcarPagamentoNaViagem(
  viagemId: string,
  participacaoId: string,
  _estado: EstadoPagamento,
  formData: FormData,
): Promise<EstadoPagamento> {
  await obterUsuarioLogado()
  const data = lerData(formData)
  if (!data.ok) return { erroData: data.erro }
  if (!ehUuid(viagemId) || !ehUuid(participacaoId)) return { erro: ERRO_JA_ALTERADO }

  let passageiroId: string
  try {
    const supabase = await createClient()
    const { data: alteradas, error } = await supabase
      .from('viagem_passageiros')
      .update({ pago_em: data.valor })
      .eq('id', participacaoId)
      .eq('viagem_id', viagemId)
      .is('pago_em', null)
      .select('id, passageiro_id')
    if (error) return erroDoBanco(error)
    if (!alteradas || alteradas.length === 0) return { erro: ERRO_JA_ALTERADO }
    passageiroId = alteradas[0].passageiro_id as string
  } catch {
    return { erro: ERRO_GENERICO }
  }
  revalidarPagamentos(passageiroId)
  revalidatePath(`/viagens/${viagemId}`)
  return { sucesso: 'Pagamento registrado' }
}
