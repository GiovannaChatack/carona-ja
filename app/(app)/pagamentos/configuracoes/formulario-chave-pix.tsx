'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ERRO_CONEXAO, tratarFalhaDeConexao } from '@/lib/acoes-cliente'
import type { EstadoChavePix } from '@/lib/pagamentos/tipos'
import { CHAVE_PIX_MAX } from '@/lib/pagamentos/validacao'

import { salvarChavePix } from './actions'

type Props = {
  chaveAtual: string | null
  voltar: string | null // caminho seguro de retorno (já conferido no servidor)
}

const estadoInicial: EstadoChavePix = {}

// Formulário da chave PIX (contracts/rotas.md → /pagamentos/configuracoes).
export function FormularioChavePix({ chaveAtual, voltar }: Props) {
  const [estado, enviar, pendente] = useActionState(
    tratarFalhaDeConexao<EstadoChavePix, [FormData]>(salvarChavePix, (formData) => ({
      erro: ERRO_CONEXAO,
      valor: String(formData.get('chave_pix') ?? ''),
    })),
    estadoInicial,
  )
  const erro = estado.erroCampo

  return (
    <form action={enviar} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="voltar" value={voltar ?? ''} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="chave_pix">Chave PIX</Label>
        {/* O React 19 reseta o formulário após a action: o defaultValue repõe o que foi digitado. */}
        <Input
          id="chave_pix"
          name="chave_pix"
          maxLength={CHAVE_PIX_MAX}
          autoComplete="off"
          defaultValue={estado.valor ?? chaveAtual ?? ''}
          className="h-11"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? 'chave_pix-dica chave_pix-erro' : 'chave_pix-dica'}
        />
        <p id="chave_pix-dica" className="text-sm text-muted-foreground">
          CPF, CNPJ, telefone, e-mail ou chave aleatória, como aparecerá na mensagem.
        </p>
        {erro && (
          <p id="chave_pix-erro" className="text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>

      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}

      <Button type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  )
}
