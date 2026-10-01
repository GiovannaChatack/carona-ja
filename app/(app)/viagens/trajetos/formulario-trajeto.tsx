'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ERRO_CONEXAO, tratarFalhaDeConexao } from '@/lib/acoes-cliente'
import type { CamposTrajeto, EstadoFormularioTrajeto } from '@/lib/trajetos/tipos'

type FormularioTrajetoProps = {
  acao: (estado: EstadoFormularioTrajeto, formData: FormData) => Promise<EstadoFormularioTrajeto>
  inicial?: Partial<Record<CamposTrajeto, string>>
  textoEnviar: string
  hrefCancelar: string
}

const estadoInicial: EstadoFormularioTrajeto = {}

const CAMPOS: { campo: CamposTrajeto; rotulo: string; placeholder: string }[] = [
  { campo: 'origem', rotulo: 'Origem', placeholder: 'Ex.: Casa' },
  { campo: 'destino', rotulo: 'Destino', placeholder: 'Ex.: Faculdade' },
]

// Formulário compartilhado pelo cadastro e pela edição (contracts/rotas.md).
export function FormularioTrajeto({
  acao,
  inicial,
  textoEnviar,
  hrefCancelar,
}: FormularioTrajetoProps) {
  const [estado, enviar, pendente] = useActionState(
    tratarFalhaDeConexao(acao, (formData: FormData) => ({
      erro: ERRO_CONEXAO,
      valores: {
        origem: String(formData.get('origem') ?? ''),
        destino: String(formData.get('destino') ?? ''),
      },
    })),
    estadoInicial,
  )
  const erros = estado.errosCampo ?? {}

  return (
    <form action={enviar} className="flex flex-col gap-5" noValidate>
      {CAMPOS.map(({ campo, rotulo, placeholder }) => (
        <div key={campo} className="flex flex-col gap-2">
          <Label htmlFor={campo}>{rotulo}</Label>
          <Input
            id={campo}
            name={campo}
            autoComplete="off"
            maxLength={80}
            placeholder={placeholder}
            // O React 19 reseta o formulário após a action: o defaultValue repõe o que foi digitado.
            defaultValue={estado.valores?.[campo] ?? inicial?.[campo]}
            className="h-11"
            aria-invalid={erros[campo] ? true : undefined}
            aria-describedby={erros[campo] ? `${campo}-erro` : undefined}
          />
          {erros[campo] && (
            <p id={`${campo}-erro`} className="text-sm text-destructive">
              {erros[campo]}
            </p>
          )}
        </div>
      ))}

      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href={hrefCancelar}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? 'Salvando...' : textoEnviar}
        </Button>
      </div>
    </form>
  )
}
