import { Plus, Route } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { AvisoUrl } from '@/components/aviso-url'
import { Button } from '@/components/ui/button'
import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { listarViagens } from '@/lib/viagens/consultas'
import type { SituacaoViagem } from '@/lib/viagens/tipos'

import { ListaViagens } from './lista-viagens'

export const metadata: Metadata = { title: 'Viagens · Caronas Já' }

const POR_PAGINA = 20
const PAGINA_MAX = 50

type Props = {
  searchParams: Promise<{ pagina?: string | string[]; situacao?: string | string[] }>
}

// ?pagina=N: inteiro de 1 a 50; qualquer outro valor vale 1 (research §10).
function lerPagina(parametro: string | string[] | undefined) {
  const pagina = typeof parametro === 'string' && /^\d+$/.test(parametro) ? Number(parametro) : 1
  return pagina >= 1 && pagina <= PAGINA_MAX ? pagina : 1
}

export default async function ViagensPage({ searchParams }: Props) {
  // Defesa em profundidade: o proxy.ts já exige sessão.
  await obterUsuarioLogado()
  const { pagina: parametroPagina, situacao: parametroSituacao } = await searchParams
  const pagina = lerPagina(parametroPagina)
  const situacao: SituacaoViagem = parametroSituacao === 'arquivadas' ? 'arquivadas' : 'ativas'
  const { viagens, temMais } = await listarViagens(situacao, pagina * POR_PAGINA)
  const consulta = new URLSearchParams()
  if (situacao === 'arquivadas') consulta.set('situacao', 'arquivadas')
  if (pagina > 1) consulta.set('pagina', String(pagina))
  const de = consulta.toString()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Viagens</h1>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/viagens/trajetos">
              <Route data-icon="inline-start" aria-hidden />
              Trajetos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/viagens/nova">
              <Plus data-icon="inline-start" aria-hidden />
              Nova viagem
            </Link>
          </Button>
        </div>
      </div>
      <ListaViagens
        situacao={situacao}
        viagens={viagens}
        temMais={temMais && pagina < PAGINA_MAX}
        pagina={pagina}
        de={de}
      />
      <Suspense>
        <AvisoUrl mensagens={{ registrada: 'Viagem registrada' }} />
      </Suspense>
    </div>
  )
}
