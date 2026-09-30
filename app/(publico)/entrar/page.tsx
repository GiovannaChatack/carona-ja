import type { Metadata } from 'next'
import Link from 'next/link'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { MENSAGENS_AUTH } from '@/lib/auth/errors'

import { FormularioEntrar } from './formulario-entrar'

export const metadata: Metadata = { title: 'Entrar · Caronas Já' }

export default async function EntrarPage({ searchParams }: PageProps<'/entrar'>) {
  const { proximo, motivo, erro } = await searchParams
  const aviso =
    erro === 'link-invalido'
      ? MENSAGENS_AUTH.linkInvalido
      : motivo === 'expirada'
        ? 'Sua sessão expirou, entre novamente'
        : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {aviso && (
          <p role="status" className="rounded-md bg-muted p-3 text-sm">
            {aviso}
          </p>
        )}
        <FormularioEntrar proximo={typeof proximo === 'string' ? proximo : undefined} />
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/esqueci-senha" className="text-sm underline underline-offset-4">
          Esqueci minha senha
        </Link>
      </CardFooter>
    </Card>
  )
}
