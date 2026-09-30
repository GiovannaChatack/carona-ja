import { ArrowLeft, Plus, Route } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { AvisoUrl } from '@/components/aviso-url'
import { EmptyState } from '@/components/empty-state'
import { ResponsiveTable, type Coluna } from '@/components/responsive-table'
import { Button } from '@/components/ui/button'
import { obterUsuarioLogado } from '@/lib/auth/sessao'
import { listarTrajetos } from '@/lib/trajetos/consultas'
import type { SituacaoTrajeto, Trajeto } from '@/lib/trajetos/tipos'
import { rotuloTrajeto } from '@/lib/trajetos/validacao'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Trajetos · Caronas Já' }

type Props = { searchParams: Promise<{ situacao?: string | string[] }> }

// `de` é a querystring da lista: os detalhes a usam para o "voltar" reabrir o mesmo filtro.
function montarColunas(de: string): Coluna<Trajeto>[] {
  return [
    {
      chave: 'trajeto',
      titulo: 'Trajeto',
      essencial: true,
      render: (t) => (
        <Link
          href={`/viagens/trajetos/${t.id}${de ? `?de=${encodeURIComponent(de)}` : ''}`}
          className="font-medium break-words underline-offset-4 hover:underline max-md:after:absolute max-md:after:inset-0"
        >
          {rotuloTrajeto(t)}
        </Link>
      ),
    },
  ]
}

// Alternância Ativos/Arquivados.
function AlternanciaSituacao({ situacao }: { situacao: SituacaoTrajeto }) {
  const opcoes: { valor: SituacaoTrajeto; rotulo: string; href: string }[] = [
    { valor: 'ativos', rotulo: 'Ativos', href: '/viagens/trajetos' },
    { valor: 'arquivados', rotulo: 'Arquivados', href: '/viagens/trajetos?situacao=arquivados' },
  ]
  return (
    <nav aria-label="Situação" className="flex w-fit gap-1 rounded-lg bg-muted p-1">
      {opcoes.map(({ valor, rotulo, href }) => {
        const atual = valor === situacao
        return (
          <Link
            key={valor}
            href={href}
            aria-current={atual ? 'page' : undefined}
            className={cn(
              'inline-flex h-11 min-w-24 items-center justify-center rounded-md px-4 text-sm font-medium',
              atual ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {rotulo}
          </Link>
        )
      })}
    </nav>
  )
}

export default async function TrajetosPage({ searchParams }: Props) {
  // Defesa em profundidade: o proxy.ts já exige sessão.
  await obterUsuarioLogado()
  const { situacao: parametro } = await searchParams
  const situacao: SituacaoTrajeto = parametro === 'arquivados' ? 'arquivados' : 'ativos'
  const trajetos = await listarTrajetos(situacao)
  const de = situacao === 'arquivados' ? 'situacao=arquivados' : ''

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/viagens"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Viagens
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Trajetos</h1>
        <Button asChild>
          <Link href="/viagens/trajetos/novo">
            <Plus data-icon="inline-start" aria-hidden />
            Novo trajeto
          </Link>
        </Button>
      </div>
      <AlternanciaSituacao situacao={situacao} />
      {trajetos.length === 0 ? (
        situacao === 'arquivados' ? (
          <EmptyState
            icone={Route}
            titulo="Nenhum trajeto arquivado"
            descricao="Os trajetos que você arquivar aparecem aqui e podem ser reativados."
          />
        ) : (
          <EmptyState
            icone={Route}
            titulo="Nenhum trajeto cadastrado"
            descricao="Cadastre a origem e o destino das caronas que você faz, como Casa → Faculdade."
            acao={
              <Button asChild>
                <Link href="/viagens/trajetos/novo">Novo trajeto</Link>
              </Button>
            }
          />
        )
      ) : (
        <ResponsiveTable
          colunas={montarColunas(de)}
          linhas={trajetos}
          chaveLinha={(t) => t.id}
          vazio={null}
        />
      )}
      <Suspense>
        <AvisoUrl mensagens={{ excluido: 'Trajeto excluído' }} />
      </Suspense>
    </div>
  )
}
