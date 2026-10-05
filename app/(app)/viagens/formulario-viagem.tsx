'use client'

import Link from 'next/link'
import { startTransition, useActionState, useRef, useState } from 'react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ERRO_CONEXAO, tratarFalhaDeConexao } from '@/lib/acoes-cliente'
import { formatCurrency, formatDataCampo } from '@/lib/format'
import type { Trajeto } from '@/lib/trajetos/tipos'
import { rotuloTrajeto } from '@/lib/trajetos/validacao'
import { centavosParaCampo, parseValorEmCentavos } from '@/lib/validacao'
import type { EstadoFormularioViagem, PassageiroOpcao, Sentido } from '@/lib/viagens/tipos'
import { percurso, somarCentavos } from '@/lib/viagens/validacao'
import { cn } from '@/lib/utils'

type Inicial = {
  trajeto?: string
  sentido?: string
  data_hora: string
  participacoes?: Record<string, string> // passageiro_id → valor em reais
}

type FormularioViagemProps = {
  acao: (estado: EstadoFormularioViagem, formData: FormData) => Promise<EstadoFormularioViagem>
  trajetos: Trajeto[]
  passageiros: PassageiroOpcao[]
  inicial: Inicial
  maxDataHora: string
  textoEnviar: string
  textoDuplicada?: string
  hrefCancelar: string
  // Só na edição: passageiro_id → pago_em. Participações pagas ficam travadas (FR-025).
  pagos?: Record<string, string>
}

const estadoInicial: EstadoFormularioViagem = {}

const SENTIDOS: { valor: Sentido; rotulo: string }[] = [
  { valor: 'ida', rotulo: 'Ida' },
  { valor: 'volta', rotulo: 'Volta' },
]

const CLASSE_SELECT =
  'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30'

function Erro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {texto}
    </p>
  )
}

