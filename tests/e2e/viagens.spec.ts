import { expect, test, type Page } from '@playwright/test'

import {
  atualizarPassageiroPelaApi,
  email,
  entrarComContaDeTeste,
  limparDadosDeTeste,
  prepararCenario,
  registrarViagemPelaApi,
  senha,
  type Cenario,
} from './helpers/passageiros'

const ERRO_VALOR = 'Informe um valor entre R$ 0,00 e R$ 9.999,99, com até 2 casas decimais.'

// Dois passageiros (R$ 12,00 e R$ 10,00) e um trajeto, criados pela API.
function novoCenario() {
  return prepararCenario({
    passageiros: [
      { base: 'Ana', valorCentavos: 1200 },
      { base: 'Bruno', valorCentavos: 1000 },
    ],
    trajeto: { origemBase: 'Casa', destino: 'Faculdade' },
  })
}

function rotulo(c: Cenario) {
  return `${c.trajeto.origem} → ${c.trajeto.destino}`
}

// Linhas da tabela (desktop) ou cartões (celular) visíveis.
function itensDaLista(page: Page) {
  return page.locator('tbody tr, main ul > li').filter({ visible: true })
}

async function semRolagemHorizontal(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
}

function dialogo(page: Page) {
  return page.getByRole('alertdialog')
}

function total(page: Page) {
  return page.getByText(/^Total: /)
}

// Clica em "Carregar mais" até `alvo` ter `quantidade` itens (ou acabar a lista).
async function carregarAte(page: Page, alvo: ReturnType<typeof itensDaLista>, quantidade: number) {
  const carregarMais = page.getByRole('link', { name: 'Carregar mais' })
  for (let i = 0; i < 10 && (await alvo.count()) < quantidade; i++) {
    if (!(await carregarMais.isVisible())) return
    const antes = await itensDaLista(page).count()
    await carregarMais.click()
    await expect.poll(() => itensDaLista(page).count()).toBeGreaterThan(antes)
  }
}

// Preenche o formulário de nova viagem já aberto.
async function preencher(page: Page, c: Cenario, sentido: 'Ida' | 'Volta') {
  await page.getByLabel('Trajeto').selectOption({ label: rotulo(c) })
  await page.getByRole('radio', { name: sentido }).check()
  for (const p of c.passageiros) await page.getByRole('checkbox', { name: p.nome }).check()
}

test('sem sessão, /viagens/nova leva ao login com o caminho de retorno', async ({ page }) => {
  await page.goto('/viagens/nova')

  await expect(page).toHaveURL(/\/entrar\?proximo=%2Fviagens%2Fnova$/)
})

