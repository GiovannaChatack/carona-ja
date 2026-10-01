import { expect, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

// Cliente anon com a sessão da conta de teste, reaproveitado pelo worker. Sob a RLS; nunca usa a
// chave service_role.
let clienteDoWorker: Promise<SupabaseClient> | null = null

function clienteDeTeste(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey || !email || !senha) {
    throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e E2E_*.')
  }
  clienteDoWorker ??= (async () => {
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } })
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
    return supabase
  })()
  return clienteDoWorker
}

// Exclui os dados "E2E …" criados por este worker, nesta ordem: as viagens dos trajetos de teste
// (a cascata remove as participações), os trajetos e os passageiros.
export async function limparDadosDeTeste() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey || !email || !senha || nomesCriados.size === 0) return

  const supabase = await clienteDeTeste()
  const nomes = [...nomesCriados]

  // Pela origem e também pelo destino (o sentido oposto começa por um ponto sem prefixo).
  for (const coluna of ['origem', 'destino']) {
    const { data: trajetos, error: erroBusca } = await supabase
      .from('trajetos')
      .select('id')
      .ilike(coluna, 'E2E %')
      .in(coluna, nomes)
    if (erroBusca) throw erroBusca
    const ids = (trajetos ?? []).map((t) => t.id as string)
    if (ids.length === 0) continue

    const { error: erroViagens } = await supabase.from('viagens').delete().in('trajeto_id', ids)
    if (erroViagens) throw erroViagens
    const { error: erroTrajetos } = await supabase.from('trajetos').delete().in('id', ids)
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
  clienteDoWorker = null
}

export type Cenario = {
  passageiros: { id: string; nome: string; valorCentavos: number }[]
  trajeto: { id: string; origem: string; destino: string }
}

// Cria pela API os passageiros e o trajeto de um cenário, com nomes de teste.
export async function prepararCenario({
  passageiros,
  trajeto,
}: {
  passageiros: { base: string; valorCentavos: number }[]
  trajeto: { origemBase: string; destino: string }
}): Promise<Cenario> {
  const supabase = await clienteDeTeste()

  const criados: Cenario['passageiros'] = []
  for (const { base, valorCentavos } of passageiros) {
    const nome = nomeDeTeste(base)
    const { data, error } = await supabase
      .from('passageiros')
      .insert({ nome, telefone: '11912345678', valor_padrao_centavos: valorCentavos })
      .select('id')
      .single()
    if (error) throw error
    criados.push({ id: data.id as string, nome, valorCentavos })
  }

  const origem = nomeDeTeste(trajeto.origemBase)
  const { data, error } = await supabase
    .from('trajetos')
    .insert({ origem, destino: trajeto.destino })
    .select('id')
    .single()
  if (error) throw error

  return {
    passageiros: criados,
    trajeto: { id: data.id as string, origem, destino: trajeto.destino },
  }
}

// Registra uma viagem pela função SQL, já confirmando a duplicidade. Devolve o id.
export async function registrarViagemPelaApi({
  trajetoId,
  sentido,
  dataHoraLocal,
  participacoes,
}: {
  trajetoId: string
  sentido: 'ida' | 'volta'
  dataHoraLocal: string
  participacoes: { passageiro_id: string; valor_centavos: number }[]
}) {
  const supabase = await clienteDeTeste()
  const { data, error } = await supabase.rpc('registrar_viagem', {
    p_trajeto_id: trajetoId,
    p_sentido: sentido,
    p_data_hora_local: dataHoraLocal,
    p_participacoes: participacoes,
    p_confirmar_duplicada: true,
  })
  if (error) throw error
  return data as string
}

// Atualiza um passageiro de teste pela API (ex.: valor padrão ou arquivamento).
export async function atualizarPassageiroPelaApi(id: string, campos: Record<string, unknown>) {
  const supabase = await clienteDeTeste()
  const { error } = await supabase.from('passageiros').update(campos).eq('id', id)
  if (error) throw error
}

// Nome antigo, mantido por compatibilidade.
export const limparPassageirosDeTeste = limparDadosDeTeste

// Edita uma viagem pela função SQL (slice 003), já confirmando a duplicidade.
export async function editarViagemPelaApi({
  viagemId,
  trajetoId,
  sentido,
  dataHoraLocal,
  participacoes,
}: {
  viagemId: string
  trajetoId: string
  sentido: 'ida' | 'volta'
  dataHoraLocal: string
  participacoes: { passageiro_id: string; valor_centavos: number }[]
}) {
  const supabase = await clienteDeTeste()
  const { error } = await supabase.rpc('editar_viagem', {
    p_viagem_id: viagemId,
    p_trajeto_id: trajetoId,
    p_sentido: sentido,
    p_data_hora_local: dataHoraLocal,
    p_participacoes: participacoes,
    p_confirmar_duplicada: true,
  })
  if (error) throw error
}

// Arquiva uma viagem ou um trajeto de teste pela API.
export async function arquivarPelaApi(tabela: 'viagens' | 'trajetos', id: string) {
  const supabase = await clienteDeTeste()
  const coluna = tabela === 'viagens' ? 'arquivada_em' : 'arquivado_em'
  const { error } = await supabase
    .from(tabela)
    .update({ [coluna]: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
