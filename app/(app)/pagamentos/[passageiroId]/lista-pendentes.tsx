'use client'

import { CheckCheck } from 'lucide-react'
import { startTransition, useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ERRO_CONEXAO, tratarFalhaDeConexao } from '@/lib/acoes-cliente'
import { formatCurrency, formatDataCampo, formatDate, paraCampoDataHora } from '@/lib/format'
import { totalItens } from '@/lib/pagamentos/mensagem'
import type { EstadoPagamento, ParticipacaoDetalhe } from '@/lib/pagamentos/tipos'
import { percurso } from '@/lib/viagens/validacao'

import { marcarPagamentos, receberTudo } from '../actions'

type Props = {
  passageiroId: string
  pendentes: ParticipacaoDetalhe[]
  hoje: string // "AAAA-MM-DD" em São Paulo, vindo do servidor
}

const estadoInicial: EstadoPagamento = {}
const semConexao = (): EstadoPagamento => ({ erro: ERRO_CONEXAO })

// Dia da viagem em São Paulo: a data do pagamento não pode ser anterior a ele.
function diaDaViagem(p: ParticipacaoDetalhe) {
  return paraCampoDataHora(p.realizada_em).slice(0, 10)
}

function viagens(n: number) {
  return n === 1 ? '1 viagem' : `${n} viagens`
}

// Pendências do passageiro: seleção com data (rodapé fixo) e "Recebi tudo" (FR-007, FR-008).
export function ListaPendentes({ passageiroId, pendentes, hoje }: Props) {
  const [estadoMarcar, marcar, marcando] = useActionState(
    tratarFalhaDeConexao<EstadoPagamento, [FormData]>(
      marcarPagamentos.bind(null, passageiroId),
      semConexao,
    ),
    estadoInicial,
  )
  const [estadoReceber, receber, recebendo] = useActionState(
    tratarFalhaDeConexao<EstadoPagamento, [FormData]>(
      receberTudo.bind(null, passageiroId),
      semConexao,
    ),
    estadoInicial,
  )
  const pendente = marcando || recebendo

  const [marcados, setMarcados] = useState<string[]>([])
  const [data, setData] = useState(hoje)
  // A resposta mais recente das duas actions define as mensagens na tela.
  const [ultimo, setUltimo] = useState<EstadoPagamento>(estadoInicial)

  // Nova resposta: no sucesso, limpa a seleção (a seleção é mantida no erro, FR-028).
  const [vistos, setVistos] = useState([estadoMarcar, estadoReceber])
  if (vistos[0] !== estadoMarcar || vistos[1] !== estadoReceber) {
    const novo = vistos[0] !== estadoMarcar ? estadoMarcar : estadoReceber
    setVistos([estadoMarcar, estadoReceber])
    setUltimo(novo)
    if (novo.sucesso) setMarcados([])
  }

  useEffect(() => {
    if (ultimo.sucesso) toast.success(ultimo.sucesso)
  }, [ultimo])

  // Só os ids que continuam pendentes (a lista muda após a revalidação).
  const selecionadas = pendentes.filter((p) => marcados.includes(p.id))
  const minima = selecionadas.reduce<string | undefined>((maior, p) => {
    const dia = diaDaViagem(p)
    return !maior || dia > maior ? dia : maior
  }, undefined)

  if (pendentes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum valor pendente</p>
  }

  function alternar(id: string, marcado: boolean) {
    setMarcados((atuais) =>
      marcado ? [...atuais.filter((m) => m !== id), id] : atuais.filter((m) => m !== id),
    )
  }

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formData = new FormData(evento.currentTarget)
    startTransition(() => marcar(formData))
  }

  function confirmarTudo() {
    const formData = new FormData()
    formData.set('data', data)
    startTransition(() => receber(formData))
  }

  const todasMarcadas = selecionadas.length === pendentes.length
  const erroData = ultimo.erroData
  // Sem seleção, o campo de data fica oculto: o erro dele aparece junto das ações.
  const erroGeral = ultimo.erro ?? (selecionadas.length === 0 ? erroData : undefined)

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setMarcados(todasMarcadas ? [] : pendentes.map((p) => p.id))}
        >
          {todasMarcadas ? 'Limpar seleção' : 'Selecionar todas'}
        </Button>
        <ConfirmDialog
          titulo="Marcar todas como pagas?"
          descricao={`${viagens(pendentes.length)} · ${formatCurrency(totalItens(pendentes))}. Data do pagamento: ${formatDataCampo(data)}.`}
          textoConfirmar="Marcar como pagas"
          variante="default"
          onConfirmar={confirmarTudo}
          gatilho={
            <Button type="button" disabled={pendente}>
              <CheckCheck data-icon="inline-start" aria-hidden />
              Recebi tudo
            </Button>
          }
        />
      </div>

      <ul className="flex flex-col divide-y rounded-lg border">
        {pendentes.map((p) => (
          <li key={p.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                name="participacao"
                value={p.id}
                checked={marcados.includes(p.id)}
                onChange={(evento) => alternar(p.id, evento.target.checked)}
                className="size-5 shrink-0 accent-primary"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">
                  {formatDate(p.realizada_em)} · {p.sentido === 'ida' ? 'Ida' : 'Volta'}
                </span>
                <span className="text-sm break-words text-muted-foreground">
                  {percurso(p, p.sentido)}
                </span>
              </span>
              <span className="shrink-0 whitespace-nowrap">{formatCurrency(p.valor_centavos)}</span>
            </label>
          </li>
        ))}
      </ul>

      {erroGeral && (
        <p role="alert" className="text-sm text-destructive">
          {erroGeral}
        </p>
      )}

      {selecionadas.length > 0 && (
        // Rodapé fixo; no celular, acima da BottomNav (h-14).
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex flex-col gap-3 border-t bg-background px-4 py-3 sm:flex-row sm:items-end sm:justify-between md:bottom-0">
          <p className="font-medium" aria-live="polite">
            {selecionadas.length === 1 ? '1 selecionada' : `${selecionadas.length} selecionadas`} ·{' '}
            {formatCurrency(totalItens(selecionadas))}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="data-pagamento">Data do pagamento</Label>
              <Input
                id="data-pagamento"
                name="data"
                type="date"
                value={data}
                min={minima}
                max={hoje}
                onChange={(evento) => setData(evento.target.value)}
                className="h-11"
                aria-invalid={erroData ? true : undefined}
                aria-describedby={erroData ? 'data-pagamento-erro' : undefined}
              />
              {erroData && (
                <p id="data-pagamento-erro" className="text-sm text-destructive">
                  {erroData}
                </p>
              )}
            </div>
            <Button type="submit" disabled={pendente}>
              {marcando ? 'Salvando...' : 'Marcar como pagas'}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
