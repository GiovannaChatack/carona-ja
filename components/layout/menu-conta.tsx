'use client'

import { LogOut } from 'lucide-react'
import { useRef } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/format'

import type { Usuario } from './usuario'

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/)
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : nome.slice(0, 2)
  return letras.toUpperCase()
}

export function MenuConta({ usuario }: { usuario: Usuario }) {
  // O formulário fica fora do menu (que é desmontado ao fechar) e é enviado pelo onSelect.
  const formSair = useRef<HTMLFormElement>(null)

  return (
    <>
      <form ref={formSair} action="/sair" method="post" hidden />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Menu da conta" className="rounded-full">
            <Avatar>
              <AvatarFallback>{iniciais(usuario.nome)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex min-w-0 flex-col gap-0.5 font-normal">
            <span className="truncate font-medium text-foreground">{usuario.nome}</span>
            <span className="truncate text-muted-foreground">{usuario.email}</span>
            {usuario.membroDesde && (
              <span className="text-xs text-muted-foreground">
                {`Membro desde ${formatDate(usuario.membroDesde)}`}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-11" onSelect={() => formSair.current?.requestSubmit()}>
            <LogOut />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
