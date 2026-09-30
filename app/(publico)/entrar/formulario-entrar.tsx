'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { entrar, type EstadoEntrar } from './actions'

const estadoInicial: EstadoEntrar = {}

export function FormularioEntrar({ proximo }: { proximo?: string }) {
  const [estado, acao, pendente] = useActionState(entrar, estadoInicial)

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="proximo" value={proximo ?? ''} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? 'Entrando...' : 'Entrar'}
      </Button>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
        {estado.erro}
      </p>
    </form>
  )
}
