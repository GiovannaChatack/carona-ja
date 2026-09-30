'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CamposPassageiro, EstadoFormularioPassageiro } from '@/lib/passageiros/tipos'

type FormularioPassageiroProps = {
  acao: (
    estado: EstadoFormularioPassageiro,
    formData: FormData,
  ) => Promise<EstadoFormularioPassageiro>
  inicial?: Partial<Record<CamposPassageiro, string>>
  textoEnviar: string
  hrefCancelar: string
}

const estadoInicial: EstadoFormularioPassageiro = {}
const OBSERVACAO_MAX = 200

function ErroCampo({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {erro}
    </p>
  )
}

// Formulário compartilhado pelo cadastro e pela edição (contracts/rotas.md).
export function FormularioPassageiro({
  acao,
  inicial,
  textoEnviar,
  hrefCancelar,
}: FormularioPassageiroProps) {
  const [estado, enviar, pendente] = useActionState(acao, estadoInicial)
  const erros = estado.errosCampo ?? {}

  // O React 19 reseta o formulário após a action: o defaultValue repõe o que foi digitado.
  const valorInicial = (campo: CamposPassageiro) => estado.valores?.[campo] ?? inicial?.[campo]
  const [tamanhoObservacao, setTamanhoObservacao] = useState(
    valorInicial('observacao')?.length ?? 0,
  )

  // Liga o campo à mensagem de erro para leitores de tela.
  const acessibilidade = (campo: CamposPassageiro) => ({
    'aria-invalid': erros[campo] ? true : undefined,
    'aria-describedby': erros[campo] ? `${campo}-erro` : undefined,
  })

  return (
    <form action={enviar} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          autoComplete="off"
          maxLength={80}
          defaultValue={valorInicial('nome')}
          className="h-11"
          {...acessibilidade('nome')}
        />
        <ErroCampo id="nome-erro" erro={erros.nome} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 91234-5678"
          defaultValue={valorInicial('telefone')}
          className="h-11"
          {...acessibilidade('telefone')}
        />
        <ErroCampo id="telefone-erro" erro={erros.telefone} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="valor">Valor padrão por trajeto</Label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
          >
            R$
          </span>
          <Input
            id="valor"
            name="valor"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            defaultValue={valorInicial('valor')}
            className="h-11 pl-10"
            {...acessibilidade('valor')}
          />
        </div>
        <ErroCampo id="valor-erro" erro={erros.valor} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="observacao">
            Observação <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <span id="observacao-contador" className="text-xs text-muted-foreground">
            {tamanhoObservacao}/{OBSERVACAO_MAX}
          </span>
        </div>
        <Textarea
          id="observacao"
          name="observacao"
          maxLength={OBSERVACAO_MAX}
          rows={3}
          defaultValue={valorInicial('observacao')}
          onChange={(evento) => setTamanhoObservacao(evento.target.value.length)}
          aria-invalid={erros.observacao ? true : undefined}
          aria-describedby={
            erros.observacao ? 'observacao-erro observacao-contador' : 'observacao-contador'
          }
        />
        <ErroCampo id="observacao-erro" erro={erros.observacao} />
      </div>

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
