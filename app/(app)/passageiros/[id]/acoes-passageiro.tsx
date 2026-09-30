'use client'

import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { startTransition, useActionState } from 'react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'

import { arquivarPassageiro, excluirPassageiro, reativarPassageiro } from '../actions'

type Props = { id: string; nome: string; arquivado: boolean }

// Arquivar, reativar e excluir; o sucesso redireciona (o AvisoUrl mostra o toast).
export function AcoesPassageiro({ id, nome, arquivado }: Props) {
  const [estadoArquivar, arquivar, arquivando] = useActionState(
    arquivarPassageiro.bind(null, id),
    {},
  )
  const [estadoReativar, reativar, reativando] = useActionState(
    reativarPassageiro.bind(null, id),
    {},
  )
  const [estadoExcluir, excluir, excluindo] = useActionState(excluirPassageiro.bind(null, id), {})
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
          titulo="Arquivar passageiro?"
          descricao={`${nome} sairá da lista de ativos e da seleção de novas viagens. O histórico continua disponível e você pode reativá-lo depois.`}
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
        titulo="Excluir passageiro?"
        descricao={`${nome} será excluído definitivamente. Esta ação não pode ser desfeita.`}
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
