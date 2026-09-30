'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { CamposPassageiro, EstadoFormularioPassageiro } from '@/lib/passageiros/tipos'
import { validarPassageiro } from '@/lib/passageiros/validacao'
import { createClient } from '@/lib/supabase/server'

const ERRO_GENERICO = 'Não foi possível salvar. Tente novamente.'
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

  try {
    const supabase = await createClient()
    // motorista_id nunca vem do formulário: o banco preenche com auth.uid() e a RLS confere.
    const { error } = await supabase
      .from('passageiros')
      .insert(validacao.dados)
      .select('id')
      .single()
    if (error?.code === '23505') return { errosCampo: { nome: ERRO_NOME_DUPLICADO }, valores }
    if (error) return { erro: ERRO_GENERICO, valores }
  } catch {
    return { erro: ERRO_GENERICO, valores }
  }

  revalidatePath('/passageiros')
  // Fora do try/catch: redirect lança uma exceção de controle do Next.
  redirect('/passageiros?aviso=cadastrado')
}
