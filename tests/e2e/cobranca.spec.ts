import { expect, test, type Page } from '@playwright/test'

import { hojeEmSaoPaulo } from '../../lib/format'
import {
  definirChavePixDeTeste,
  email,
  entrarComContaDeTeste,
  limparDadosDeTeste,
  marcarPagoPelaApi,
  participacoesDaViagemPelaApi,
  prepararCenario,
  registrarViagemPelaApi,
  senha,
} from './helpers/passageiros'

// Regras contra condições de corrida (tasks.md): a chave PIX é estado global da conta, então
// todo teste grava sempre o mesmo valor (teste@exemplo.com) e nenhum a apaga.

const CHAVE = 'teste@exemplo.com'

// Mensagem do modelo da spec para o passageiro de teste (primeiro nome "E2E").
const MENSAGEM = [
  'Olá, E2E!',
  '',
  'Segue o detalhamento das suas viagens pendentes (Total Devido: R$ 20,00):',
  '',
  '- 28/09/2025 (Ida): R$ 10,00',
  '- 28/09/2025 (Volta): R$ 10,00',
  '',
  '*Valor a ser pago: R$ 20,00*',
  '',
  'Você pode pagar via PIX para a chave:',
  `*${CHAVE}*`,
  '',
  'Qualquer dúvida, estou à disposição. Obrigado!',
].join('\n')

const PREFIXO_WHATSAPP = 'https://wa.me/5511912345678?text='

async function semRolagemHorizontal(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
}

function previa(page: Page) {
  return page.getByLabel('Prévia da mensagem')
}

// Sem viagens marcadas o <a> fica sem href (e sem o papel de link): busca pelo texto.
function linkWhatsApp(page: Page) {
  return page.locator('a', { hasText: 'Abrir no WhatsApp' })
}

// Passageiro de teste (telefone 11912345678, R$ 10,00) com Ida e Volta em 28/09/2025.
async function cenario() {
  const c = await prepararCenario({
    passageiros: [{ base: 'Cob', valorCentavos: 1000 }],
    trajeto: { origemBase: 'Casa', destino: 'Faculdade' },
  })
  const p = c.passageiros[0]
  const registrar = (sentido: 'ida' | 'volta', dataHoraLocal: string) =>
    registrarViagemPelaApi({
      trajetoId: c.trajeto.id,
      sentido,
      dataHoraLocal,
      participacoes: [{ passageiro_id: p.id, valor_centavos: 1000 }],
    })
  const ida = await registrar('ida', '2025-09-28T07:00')
  const volta = await registrar('volta', '2025-09-28T18:00')
  return { p, ida, volta }
}

