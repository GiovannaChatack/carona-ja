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
      {/* Passageiros e trajetos têm tela; o registro de viagens chega na fatia B e pagamentos
          ainda não existem (sem links para eles). */}
      <EmptyState
        icone={Car}
        titulo="Tudo pronto por aqui"
        descricao="Comece cadastrando os seus passageiros e os trajetos que você faz. Em seguida você poderá registrar viagens."
        acao={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/viagens/trajetos">Cadastrar trajetos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/passageiros">Passageiros</Link>
            </Button>
          </div>
        }
      />
      <Suspense>
        <AvisoUrl parametro="senha" mensagens={{ atualizada: 'Senha atualizada' }} />
      </Suspense>
    </>
  )
}
