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
  // Elemento que abre o diálogo (ex.: um Button).
  gatilho: React.ReactNode
}

// Confirmação de ações destrutivas, com texto explícito no botão (contracts/ui.md).
export function ConfirmDialog({
  titulo,
  descricao,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  onConfirmar,
  gatilho,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{gatilho}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{textoCancelar}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirmar}>
            {textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
