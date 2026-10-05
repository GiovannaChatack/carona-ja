'use client'

import { Check } from 'lucide-react'
import { startTransition, useActionState, useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ERRO_CONEXAO, tratarFalhaDeConexao } from '@/lib/acoes-cliente'
import type { EstadoPagamento } from '@/lib/pagamentos/tipos'

import { marcarPagamentoNaViagem } from '../../pagamentos/actions'

type Props = {
  viagemId: string
  participacaoId: string
  nome: string
  hoje: string // "AAAA-MM-DD" em São Paulo
  diaViagem: string // "AAAA-MM-DD" da viagem em São Paulo
}

const estadoInicial: EstadoPagamento = {}

// Marca o pagamento de um passageiro a partir dos detalhes da viagem (FR-014).
export function MarcarPagamento({ viagemId, participacaoId, nome, hoje, diaViagem }: Props) {
  const [aberto, setAberto] = useState(false)
  const [estado, enviar, pendente] = useActionState(
    tratarFalhaDeConexao<EstadoPagamento, [FormData]>(
      async (anterior, formData) => {
        const resultado = await marcarPagamentoNaViagem(
          viagemId,
          participacaoId,
          anterior,
          formData,
        )
        // O toast sai aqui: no sucesso, este componente some da tela com a revalidação.
        if (resultado.sucesso) {
          toast.success(resultado.sucesso)
          setAberto(false)
        }
        return resultado
      },
      () => ({ erro: ERRO_CONEXAO }),
    ),
    estadoInicial,
  )

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formData = new FormData(evento.currentTarget)
    startTransition(() => enviar(formData))
  }

  const idCampo = `data-pagamento-${participacaoId}`

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline">
          <Check data-icon="inline-start" aria-hidden />
          Marcar como pago
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={aoEnviar} className="grid gap-4" noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Marcar pagamento de ${nome}`}</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o dia em que o pagamento foi recebido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={idCampo}>Data do pagamento</Label>
            <Input
              id={idCampo}
              name="data"
              type="date"
              defaultValue={hoje}
              min={diaViagem}
              max={hoje}
              className="h-11"
              aria-invalid={estado.erroData ? true : undefined}
              aria-describedby={estado.erroData ? `${idCampo}-erro` : undefined}
            />
            {estado.erroData && (
              <p id={`${idCampo}-erro`} className="text-sm text-destructive">
                {estado.erroData}
              </p>
            )}
            {estado.erro && (
              <p role="alert" className="text-sm text-destructive">
                {estado.erro}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <Button type="submit" disabled={pendente}>
              {pendente ? 'Salvando...' : 'Confirmar'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
