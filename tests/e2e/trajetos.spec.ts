import { expect, test, type Page } from '@playwright/test'

import {
  email,
  entrarComContaDeTeste,
  limparDadosDeTeste,
  nomeDeTeste,
  senha,
} from './helpers/passageiros'

// Cadastra pelo formulário, confere o toast e termina nos detalhes do trajeto.
async function cadastrar(page: Page, origem: string, destino = 'Faculdade') {
  await page.goto('/viagens/trajetos/novo')
  await page.getByLabel('Origem').fill(origem)
  await page.getByLabel('Destino').fill(destino)
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Trajeto cadastrado')).toBeVisible()
  await expect(page).toHaveURL(/\/viagens\/trajetos\/[0-9a-f-]{36}$/)
  await expect(
    page.getByRole('heading', { name: `${origem} → ${destino}`, level: 1 }),
  ).toBeVisible()
}

// Linha da tabela (desktop) ou cartão (celular) visível com o trajeto.
function itemDaLista(page: Page, rotulo: string) {
  return page.locator('tr, li').filter({ hasText: rotulo }).filter({ visible: true })
}

async function semRolagemHorizontal(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
}

function dialogo(page: Page) {
  return page.getByRole('alertdialog')
}

test('sem sessão, /viagens/trajetos leva ao login com o caminho de retorno', async ({ page }) => {
  await page.goto('/viagens/trajetos')

  await expect(page).toHaveURL(/\/entrar\?proximo=%2Fviagens%2Ftrajetos$/)
})

test.describe('US1 – cadastro e lista de trajetos', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.afterAll(limparDadosDeTeste)

  test('navegação até Trajetos e cadastro válido', async ({ page }) => {
    await entrarComContaDeTeste(page, '/inicio')

    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Viagens' })
      .filter({ visible: true })
      .click()
    await expect(page).toHaveURL(/\/viagens$/)
    await expect(page.getByRole('heading', { name: 'Viagens', level: 1 })).toBeVisible()

    // O cabeçalho e o estado vazio de /viagens podem ter o link "Trajetos".
    await page.getByRole('main').getByRole('link', { name: 'Trajetos' }).first().click()
    await expect(page).toHaveURL(/\/viagens\/trajetos$/)
    await expect(page.getByRole('heading', { name: 'Trajetos', level: 1 })).toBeVisible()

    await cadastrar(page, nomeDeTeste('Casa'))
  })

  test('campos vazios e origem igual ao destino mostram mensagens', async ({ page }) => {
    await entrarComContaDeTeste(page, '/viagens/trajetos/novo')

    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Informe a origem.')).toBeVisible()
    await expect(page.getByText('Informe o destino.')).toBeVisible()
    await expect(page.getByLabel('Origem')).toHaveAttribute('aria-invalid', 'true')

    const origem = nomeDeTeste('Igual')
    await page.getByLabel('Origem').fill(origem)
    await page.getByLabel('Destino').fill(origem.toLowerCase())
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('A origem e o destino precisam ser diferentes.')).toBeVisible()
    await expect(page).toHaveURL(/\/viagens\/trajetos\/novo$/)
    await expect(page.getByLabel('Origem')).toHaveValue(origem)
  })

  test('duplicado é recusado; sentido oposto é aceito; lista mostra os dois', async ({ page }) => {
    await entrarComContaDeTeste(page, '/viagens/trajetos')
    const origem = nomeDeTeste('Casa')
    await cadastrar(page, origem)

    await page.goto('/viagens/trajetos/novo')
    await page.getByLabel('Origem').fill(origem.toUpperCase())
    await page.getByLabel('Destino').fill('faculdade')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Este trajeto já está cadastrado.')).toBeVisible()
    await expect(page).toHaveURL(/\/viagens\/trajetos\/novo$/)

    await cadastrar(page, 'Faculdade', origem)

    await page.goto('/viagens/trajetos')
    await expect(itemDaLista(page, `${origem} → Faculdade`)).toBeVisible()
    await expect(itemDaLista(page, `Faculdade → ${origem}`)).toBeVisible()
  })

  test('sem rolagem horizontal na lista e no formulário', async ({ page }) => {
    await entrarComContaDeTeste(page, '/viagens/trajetos')
    expect(await semRolagemHorizontal(page), 'rolagem horizontal em /viagens/trajetos').toBe(true)

    await page.goto('/viagens/trajetos/novo')
    await expect(page.getByRole('heading', { name: 'Novo trajeto' })).toBeVisible()
    expect(await semRolagemHorizontal(page), 'rolagem horizontal em /viagens/trajetos/novo').toBe(
      true,
    )
  })
})

