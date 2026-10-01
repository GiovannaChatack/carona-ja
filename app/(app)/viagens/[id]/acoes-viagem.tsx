'use client'

import { Archive, ArchiveRestore } from 'lucide-react'
import { startTransition, useActionState } from 'react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'

import { arquivarViagem, reativarViagem } from '../actions'

type Props = { id: string; dataFormatada: string; arquivada: boolean }

// Arquivar e reativar; o sucesso redireciona (o AvisoUrl mostra o toast).
export function AcoesViagem({ id, dataFormatada, arquivada }: Props) {
  const [estadoArquivar, arquivar, arquivando] = useActionState(arquivarViagem.bind(null, id), {})
  const [estadoReativar, reativar, reativando] = useActionState(reativarViagem.bind(null, id), {})
  const pendente = arquivando || reativando
  const erro = estadoArquivar.erro ?? estadoReativar.erro

  return (
    <>
      {arquivada ? (
        <Button variant="outline" disabled={pendente} onClick={() => startTransition(reativar)}>
          <ArchiveRestore data-icon="inline-start" aria-hidden />
          Reativar
        </Button>
      ) : (
        <ConfirmDialog
          titulo="Arquivar viagem?"
          descricao={`A viagem de ${dataFormatada} deixará de ser considerada em totais e pendências. Você pode reativá-la depois.`}
          textoConfirmar="Arquivar"
          onConfirmar={() => startTransition(arquivar)}
          gatilho={
            <Button variant="secondary" disabled={pendente}>
              <Archive data-icon="inline-start" aria-hidden />
              Arquivar
            </Button>
          }
        />
      )}
      {erro && (
        <p role="alert" className="w-full text-sm text-destructive">
          {erro}
        </p>
      )}
    </>
  )
}