test.describe('cobrança e chave PIX', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.beforeEach(definirChavePixDeTeste)
  test.afterAll(limparDadosDeTeste)

  test.describe('US3 – chave PIX', () => {
    test('cadastro com validação e retorno à cobrança (FR-022, FR-023)', async ({ page }) => {
      const { p } = await cenario()
      const destino = '/pagamentos/configuracoes'

      await entrarComContaDeTeste(page, destino)
      await page.goto(`${destino}?aviso=pix-necessaria&voltar=/pagamentos/${p.id}/cobrar`)
      await expect(page).toHaveTitle('Chave PIX · Caronas Já')
      await expect(page.getByText('Cadastre a chave PIX para gerar cobranças.')).toBeVisible()

      const campo = page.getByLabel('Chave PIX')
      await campo.fill('   ')
      await page.getByRole('button', { name: 'Salvar' }).click()
      await expect(page.getByText('Informe a chave PIX.')).toBeVisible()

      // O maxLength impede digitar 78 caracteres; removido para conferir a validação do servidor.
      await campo.evaluate((el) => el.removeAttribute('maxlength'))
      await campo.fill('a'.repeat(78))
      await page.getByRole('button', { name: 'Salvar' }).click()
      await expect(page.getByText('A chave PIX pode ter no máximo 77 caracteres.')).toBeVisible()

      await campo.fill(CHAVE)
      await page.getByRole('button', { name: 'Salvar' }).click()
      await expect(page.getByText('Chave PIX salva')).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/pagamentos/${p.id}/cobrar$`))
      await expect(page.getByRole('heading', { level: 1 })).toContainText(`Cobrar ${p.nome}`)
    })

    test('?voltar= externo é ignorado (FR-026)', async ({ page }) => {
      await entrarComContaDeTeste(page, '/pagamentos/configuracoes')
      await page.goto('/pagamentos/configuracoes?voltar=https://exemplo.com')
      await expect(page.getByLabel('Chave PIX')).toHaveValue(CHAVE)
      await page.getByRole('button', { name: 'Salvar' }).click()

      await expect(page.getByText('Chave PIX salva')).toBeVisible()
      await expect(page).toHaveURL(/\/pagamentos$/)
      await expect(page.getByRole('heading', { name: 'Pagamentos', level: 1 })).toBeVisible()
    })

    test('link "Chave PIX" na tela de pagamentos', async ({ page }) => {
      await entrarComContaDeTeste(page, '/pagamentos')
      await page.getByRole('link', { name: 'Chave PIX' }).click()
      await expect(page).toHaveURL(/\/pagamentos\/configuracoes$/)
      await expect(page.getByRole('heading', { name: 'Chave PIX', level: 1 })).toBeVisible()
    })
  })

  test.describe('US2 – cobrar pelo WhatsApp', () => {
    test('prévia igual ao modelo da spec (FR-017, SC-006)', async ({ page }) => {
      const { p } = await cenario()

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}`)
      await page.getByRole('link', { name: 'Cobrar pelo WhatsApp' }).click()
      await expect(page).toHaveURL(new RegExp(`/pagamentos/${p.id}/cobrar$`))
      await expect(page).toHaveTitle(`Cobrar ${p.nome} · Caronas Já`)
      expect(await previa(page).innerText()).toBe(MENSAGEM)
    })

    test('desmarcar viagens atualiza a prévia e o total (FR-016)', async ({ page }) => {
      const { p } = await cenario()

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}/cobrar`)
      await page.getByRole('checkbox', { name: /· Volta/ }).uncheck()
      const texto = await previa(page).innerText()
      expect(texto).toContain('(Total Devido: R$ 10,00)')
      expect(texto).toContain('*Valor a ser pago: R$ 10,00*')
      expect(texto).toContain('- 28/09/2025 (Ida): R$ 10,00')
      expect(texto).not.toContain('(Volta)')
      await expect(page.getByText(/^Total: R\$\s10,00$/)).toBeVisible()

      await page.getByRole('checkbox', { name: /· Ida/ }).uncheck()
      await expect(page.getByText('Selecione ao menos uma viagem.')).toBeVisible()
      await expect(linkWhatsApp(page)).toHaveAttribute('aria-disabled', 'true')
      await expect(linkWhatsApp(page)).not.toHaveAttribute('href')
      await expect(page.getByRole('button', { name: 'Copiar mensagem' })).toBeDisabled()
    })

    test('link do WhatsApp com o telefone e o texto da prévia (FR-018)', async ({ page }) => {
      const { p } = await cenario()

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}/cobrar`)
      const link = linkWhatsApp(page)
      await expect(link).toHaveAttribute('target', '_blank')
      const href = (await link.getAttribute('href'))!
      expect(href.startsWith(PREFIXO_WHATSAPP)).toBe(true)
      expect(decodeURIComponent(href.slice(PREFIXO_WHATSAPP.length))).toBe(MENSAGEM)
    })

    test('copiar a mensagem (FR-019) sem gravar nada (FR-020)', async ({ page, context }) => {
      const { p, ida, volta } = await cenario()
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}/cobrar`)
      await page.getByRole('button', { name: 'Copiar mensagem' }).click()
      await expect(page.getByText('Mensagem copiada')).toBeVisible()
      // No Windows, a área de transferência devolve as quebras de linha com CR (13) antes do LF.
      const copiado = await page.evaluate(() => navigator.clipboard.readText())
      expect(copiado.split(String.fromCharCode(13)).join('')).toBe(MENSAGEM)

      for (const viagem of [ida, volta]) {
        const [participacao] = await participacoesDaViagemPelaApi(viagem)
        expect(participacao.pago_em).toBeNull()
      }
    })

    test('sem pendências não há o que cobrar (FR-015)', async ({ page }) => {
      const { p, ida, volta } = await cenario()
      const ids = [
        ...(await participacoesDaViagemPelaApi(ida)),
        ...(await participacoesDaViagemPelaApi(volta)),
      ].map((x) => x.id)
      await marcarPagoPelaApi(ids, hojeEmSaoPaulo())

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}`)
      await expect(page.getByRole('button', { name: 'Nada a cobrar' })).toBeDisabled()
      await page.goto(`/pagamentos/${p.id}/cobrar`)
      await expect(page).toHaveURL(new RegExp(`/pagamentos/${p.id}$`))
    })

    test('cobrança e configurações sem rolagem horizontal (SC-008)', async ({ page }) => {
      const { p } = await cenario()

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}/cobrar`)
      await expect(previa(page)).toBeVisible()
      expect(await semRolagemHorizontal(page)).toBe(true)
      await page.getByRole('link', { name: 'Alterar chave PIX' }).click()
      await expect(page.getByRole('heading', { name: 'Chave PIX', level: 1 })).toBeVisible()
      expect(await semRolagemHorizontal(page)).toBe(true)
    })
  })
})
