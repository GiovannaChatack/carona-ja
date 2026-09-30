// As variáveis NEXT_PUBLIC_* precisam ser lidas de forma explícita (process.env.NOME)
// para que o Next.js consiga incorporá-las ao código do navegador.
function obrigatoria(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não configurada. Veja .env.example.`)
  }
  return valor
}

export const env = {
  get supabaseUrl() {
    return obrigatoria('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  },
  get supabaseAnonKey() {
    return obrigatoria('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  },
  get siteUrl() {
    return obrigatoria('NEXT_PUBLIC_SITE_URL', process.env.NEXT_PUBLIC_SITE_URL)
  },
}
