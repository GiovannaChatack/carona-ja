'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { paraCampoDataHora } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { EstadoFormularioViagem } from '@/lib/viagens/tipos'
import { validarViagem } from '@/lib/viagens/validacao'

const ERRO_GENERICO = 'Não foi possível salvar. Tente novamente.'

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
    default:
      return { erro: ERRO_GENERICO, valores }
  }
}

export async function registrarViagem(
  _estado: EstadoFormularioViagem,
  formData: FormData,
): Promise<EstadoFormularioViagem> {
  const valores = valoresPreenchidos(formData)
  const validacao = validarViagem(formData, paraCampoDataHora(new Date()))
  if (!validacao.ok) {
    return { errosCampo: validacao.errosCampo, errosValor: validacao.errosValor, valores }
  }

  const { trajeto_id, sentido, data_hora_local, participacoes } = validacao.dados
  try {
    const supabase = await createClient()
    // motorista_id nunca vem do formulário: a função grava com auth.uid() sob a RLS.
    const { error } = await supabase.rpc('registrar_viagem', {
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

  revalidatePath('/viagens')
  // Fora do try/catch: redirect lança uma exceção de controle do Next.
  redirect('/viagens?aviso=registrada')
}