// Formulário de viagem com total em tempo real (contracts/rotas.md, research §11).
// Estado controlado: o envio é feito pelo onSubmit (sem o reset automático do React 19), para
// o que foi preenchido nunca se perder após um erro ou ao cancelar o aviso de duplicidade.
export function FormularioViagem({
  acao,
  trajetos,
  passageiros,
  inicial,
  maxDataHora,
  textoEnviar,
  textoDuplicada = 'Registrar',
  hrefCancelar,
  pagos = {},
}: FormularioViagemProps) {
  // O formulário é controlado: na falha de conexão, o que foi preenchido continua na tela.
  const [estado, enviar, pendente] = useActionState(
    tratarFalhaDeConexao(acao, () => ({ erro: ERRO_CONEXAO })),
    estadoInicial,
  )
  const confirmarRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [trajeto, setTrajeto] = useState(inicial.trajeto ?? '')
  const [sentido, setSentido] = useState(inicial.sentido ?? '')
  const [dataHora, setDataHora] = useState(inicial.data_hora)
  const [marcados, setMarcados] = useState<string[]>(() => Object.keys(inicial.participacoes ?? {}))
  const [valores, setValores] = useState<Record<string, string>>(() => inicial.participacoes ?? {})
  const [duplicadaAberta, setDuplicadaAberta] = useState(false)

  // Nova resposta da action: repõe o que foi enviado e abre o aviso de duplicidade, se houver.
  const [estadoVisto, setEstadoVisto] = useState(estado)
  if (estado !== estadoVisto) {
    setEstadoVisto(estado)
    const v = estado.valores
    if (v) {
      setTrajeto(v.trajeto ?? '')
      setSentido(v.sentido ?? '')
      setDataHora(v.data_hora ?? '')
      setMarcados(v.passageiros ?? [])
      setValores((atuais) => ({ ...atuais, ...v.valoresPorPassageiro }))
    }
    setDuplicadaAberta(Boolean(estado.duplicada))
  }

  const erros = estado.errosCampo ?? {}
  const errosValor = estado.errosValor ?? {}

  const trajetoEscolhido = trajetos.find((t) => t.id === trajeto)
  const sentidoEscolhido = SENTIDOS.find((s) => s.valor === sentido)?.valor

  // Mesma conversão do servidor; valor inválido conta como R$ 0,00.
  const total = somarCentavos(
    marcados.map((id) => {
      const valor = parseValorEmCentavos(valores[id] ?? '')
      return valor.ok ? valor.valor : 0
    }),
  )

  function alternarPassageiro(p: PassageiroOpcao, marcado: boolean) {
    if (!marcado) {
      setMarcados((atuais) => atuais.filter((id) => id !== p.id))
      return
    }
    setMarcados((atuais) => (atuais.includes(p.id) ? atuais : [...atuais, p.id]))
    // O valor padrão só entra na primeira marcação; depois, fica o que foi digitado.
    setValores((atuais) =>
      p.id in atuais ? atuais : { ...atuais, [p.id]: centavosParaCampo(p.valor_padrao_centavos) },
    )
  }

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formData = new FormData(evento.currentTarget)
    // A confirmação vale só para este envio.
    if (confirmarRef.current) confirmarRef.current.value = ''
    startTransition(() => enviar(formData))
  }

  function confirmarDuplicada() {
    if (confirmarRef.current) confirmarRef.current.value = '1'
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} onSubmit={aoEnviar} className="flex flex-col gap-6" noValidate>
      <input ref={confirmarRef} type="hidden" name="confirmar_duplicada" defaultValue="" />

      <div className="flex flex-col gap-2">
        <Label htmlFor="trajeto">Trajeto</Label>
        <select
          id="trajeto"
          name="trajeto"
          value={trajeto}
          onChange={(evento) => setTrajeto(evento.target.value)}
          className={CLASSE_SELECT}
          aria-invalid={erros.trajeto ? true : undefined}
          aria-describedby={erros.trajeto ? 'trajeto-erro' : undefined}
        >
          <option value="">Escolha o trajeto</option>
          {trajetos.map((t) => (
            <option key={t.id} value={t.id}>
              {rotuloTrajeto(t)}
              {t.arquivado_em ? ' (arquivado)' : ''}
            </option>
          ))}
        </select>
        <Erro id="trajeto-erro" texto={erros.trajeto} />
      </div>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={erros.sentido ? 'sentido-erro' : undefined}
      >
        <legend className="mb-2 text-sm leading-none font-medium">Sentido</legend>
        <div role="radiogroup" aria-label="Sentido" className="grid grid-cols-2 gap-3">
          {SENTIDOS.map(({ valor, rotulo }) => (
            <label
              key={valor}
              className={cn(
                'relative flex h-12 cursor-pointer items-center justify-center rounded-lg border text-base font-medium transition-colors',
                'has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground',
                'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                erros.sentido && 'border-destructive',
              )}
            >
              {/* O rádio nativo cobre o botão inteiro, invisível: clique e teclado funcionam. */}
              <input
                type="radio"
                name="sentido"
                value={valor}
                checked={sentido === valor}
                onChange={() => setSentido(valor)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {rotulo}
            </label>
          ))}
        </div>
        {trajetoEscolhido && sentidoEscolhido && (
          <p className="text-sm text-muted-foreground">
            Percurso: {percurso(trajetoEscolhido, sentidoEscolhido)}
          </p>
        )}
        <Erro id="sentido-erro" texto={erros.sentido} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="data_hora">Data e hora</Label>
        <Input
          id="data_hora"
          name="data_hora"
          type="datetime-local"
          max={maxDataHora}
          value={dataHora}
          onChange={(evento) => setDataHora(evento.target.value)}
          className="h-11"
          aria-invalid={erros.data_hora ? true : undefined}
          aria-describedby={erros.data_hora ? 'data_hora-erro' : undefined}
        />
        <Erro id="data_hora-erro" texto={erros.data_hora} />
      </div>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={erros.passageiros ? 'passageiros-erro' : undefined}
      >
        <legend className="mb-2 text-sm leading-none font-medium">Passageiros</legend>
        <ul className="flex flex-col divide-y rounded-lg border">
          {passageiros.map((p) => {
            const pagoEm = pagos[p.id]
            const marcado = Boolean(pagoEm) || marcados.includes(p.id)
            const erroValor = marcado ? errosValor[p.id] : undefined
            return (
              <li key={p.id} className="flex flex-col gap-2 px-3 py-2">
                <div className="flex min-h-11 items-center gap-3">
                  <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 has-disabled:cursor-default">
                    <input
                      type="checkbox"
                      name={pagoEm ? undefined : 'passageiros'}
                      value={p.id}
                      checked={marcado}
                      disabled={Boolean(pagoEm)}
                      onChange={(evento) => alternarPassageiro(p, evento.target.checked)}
                      className="size-5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 break-words">{p.nome}</span>
                    {p.arquivado_em && <Badge variant="secondary">Arquivado</Badge>}
                    {pagoEm && <Badge variant="outline">Pago em {formatDataCampo(pagoEm)}</Badge>}
                  </label>
                  {/* Campos desabilitados não são enviados: os ocultos mantêm a participação paga. */}
                  {pagoEm && (
                    <>
                      <input type="hidden" name="passageiros" value={p.id} />
                      <input type="hidden" name={`valor_${p.id}`} value={valores[p.id] ?? ''} />
                    </>
                  )}
                  {marcado && (
                    <div className="relative w-28 shrink-0">
                      <Label htmlFor={`valor_${p.id}`} className="sr-only">
                        {`Valor de ${p.nome}`}
                      </Label>
                      <span
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground"
                      >
                        R$
                      </span>
                      <Input
                        id={`valor_${p.id}`}
                        name={pagoEm ? undefined : `valor_${p.id}`}
                        disabled={Boolean(pagoEm)}
                        inputMode="decimal"
                        autoComplete="off"
                        value={valores[p.id] ?? ''}
                        onChange={(evento) =>
                          setValores((atuais) => ({ ...atuais, [p.id]: evento.target.value }))
                        }
                        className="h-11 pl-9 text-right"
                        aria-invalid={erroValor ? true : undefined}
                        aria-describedby={erroValor ? `valor_${p.id}-erro` : undefined}
                      />
                    </div>
                  )}
                </div>
                <Erro id={`valor_${p.id}-erro`} texto={erroValor} />
              </li>
            )
          })}
        </ul>
        <Erro id="passageiros-erro" texto={erros.passageiros} />
      </fieldset>

      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}

      {/* Barra do total: fixa no rodapé; no celular, acima da BottomNav (h-14). */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex flex-col gap-3 border-t bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:bottom-0">
        <p className="font-medium" aria-live="polite">
          Total: {formatCurrency(total)} · {marcados.length}{' '}
          {marcados.length === 1 ? 'passageiro' : 'passageiros'}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Button asChild variant="outline" className="h-11">
            <Link href={hrefCancelar}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={pendente} className="h-11">
            {pendente ? 'Salvando...' : textoEnviar}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        titulo="Registrar mesmo assim?"
        descricao={estado.duplicada ?? ''}
        textoConfirmar={textoDuplicada}
        onConfirmar={confirmarDuplicada}
        aberto={duplicadaAberta}
        onAbertoChange={setDuplicadaAberta}
        variante="default"
      />
    </form>
  )
}