test.describe('US2 – registrar viagem', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.afterAll(limparDadosDeTeste)

  test('registro com percurso, valores e total em tempo real', async ({ page }) => {
    const c = await novoCenario()
    const [ana, bruno] = c.passageiros
    await entrarComContaDeTeste(page, '/inicio')

    await page.getByRole('main').getByRole('link', { name: 'Registrar viagem' }).click()
    await expect(page).toHaveURL(/\/viagens\/nova$/)
    await expect(page.getByRole('heading', { name: 'Nova viagem', level: 1 })).toBeVisible()

    await page.getByLabel('Trajeto').selectOption({ label: rotulo(c) })
    await page.getByRole('radio', { name: 'Ida' }).check()
    await expect(page.getByText(`Percurso: ${c.trajeto.origem} → Faculdade`)).toBeVisible()
    await page.getByRole('radio', { name: 'Volta' }).check()
    await expect(page.getByText(`Percurso: Faculdade → ${c.trajeto.origem}`)).toBeVisible()
    await page.getByRole('radio', { name: 'Ida' }).check()

    await page.getByRole('checkbox', { name: ana.nome }).check()
    await page.getByRole('checkbox', { name: bruno.nome }).check()
    await expect(page.getByLabel(`Valor de ${ana.nome}`)).toHaveValue('12,00')
    await expect(page.getByLabel(`Valor de ${bruno.nome}`)).toHaveValue('10,00')
    await expect(total(page)).toHaveText(/^Total: R\$\s22,00 · 2 passageiros$/)

    await page.getByLabel(`Valor de ${ana.nome}`).fill('8,5')
    await expect(total(page)).toHaveText(/^Total: R\$\s18,50 · 2 passageiros$/)

    await page.getByRole('button', { name: 'Registrar viagem' }).click()
    await expect(page.getByText('Viagem registrada')).toBeVisible()
    await expect(page).toHaveURL(/\/viagens$/)
    // Filtra pelo percurso: outros workers registram viagens na mesma conta ao mesmo tempo.
    const item = itensDaLista(page).filter({ hasText: `${c.trajeto.origem} → Faculdade` })
    await expect(item).toHaveCount(1)
    await expect(item).toContainText('Ida')
    await expect(item).toContainText(/R\$\s18,50/)
    await expect(item.getByText('2', { exact: true })).toBeVisible()

    // A viagem mais recente define o trajeto sugerido (FR-014).
    await page.goto('/viagens/nova')
    await expect(page.getByLabel('Trajeto')).toHaveValue(c.trajeto.id)
  })

  test('viagem duplicada no dia pede confirmação', async ({ page }) => {
    const c = await novoCenario()
    await entrarComContaDeTeste(page, '/viagens/nova')
    await preencher(page, c, 'Ida')
    await page.getByRole('button', { name: 'Registrar viagem' }).click()
    await expect(page.getByText('Viagem registrada')).toBeVisible()

    await page.goto('/viagens/nova')
    await preencher(page, c, 'Ida')
    await page.getByLabel(`Valor de ${c.passageiros[0].nome}`).fill('7')
    await page.getByRole('button', { name: 'Registrar viagem' }).click()
    await expect(dialogo(page).getByText('Registrar mesmo assim?')).toBeVisible()
    await expect(dialogo(page)).toContainText(
      /Já existe uma viagem de ida neste trajeto em \d{2}\/\d{2}\/\d{4}\./,
    )

    // Cancelar mantém o que foi preenchido.
    await dialogo(page).getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialogo(page)).toHaveCount(0)
    await expect(page).toHaveURL(/\/viagens\/nova$/)
    await expect(page.getByLabel(`Valor de ${c.passageiros[0].nome}`)).toHaveValue('7')
    await expect(page.getByRole('radio', { name: 'Ida' })).toBeChecked()

    await page.getByRole('button', { name: 'Registrar viagem' }).click()
    await dialogo(page).getByRole('button', { name: 'Registrar', exact: true }).click()
    await expect(page.getByText('Viagem registrada')).toBeVisible()
    await expect(
      itensDaLista(page).filter({ hasText: `${c.trajeto.origem} → Faculdade` }),
    ).toHaveCount(2)
  })

  test('erros de validação ficam nos campos', async ({ page }) => {
    const c = await novoCenario()
    const [ana] = c.passageiros
    await entrarComContaDeTeste(page, '/viagens/nova')
    await page.getByLabel('Trajeto').selectOption({ label: rotulo(c) })

    await page.getByRole('button', { name: 'Registrar viagem' }).click()
    await expect(page.getByText('Marque ao menos um passageiro.')).toBeVisible()
    await expect(page.getByText('Escolha Ida ou Volta.')).toBeVisible()
    await expect(page).toHaveURL(/\/viagens\/nova$/)
    await expect(page.getByLabel('Trajeto')).toHaveValue(c.trajeto.id)

    await page.getByRole('radio', { name: 'Volta' }).check()
    await page.getByRole('checkbox', { name: ana.nome }).check()
    await page.getByLabel(`Valor de ${ana.nome}`).fill('-1')
    await expect(total(page)).toHaveText(/^Total: R\$\s0,00 · 1 passageiro$/)
    await page.getByRole('button', { name: 'Registrar viagem' }).click()
    await expect(page.getByText(ERRO_VALOR)).toBeVisible()
    await expect(page.getByLabel(`Valor de ${ana.nome}`)).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel(`Valor de ${ana.nome}`)).toHaveValue('-1')
  })

  test('sem rolagem horizontal; a barra do total não cobre o envio', async ({ page }) => {
    await novoCenario()
    await entrarComContaDeTeste(page, '/viagens')
    expect(await semRolagemHorizontal(page), 'rolagem horizontal em /viagens').toBe(true)

    await page.goto('/viagens/nova')
    await expect(page.getByRole('heading', { name: 'Nova viagem' })).toBeVisible()
    expect(await semRolagemHorizontal(page), 'rolagem horizontal em /viagens/nova').toBe(true)

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const enviar = page.getByRole('button', { name: 'Registrar viagem' })
    await expect(enviar).toBeInViewport({ ratio: 1 })

    // No celular, a barra fica acima da navegação inferior.
    const navInferior = page.getByRole('navigation', { name: 'Navegação inferior' })
    if (await navInferior.isVisible()) {
      const caixaNav = (await navInferior.boundingBox())!
      const caixaBotao = (await enviar.boundingBox())!
      expect(caixaBotao.y + caixaBotao.height).toBeLessThanOrEqual(caixaNav.y)
    }
  })
})

