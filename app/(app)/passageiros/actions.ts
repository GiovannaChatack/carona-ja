'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type {
  CamposPassageiro,
  EstadoAcaoPassageiro,
  EstadoFormularioPassageiro,
} from '@/lib/passageiros/tipos'
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

// Efeito comum de arquivar, reativar e excluir: revalida as telas e redireciona no sucesso.
function concluirAcao(id: string, destino: string): never {
  revalidatePath('/passageiros')
  revalidatePath(`/passageiros/${id}`)
  // Fora do try/catch das actions: redirect lança uma exceção de controle do Next.
  redirect(destino)
}

export async function arquivarPassageiro(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _estado: EstadoAcaoPassageiro,
): Promise<EstadoAcaoPassageiro> {
  if (!ehUuid(id)) return { erro: ERRO_NAO_ENCONTRADO }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('passageiros')
      .update({ arquivado_em: new Date().toISOString() })
      .eq('id', id)
      .is('arquivado_em', null)
      .select('id')
    if (error) return { erro: ERRO_GENERICO }
    if (!data || data.length === 0) return { erro: ERRO_NAO_ENCONTRADO }
  } catch {
    return { erro: ERRO_GENERICO }
  }

  concluirAcao(id, `/passageiros/${id}?aviso=arquivado`)
}

export async function reativarPassageiro(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _estado: EstadoAcaoPassageiro,
): Promise<EstadoAcaoPassageiro> {
  if (!ehUuid(id)) return { erro: ERRO_NAO_ENCONTRADO }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('passageiros')
      .update({ arquivado_em: null })
      .eq('id', id)
      .select('id')
    if (error?.code === '23505') {
      return { erro: `${ERRO_NOME_DUPLICADO} Renomeie um deles antes de reativar.` }
    }
    if (error) return { erro: ERRO_GENERICO }
    if (!data || data.length === 0) return { erro: ERRO_NAO_ENCONTRADO }
  } catch {
    return { erro: ERRO_GENERICO }
  }

  concluirAcao(id, `/passageiros/${id}?aviso=reativado`)
}

export async function excluirPassageiro(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _estado: EstadoAcaoPassageiro,
): Promise<EstadoAcaoPassageiro> {
  if (!ehUuid(id)) return { erro: ERRO_NAO_ENCONTRADO }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('passageiros').delete().eq('id', id).select('id')
    if (error?.code === '23503') {
      return { erro: 'Este passageiro tem viagens registradas e não pode ser excluído. Arquive-o.' }
    }
    if (error) return { erro: ERRO_GENERICO }
    if (!data || data.length === 0) return { erro: ERRO_NAO_ENCONTRADO }
  } catch {
    return { erro: ERRO_GENERICO }
  }

  concluirAcao(id, '/passageiros?aviso=excluido')
}
