'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { redefinirSenha, type EstadoRedefinirSenha } from './actions'

const estadoInicial: EstadoRedefinirSenha = {}

export function FormularioRedefinirSenha() {
  const [estado, acao, pendente] = useActionState(redefinirSenha, estadoInicial)

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmacao">Confirmar nova senha</Label>
        <Input
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? 'Salvando...' : 'Salvar nova senha'}
      </Button>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
        {estado.erro}
      </p>
    </form>
  )
}
