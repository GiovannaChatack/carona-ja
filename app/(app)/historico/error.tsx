'use client'

import { ErroConexao } from '@/components/erro-conexao'

// Os filtros estão na URL: "Tentar novamente" os mantém (FR-022).
export default function ErroHistorico(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <ErroConexao {...props} mensagem="Não foi possível carregar o histórico. Tente novamente." />
  )
}
