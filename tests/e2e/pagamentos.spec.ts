import { randomUUID } from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

import { hojeEmSaoPaulo } from '../../lib/format'
import {
  arquivarPelaApi,
  editarViagemPelaApi,
  email,
  entrarComContaDeTeste,
  limparDadosDeTeste,
  marcarPagoPelaApi,
  participacoesDaViagemPelaApi,
  prepararCenario,
  registrarViagemPelaApi,
  senha,
} from './helpers/passageiros'

// Regras contra condições de corrida (tasks.md): mobile e desktop rodam em paralelo na mesma
// conta. Nenhum teste afirma totais globais; toda asserção é sobre o passageiro do próprio teste.

const hoje = hojeEmSaoPaulo()
const amanha = (() => {
  const [ano, mes, dia] = hoje.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia + 1)).toISOString().slice(0, 10)
})()
const ontem = (() => {
  const [ano, mes, dia] = hoje.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia - 1)).toISOString().slice(0, 10)
})()

// "AAAA-MM-DD" → "DD/MM/AAAA"
function dataBR(data: string) {
  return data.split('-').reverse().join('/')
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

function secao(page: Page, nome: 'Pendentes' | 'Pagas') {
  return page.getByRole('region', { name: nome })
}

function itensDaSecao(page: Page, nome: 'Pendentes' | 'Pagas') {
  return secao(page, nome).locator('li')
}

function totalDevido(page: Page) {
  return page.getByTestId('total-devido')
}

// Um passageiro (R$ 10,00, telefone 11912345678) e um trajeto próprios, com Ida às 07:00 e
// Volta às 18:00 de 28/09/2025. `extras` acrescenta passageiros às duas viagens.
async function cenario(extras: { base: string; valorCentavos: number }[] = []) {
  const c = await prepararCenario({
    passageiros: [{ base: 'Pag', valorCentavos: 1000 }, ...extras],
    trajeto: { origemBase: 'Casa', destino: 'Faculdade' },
  })
  const participacoes = c.passageiros.map((p) => ({
    passageiro_id: p.id,
    valor_centavos: p.valorCentavos,
  }))
  const registrar = (sentido: 'ida' | 'volta', dataHoraLocal: string) =>
    registrarViagemPelaApi({ trajetoId: c.trajeto.id, sentido, dataHoraLocal, participacoes })
  const ida = await registrar('ida', '2025-09-28T07:00')
  const volta = await registrar('volta', '2025-09-28T18:00')
  return { c, p: c.passageiros[0], ida, volta, registrar }
}

// Id da participação do passageiro na viagem.
async function participacao(viagemId: string, passageiroId: string) {
  const lista = await participacoesDaViagemPelaApi(viagemId)
  return lista.find((x) => x.passageiro_id === passageiroId)!
}

test('sem sessão, /pagamentos leva ao login com o caminho de retorno (FR-026)', async ({
  page,
}) => {
  await page.goto('/pagamentos')

  await expect(page).toHaveURL(/\/entrar\?proximo=%2Fpagamentos$/)
})

test('sem sessão, as views e a chave PIX não devolvem dados (FR-026, SC-007)', async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  test.skip(!url || !anonKey, 'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  const anonimo = createClient(url!, anonKey!, { auth: { persistSession: false } })

  // Sem sessão, a RLS devolve 0 linhas (ou a consulta é recusada).
  for (const [tabela, colunas] of [
    ['participacoes_detalhe', 'id, pago_em'],
    ['pendencias_passageiros', 'passageiro_id, total_pendente_centavos'],
    ['perfis', 'id, chave_pix'],
  ]) {
    const { data } = await anonimo.from(tabela).select(colunas)
    expect(data ?? []).toHaveLength(0)
  }

  const { data: alteradas } = await anonimo
    .from('viagem_passageiros')
    .update({ pago_em: hoje })
    .not('id', 'is', null)
    .select('id')
  expect(alteradas ?? []).toHaveLength(0)
})

test.describe('pagamentos', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.afterAll(limparDadosDeTeste)

  test('passageiro inexistente ou de outra conta: página não encontrada (FR-026)', async ({
    page,
  }) => {
    await entrarComContaDeTeste(page, '/pagamentos')
    const id = randomUUID()

    await page.goto(`/pagamentos/${id}`)
    await expect(page.getByText('Página não encontrada')).toBeVisible()
    await page.goto(`/pagamentos/${id}/cobrar`)
    await expect(page.getByText('Página não encontrada')).toBeVisible()
    await page.goto('/pagamentos/abc')
    await expect(page.getByText('Página não encontrada')).toBeVisible()
  })

  test.describe('US1 – pendências e marcar pagamentos', () => {
    test('lista de pendências e pagamentos do passageiro', async ({ page }) => {
      const { p } = await cenario()

      await entrarComContaDeTeste(page, '/pagamentos')
      await expect(page).toHaveTitle('Pagamentos · Caronas Já')
      const nav = page
        .getByRole('navigation', { name: /Navegação (inferior|lateral)/ })
        .filter({ visible: true })
      await expect(nav.getByRole('link', { name: 'Pagamentos' })).toHaveAttribute(
        'aria-current',
        'page',
      )

      const linha = itensDaLista(page).filter({ hasText: p.nome })
      await expect(linha).toContainText('2 viagens')
      await expect(linha).toContainText(/R\$\s20,00/)

      await linha.getByRole('link', { name: p.nome }).click()
      await expect(page).toHaveURL(new RegExp(`/pagamentos/${p.id}$`))
      await expect(page.getByRole('heading', { level: 1 })).toContainText(p.nome)
      await expect(totalDevido(page)).toHaveText(/R\$\s20,00/)
      const pendentes = itensDaSecao(page, 'Pendentes')
      await expect(pendentes).toHaveCount(2)
      await expect(pendentes.nth(0)).toContainText('28/09/2025 · Ida')
      await expect(pendentes.nth(1)).toContainText('28/09/2025 · Volta')
    })

    test('marcar a Ida como paga com a data de hoje (SC-004)', async ({ page }) => {
      const { p } = await cenario()

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}`)
      await page.getByRole('checkbox', { name: /· Ida/ }).check()
      await expect(page.getByText(/^1 selecionada · R\$\s10,00$/)).toBeVisible()
      await expect(page.getByLabel('Data do pagamento')).toHaveValue(hoje)
      await page.getByRole('button', { name: 'Marcar como pagas' }).click()

      await expect(page.getByText('1 viagem marcada como paga')).toBeVisible()
      await expect(totalDevido(page)).toHaveText(/R\$\s10,00/)
      await expect(itensDaSecao(page, 'Pendentes')).toHaveCount(1)
      const pagas = itensDaSecao(page, 'Pagas')
      await expect(pagas).toHaveCount(1)
      await expect(pagas.first()).toContainText('28/09/2025 · Ida')
      await expect(pagas.first()).toContainText(`Pago em ${dataBR(hoje)}`)
    })

    test('data no futuro ou antes da viagem é recusada (FR-009)', async ({ page }) => {
      const { p, ida } = await cenario()

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}`)
      await page.getByRole('checkbox', { name: /· Ida/ }).check()
      await page.getByLabel('Data do pagamento').fill(amanha)
      await page.getByRole('button', { name: 'Marcar como pagas' }).click()
      await expect(page.getByText('A data do pagamento não pode ser no futuro.')).toBeVisible()

      await page.getByLabel('Data do pagamento').fill('2025-09-27')
      await page.getByRole('button', { name: 'Marcar como pagas' }).click()
      await expect(
        page.getByText('A data do pagamento não pode ser anterior à data da viagem.'),
      ).toBeVisible()

      await expect(itensDaSecao(page, 'Pendentes')).toHaveCount(2)
      expect((await participacao(ida, p.id)).pago_em).toBeNull()
    })

    test('"Recebi tudo" zera as pendências e tira o passageiro da lista', async ({ page }) => {
      const { p } = await cenario()

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}`)
      await page.getByRole('button', { name: 'Recebi tudo' }).click()
      const dialogo = page.getByRole('alertdialog')
      await expect(dialogo).toContainText('Marcar todas como pagas?')
      await expect(dialogo).toContainText(
        new RegExp(`2 viagens · R\\$\\s20,00\\. Data do pagamento: ${dataBR(hoje)}\\.`),
      )
      await dialogo.getByRole('button', { name: 'Marcar como pagas' }).click()

      await expect(page.getByText('2 viagens marcadas como pagas')).toBeVisible()
      await expect(page.getByText('Nenhum valor pendente')).toBeVisible()
      await expect(totalDevido(page)).toHaveText(/R\$\s0,00/)
      await expect(itensDaSecao(page, 'Pagas')).toHaveCount(2)
      await expect(page.getByRole('button', { name: 'Nada a cobrar' })).toBeDisabled()

      await page.goto('/pagamentos')
      await expect(page.getByRole('heading', { name: 'Pagamentos', level: 1 })).toBeVisible()
      await expect(itensDaLista(page).filter({ hasText: p.nome })).toHaveCount(0)
    })

    test('viagem já paga em outra aba mantém a data original (FR-011)', async ({ page }) => {
      const { p, ida, volta } = await cenario()

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}`)
      await expect(itensDaSecao(page, 'Pendentes')).toHaveCount(2)
      const idaPaga = await participacao(ida, p.id)
      await marcarPagoPelaApi([idaPaga.id], hoje)

      // A página antiga ainda mostra as duas como pendentes.
      await page.getByRole('button', { name: 'Selecionar todas' }).click()
      await page.getByLabel('Data do pagamento').fill('2025-09-29')
      await page.getByRole('button', { name: 'Marcar como pagas' }).click()

      await expect(page.getByText('1 viagem marcada como paga · 1 já estava paga')).toBeVisible()
      expect((await participacao(ida, p.id)).pago_em).toBe(hoje)
      expect((await participacao(volta, p.id)).pago_em).toBe('2025-09-29')
    })

    test('valor zero e viagem arquivada ficam fora das pendências (FR-003, FR-004)', async ({
      page,
    }) => {
      const { c, p } = await cenario()
      await registrarViagemPelaApi({
        trajetoId: c.trajeto.id,
        sentido: 'ida',
        dataHoraLocal: '2025-09-29T07:00',
        participacoes: [{ passageiro_id: p.id, valor_centavos: 0 }],
      })
      const arquivada = await registrarViagemPelaApi({
        trajetoId: c.trajeto.id,
        sentido: 'volta',
        dataHoraLocal: '2025-09-29T18:00',
        participacoes: [{ passageiro_id: p.id, valor_centavos: 1000 }],
      })
      await arquivarPelaApi('viagens', arquivada)

      await entrarComContaDeTeste(page, `/pagamentos/${p.id}`)
      await expect(itensDaSecao(page, 'Pendentes')).toHaveCount(2)
      await expect(secao(page, 'Pendentes')).not.toContainText('29/09/2025')
      await expect(totalDevido(page)).toHaveText(/R\$\s20,00/)

      await page.goto('/pagamentos')
      const linha = itensDaLista(page).filter({ hasText: p.nome })
      await expect(linha).toContainText('2 viagens')
      await expect(linha).toContainText(/R\$\s20,00/)
    })

    test('total devido na tela do passageiro (FR-013)', async ({ page }) => {
      const { p } = await cenario()

      await entrarComContaDeTeste(page, `/passageiros/${p.id}`)
      await expect(page.getByText(/^Total devido: R\$\s20,00$/)).toBeVisible()
      await page.getByRole('link', { name: 'Ver pagamentos' }).click()
      await expect(page).toHaveURL(new RegExp(`/pagamentos/${p.id}$`))
      await expect(totalDevido(page)).toHaveText(/R\$\s20,00/)
    })

    test('participação paga fica travada na edição da viagem (FR-025)', async ({ page }) => {
      const { c, p, ida } = await cenario([{ base: 'Outro', valorCentavos: 800 }])
      const outro = c.passageiros[1]
      await marcarPagoPelaApi([(await participacao(ida, p.id)).id], hoje)

      await entrarComContaDeTeste(page, `/viagens/${ida}/editar`)
      const caixa = page.getByRole('checkbox', { name: p.nome })
      await expect(caixa).toBeChecked()
      await expect(caixa).toBeDisabled()
      await expect(page.getByLabel(`Valor de ${p.nome}`)).toBeDisabled()
      await expect(page.locator('main li').filter({ hasText: p.nome })).toContainText(
        `Pago em ${dataBR(hoje)}`,
      )

      const base = { viagemId: ida, trajetoId: c.trajeto.id, sentido: 'ida' as const }
      await expect(
        editarViagemPelaApi({
          ...base,
          dataHoraLocal: '2025-09-28T07:00',
          participacoes: [
            { passageiro_id: p.id, valor_centavos: 1200 },
            { passageiro_id: outro.id, valor_centavos: 800 },
          ],
        }),
      ).rejects.toMatchObject({ code: 'CJ007' })
      await expect(
        editarViagemPelaApi({
          ...base,
          dataHoraLocal: '2025-09-28T07:00',
          participacoes: [{ passageiro_id: outro.id, valor_centavos: 800 }],
        }),
      ).rejects.toMatchObject({ code: 'CJ007' })

      // Alterar só a hora continua permitido.
      await page.getByLabel('Data e hora').fill('2025-09-28T07:30')
      await page.getByRole('button', { name: 'Salvar alterações' }).click()
      await expect(page.getByText('Viagem atualizada')).toBeVisible({ timeout: 15_000 })
      const depois = await participacao(ida, p.id)
      expect(depois.pago_em).toBe(hoje)
      expect(depois.valor_centavos).toBe(1000)
    })

    test('arquivar viagem com pagamentos pede confirmação reforçada (FR-024)', async ({ page }) => {
      const { p, ida } = await cenario()
      await marcarPagoPelaApi([(await participacao(ida, p.id)).id], hoje)

      await entrarComContaDeTeste(page, `/viagens/${ida}`)
      await page.getByRole('button', { name: 'Arquivar' }).click()
      const dialogo = page.getByRole('alertdialog')
      await expect(dialogo).toContainText('Arquivar viagem com pagamentos?')
      await expect(dialogo).toContainText('1 passageiro já pagou esta viagem.')
      await dialogo.getByRole('button', { name: 'Arquivar mesmo assim' }).click()
      await expect(page.getByText('Viagem arquivada')).toBeVisible()

      await page.goto(`/pagamentos/${p.id}`)
      await expect(itensDaSecao(page, 'Pendentes')).toHaveCount(1)
      await expect(secao(page, 'Pendentes')).toContainText('Volta')
      await expect(page.getByText('Nenhum pagamento registrado.')).toBeVisible()

      await page.goto(`/viagens/${ida}`)
      await page.getByRole('button', { name: 'Reativar' }).click()
      await expect(page.getByText('Viagem reativada')).toBeVisible()
      await page.goto(`/pagamentos/${p.id}`)
      await expect(itensDaSecao(page, 'Pagas')).toHaveCount(1)
      await expect(itensDaSecao(page, 'Pagas').first()).toContainText(`Pago em ${dataBR(hoje)}`)
    })

    test.describe('US4 – desfazer e corrigir a data', () => {
      test('alterar a data do pagamento (FR-012)', async ({ page }) => {
        const { p, ida } = await cenario()
        await marcarPagoPelaApi([(await participacao(ida, p.id)).id], hoje)

        await entrarComContaDeTeste(page, `/pagamentos/${p.id}`)
        const paga = itensDaSecao(page, 'Pagas').first()
        await paga.getByRole('button', { name: 'Alterar data' }).click()
        const dialogo = page.getByRole('alertdialog')
        await expect(dialogo).toContainText('Alterar data do pagamento')
        await expect(dialogo.getByLabel('Data do pagamento')).toHaveValue(hoje)

        await dialogo.getByLabel('Data do pagamento').fill('2025-09-27')
        await dialogo.getByRole('button', { name: 'Salvar' }).click()
        await expect(
          dialogo.getByText('A data do pagamento não pode ser anterior à data da viagem.'),
        ).toBeVisible()

        await dialogo.getByLabel('Data do pagamento').fill(ontem)
        await dialogo.getByRole('button', { name: 'Salvar' }).click()
        await expect(page.getByText('Data do pagamento alterada')).toBeVisible()
        await expect(dialogo).toBeHidden()
        await expect(itensDaSecao(page, 'Pagas').first()).toContainText(`Pago em ${dataBR(ontem)}`)
        expect((await participacao(ida, p.id)).pago_em).toBe(ontem)
      })

      test('desfazer o pagamento; cancelar não muda nada (FR-012)', async ({ page }) => {
        const { p, ida } = await cenario()
        await marcarPagoPelaApi([(await participacao(ida, p.id)).id], hoje)

        await entrarComContaDeTeste(page, `/pagamentos/${p.id}`)
        await expect(totalDevido(page)).toHaveText(/R\$\s10,00/)
        const paga = itensDaSecao(page, 'Pagas').first()

        await paga.getByRole('button', { name: 'Desfazer' }).click()
        await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click()
        await expect(page.getByRole('alertdialog')).toBeHidden()
        await expect(itensDaSecao(page, 'Pagas')).toHaveCount(1)
        expect((await participacao(ida, p.id)).pago_em).toBe(hoje)

        await paga.getByRole('button', { name: 'Desfazer' }).click()
        const dialogo = page.getByRole('alertdialog')
        await expect(dialogo).toContainText('Desfazer pagamento?')
        await expect(dialogo).toContainText('A viagem de 28/09/2025 volta a ficar pendente.')
        await dialogo.getByRole('button', { name: 'Desfazer' }).click()

        await expect(page.getByText('Pagamento desfeito')).toBeVisible()
        await expect(totalDevido(page)).toHaveText(/R\$\s20,00/)
        await expect(itensDaSecao(page, 'Pendentes')).toHaveCount(2)
        await expect(page.getByText('Nenhum pagamento registrado.')).toBeVisible()
        expect((await participacao(ida, p.id)).pago_em).toBeNull()
      })

      test('"Carregar mais" nas pagas', async ({ page }) => {
        const c = await prepararCenario({
          passageiros: [{ base: 'Muitas', valorCentavos: 500 }],
          trajeto: { origemBase: 'Casa', destino: 'Faculdade' },
        })
        const [p] = c.passageiros
        const ids: string[] = []
        for (let dia = 1; dia <= 21; dia++) {
          const viagem = await registrarViagemPelaApi({
            trajetoId: c.trajeto.id,
            sentido: 'ida',
            dataHoraLocal: `2025-08-${String(dia).padStart(2, '0')}T07:00`,
            participacoes: [{ passageiro_id: p.id, valor_centavos: 500 }],
          })
          ids.push((await participacao(viagem, p.id)).id)
        }
        await marcarPagoPelaApi(ids, hoje)

        await entrarComContaDeTeste(page, `/pagamentos/${p.id}`)
        await expect(itensDaSecao(page, 'Pagas')).toHaveCount(20)
        await page.getByRole('link', { name: 'Carregar mais' }).click()
        await expect(page).toHaveURL(new RegExp(`/pagamentos/${p.id}\\?pagas=40$`))
        await expect(itensDaSecao(page, 'Pagas')).toHaveCount(21)
        await expect(page.getByRole('link', { name: 'Carregar mais' })).toHaveCount(0)
      })
    })

    test.describe('US5 – situação de pagamento na viagem', () => {
      test('situação por passageiro e "Marcar como pago" (FR-014)', async ({ page }) => {
        const { c, p, ida, volta } = await cenario([
          { base: 'Zero', valorCentavos: 0 },
          { base: 'Pago', valorCentavos: 1000 },
        ])
        const [, zero, pago] = c.passageiros
        await marcarPagoPelaApi([(await participacao(ida, pago.id)).id], hoje)
        await arquivarPelaApi('viagens', volta)

        await entrarComContaDeTeste(page, `/viagens/${ida}`)
        const linha = (nome: string) => page.locator('main li').filter({ hasText: nome })
        await expect(linha(p.nome)).toContainText('Pendente')
        await expect(linha(zero.nome)).toContainText('Sem cobrança')
        await expect(
          linha(zero.nome).getByRole('button', { name: 'Marcar como pago' }),
        ).toHaveCount(0)
        await expect(linha(pago.nome)).toContainText(`Pago em ${dataBR(hoje)}`)
        await expect(
          linha(pago.nome).getByRole('button', { name: 'Marcar como pago' }),
        ).toHaveCount(0)
        expect(await semRolagemHorizontal(page)).toBe(true)

        await linha(p.nome).getByRole('button', { name: 'Marcar como pago' }).click()
        const dialogo = page.getByRole('alertdialog')
        await expect(dialogo).toContainText(`Marcar pagamento de ${p.nome}`)
        await expect(dialogo.getByLabel('Data do pagamento')).toHaveValue(hoje)
        await dialogo.getByRole('button', { name: 'Confirmar' }).click()

        await expect(page.getByText('Pagamento registrado')).toBeVisible()
        await expect(linha(p.nome)).toContainText(`Pago em ${dataBR(hoje)}`)
        await expect(page.getByRole('button', { name: 'Marcar como pago' })).toHaveCount(0)

        await page.goto(`/pagamentos/${p.id}`)
        // A Volta está arquivada e a Ida foi paga: nada pendente.
        await expect(page.getByText('Nenhum valor pendente')).toBeVisible()
        await expect(itensDaSecao(page, 'Pagas')).toHaveCount(1)

        await page.goto(`/viagens/${volta}`)
        await expect(linha(p.nome)).toContainText('Pendente')
        await expect(page.getByRole('button', { name: 'Marcar como pago' })).toHaveCount(0)
        expect(await semRolagemHorizontal(page)).toBe(true)
      })
    })

    test('telas de pagamentos sem rolagem horizontal (SC-008)', async ({ page }) => {
      const { p } = await cenario()

      await entrarComContaDeTeste(page, '/pagamentos')
      expect(await semRolagemHorizontal(page)).toBe(true)
      await page.goto(`/pagamentos/${p.id}`)
      await page.getByRole('checkbox', { name: /· Ida/ }).check()
      await expect(page.getByLabel('Data do pagamento')).toBeVisible()
      expect(await semRolagemHorizontal(page)).toBe(true)
    })
  })
})
