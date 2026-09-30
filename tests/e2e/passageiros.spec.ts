import { expect, test, type Page } from '@playwright/test'

import {
  email,
  entrarComContaDeTeste,
  limparPassageirosDeTeste,
  nomeDeTeste,
  senha,
} from './helpers/passageiros'

const ERRO_VALOR = 'Informe um valor entre R$ 0,00 e R$ 9.999,99, com até 2 casas decimais.'

// Cadastra pelo formulário e espera voltar à lista com o toast.
async function cadastrar(page: Page, nome: string, telefone = '(11) 91234-5678', valor = '12,5') {
  await page.goto('/passageiros/novo')
  await page.getByLabel('Nome').fill(nome)
  await page.getByLabel('Telefone').fill(telefone)
  await page.getByLabel('Valor padrão por trajeto').fill(valor)
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Passageiro cadastrado')).toBeVisible()
  // O AvisoUrl remove o ?aviso=cadastrado depois de mostrar o toast.
  await expect(page).toHaveURL(/\/passageiros$/)
}

// Linha da tabela (desktop) ou cartão (celular) visível com o nome do passageiro.
function itemDaLista(page: Page, nome: string) {
  return page.locator('tr, li').filter({ hasText: nome }).filter({ visible: true })
}

async function semRolagemHorizontal(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
}

test('sem sessão, /passageiros leva ao login com o caminho de retorno', async ({ page }) => {
  await page.goto('/passageiros')

  await expect(page).toHaveURL(/\/entrar\?proximo=%2Fpassageiros$/)
})

test.describe('US1 – cadastro e lista', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.afterAll(limparPassageirosDeTeste)

  test('link na navegação, cadastro válido e lista formatada', async ({ page }) => {
    await entrarComContaDeTeste(page, '/inicio')

    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Passageiros' })
      .filter({ visible: true })
      .click()
    await expect(page).toHaveURL(/\/passageiros$/)
    await expect(page.getByRole('heading', { name: 'Passageiros', level: 1 })).toBeVisible()

    const nome = nomeDeTeste('Ana')
    await cadastrar(page, nome)

    const item = itemDaLista(page, nome)
    await expect(item).toContainText('(11) 91234-5678')
    // \s cobre o espaço não separável que o Intl usa depois de "R$".
    await expect(item).toContainText(/R\$\s12,50/)
    await expect(item.getByRole('link', { name: '(11) 91234-5678' })).toHaveAttribute(
      'href',
      'tel:+5511912345678',
    )
  })

  test('campos inválidos mostram mensagens e mantêm o que foi digitado', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros/novo')

    await page.getByLabel('Valor padrão por trajeto').fill('-1')
    await page.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText('Informe o nome.')).toBeVisible()
    await expect(page.getByText('Informe o telefone.')).toBeVisible()
    await expect(page.getByText(ERRO_VALOR)).toBeVisible()
    await expect(page.getByLabel('Nome')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL(/\/passageiros\/novo$/)
    await expect(page.getByLabel('Valor padrão por trajeto')).toHaveValue('-1')
  })

  test('nome duplicado entre os ativos é recusado', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const nome = nomeDeTeste('Duplicado')
    await cadastrar(page, nome)

    await page.goto('/passageiros/novo')
    await page.getByLabel('Nome').fill(`  ${nome.toUpperCase()}  `)
    await page.getByLabel('Telefone').fill('11 3123 4567')
    await page.getByLabel('Valor padrão por trajeto').fill('10')
    await page.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText('Já existe um passageiro ativo com esse nome.')).toBeVisible()
    await expect(page).toHaveURL(/\/passageiros\/novo$/)
  })

  test('busca ignora maiúsculas e acentos', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const nome = nomeDeTeste('José')
    await cadastrar(page, nome)

    const busca = page.getByLabel('Buscar por nome')
    // "E2E José abc" → "e2e jose abc": sem acento e em minúsculas.
    await busca.fill(nome.replace('José', 'jose').toLowerCase())
    await expect(itemDaLista(page, nome)).toBeVisible()
    await expect(page).toHaveURL(/[?&]busca=/)

    await busca.fill(`jose ${Date.now()} inexistente`)
    await expect(page.getByText('Nenhum passageiro encontrado')).toBeVisible()
    await expect(itemDaLista(page, nome)).toHaveCount(0)

    await page.getByRole('button', { name: 'Limpar busca' }).click()
    await expect(busca).toHaveValue('')
    await expect(itemDaLista(page, nome)).toBeVisible()
    await expect(page).not.toHaveURL(/[?&]busca=/)
  })

  test('sem rolagem horizontal na lista e no formulário', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    expect(await semRolagemHorizontal(page), 'rolagem horizontal em /passageiros').toBe(true)

    await page.goto('/passageiros/novo')
    await expect(page.getByRole('heading', { name: 'Novo passageiro' })).toBeVisible()
    expect(await semRolagemHorizontal(page), 'rolagem horizontal em /passageiros/novo').toBe(true)
  })
})
