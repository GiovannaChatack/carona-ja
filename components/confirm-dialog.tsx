'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type ConfirmDialogProps = {
  titulo: string
  descricao: string
  textoConfirmar?: string
  textoCancelar?: string
  onConfirmar: () => void
  // Elemento que abre o diálogo (ex.: um Button). Sem gatilho, use `aberto`/`onAbertoChange`.
  gatilho?: React.ReactNode
  // Controle externo (ex.: diálogo aberto pela resposta de uma action).
  aberto?: boolean
  onAbertoChange?: (aberto: boolean) => void
  variante?: 'destructive' | 'default'
}

// Confirmação de ações destrutivas, com texto explícito no botão (contracts/ui.md).
export function ConfirmDialog({
  titulo,
  descricao,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  onConfirmar,
  gatilho,
  aberto,
  onAbertoChange,
  variante = 'destructive',
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={aberto} onOpenChange={onAbertoChange}>
      {gatilho && <AlertDialogTrigger asChild>{gatilho}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{textoCancelar}</AlertDialogCancel>
          <AlertDialogAction variant={variante} onClick={onConfirmar}>
            {textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
