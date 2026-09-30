export const DESTINO_PADRAO = '/inicio'

// Evita redirect aberto: só aceita caminhos internos ("/x"), nunca "//host" nem "\".
export function sanitizeNext(valor: FormDataEntryValue | string | null | undefined): string {
  if (typeof valor !== 'string') return DESTINO_PADRAO
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) {
    return DESTINO_PADRAO
  }
  return valor
}
