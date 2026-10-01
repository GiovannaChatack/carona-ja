import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

import { hojeEmSaoPaulo } from '../../lib/format'
import {
  arquivarPelaApi,
  atualizarPassageiroPelaApi,
  editarViagemPelaApi,
  email,
  entrarComContaDeTeste,
  limparDadosDeTeste,
  prepararCenario,
  registrarViagemPelaApi,
  senha,
} from './helpers/passageiros'

// Regras contra condições de corrida (tasks.md): o slice 005, os outros arquivos e o outro
// projeto do Playwright usam a mesma conta. Toda asserção sobre linhas ou resumo é feita com o
// trajeto ou o passageiro criados pelo próprio teste.

// Dia 1 do mês atual e do mês passado, no calendário de São Paulo: nunca cruzam a virada de mês
// durante a execução (dia 1 às 00:05 é, no pior caso, minutos no futuro, o que a viagem aceita).
const hoje = hojeEmSaoPaulo()
const diaUmDoMes = `${hoje.slice(0, 8)}01`
const diaUmDoMesPassado = (() => {
  const [ano, mes] = hoje.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 2, 1)).toISOString().slice(0, 10)
})()

// "AAAA-MM-DD" → "DD/MM/AAAA"
function dataBR(data: string) {
  return data.split('-').reverse().join('/')
}

// Linhas da tabela (desktop) ou cartões (celular) visíveis.
function itensDaLista(page: Page) {
  return page.locator('tbody tr, main ul > li').filter({ visible: true })
}

function resumo(page: Page) {
  return page.getByRole('region', { name: 'Resumo' })
}

async function semRolagemHorizontal(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
}

// Soma, em centavos, os valores "R$ x" de cada item (sem filtro de passageiro, só o total).
async function somaDosItens(page: Page) {
  const textos = await itensDaLista(page).allInnerTexts()
  return textos
    .flatMap((t) => [...t.matchAll(/R\$\s*([\d.]+),(\d{2})/g)])
    .reduce(
      (soma, [, reais, centavos]) =>
        soma + Number(reais.replace(/\./g, '')) * 100 + Number(centavos),
      0,
    )
}

// Escolhe uma opção de filtro e espera a URL mudar.
async function filtrar(page: Page, rotulo: string, opcao: { label?: string; value?: string }) {
  const antes = page.url()
  await page.getByLabel(rotulo, { exact: true }).selectOption(opcao)
  await expect.poll(() => page.url()).not.toBe(antes)
}

function umPassageiro(base: string, valorCentavos: number, trajetoBase = 'Casa') {
  return prepararCenario({
    passageiros: [{ base, valorCentavos }],
    trajeto: { origemBase: trajetoBase, destino: 'Faculdade' },
  })
}

test('sem sessão, /historico leva ao login com o caminho de retorno', async ({ page }) => {
  await page.goto('/historico')

  await expect(page).toHaveURL(/\/entrar\?proximo=%2Fhistorico$/)
})

test('sem sessão, as funções do histórico não devolvem dados (FR-020)', async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  test.skip(!url || !anonKey, 'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  const anonimo = createClient(url!, anonKey!, { auth: { persistSession: false } })
  const filtros = { p_inicio: '2000-01-01', p_fim: '2100-12-31' }

  const linhas = await anonimo.rpc('historico_viagens', filtros)
  expect(linhas.error).not.toBeNull()
  expect(linhas.data).toBeNull()

  const totais = await anonimo.rpc('historico_resumo', filtros)
  expect(totais.error).not.toBeNull()
  expect(totais.data).toBeNull()
})

