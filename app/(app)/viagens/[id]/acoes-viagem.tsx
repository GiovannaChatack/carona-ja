'use client'

import { Archive, ArchiveRestore } from 'lucide-react'
import { startTransition, useActionState } from 'react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ERRO_CONEXAO, tratarFalhaDeConexao } from '@/lib/acoes-cliente'

import { arquivarViagem, reativarViagem } from '../actions'

type Props = { id: string; dataFormatada: string; arquivada: boolean; pagas: number }

const semConexao = () => ({ erro: ERRO_CONEXAO })

// Arquivar e reativar; o sucesso redireciona (o AvisoUrl mostra o toast).
export function AcoesViagem({ id, dataFormatada, arquivada, pagas }: Props) {
  const [estadoArquivar, arquivar, arquivando] = useActionState(
    tratarFalhaDeConexao(arquivarViagem.bind(null, id), semConexao),
    {},
  )
  const [estadoReativar, reativar, reativando] = useActionState(
    tratarFalhaDeConexao(reativarViagem.bind(null, id), semConexao),
    {},
  )
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
        // Com participações pagas, a confirmação deixa a consequência explícita (FR-024).
        <ConfirmDialog
          titulo={pagas > 0 ? 'Arquivar viagem com pagamentos?' : 'Arquivar viagem?'}
          descricao={
            pagas > 0
              ? `${pagas} ${pagas === 1 ? 'passageiro já pagou' : 'passageiros já pagaram'} esta viagem. Esses valores deixarão de ser contados. Os pagamentos ficam guardados e voltam se você reativar a viagem.`
              : `A viagem de ${dataFormatada} deixará de ser considerada em totais e pendências. Você pode reativá-la depois.`
          }
          textoConfirmar={pagas > 0 ? 'Arquivar mesmo assim' : 'Arquivar'}
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
