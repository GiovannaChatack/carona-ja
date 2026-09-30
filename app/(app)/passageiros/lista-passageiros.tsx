'use client'

import { Search, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { ResponsiveTable, type Coluna } from '@/components/responsive-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatPhone } from '@/lib/format'
import type { Passageiro } from '@/lib/passageiros/tipos'
import { normalizarParaBusca } from '@/lib/passageiros/validacao'

const colunas: Coluna<Passageiro>[] = [
  { chave: 'nome', titulo: 'Nome', essencial: true, render: (p) => p.nome },
  {
    chave: 'telefone',
    titulo: 'Telefone',
    essencial: true,
    render: (p) => (
      <a href={`tel:+55${p.telefone}`} className="underline-offset-4 hover:underline">
        {formatPhone(p.telefone)}
      </a>
    ),
  },
  {
    chave: 'valor',
    titulo: 'Valor padrão',
    essencial: true,
    render: (p) => formatCurrency(p.valor_padrao_centavos),
  },
]

// Lista com busca instantânea no cliente; o texto é espelhado em ?busca= (research §6).
// Renderizar dentro de <Suspense> por usar useSearchParams.
export function ListaPassageiros({ passageiros }: { passageiros: Passageiro[] }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [busca, setBusca] = useState(() => searchParams.get('busca') ?? '')

  function alterarBusca(texto: string) {
    setBusca(texto)
    const params = new URLSearchParams(searchParams.toString())
    if (texto) params.set('busca', texto)
    else params.delete('busca')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  if (passageiros.length === 0) {
    return (
      <EmptyState
        icone={Users}
        titulo="Nenhum passageiro cadastrado"
        descricao="Cadastre as pessoas que pegam carona com você para registrar viagens e cobranças."
        acao={
          <Button asChild>
            <Link href="/passageiros/novo">Novo passageiro</Link>
          </Button>
        }
      />
    )
  }

  const termo = normalizarParaBusca(busca)
  const filtrados = termo
    ? passageiros.filter((p) => normalizarParaBusca(p.nome).includes(termo))
    : passageiros

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full md:max-w-sm">
        <Label htmlFor="busca" className="sr-only">
          Buscar por nome
        </Label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="busca"
          type="search"
          placeholder="Buscar por nome"
          autoComplete="off"
          value={busca}
          onChange={(evento) => alterarBusca(evento.target.value)}
          className="h-11 pl-9"
        />
      </div>
      <ResponsiveTable
        colunas={colunas}
        linhas={filtrados}
        chaveLinha={(p) => p.id}
        vazio={
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <p className="text-muted-foreground">Nenhum passageiro encontrado</p>
            <Button variant="outline" onClick={() => alterarBusca('')}>
              Limpar busca
            </Button>
          </div>
        }
      />
    </div>
  )
}