test.describe('histórico', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.afterAll(limparDadosDeTeste)

  test.describe('US1 – período, resumo e tabela', () => {
    test('este mês e mês passado, sem as arquivadas', async ({ page }) => {
      const c = await umPassageiro('Ana', 1200)
      const [ana] = c.passageiros
      const registrar = (dataHoraLocal: string, valor: number) =>
        registrarViagemPelaApi({
          trajetoId: c.trajeto.id,
          sentido: 'ida',
          dataHoraLocal,
          participacoes: [{ passageiro_id: ana.id, valor_centavos: valor }],
        })
      await registrar(`${diaUmDoMes}T00:05`, 1200)
      await registrar(`${diaUmDoMes}T12:00`, 1500)
      await registrar(`${diaUmDoMesPassado}T08:00`, 900)
      await arquivarPelaApi('viagens', await registrar(`${diaUmDoMes}T09:00`, 3000))

      await entrarComContaDeTeste(page, '/historico')
      await page.goto(`/historico?trajeto=${c.trajeto.id}`)

      const itens = itensDaLista(page)
      await expect(itens).toHaveCount(2)
      await expect(itens.nth(0)).toContainText(`${dataBR(diaUmDoMes)} 12:00`)
      await expect(itens.nth(1)).toContainText(`${dataBR(diaUmDoMes)} 00:05`)
      await expect(resumo(page)).toContainText('2 viagens')
      await expect(resumo(page)).toContainText(/Total cobrado: R\$\s27,00/)

      await filtrar(page, 'Período', { label: 'Mês passado' })
      await expect(page).toHaveURL(/periodo=mes-passado/)
      await expect(itens).toHaveCount(1)
      await expect(itens.nth(0)).toContainText(`${dataBR(diaUmDoMesPassado)} 08:00`)
      await expect(resumo(page)).toContainText('1 viagem')
      await expect(resumo(page)).toContainText(/R\$\s9,00/)
    })

    test('cada viagem mostra data, percurso, sentido, nomes e total, sem rolagem horizontal', async ({
      page,
    }) => {
      const c = await prepararCenario({
        passageiros: [
          { base: 'Ana', valorCentavos: 1200 },
          { base: 'Bruno', valorCentavos: 1000 },
        ],
        trajeto: { origemBase: 'Casa', destino: 'Faculdade' },
      })
      const [ana, bruno] = c.passageiros
      await registrarViagemPelaApi({
        trajetoId: c.trajeto.id,
        sentido: 'volta',
        dataHoraLocal: `${diaUmDoMes}T18:30`,
        participacoes: [
          { passageiro_id: ana.id, valor_centavos: 1200 },
          { passageiro_id: bruno.id, valor_centavos: 1000 },
        ],
      })

      await entrarComContaDeTeste(page, '/historico')
      await page.goto(`/historico?trajeto=${c.trajeto.id}`)

      const item = itensDaLista(page)
      await expect(item).toHaveCount(1)
      await expect(item).toContainText(`${dataBR(diaUmDoMes)} 18:30`)
      await expect(item).toContainText(`Faculdade → ${c.trajeto.origem}`)
      await expect(item).toContainText('Volta')
      await expect(item).toContainText(`${ana.nome}, ${bruno.nome}`)
      await expect(item).toContainText(/R\$\s22,00/)
      expect(await semRolagemHorizontal(page), 'rolagem horizontal em /historico').toBe(true)
    })

    test('viagem às 23:30 do último dia do mês fica nesse mês (SC-005)', async ({ page }) => {
      const c = await umPassageiro('Ana', 1200)
      await registrarViagemPelaApi({
        trajetoId: c.trajeto.id,
        sentido: 'ida',
        dataHoraLocal: '2021-03-31T23:30',
        participacoes: [{ passageiro_id: c.passageiros[0].id, valor_centavos: 1200 }],
      })

      await entrarComContaDeTeste(page, '/historico')
      await page.goto(`/historico?trajeto=${c.trajeto.id}`)
      await page.getByLabel('Período', { exact: true }).selectOption({ label: 'Personalizado' })
      await page.getByLabel('De', { exact: true }).fill('2021-03-31')
      await page.getByLabel('Até', { exact: true }).fill('2021-03-31')
      await page.getByRole('button', { name: 'Aplicar' }).click()

      await expect(page).toHaveURL(/periodo=personalizado&inicio=2021-03-31&fim=2021-03-31/)
      await expect(itensDaLista(page)).toHaveCount(1)
      await expect(itensDaLista(page)).toContainText('31/03/2021 23:30')
      await expect(resumo(page)).toContainText('31/03/2021')

      await page.goto(
        `/historico?periodo=personalizado&inicio=2021-04-01&fim=2021-04-30&trajeto=${c.trajeto.id}`,
      )
      await expect(page.getByRole('heading', { name: 'Nenhuma viagem no período' })).toBeVisible()
      await expect(itensDaLista(page)).toHaveCount(0)
    })

    test('período personalizado inválido no formulário e na URL', async ({ page }) => {
      const c = await umPassageiro('Ana', 1200)

      await entrarComContaDeTeste(page, '/historico')
      const url = `/historico?trajeto=${c.trajeto.id}`
      await page.goto(url)
      // O personalizado só navega depois de "Aplicar".
      await page.getByLabel('Período', { exact: true }).selectOption({ label: 'Personalizado' })
      await page.getByRole('button', { name: 'Aplicar' }).click()
      await expect(page.getByText('Informe as duas datas.')).toBeVisible()

      await page.getByLabel('De', { exact: true }).fill('2026-09-10')
      await page.getByLabel('Até', { exact: true }).fill('2026-09-01')
      await page.getByRole('button', { name: 'Aplicar' }).click()
      await expect(
        page.getByText('A data inicial precisa ser anterior ou igual à final.'),
      ).toBeVisible()
      expect(new URL(page.url()).search).toBe(`?trajeto=${c.trajeto.id}`)

      await page.goto(
        `/historico?periodo=personalizado&inicio=2026-09-10&fim=2026-09-01&trajeto=${c.trajeto.id}`,
      )
      await expect(page.getByText('Período inválido; mostrando este mês.')).toBeVisible()
      await expect(page.getByLabel('Período', { exact: true })).toHaveValue('este-mes')
    })

    test('carregar mais e resumo com todas as viagens (FR-014, SC-002)', async ({ page }) => {
      const c = await umPassageiro('Ana', 1000)
      let esperado = 0
      for (let i = 0; i < 21; i++) {
        const valor = 1000 + i * 10
        esperado += valor
        const minuto = String(i).padStart(2, '0')
        await registrarViagemPelaApi({
          trajetoId: c.trajeto.id,
          sentido: 'ida',
          dataHoraLocal: `2021-05-10T07:${minuto}`,
          participacoes: [{ passageiro_id: c.passageiros[0].id, valor_centavos: valor }],
        })
      }

      await entrarComContaDeTeste(page, '/historico')
      await page.goto(
        `/historico?periodo=personalizado&inicio=2021-05-10&fim=2021-05-10&trajeto=${c.trajeto.id}`,
      )
      await expect(itensDaLista(page)).toHaveCount(20)
      await expect(resumo(page)).toContainText('21 viagens')
      await expect(resumo(page)).toContainText(/R\$\s231,00/)

      await page.getByRole('link', { name: 'Carregar mais' }).click()
      await expect(itensDaLista(page)).toHaveCount(21)
      await expect(page.getByRole('link', { name: 'Carregar mais' })).toHaveCount(0)
      expect(await somaDosItens(page)).toBe(esperado)
    })

    test('trajeto sem viagens no período mostra o estado vazio e o resumo zerado', async ({
      page,
    }) => {
      const c = await umPassageiro('Ana', 1200)
      // Garante que a conta tem ao menos uma viagem ativa (fora do período consultado).
      await registrarViagemPelaApi({
        trajetoId: c.trajeto.id,
        sentido: 'ida',
        dataHoraLocal: '2021-06-01T08:00',
        participacoes: [{ passageiro_id: c.passageiros[0].id, valor_centavos: 1200 }],
      })

      await entrarComContaDeTeste(page, '/historico')
      await page.goto(`/historico?trajeto=${c.trajeto.id}`)

      await expect(page.getByRole('heading', { name: 'Nenhuma viagem no período' })).toBeVisible()
      await expect(resumo(page)).toContainText('0 viagens')
      await expect(resumo(page)).toContainText(/R\$\s0,00/)
      await expect(page.getByRole('link', { name: 'Limpar filtros' }).first()).toBeVisible()
    })

    test('abrir uma viagem e voltar mantém os filtros; recarregar também', async ({ page }) => {
      const c = await umPassageiro('Ana', 1200)
      await registrarViagemPelaApi({
        trajetoId: c.trajeto.id,
        sentido: 'ida',
        dataHoraLocal: `${diaUmDoMesPassado}T07:15`,
        participacoes: [{ passageiro_id: c.passageiros[0].id, valor_centavos: 1200 }],
      })

      await entrarComContaDeTeste(page, '/historico')
      const url = `/historico?periodo=mes-passado&trajeto=${c.trajeto.id}&sentido=ida`
      await page.goto(url)
      await itensDaLista(page)
        .getByRole('link', { name: `${dataBR(diaUmDoMesPassado)} 07:15` })
        .click()
      await expect(page).toHaveURL(/\/viagens\/[0-9a-f-]{36}\?volta=historico/)

      const voltar = page.locator('main').getByRole('link', { name: 'Histórico' })
      await expect(voltar).toBeVisible()
      await voltar.click()
      await expect(page).toHaveURL(new RegExp(`${url.replace(/\?/, '\\?')}$`))
      await expect(itensDaLista(page)).toHaveCount(1)

      await page.reload()
      await expect(page.getByLabel('Período', { exact: true })).toHaveValue('mes-passado')
      await expect(page.getByLabel('Trajeto', { exact: true })).toHaveValue(c.trajeto.id)
      await expect(page.getByLabel('Sentido', { exact: true })).toHaveValue('ida')
    })

    test('viagem editada mostra os valores atuais', async ({ page }) => {
      const c = await prepararCenario({
        passageiros: [
          { base: 'Ana', valorCentavos: 1200 },
          { base: 'Bruno', valorCentavos: 1000 },
        ],
        trajeto: { origemBase: 'Casa', destino: 'Faculdade' },
      })
      const [ana, bruno] = c.passageiros
      const dados = {
        trajetoId: c.trajeto.id,
        sentido: 'ida' as const,
        dataHoraLocal: `${diaUmDoMes}T07:00`,
      }
      const viagemId = await registrarViagemPelaApi({
        ...dados,
        participacoes: [
          { passageiro_id: ana.id, valor_centavos: 1200 },
          { passageiro_id: bruno.id, valor_centavos: 1000 },
        ],
      })

      await entrarComContaDeTeste(page, '/historico')
      await page.goto(`/historico?trajeto=${c.trajeto.id}`)
      await expect(resumo(page)).toContainText(/R\$\s22,00/)

      await editarViagemPelaApi({
        ...dados,
        viagemId,
        participacoes: [
          { passageiro_id: ana.id, valor_centavos: 1200 },
          { passageiro_id: bruno.id, valor_centavos: 1500 },
        ],
      })
      await page.reload()
      await expect(itensDaLista(page)).toContainText(/R\$\s27,00/)
      await expect(resumo(page)).toContainText(/R\$\s27,00/)
    })
  })

  test.describe('US2 – filtro por passageiro', () => {
    test('valor do passageiro na linha e no resumo; atalho e arquivado', async ({ page }) => {
      const c = await prepararCenario({
        passageiros: [
          { base: 'Ana', valorCentavos: 1200 },
          { base: 'Bruno', valorCentavos: 1000 },
        ],
        trajeto: { origemBase: 'Casa', destino: 'Faculdade' },
      })
      const [ana, bruno] = c.passageiros
      const registrar = (
        sentido: 'ida' | 'volta',
        hora: string,
        participacoes: { passageiro_id: string; valor_centavos: number }[],
      ) =>
        registrarViagemPelaApi({
          trajetoId: c.trajeto.id,
          sentido,
          dataHoraLocal: `${diaUmDoMes}T${hora}`,
          participacoes,
        })
      await registrar('ida', '07:00', [
        { passageiro_id: ana.id, valor_centavos: 1200 },
        { passageiro_id: bruno.id, valor_centavos: 1000 },
      ])
      await registrar('volta', '18:00', [{ passageiro_id: ana.id, valor_centavos: 1500 }])
      await registrar('ida', '08:00', [{ passageiro_id: bruno.id, valor_centavos: 1000 }])

      await entrarComContaDeTeste(page, '/historico')
      await page.goto(`/historico?trajeto=${c.trajeto.id}`)
      await expect(resumo(page)).toContainText('3 viagens')
      await expect(resumo(page)).toContainText(/Total cobrado: R\$\s47,00/)

      await filtrar(page, 'Passageiro', { value: ana.id })
      const itens = itensDaLista(page)
      await expect(itens).toHaveCount(2)
      await expect(
        page.getByText(`Valor de ${ana.nome}`).filter({ visible: true }).first(),
      ).toBeVisible()
      await expect(itens.nth(0)).toContainText(/R\$\s15,00/)
      await expect(itens.nth(1)).toContainText(/R\$\s12,00/)
      await expect(resumo(page)).toContainText('2 viagens')
      await expect(resumo(page)).toContainText(
        new RegExp(`Total cobrado de ${ana.nome}: R\\$\\s27,00`),
      )

      // Atalho no detalhe do passageiro (US2-5).
      await page.goto(`/passageiros/${ana.id}`)
      await page.getByRole('link', { name: 'Ver histórico' }).click()
      await expect(page).toHaveURL(new RegExp(`/historico\\?passageiro=${ana.id}$`))
      await expect(page.getByLabel('Passageiro', { exact: true })).toHaveValue(ana.id)
      await expect(itensDaLista(page)).toHaveCount(2)

      // Arquivado continua disponível no filtro (US2-4).
      await atualizarPassageiroPelaApi(ana.id, { arquivado_em: new Date().toISOString() })
      await page.goto(`/historico?passageiro=${ana.id}&trajeto=${c.trajeto.id}`)
      const passageiro = page.getByLabel('Passageiro', { exact: true })
      await expect(
        passageiro.locator('option', { hasText: `${ana.nome} (arquivado)` }),
      ).toHaveCount(1)
      await expect(passageiro).toHaveValue(ana.id)
      await expect(itensDaLista(page)).toHaveCount(2)
      await expect(resumo(page)).toContainText(
        new RegExp(`Total cobrado de ${ana.nome}: R\\$\\s27,00`),
      )
    })

    test('item "Histórico" na navegação, marcado como atual', async ({ page }) => {
      await entrarComContaDeTeste(page, '/historico')
      const nav = page
        .getByRole('navigation', { name: /Navegação (inferior|lateral)/ })
        .filter({ visible: true })
      const item = nav.getByRole('link', { name: 'Histórico' })
      await expect(item).toBeVisible()
      await expect(item).toHaveAttribute('aria-current', 'page')
      await expect(page).toHaveTitle('Histórico · Caronas Já')
    })
  })

  test.describe('US3 – trajeto e sentido', () => {
    test('filtros combinados, limpar e trajeto arquivado', async ({ page }) => {
      const c1 = await umPassageiro('Paulo', 1000, 'Casa')
      const [p] = c1.passageiros
      const c2 = await prepararCenario({
        passageiros: [],
        trajeto: { origemBase: 'Casa', destino: 'Trabalho' },
      })
      const registrar = (trajetoId: string, sentido: 'ida' | 'volta', hora: string) =>
        registrarViagemPelaApi({
          trajetoId,
          sentido,
          dataHoraLocal: `${diaUmDoMes}T${hora}`,
          participacoes: [{ passageiro_id: p.id, valor_centavos: 1000 }],
        })
      await registrar(c1.trajeto.id, 'ida', '07:00')
      await registrar(c1.trajeto.id, 'volta', '18:00')
      await registrar(c2.trajeto.id, 'volta', '19:00')

      await entrarComContaDeTeste(page, '/historico')
      await page.goto(`/historico?passageiro=${p.id}`)
      await expect(itensDaLista(page)).toHaveCount(3)

      await filtrar(page, 'Sentido', { label: 'Volta' })
      await expect(itensDaLista(page)).toHaveCount(2)
      await expect(resumo(page)).toContainText('2 viagens')

      await filtrar(page, 'Trajeto', { value: c1.trajeto.id })
      await expect(page).toHaveURL(
        new RegExp(`passageiro=${p.id}&trajeto=${c1.trajeto.id}&sentido=volta$`),
      )
      await expect(itensDaLista(page)).toHaveCount(1)
      await expect(itensDaLista(page)).toContainText('18:00')
      await expect(resumo(page)).toContainText('1 viagem')
      await expect(resumo(page)).toContainText(/R\$\s10,00/)

      // "Limpar filtros" volta ao padrão e some (US3-4).
      await page.getByRole('link', { name: 'Limpar filtros' }).first().click()
      await expect(page).toHaveURL(/\/historico$/)
      await expect(page.getByRole('link', { name: 'Limpar filtros' })).toHaveCount(0)
      await expect(page.getByLabel('Sentido', { exact: true })).toHaveValue('')

      // Trajeto arquivado continua no filtro (US3-5).
      await arquivarPelaApi('trajetos', c1.trajeto.id)
      await page.goto(`/historico?trajeto=${c1.trajeto.id}`)
      const trajeto = page.getByLabel('Trajeto', { exact: true })
      await expect(
        trajeto.locator('option', { hasText: `${c1.trajeto.origem} → Faculdade (arquivado)` }),
      ).toHaveCount(1)
      await expect(trajeto).toHaveValue(c1.trajeto.id)
      await expect(itensDaLista(page)).toHaveCount(2)
    })
  })

  test.describe('privacidade', () => {
    test('passageiro ou trajeto inexistente na URL é ignorado (FR-020)', async ({ page }) => {
      const c = await umPassageiro('Ana', 1200)
      await registrarViagemPelaApi({
        trajetoId: c.trajeto.id,
        sentido: 'ida',
        dataHoraLocal: `${diaUmDoMes}T07:00`,
        participacoes: [{ passageiro_id: c.passageiros[0].id, valor_centavos: 1200 }],
      })

      await entrarComContaDeTeste(page, '/historico')
      await page.goto(`/historico?passageiro=${crypto.randomUUID()}&trajeto=${c.trajeto.id}`)
      await expect(page.getByLabel('Passageiro', { exact: true })).toHaveValue('')
      await expect(page.getByLabel('Trajeto', { exact: true })).toHaveValue(c.trajeto.id)
      await expect(itensDaLista(page)).toHaveCount(1)
      await expect(resumo(page)).toContainText('1 viagem')

      await page.goto(`/historico?trajeto=${crypto.randomUUID()}`)
      await expect(page.getByRole('heading', { name: 'Histórico', level: 1 })).toBeVisible()
      await expect(page.getByLabel('Trajeto', { exact: true })).toHaveValue('')
    })
  })
})
