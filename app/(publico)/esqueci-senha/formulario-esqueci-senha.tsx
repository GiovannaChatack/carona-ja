'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { solicitarLink, type EstadoEsqueciSenha } from './actions'

const estadoInicial: EstadoEsqueciSenha = {}

export function FormularioEsqueciSenha() {
  const [estado, acao, pendente] = useActionState(solicitarLink, estadoInicial)

  if (estado.enviado) {
    return (
      <p role="status" className="rounded-md bg-muted p-3 text-sm">
        Se o e-mail estiver cadastrado, você receberá um link.
      </p>
    )
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? 'Enviando...' : 'Enviar link'}
      </Button>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
        {estado.erro}
      </p>
    </form>
  )
}
