'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type {
  CamposTrajeto,
  EstadoAcaoTrajeto,
  EstadoFormularioTrajeto,
} from '@/lib/trajetos/tipos'
import { ERRO_ORIGEM_IGUAL_DESTINO, validarTrajeto } from '@/lib/trajetos/validacao'
import { ehUuid } from '@/lib/validacao'

const ERRO_GENERICO = 'Não foi possível salvar. Tente novamente.'
const ERRO_NAO_ENCONTRADO = 'Trajeto não encontrado.'
const ERRO_DUPLICADO = 'Este trajeto já está cadastrado.'

// Texto digitado em cada campo, devolvido para repopular o formulário após um erro.
function valoresDigitados(formData: FormData): Partial<Record<CamposTrajeto, string>> {
  const campos: CamposTrajeto[] = ['origem', 'destino']
  return Object.fromEntries(campos.map((campo) => [campo, String(formData.get(campo) ?? '')]))
}

// Erros do banco que viram mensagem no campo Destino; os demais são genéricos.
function erroDeGravacao(
  codigo: string | undefined,
  valores: Partial<Record<CamposTrajeto, string>>,
): EstadoFormularioTrajeto {
  if (codigo === '23505') return { errosCampo: { destino: ERRO_DUPLICADO }, valores }
  if (codigo === '23514') return { errosCampo: { destino: ERRO_ORIGEM_IGUAL_DESTINO }, valores }
  return { erro: ERRO_GENERICO, valores }
}

export async function cadastrarTrajeto(
  _estado: EstadoFormularioTrajeto,
  formData: FormData,
): Promise<EstadoFormularioTrajeto> {
  const valores = valoresDigitados(formData)
  const validacao = validarTrajeto(formData)
  if (!validacao.ok) return { errosCampo: validacao.errosCampo, valores }

  let id: string
  try {
    const supabase = await createClient()
    // motorista_id nunca vem do formulário: o banco preenche com auth.uid() e a RLS confere.
    const { data, error } = await supabase
      .from('trajetos')
      .insert(validacao.dados)
      .select('id')
      .single()
    if (error || !data) return erroDeGravacao(error?.code, valores)
    id = data.id
  } catch {
    return { erro: ERRO_GENERICO, valores }
  }

  revalidatePath('/viagens/trajetos')
  // Fora do try/catch: redirect lança uma exceção de controle do Next.
  redirect(`/viagens/trajetos/${id}?aviso=cadastrado`)
}

export async function editarTrajeto(
  id: string,
  _estado: EstadoFormularioTrajeto,
  formData: FormData,
): Promise<EstadoFormularioTrajeto> {
  const valores = valoresDigitados(formData)
  if (!ehUuid(id)) return { erro: ERRO_NAO_ENCONTRADO, valores }

  const validacao = validarTrajeto(formData)
  if (!validacao.ok) return { errosCampo: validacao.errosCampo, valores }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('trajetos')
      .update(validacao.dados)
      .eq('id', id)
      .select('id')
    if (error) return erroDeGravacao(error.code, valores)
    // Nenhuma linha: id inexistente ou de outra conta (a RLS esconde).
    if (!data || data.length === 0) return { erro: ERRO_NAO_ENCONTRADO, valores }
  } catch {
    return { erro: ERRO_GENERICO, valores }
  }

  revalidatePath('/viagens')
  concluirAcao(id, `/viagens/trajetos/${id}?aviso=atualizado`)
}

// Efeito comum das ações: revalida as telas e redireciona no sucesso.
function concluirAcao(id: string, destino: string): never {
  revalidatePath('/viagens/trajetos')
  revalidatePath(`/viagens/trajetos/${id}`)
  // Fora do try/catch das actions: redirect lança uma exceção de controle do Next.
  redirect(destino)
}

export async function arquivarTrajeto(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _estado: EstadoAcaoTrajeto,
): Promise<EstadoAcaoTrajeto> {
  if (!ehUuid(id)) return { erro: ERRO_NAO_ENCONTRADO }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('trajetos')
      .update({ arquivado_em: new Date().toISOString() })
      .eq('id', id)
      .is('arquivado_em', null)
      .select('id')
    if (error) return { erro: ERRO_GENERICO }
    if (!data || data.length === 0) return { erro: ERRO_NAO_ENCONTRADO }
  } catch {
    return { erro: ERRO_GENERICO }
  }

  concluirAcao(id, `/viagens/trajetos/${id}?aviso=arquivado`)
}

export async function reativarTrajeto(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _estado: EstadoAcaoTrajeto,
): Promise<EstadoAcaoTrajeto> {
  if (!ehUuid(id)) return { erro: ERRO_NAO_ENCONTRADO }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('trajetos')
      .update({ arquivado_em: null })
      .eq('id', id)
      .select('id')
    if (error?.code === '23505') {
      return { erro: 'Já existe um trajeto ativo com essa origem e esse destino.' }
    }
    if (error) return { erro: ERRO_GENERICO }
    if (!data || data.length === 0) return { erro: ERRO_NAO_ENCONTRADO }
  } catch {
    return { erro: ERRO_GENERICO }
  }

  concluirAcao(id, `/viagens/trajetos/${id}?aviso=reativado`)
}

export async function excluirTrajeto(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _estado: EstadoAcaoTrajeto,
): Promise<EstadoAcaoTrajeto> {
  if (!ehUuid(id)) return { erro: ERRO_NAO_ENCONTRADO }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('trajetos').delete().eq('id', id).select('id')
    if (error?.code === '23503') {
      return { erro: 'Este trajeto tem viagens registradas e não pode ser excluído. Arquive-o.' }
    }
    if (error) return { erro: ERRO_GENERICO }
    if (!data || data.length === 0) return { erro: ERRO_NAO_ENCONTRADO }
  } catch {
    return { erro: ERRO_GENERICO }
  }

  concluirAcao(id, '/viagens/trajetos?aviso=excluido')
}
