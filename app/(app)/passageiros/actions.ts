'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { CamposPassageiro, EstadoFormularioPassageiro } from '@/lib/passageiros/tipos'
import { ehUuid, validarPassageiro } from '@/lib/passageiros/validacao'
import { createClient } from '@/lib/supabase/server'

const ERRO_GENERICO = 'Não foi possível salvar. Tente novamente.'
const ERRO_NAO_ENCONTRADO = 'Passageiro não encontrado.'
const ERRO_NOME_DUPLICADO = 'Já existe um passageiro ativo com esse nome.'

// Texto digitado em cada campo, devolvido para repopular o formulário após um erro.
function valoresDigitados(formData: FormData): Partial<Record<CamposPassageiro, string>> {
  const campos: CamposPassageiro[] = ['nome', 'telefone', 'valor', 'observacao']
  return Object.fromEntries(campos.map((campo) => [campo, String(formData.get(campo) ?? '')]))
}

export async function cadastrarPassageiro(
  _estado: EstadoFormularioPassageiro,
  formData: FormData,
): Promise<EstadoFormularioPassageiro> {
  const valores = valoresDigitados(formData)
  const validacao = validarPassageiro(formData)
  if (!validacao.ok) return { errosCampo: validacao.errosCampo, valores }

  let id: string
  try {
    const supabase = await createClient()
    // motorista_id nunca vem do formulário: o banco preenche com auth.uid() e a RLS confere.
    const { data, error } = await supabase
      .from('passageiros')
      .insert(validacao.dados)
      .select('id')
      .single()
    if (error?.code === '23505') return { errosCampo: { nome: ERRO_NOME_DUPLICADO }, valores }
    if (error || !data) return { erro: ERRO_GENERICO, valores }
    id = data.id
  } catch {
    return { erro: ERRO_GENERICO, valores }
  }

  revalidatePath('/passageiros')
  // Fora do try/catch: redirect lança uma exceção de controle do Next.
  redirect(`/passageiros/${id}?aviso=cadastrado`)
}

export async function editarPassageiro(
  id: string,
  _estado: EstadoFormularioPassageiro,
  formData: FormData,
): Promise<EstadoFormularioPassageiro> {
  const valores = valoresDigitados(formData)
  if (!ehUuid(id)) return { erro: ERRO_NAO_ENCONTRADO, valores }

  const validacao = validarPassageiro(formData)
  if (!validacao.ok) return { errosCampo: validacao.errosCampo, valores }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('passageiros')
      .update(validacao.dados)
      .eq('id', id)
      .select('id')
    if (error?.code === '23505') return { errosCampo: { nome: ERRO_NOME_DUPLICADO }, valores }
    if (error) return { erro: ERRO_GENERICO, valores }
    // Nenhuma linha: id inexistente ou de outra conta (a RLS esconde).
    if (!data || data.length === 0) return { erro: ERRO_NAO_ENCONTRADO, valores }
  } catch {
    return { erro: ERRO_GENERICO, valores }
  }

  revalidatePath('/passageiros')
  revalidatePath(`/passageiros/${id}`)
  redirect(`/passageiros/${id}?aviso=atualizado`)
}
