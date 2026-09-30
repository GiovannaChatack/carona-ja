import { expect, test } from '@playwright/test'

// Teste de fumaça da publicação. Roda localmente ou contra produção:
// E2E_BASE_URL=https://<url-producao> npx playwright test tests/e2e/publicacao.spec.ts
test('a página inicial está no ar e conectada ao banco', async ({ page }) => {
  const resposta = await page.goto('/')

  expect(resposta?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Caronas Já' })).toBeVisible()
  await expect(page.getByText('Conexão com o banco: OK')).toBeVisible()
})
