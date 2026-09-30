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
      {/* Passageiros, trajetos e viagens têm tela; pagamentos ainda não existem (sem links). */}
      <EmptyState
        icone={Car}
        titulo="Tudo pronto por aqui"
        descricao="Registre cada viagem com os passageiros que foram e quanto cada um pagou. Os passageiros e os trajetos ficam guardados para as próximas."
        acao={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/viagens/nova">Registrar viagem</Link>
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
