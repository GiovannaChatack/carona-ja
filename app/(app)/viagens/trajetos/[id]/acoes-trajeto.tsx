'use client'

import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { startTransition, useActionState } from 'react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'

import { arquivarTrajeto, excluirTrajeto, reativarTrajeto } from '../actions'

type Props = { id: string; rotulo: string; arquivado: boolean }

// Arquivar, reativar e excluir; o sucesso redireciona (o AvisoUrl mostra o toast).
export function AcoesTrajeto({ id, rotulo, arquivado }: Props) {
  const [estadoArquivar, arquivar, arquivando] = useActionState(arquivarTrajeto.bind(null, id), {})
  const [estadoReativar, reativar, reativando] = useActionState(reativarTrajeto.bind(null, id), {})
  const [estadoExcluir, excluir, excluindo] = useActionState(excluirTrajeto.bind(null, id), {})
  const pendente = arquivando || reativando || excluindo
  const erro = estadoArquivar.erro ?? estadoReativar.erro ?? estadoExcluir.erro

  return (
    <>
      {arquivado ? (
        <Button variant="outline" disabled={pendente} onClick={() => startTransition(reativar)}>
          <ArchiveRestore data-icon="inline-start" aria-hidden />
          Reativar
        </Button>
      ) : (
        <ConfirmDialog
          titulo="Arquivar trajeto?"
          descricao={`${rotulo} não aparecerá ao registrar novas viagens. As viagens já registradas continuam iguais e você pode reativá-lo depois.`}
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
      <ConfirmDialog
        titulo="Excluir trajeto?"
        descricao={`${rotulo} será excluído definitivamente. Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        onConfirmar={() => startTransition(excluir)}
        gatilho={
          <Button variant="destructive" disabled={pendente}>
            <Trash2 data-icon="inline-start" aria-hidden />
            Excluir
          </Button>
        }
      />
      {erro && (
        <p role="alert" className="w-full text-sm text-destructive">
          {erro}
        </p>
      )}
    </>
  )
}
