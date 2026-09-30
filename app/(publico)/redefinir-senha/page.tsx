import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

import { FormularioRedefinirSenha } from './formulario-redefinir-senha'

export const metadata: Metadata = { title: 'Redefinir senha · Caronas Já' }

export default async function RedefinirSenhaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?erro=link-invalido')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>A nova senha precisa ter no mínimo 8 caracteres.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioRedefinirSenha />
      </CardContent>
    </Card>
  )
}
