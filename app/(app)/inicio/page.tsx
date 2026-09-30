import { Car } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { AvisoUrl } from '@/components/aviso-url'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { obterUsuarioLogado } from '@/lib/auth/sessao'

export const metadata: Metadata = { title: 'Início · Caronas Já' }

export default async function InicioPage() {
  const { nomeExibicao } = await obterUsuarioLogado()

  return (
    <>
      <h1 className="text-2xl font-semibold">{`Olá, ${nomeExibicao}`}</h1>
      {/* Só passageiros tem tela; viagens e pagamentos ainda não existem (sem links para eles). */}
      <EmptyState
        icone={Car}
        titulo="Tudo pronto por aqui"
        descricao="Comece cadastrando os seus passageiros. Em breve você também poderá registrar viagens e acompanhar pagamentos."
        acao={
          <Button asChild>
            <Link href="/passageiros">Cadastrar passageiros</Link>
          </Button>
        }
      />
      <Suspense>
        <AvisoUrl parametro="senha" mensagens={{ atualizada: 'Senha atualizada' }} />
      </Suspense>
    </>
  )
}
