'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { paraCampoDataHora } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { ehUuid } from '@/lib/validacao'
import type { EstadoAcaoViagem, EstadoFormularioViagem } from '@/lib/viagens/tipos'
import { validarViagem } from '@/lib/viagens/validacao'

const ERRO_GENERICO = 'Não foi possível salvar. Tente novamente.'
const ERRO_NAO_ENCONTRADA = 'Viagem não encontrada.'

type Valores = NonNullable<EstadoFormularioViagem['valores']>

// O que foi preenchido, devolvido para repopular o formulário após um erro.
function valoresPreenchidos(formData: FormData): Valores {
  const campo = (nome: string) => String(formData.get(nome) ?? '')
  const passageiros = [...new Set(formData.getAll('passageiros').map(String))]
  const valoresPorPassageiro: Record<string, string> = {}
  for (const [chave, valor] of formData.entries()) {
    if (chave.startsWith('valor_')) valoresPorPassageiro[chave.slice(6)] = String(valor)
  }
  return {
    trajeto: campo('trajeto'),
    sentido: campo('sentido'),
    data_hora: campo('data_hora'),
    passageiros,
    valoresPorPassageiro,
  }
}

// Erros das funções SQL (SQLSTATE CJ00x) no campo certo; os demais são genéricos (research §8).
function erroDaFuncao(
  erro: { code?: string; details?: string | null },
  sentido: string,
  valores: Valores,
): EstadoFormularioViagem {
  switch (erro.code) {
    case 'CJ001':
      return {
        duplicada: `Já existe uma viagem de ${sentido === 'volta' ? 'volta' : 'ida'} neste trajeto em ${erro.details ?? 'data informada'}.`,
        valores,
      }
    case 'CJ002':
      return { errosCampo: { trajeto: 'Escolha um trajeto ativo.' }, valores }
    case 'CJ003':
      return {
        errosCampo: {
          passageiros:
            'Um dos passageiros marcados foi arquivado ou não existe mais. Revise a lista.',
        },
        valores,
      }
    case 'CJ004':
      return { errosCampo: { passageiros: 'Marque ao menos um passageiro.' }, valores }
    case 'CJ005':
      return {
        errosCampo: { data_hora: 'A data e a hora não podem passar de 1 dia no futuro.' },
        valores,
      }
    case 'CJ006':
      return { erro: ERRO_NAO_ENCONTRADA, valores }
    default:
      return { erro: ERRO_GENERICO, valores }
  }
}

// Valida o formulário e chama a função SQL; devolve o estado de erro ou null no sucesso.
// motorista_id nunca vem do formulário: as funções gravam com auth.uid() sob a RLS.
async function gravarViagem(
  formData: FormData,
  funcao: 'registrar_viagem' | 'editar_viagem',
  extras: Record<string, string> = {},
): Promise<EstadoFormularioViagem | null> {
  const valores = valoresPreenchidos(formData)
  const validacao = validarViagem(formData, paraCampoDataHora(new Date()))
  if (!validacao.ok) {
    return { errosCampo: validacao.errosCampo, errosValor: validacao.errosValor, valores }
  }

  const { trajeto_id, sentido, data_hora_local, participacoes } = validacao.dados
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc(funcao, {
      ...extras,
      p_trajeto_id: trajeto_id,
      p_sentido: sentido,
      p_data_hora_local: data_hora_local,
      p_participacoes: participacoes,
      p_confirmar_duplicada: formData.get('confirmar_duplicada') === '1',
    })
    if (error) return erroDaFuncao(error, sentido, valores)
  } catch {
    return { erro: ERRO_GENERICO, valores }
  }
  return null
}

export async function registrarViagem(
  _estado: EstadoFormularioViagem,
  formData: FormData,
): Promise<EstadoFormularioViagem> {
  const falha = await gravarViagem(formData, 'registrar_viagem')
  if (falha) return falha

  revalidatePath('/viagens')
  // Fora do try/catch: redirect lança uma exceção de controle do Next.
  redirect('/viagens?aviso=registrada')
}

// Efeito comum das ações sobre uma viagem: revalida as telas e redireciona no sucesso.
function concluirAcao(id: string, destino: string): never {
  revalidatePath('/viagens')
  revalidatePath(`/viagens/${id}`)
  // Fora do try/catch das actions: redirect lança uma exceção de controle do Next.
  redirect(destino)
}

export async function editarViagem(
  id: string,
  _estado: EstadoFormularioViagem,
  formData: FormData,
): Promise<EstadoFormularioViagem> {
  if (!ehUuid(id)) return { erro: ERRO_NAO_ENCONTRADA, valores: valoresPreenchidos(formData) }

  const falha = await gravarViagem(formData, 'editar_viagem', { p_viagem_id: id })
  if (falha) return falha

  concluirAcao(id, `/viagens/${id}?aviso=atualizada`)
}

// Arquivar ou reativar: muda só arquivada_em; nada é apagado (FR-021, FR-022).
async function mudarSituacao(id: string, arquivar: boolean): Promise<EstadoAcaoViagem | null> {
  if (!ehUuid(id)) return { erro: ERRO_NAO_ENCONTRADA }

  try {
    const supabase = await createClient()
    const consulta = supabase
      .from('viagens')
      .update({ arquivada_em: arquivar ? new Date().toISOString() : null })
      .eq('id', id)
    const { data, error } = await (arquivar ? consulta.is('arquivada_em', null) : consulta).select(
      'id',
    )
    if (error) return { erro: ERRO_GENERICO }
    // Nenhuma linha: id inexistente, de outra conta (a RLS esconde) ou já arquivada.
    if (!data || data.length === 0) return { erro: ERRO_NAO_ENCONTRADA }
  } catch {
    return { erro: ERRO_GENERICO }
  }
  return null
}

export async function arquivarViagem(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _estado: EstadoAcaoViagem,
): Promise<EstadoAcaoViagem> {
  const falha = await mudarSituacao(id, true)
  if (falha) return falha
  concluirAcao(id, `/viagens/${id}?aviso=arquivada`)
}

export async function reativarViagem(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida por useActionState
  _estado: EstadoAcaoViagem,
): Promise<EstadoAcaoViagem> {
  const falha = await mudarSituacao(id, false)
  if (falha) return falha
  concluirAcao(id, `/viagens/${id}?aviso=reativada`)
}
