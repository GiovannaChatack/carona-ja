// Layout das telas de acesso (login e recuperação de senha): cartão centralizado.
export default function PublicoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <p className="text-center text-2xl font-semibold">Caronas Já</p>
        {children}
      </div>
    </main>
  )
}
