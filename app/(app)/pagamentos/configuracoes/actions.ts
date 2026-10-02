'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { obterUsuarioLogado } from '@/lib/auth/sessao'
import type { EstadoChavePix } from '@/lib/pagamentos/tipos'
import { caminhoVoltarSeguro, validarChavePix } from '@/lib/pagamentos/validacao'
import { createClient } from '@/lib/supabase/server'

const ERRO_GENERICO = 'Não foi possível salvar. Tente novamente.'

// Grava a chave PIX do motorista logado (FR-021, FR-022). O id nunca vem do formulário.
export async function salvarChavePix(
  _estado: EstadoChavePix,
  formData: FormData,
): Promise<EstadoChavePix> {
  await obterUsuarioLogado()
  const valor = String(formData.get('chave_pix') ?? '')
  const validacao = validarChavePix(valor)
  if (!validacao.ok) return { erroCampo: validacao.erro, valor }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { erro: ERRO_GENERICO, valor }
    const { data, error } = await supabase
      .from('perfis')
      .update({ chave_pix: validacao.valor })
      .eq('id', user.id)
      .select('id')
    if (error || !data || data.length === 0) return { erro: ERRO_GENERICO, valor }
  } catch {
    return { erro: ERRO_GENERICO, valor }
  }

  revalidatePath('/pagamentos', 'layout')
  // Só volta para a cobrança de um passageiro; qualquer outro destino é descartado (FR-026).
  const destino = new URL(
    caminhoVoltarSeguro(String(formData.get('voltar') ?? '')) ?? '/pagamentos',
    'http://local',
  )
  destino.searchParams.set('aviso', 'pix-salva')
  // Fora do try/catch: redirect lança uma exceção de controle do Next.
  redirect(`${destino.pathname}${destino.search}`)
}
