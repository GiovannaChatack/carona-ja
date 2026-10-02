'use client'

import { Copy, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/format'
import { linkWhatsApp, montarMensagemCobranca, totalItens } from '@/lib/pagamentos/mensagem'
import type { ItemCobranca } from '@/lib/pagamentos/tipos'
import { cn } from '@/lib/utils'

type Props = {
  nome: string
  telefone: string
  chavePix: string
  itens: (ItemCobranca & { id: string })[]
}

// Seleção das viagens, prévia da mensagem e envio pelo WhatsApp ou cópia (FR-016–FR-019).
// Tudo é calculado no navegador, sem ida ao servidor; nada é gravado (FR-020).
export function Cobranca({ nome, telefone, chavePix, itens }: Props) {
  const [marcados, setMarcados] = useState<string[]>(() => itens.map((i) => i.id))

  const selecionados = itens.filter((i) => marcados.includes(i.id))
  const vazio = selecionados.length === 0
  const texto = vazio ? '' : montarMensagemCobranca({ nome, chavePix, itens: selecionados })

  function alternar(id: string, marcado: boolean) {
    setMarcados((atuais) =>
      marcado ? [...atuais.filter((m) => m !== id), id] : atuais.filter((m) => m !== id),
    )
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      toast.success('Mensagem copiada')
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto da prévia e copie.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="viagens-titulo" className="flex flex-col gap-3">
        <h2 id="viagens-titulo" className="text-lg font-semibold">
          Viagens
        </h2>
        <ul className="flex flex-col divide-y rounded-lg border">
          {itens.map((item) => (
            <li key={item.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  checked={marcados.includes(item.id)}
                  onChange={(evento) => alternar(item.id, evento.target.checked)}
                  className="size-5 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1">
                  {formatDate(item.realizada_em)} · {item.sentido === 'ida' ? 'Ida' : 'Volta'}
                </span>
                <span className="shrink-0 whitespace-nowrap">
                  {formatCurrency(item.valor_centavos)}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="text-lg font-semibold" aria-live="polite">
          Total: {formatCurrency(totalItens(selecionados))}
        </p>
      </section>

      <section aria-labelledby="previa-titulo" className="flex flex-col gap-3">
        <h2 id="previa-titulo" className="text-lg font-semibold">
          Mensagem
        </h2>
        {vazio ? (
          <p role="alert" className="text-sm text-destructive">
            Selecione ao menos uma viagem.
          </p>
        ) : (
          <Card>
            <CardContent>
              <p
                aria-label="Prévia da mensagem"
                className="text-sm break-words whitespace-pre-wrap select-text"
              >
                {texto}
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Um <a> (e não window.open após um await) evita o bloqueio de pop-up no celular. */}
        <a
          href={vazio ? undefined : linkWhatsApp(telefone, texto)}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={vazio ? true : undefined}
          className={cn(
            buttonVariants({ size: 'lg' }),
            vazio && 'pointer-events-none opacity-50',
          )}
        >
          <MessageCircle data-icon="inline-start" aria-hidden />
          Abrir no WhatsApp
        </a>
        <Button type="button" variant="outline" size="lg" disabled={vazio} onClick={copiar}>
          <Copy data-icon="inline-start" aria-hidden />
          Copiar mensagem
        </Button>
      </div>
    </div>
  )
}
