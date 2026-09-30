'use server'

import { MENSAGENS_AUTH, mapAuthError } from '@/lib/auth/errors'
import { env } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

export type EstadoEsqueciSenha = { erro?: string; enviado?: boolean }

export async function solicitarLink(
  _estado: EstadoEsqueciSenha,
  formData: FormData,
): Promise<EstadoEsqueciSenha> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { erro: 'Informe o e-mail.' }

  let erro: unknown = null
  try {
    const supabase = await createClient()
    const resultado = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.siteUrl}/auth/confirmar?next=/redefinir-senha`,
    })
    erro = resultado.error
  } catch (e) {
    erro = e
  }

  // Limite de tentativas e falha de rede não dizem nada sobre o e-mail; o resto recebe
  // sempre a mesma resposta, exista ou não a conta (FR-007).
  if (erro) {
    const mensagem = mapAuthError(erro)
    if (mensagem === MENSAGENS_AUTH.limite || mensagem === MENSAGENS_AUTH.rede) {
      return { erro: mensagem }
    }
  }

  return { enviado: true }
}
