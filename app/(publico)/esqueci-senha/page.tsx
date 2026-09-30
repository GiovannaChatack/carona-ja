import type { Metadata } from 'next'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { FormularioEsqueciSenha } from './formulario-esqueci-senha'

export const metadata: Metadata = { title: 'Esqueci minha senha · Caronas Já' }

export default function EsqueciSenhaPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Esqueci minha senha</CardTitle>
        <CardDescription>Informe seu e-mail para receber um link de redefinição.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioEsqueciSenha />
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/entrar" className="text-sm underline underline-offset-4">
          Voltar para o login
        </Link>
      </CardFooter>
    </Card>
  )
}
