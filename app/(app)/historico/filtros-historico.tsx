'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { paraQuery, temFiltroAlemDoPadrao } from '@/lib/historico/filtros'
import type { FiltroHistorico, OpcaoFiltro, TipoPeriodo } from '@/lib/historico/tipos'

const CLASSE_SELECT =
  'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30'

const PERIODOS: { valor: TipoPeriodo; rotulo: string }[] = [
  { valor: 'este-mes', rotulo: 'Este mês' },
  { valor: 'mes-passado', rotulo: 'Mês passado' },
  { valor: '30-dias', rotulo: 'Últimos 30 dias' },
  { valor: 'personalizado', rotulo: 'Personalizado' },
]

type Props = {
  filtro: FiltroHistorico
  opcoes: { passageiros: OpcaoFiltro[]; trajetos: OpcaoFiltro[] }
}

// Filtros aplicados ao mudar; a URL é a fonte da verdade (research §5). A página remonta este
// componente quando o filtro muda, então o estado local só guarda o período ainda não aplicado.
export function FiltrosHistorico({ filtro, opcoes }: Props) {
  const router = useRouter()
  const [periodo, setPeriodo] = useState<TipoPeriodo>(filtro.periodo)
  const [inicio, setInicio] = useState(filtro.inicio ?? '')
  const [fim, setFim] = useState(filtro.fim ?? '')
  const [erroPeriodo, setErroPeriodo] = useState<string>()

  // Qualquer mudança de filtro volta para a primeira página.
  function navegar(mudancas: Partial<FiltroHistorico>) {
    const query = paraQuery({ ...filtro, ...mudancas, pagina: 1 })
    router.replace(query ? `/historico?${query}` : '/historico', { scroll: false })
  }

  function mudarPeriodo(valor: TipoPeriodo) {
    setPeriodo(valor)
    setErroPeriodo(undefined)
    // O personalizado só vale depois de "Aplicar"; até lá, o período anterior continua.
    if (valor !== 'personalizado') navegar({ periodo: valor, inicio: undefined, fim: undefined })
  }

  function aplicarPersonalizado() {
    if (!inicio || !fim) return setErroPeriodo('Informe as duas datas.')
    if (inicio > fim) return setErroPeriodo('A data inicial precisa ser anterior ou igual à final.')
    setErroPeriodo(undefined)
    navegar({ periodo: 'personalizado', inicio, fim })
  }

  return (
    <section aria-label="Filtros" className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filtro-periodo">Período</Label>
          <select
            id="filtro-periodo"
            value={periodo}
            onChange={(evento) => mudarPeriodo(evento.target.value as TipoPeriodo)}
            className={CLASSE_SELECT}
          >
            {PERIODOS.map(({ valor, rotulo }) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="filtro-passageiro">Passageiro</Label>
          <select
            id="filtro-passageiro"
            value={filtro.passageiro ?? ''}
            onChange={(evento) => navegar({ passageiro: evento.target.value || undefined })}
            className={CLASSE_SELECT}
          >
            <option value="">Todos</option>
            {opcoes.passageiros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="filtro-trajeto">Trajeto</Label>
          <select
            id="filtro-trajeto"
            value={filtro.trajeto ?? ''}
            onChange={(evento) => navegar({ trajeto: evento.target.value || undefined })}
            className={CLASSE_SELECT}
          >
            <option value="">Todos</option>
            {opcoes.trajetos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="filtro-sentido">Sentido</Label>
          <select
            id="filtro-sentido"
            value={filtro.sentido ?? ''}
            onChange={(evento) =>
              navegar({ sentido: (evento.target.value || undefined) as FiltroHistorico['sentido'] })
            }
            className={CLASSE_SELECT}
          >
            <option value="">Ida e volta</option>
            <option value="ida">Ida</option>
            <option value="volta">Volta</option>
          </select>
        </div>
      </div>

      {periodo === 'personalizado' && (
        <div className="flex flex-col gap-2">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="filtro-inicio">De</Label>
              <Input
                id="filtro-inicio"
                type="date"
                value={inicio}
                onChange={(evento) => setInicio(evento.target.value)}
                className="h-11"
                aria-invalid={erroPeriodo ? true : undefined}
                aria-describedby={erroPeriodo ? 'filtro-periodo-erro' : undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="filtro-fim">Até</Label>
              <Input
                id="filtro-fim"
                type="date"
                value={fim}
                onChange={(evento) => setFim(evento.target.value)}
                className="h-11"
                aria-invalid={erroPeriodo ? true : undefined}
                aria-describedby={erroPeriodo ? 'filtro-periodo-erro' : undefined}
              />
            </div>
            <Button type="button" onClick={aplicarPersonalizado} className="h-11">
              Aplicar
            </Button>
          </div>
          {erroPeriodo && (
            <p id="filtro-periodo-erro" role="alert" className="text-sm text-destructive">
              {erroPeriodo}
            </p>
          )}
        </div>
      )}

      {temFiltroAlemDoPadrao(filtro) && (
        <Link
          href="/historico"
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium underline-offset-4 hover:underline"
        >
          Limpar filtros
        </Link>
      )}
    </section>
  )
}
