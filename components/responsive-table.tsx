import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type Coluna<T> = {
  chave: string
  titulo: string
  // Sem render, exibe linha[chave] como texto.
  render?: (linha: T) => React.ReactNode
  // Colunas essenciais aparecem também nos cards do celular.
  essencial?: boolean
}

type ResponsiveTableProps<T> = {
  colunas: Coluna<T>[]
  linhas: T[]
  chaveLinha: (linha: T) => string
  vazio: React.ReactNode
}

function valor<T>(coluna: Coluna<T>, linha: T): React.ReactNode {
  if (coluna.render) return coluna.render(linha)
  const bruto = (linha as Record<string, unknown>)[coluna.chave]
  return bruto == null ? '' : String(bruto)
}

// Tabela a partir de 768px; lista de cards com as colunas essenciais abaixo disso (Princípio IV).
export function ResponsiveTable<T>({
  colunas,
  linhas,
  chaveLinha,
  vazio,
}: ResponsiveTableProps<T>) {
  if (linhas.length === 0) return <>{vazio}</>

  const essenciais = colunas.filter((c) => c.essencial)

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map((c) => (
                <TableHead key={c.chave}>{c.titulo}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((linha) => (
              <TableRow key={chaveLinha(linha)}>
                {colunas.map((c) => (
                  <TableCell key={c.chave}>{valor(c, linha)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {linhas.map((linha) => (
          <li key={chaveLinha(linha)}>
            <Card className="relative">
              <CardContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {essenciais.map((c) => (
                    <div key={c.chave} className="contents">
                      <dt className="text-muted-foreground">{c.titulo}</dt>
                      <dd className="min-w-0 text-right break-words">{valor(c, linha)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}