test.describe('US3 – lista e detalhes', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.afterAll(limparDadosDeTeste)

  test('ordem da lista, detalhes e valor copiado', async ({ page }) => {
    const c = await novoCenario()
    const [ana, bruno] = c.passageiros
    const participacoes = [
      { passageiro_id: ana.id, valor_centavos: 1200 },
      { passageiro_id: bruno.id, valor_centavos: 1000 },
    ]
    for (const dataHoraLocal of ['2021-03-02T10:00', '2021-03-03T10:00', '2021-03-01T07:40']) {
      await registrarViagemPelaApi({
        trajetoId: c.trajeto.id,
        sentido: 'ida',
        dataHoraLocal,
        participacoes,
      })
    }

    await entrarComContaDeTeste(page, '/viagens')
    // As viagens de 2021 podem estar além da primeira página (outros workers usam a conta).
    const meus = itensDaLista(page).filter({ hasText: c.trajeto.origem })
    await carregarAte(page, meus, 3)
    await expect(meus).toHaveCount(3)
    await expect(meus.nth(0)).toContainText('03/03/2021')
    await expect(meus.nth(1)).toContainText('02/03/2021')
    await expect(meus.nth(2)).toContainText('01/03/2021')

    // O valor padrão alterado depois não muda a viagem (SC-004).
    await atualizarPassageiroPelaApi(ana.id, { valor_padrao_centavos: 1500 })

    await meus
      .nth(2)
      .getByRole('link', { name: /01\/03\/2021/ })
      .click()
    await expect(page).toHaveURL(/\/viagens\/[0-9a-f-]{36}(\?.*)?$/)
    await expect(
      page.getByRole('heading', { name: `Ida: ${c.trajeto.origem} → Faculdade`, level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('01/03/2021 07:40')).toBeVisible()
    await expect(page.locator('li').filter({ hasText: ana.nome })).toContainText(/R\$\s12,00/)
    await expect(page.locator('li').filter({ hasText: bruno.nome })).toContainText(/R\$\s10,00/)
    await expect(page.getByText(/^R\$\s22,00$/)).toBeVisible()

    // Arquivar o passageiro mantém o nome na viagem, com o selo.
    await atualizarPassageiroPelaApi(bruno.id, { arquivado_em: new Date().toISOString() })
    await page.reload()
    await expect(page.locator('li').filter({ hasText: bruno.nome })).toContainText('Arquivado')

    // "Viagens" volta à lista.
    await page.getByRole('link', { name: 'Viagens' }).filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/\/viagens(\?pagina=\d+)?$/)
  })

  test('passageiro e trajeto com viagens não podem ser excluídos', async ({ page }) => {
    const c = await novoCenario()
    const [ana] = c.passageiros
    await registrarViagemPelaApi({
      trajetoId: c.trajeto.id,
      sentido: 'volta',
      dataHoraLocal: '2021-04-01T18:00',
      participacoes: [{ passageiro_id: ana.id, valor_centavos: 1200 }],
    })

    await entrarComContaDeTeste(page, `/passageiros/${ana.id}`)
    await page.getByRole('button', { name: 'Excluir', exact: true }).click()
    await dialogo(page).getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(
      page.getByText('Este passageiro tem viagens registradas e não pode ser excluído. Arquive-o.'),
    ).toBeVisible()

    await page.goto(`/viagens/trajetos/${c.trajeto.id}`)
    await expect(page.getByText('Viagens registradas')).toBeVisible()
    await page.getByRole('button', { name: 'Excluir', exact: true }).click()
    await dialogo(page).getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(
      page.getByText('Este trajeto tem viagens registradas e não pode ser excluído. Arquive-o.'),
    ).toBeVisible()
  })

  test('mais de 20 viagens: "Carregar mais"', async ({ page }) => {
    const c = await novoCenario()
    const participacoes = [{ passageiro_id: c.passageiros[0].id, valor_centavos: 1200 }]
    // Datas antigas (2001) para não empurrar as viagens dos outros testes.
    for (let dia = 1; dia <= 21; dia++) {
      await registrarViagemPelaApi({
        trajetoId: c.trajeto.id,
        sentido: 'ida',
        dataHoraLocal: `2001-01-${String(dia).padStart(2, '0')}T08:00`,
        participacoes,
      })
    }

    await entrarComContaDeTeste(page, '/viagens')
    await expect(itensDaLista(page)).toHaveCount(20)
    const carregarMais = page.getByRole('link', { name: 'Carregar mais' })
    await expect(carregarMais).toBeVisible()

    await carregarMais.click()
    await expect(page).toHaveURL(/pagina=2/)
    await expect.poll(() => itensDaLista(page).count()).toBeGreaterThan(20)

    // A 21ª (a mais antiga) aparece depois de carregar o suficiente.
    const maisAntiga = itensDaLista(page).filter({ hasText: '01/01/2001' }).filter({
      hasText: c.trajeto.origem,
    })
    await carregarAte(page, maisAntiga, 1)
    await expect(maisAntiga).toHaveCount(1)
  })

  test('id inválido ou inexistente mostra página não encontrada', async ({ page }) => {
    await entrarComContaDeTeste(page, '/viagens')

    await page.goto('/viagens/abc')
    await expect(page.getByText('Página não encontrada')).toBeVisible()
    await page.goto('/viagens/00000000-0000-4000-8000-000000000000')
    await expect(page.getByText('Página não encontrada')).toBeVisible()
  })
})
