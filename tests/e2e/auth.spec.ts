import { expect, test, type Page } from '@playwright/test'

// Usa uma conta de TESTE (nunca a conta do dono). Sem as variáveis, os cenários com login são pulados.
const email = process.env.E2E_EMAIL
const senha = process.env.E2E_SENHA

// A saudação é o h1 de /inicio. getByText('Olá,') também acharia o anunciador de rotas do Next.
function saudacao(page: Page) {
  return page.getByRole('heading', { name: /^Olá,/ })
}

async function entrar(page: Page, senhaUsada = senha!) {
  await page.getByLabel('E-mail').fill(email!)
  await page.getByLabel('Senha').fill(senhaUsada)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

// Login que deve dar certo: se o Supabase recusar a conta de teste, falha com uma mensagem clara
// em vez de um timeout de URL.
async function entrarComSucesso(page: Page) {
  await entrar(page)
  const recusado = page.getByText('E-mail ou senha inválidos.')
  await expect(saudacao(page).or(recusado)).toBeVisible()
  if (await recusado.isVisible()) {
    throw new Error(
      'O Supabase recusou E2E_EMAIL/E2E_SENHA. Crie a conta de teste em Auth → Users ' +
        '(auto-confirm) ou corrija a senha no .env.local.',
    )
  }
}

test('sem sessão, /inicio leva ao login com o caminho de retorno', async ({ page }) => {
  await page.goto('/inicio')

  await expect(page).toHaveURL(/\/entrar\?proximo=%2Finicio$/)
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test.describe('com conta de teste', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')

  test('senha errada mostra erro e continua no login', async ({ page }) => {
    await page.goto('/entrar')
    await entrar(page, `${senha}-errada`)

    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible()
    await expect(page).toHaveURL(/\/entrar/)
  })

  test('login, sessão persistente e saída', async ({ page }) => {
    await page.goto('/inicio')
    await entrarComSucesso(page)

    await expect(page).toHaveURL(/\/inicio$/)

    // Com sessão, /entrar volta para /inicio.
    await page.goto('/entrar')
    await expect(page).toHaveURL(/\/inicio$/)

    // A sessão sobrevive a um recarregamento.
    await page.reload()
    await expect(saudacao(page)).toBeVisible()

    await page.getByRole('button', { name: 'Menu da conta' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/entrar$/)

    await page.goto('/inicio')
    await expect(page).toHaveURL(/\/entrar\?proximo=%2Finicio/)
  })

  test('proximo externo é ignorado após o login', async ({ page }) => {
    await page.goto('/entrar?proximo=//evil.com')
    await entrarComSucesso(page)

    await expect(page).toHaveURL(/\/inicio$/)
  })
})
