'use server'

import { redirect } from 'next/navigation'

import { MENSAGENS_AUTH, mapAuthError } from '@/lib/auth/errors'
import { createClient } from '@/lib/supabase/server'

export type EstadoRedefinirSenha = { erro?: string }

const SENHA_MINIMA = 8

export async function redefinirSenha(
  _estado: EstadoRedefinirSenha,
  formData: FormData,
): Promise<EstadoRedefinirSenha> {
  const senha = String(formData.get('senha') ?? '')
  const confirmacao = String(formData.get('confirmacao') ?? '')

  if (senha.length < SENHA_MINIMA) {
    return { erro: `A senha precisa ter no mínimo ${SENHA_MINIMA} caracteres.` }
  }
  if (senha !== confirmacao) return { erro: MENSAGENS_AUTH.senhasDiferentes }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?erro=link-invalido')

  try {
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      const mensagem = mapAuthError(error)
      // Aqui não há o que esconder: fora limite e rede, o erro é da própria senha
      // (ex.: igual à anterior ou fraca demais).
      if (mensagem === MENSAGENS_AUTH.credencial) {
        return { erro: 'Não foi possível atualizar a senha. Tente outra senha.' }
      }
      return { erro: mensagem }
    }
  } catch (error) {
    return { erro: mapAuthError(error) }
  }

  redirect('/inicio?senha=atualizada')
}
