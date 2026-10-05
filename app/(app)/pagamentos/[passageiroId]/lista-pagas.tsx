'use client'

import { CalendarDays, Undo2 } from 'lucide-react'
import Link from 'next/link'
import { startTransition, useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ERRO_CONEXAO, tratarFalhaDeConexao } from '@/lib/acoes-cliente'
import { formatCurrency, formatDataCampo, formatDate, paraCampoDataHora } from '@/lib/format'
import type { EstadoPagamento, ParticipacaoDetalhe } from '@/lib/pagamentos/tipos'
import { percurso } from '@/lib/viagens/validacao'

import { alterarDataPagamento, desfazerPagamento } from '../actions'

type Props = {
  passageiroId: string
  pagas: ParticipacaoDetalhe[]
  hoje: string // "AAAA-MM-DD" em São Paulo
  proximaPagina?: number // limite do "Carregar mais"; ausente = não há mais
}

const estadoInicial: EstadoPagamento = {}
const semConexao = (): EstadoPagamento => ({ erro: ERRO_CONEXAO })

// Viagens pagas com "Alterar data" e "Desfazer" (FR-012). As actions ficam neste componente,
// e não em cada item, porque o item pode sair da lista com a revalidação.
export function ListaPagas({ passageiroId, pagas, hoje, proximaPagina }: Props) {
  const [estadoDesfazer, desfazer, desfazendo] = useActionState(
    tratarFalhaDeConexao(
      (estado: EstadoPagamento, participacaoId: string) =>
        desfazerPagamento(participacaoId, passageiroId, estado),
      semConexao,
    ),
    estadoInicial,
  )
  const [estadoAlterar, alterar, alterando] = useActionState(
    tratarFalhaDeConexao(
      (estado: EstadoPagamento, formData: FormData) =>
        alterarDataPagamento(String(formData.get('participacao')), passageiroId, estado, formData),
      semConexao,
    ),
    estadoInicial,
  )
  const [editando, setEditando] = useState<ParticipacaoDetalhe | null>(null)
  const [ultimo, setUltimo] = useState<EstadoPagamento>(estadoInicial)

  // Nova resposta: no sucesso de "Alterar data", fecha o diálogo.
  const [vistos, setVistos] = useState([estadoDesfazer, estadoAlterar])
  if (vistos[0] !== estadoDesfazer || vistos[1] !== estadoAlterar) {
    const deAlterar = vistos[1] !== estadoAlterar
    const novo = deAlterar ? estadoAlterar : estadoDesfazer
    setVistos([estadoDesfazer, estadoAlterar])
    setUltimo(novo)
    if (deAlterar && novo.sucesso) setEditando(null)
  }

  useEffect(() => {
    if (ultimo.sucesso) toast.success(ultimo.sucesso)
  }, [ultimo])

  function aoSalvarData(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formData = new FormData(evento.currentTarget)
    startTransition(() => alterar(formData))
  }

  const erroDialogo = editando && ultimo === estadoAlterar ? estadoAlterar : undefined
  const erroLista = ultimo === estadoDesfazer ? estadoDesfazer.erro : undefined

  if (pagas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {erroLista && (
        <p role="alert" className="text-sm text-destructive">
          {erroLista}
        </p>
      )}
      <ul className="flex flex-col divide-y rounded-lg border">
        {pagas.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">
                  {formatDate(p.realizada_em)} · {p.sentido === 'ida' ? 'Ida' : 'Volta'}
                </span>
                <span className="text-sm break-words text-muted-foreground">
                  {percurso(p, p.sentido)}
                </span>
                <span className="text-sm">Pago em {formatDataCampo(p.pago_em!)}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap">{formatCurrency(p.valor_centavos)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={alterando || desfazendo}
                onClick={() => {
                  setUltimo(estadoInicial)
                  setEditando(p)
                }}
              >
                <CalendarDays data-icon="inline-start" aria-hidden />
                Alterar data
              </Button>
              <ConfirmDialog
                titulo="Desfazer pagamento?"
                descricao={`A viagem de ${formatDate(p.realizada_em)} volta a ficar pendente.`}
                textoConfirmar="Desfazer"
                onConfirmar={() => startTransition(() => desfazer(p.id))}
                gatilho={
                  <Button type="button" variant="ghost" disabled={alterando || desfazendo}>
                    <Undo2 data-icon="inline-start" aria-hidden />
                    Desfazer
                  </Button>
                }
              />
            </div>
          </li>
        ))}
      </ul>
      {proximaPagina && (
        <Button asChild variant="outline" className="h-11 self-center">
          <Link href={`/pagamentos/${passageiroId}?pagas=${proximaPagina}`} scroll={false}>
            Carregar mais
          </Link>
        </Button>
      )}

      <AlertDialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <AlertDialogContent>
          {editando && (
            <form key={editando.id} onSubmit={aoSalvarData} className="grid gap-4" noValidate>
              <AlertDialogHeader>
                <AlertDialogTitle>Alterar data do pagamento</AlertDialogTitle>
                <AlertDialogDescription>
                  {`Viagem de ${formatDate(editando.realizada_em)} (${editando.sentido === 'ida' ? 'Ida' : 'Volta'}).`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <input type="hidden" name="participacao" value={editando.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="nova-data-pagamento">Data do pagamento</Label>
                <Input
                  id="nova-data-pagamento"
                  name="data"
                  type="date"
                  defaultValue={editando.pago_em ?? hoje}
                  min={paraCampoDataHora(editando.realizada_em).slice(0, 10)}
                  max={hoje}
                  className="h-11"
                  aria-invalid={erroDialogo?.erroData ? true : undefined}
                  aria-describedby={erroDialogo?.erroData ? 'nova-data-pagamento-erro' : undefined}
                />
                {erroDialogo?.erroData && (
                  <p id="nova-data-pagamento-erro" className="text-sm text-destructive">
                    {erroDialogo.erroData}
                  </p>
                )}
                {erroDialogo?.erro && (
                  <p role="alert" className="text-sm text-destructive">
                    {erroDialogo.erro}
                  </p>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                <Button type="submit" disabled={alterando}>
                  {alterando ? 'Salvando...' : 'Salvar'}
                </Button>
              </AlertDialogFooter>
            </form>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