test.describe('US6 – gestão de trajetos', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.afterAll(limparDadosDeTeste)

  async function arquivar(page: Page) {
    await page.getByRole('button', { name: 'Arquivar', exact: true }).click()
    await expect(dialogo(page).getByText('Arquivar trajeto?')).toBeVisible()
    await dialogo(page).getByRole('button', { name: 'Arquivar', exact: true }).click()
    await expect(page.getByText('Trajeto arquivado')).toBeVisible()
  }

  test('editar a origem volta aos detalhes', async ({ page }) => {
    await entrarComContaDeTeste(page, '/viagens/trajetos')
    await cadastrar(page, nomeDeTeste('Editar'))

    await page.getByRole('link', { name: 'Editar' }).click()
    await expect(page).toHaveURL(/\/viagens\/trajetos\/[0-9a-f-]{36}\/editar$/)
    await expect(page.getByLabel('Destino')).toHaveValue('Faculdade')

    const nova = nomeDeTeste('Editada')
    await page.getByLabel('Origem').fill(nova)
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Trajeto atualizado')).toBeVisible()
    await expect(page).toHaveURL(/\/viagens\/trajetos\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { name: `${nova} → Faculdade`, level: 1 })).toBeVisible()
  })

  test('arquivar, ver em Arquivados e reativar', async ({ page }) => {
    await entrarComContaDeTeste(page, '/viagens/trajetos')
    const origem = nomeDeTeste('Arquivar')
    const rotulo = `${origem} → Faculdade`
    await cadastrar(page, origem)

    // Cancelar não altera nada.
    await page.getByRole('button', { name: 'Arquivar', exact: true }).click()
    await dialogo(page).getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialogo(page)).toHaveCount(0)
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible()

    await arquivar(page)
    await expect(page.getByText(/Arquivado em \d{2}\/\d{2}\/\d{4}/)).toBeVisible()
    await expect(page.getByText('Este trajeto está arquivado', { exact: false })).toBeVisible()
    const detalhes = page.url()

    await page.goto('/viagens/trajetos')
    await expect(itemDaLista(page, rotulo)).toHaveCount(0)
    await page.getByRole('link', { name: 'Arquivados' }).click()
    await expect(page).toHaveURL(/situacao=arquivados/)
    await expect(itemDaLista(page, rotulo)).toBeVisible()

    await page.goto(detalhes)
    await page.getByRole('button', { name: 'Reativar' }).click()
    await expect(page.getByText('Trajeto reativado')).toBeVisible()
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible()
  })

  test('reativar é recusado se já há um ativo igual', async ({ page }) => {
    await entrarComContaDeTeste(page, '/viagens/trajetos')
    const origem = nomeDeTeste('Reativar')
    await cadastrar(page, origem)
    await arquivar(page)
    const arquivado = page.url()

    // Novo ativo igual (o índice único só vale entre os ativos).
    await cadastrar(page, origem)
    await page.goto(arquivado)
    await page.getByRole('button', { name: 'Reativar' }).click()
    await expect(
      page.getByText('Já existe um trajeto ativo com essa origem e esse destino.'),
    ).toBeVisible()
  })

  test('excluir com confirmação', async ({ page }) => {
    await entrarComContaDeTeste(page, '/viagens/trajetos')
    const origem = nomeDeTeste('Excluir')
    const rotulo = `${origem} → Faculdade`
    await cadastrar(page, origem)

    await page.getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(dialogo(page).getByText('Excluir trajeto?')).toBeVisible()
    await dialogo(page).getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('heading', { name: rotulo, level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Excluir', exact: true }).click()
    await dialogo(page).getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(page.getByText('Trajeto excluído')).toBeVisible()
    await expect(page).toHaveURL(/\/viagens\/trajetos(\?.*)?$/)
    await expect(itemDaLista(page, rotulo)).toHaveCount(0)
  })

  test('id inválido ou inexistente mostra página não encontrada', async ({ page }) => {
    await entrarComContaDeTeste(page, '/viagens/trajetos')

    await page.goto('/viagens/trajetos/abc')
    await expect(page.getByText('Página não encontrada')).toBeVisible()
    await page.goto('/viagens/trajetos/00000000-0000-4000-8000-000000000000')
    await expect(page.getByText('Página não encontrada')).toBeVisible()
  })
})
