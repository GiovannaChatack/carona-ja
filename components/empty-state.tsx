import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icone: LucideIcon
  titulo: string
  descricao: string
  acao?: React.ReactNode
}

// Estado vazio padrão de listas e telas sem conteúdo (contracts/ui.md).
export function EmptyState({ icone: Icone, titulo, descricao, acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Icone className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="max-w-sm text-muted-foreground">{descricao}</p>
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}
