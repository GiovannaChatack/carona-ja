import { expect, test, type Page } from '@playwright/test'

// Usa uma conta de TESTE (nunca a conta do dono). Sem as variáveis, os cenários são pulados.
const email = process.env.E2E_EMAIL
const senha = process.env.E2E_SENHA

test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')

async function entrar(page: Page) {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(email!)
  await page.getByLabel('Senha').fill(senha!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: /^Olá,/ })).toBeVisible()
}

async function semRolagemHorizontal(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
}

test('sem rolagem horizontal de 360px a 1920px', async ({ page }) => {
  await entrar(page)

  for (const largura of [360, 768, 1280, 1920]) {
    await page.setViewportSize({ width: largura, height: 800 })
    await page.goto('/inicio')
    await expect(page.getByRole('heading', { name: /^Olá,/ })).toBeVisible()
    expect(await semRolagemHorizontal(page), `rolagem horizontal em ${largura}px`).toBe(true)
  }
})

test('BottomNav no celular e Sidebar no desktop', async ({ page }) => {
  await entrar(page)
  const bottomNav = page.getByRole('navigation', { name: 'Navegação inferior' })
  const sidebar = page.getByRole('navigation', { name: 'Navegação lateral' })

  await page.setViewportSize({ width: 360, height: 800 })
  await expect(bottomNav).toBeVisible()
  await expect(sidebar).toBeHidden()

  const inicio = bottomNav.getByRole('link', { name: 'Início' })
  await expect(inicio).toHaveAttribute('aria-current', 'page')
  const caixa = await inicio.boundingBox()
  expect(caixa?.width).toBeGreaterThanOrEqual(44)
  expect(caixa?.height).toBeGreaterThanOrEqual(44)

  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(sidebar).toBeVisible()
  await expect(bottomNav).toBeHidden()

  const inicioLateral = sidebar.getByRole('link', { name: 'Início' })
  await expect(inicioLateral).toHaveAttribute('aria-current', 'page')
  const caixaLateral = await inicioLateral.boundingBox()
  expect(caixaLateral?.height).toBeGreaterThanOrEqual(44)
})

test.describe('tema', () => {
  test.use({ colorScheme: 'dark' })

  test('segue o sistema, alterna manualmente e persiste', async ({ page }) => {
    await entrar(page)
    const html = page.locator('html')

    await expect(html).toHaveClass(/\bdark\b/)

    await page.getByRole('button', { name: 'Alternar tema' }).click()
    await expect(html).not.toHaveClass(/\bdark\b/)

    await page.reload()
    await expect(page.getByRole('heading', { name: /^Olá,/ })).toBeVisible()
    await expect(html).not.toHaveClass(/\bdark\b/)
  })
})

test('rota inexistente mostra a página 404 em pt-BR', async ({ page }) => {
  await entrar(page)
  await page.goto('/nao-existe')

  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute(
    'href',
    '/inicio',
  )
})

test('/inicio convida a registrar viagens, sem links para telas inexistentes', async ({ page }) => {
  await entrar(page)

  const conteudo = page.getByRole('main')
  await expect(conteudo.getByText('Tudo pronto por aqui')).toBeVisible()
  // Só viagens e passageiros. Os pagamentos ainda não existem.
  const links = conteudo.getByRole('link')
  await expect(links).toHaveCount(2)
  await expect(links.nth(0)).toHaveText('Registrar viagem')
  await expect(links.nth(0)).toHaveAttribute('href', '/viagens/nova')
  await expect(links.nth(1)).toHaveText('Passageiros')
  await expect(links.nth(1)).toHaveAttribute('href', '/passageiros')
  await expect(conteudo.getByRole('button')).toHaveCount(0)
})
