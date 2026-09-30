import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Usa uma conta de TESTE (nunca a conta do dono).
export const email = process.env.E2E_EMAIL
export const senha = process.env.E2E_SENHA

// Nomes criados por este worker, para a limpeza não apagar os de outro worker em execução.
const nomesCriados = new Set<string>()

// Nomes únicos por execução e por projeto (mobile/desktop rodam em paralelo na mesma conta).
// Servem para passageiros e para a origem dos trajetos de teste.
export function nomeDeTeste(base: string) {
  const nome = `E2E ${base} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  nomesCriados.add(nome)
  return nome
}

// Abre o destino (que leva ao login) e entra com a conta de teste.
export async function entrarComContaDeTeste(page: Page, destino: string) {
  await page.goto(destino)
  await page.getByLabel('E-mail').fill(email!)
  await page.getByLabel('Senha').fill(senha!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => url.pathname === destino)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

// Exclui os dados "E2E …" criados por este worker: primeiro os trajetos (pela origem), depois
// os passageiros. A RLS limita à conta de teste; nunca usa a chave service_role.
export async function limparDadosDeTeste() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey || !email || !senha || nomesCriados.size === 0) return

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (erroLogin) throw erroLogin

  const nomes = [...nomesCriados]
  // Pela origem e também pelo destino (o sentido oposto começa por um ponto sem prefixo).
  for (const coluna of ['origem', 'destino']) {
    const { error: erroTrajetos } = await supabase
      .from('trajetos')
      .delete()
      .ilike(coluna, 'E2E %')
      .in(coluna, nomes)
    if (erroTrajetos) throw erroTrajetos
  }

  const { error } = await supabase
    .from('passageiros')
    .delete()
    .ilike('nome', 'E2E %')
    .in('nome', nomes)
  if (error) throw error
  nomesCriados.clear()
  // 'local': o padrão (global) revogaria as sessões dos outros workers em execução.
  await supabase.auth.signOut({ scope: 'local' })
}

// Nome antigo, mantido por compatibilidade.
export const limparPassageirosDeTeste = limparDadosDeTeste
