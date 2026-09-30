import { expect, test, type Page } from '@playwright/test'

import {
  email,
  entrarComContaDeTeste,
  limparPassageirosDeTeste,
  nomeDeTeste,
  senha,
} from './helpers/passageiros'

const ERRO_VALOR = 'Informe um valor entre R$ 0,00 e R$ 9.999,99, com até 2 casas decimais.'

// Cadastra pelo formulário, confere o toast e termina na lista.
async function cadastrar(page: Page, nome: string, telefone = '(11) 91234-5678', valor = '12,5') {
  await page.goto('/passageiros/novo')
  await page.getByLabel('Nome').fill(nome)
  await page.getByLabel('Telefone').fill(telefone)
  await page.getByLabel('Valor padrão por trajeto').fill(valor)
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Passageiro cadastrado')).toBeVisible()
  // O cadastro termina nos detalhes; o AvisoUrl remove o ?aviso= depois do toast.
  await expect(page).toHaveURL(/\/passageiros\/[0-9a-f-]{36}$/)
  // Volta à lista, que é o ponto de partida dos cenários.
  await page.goto('/passageiros')
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

test.describe('US2 – detalhes', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.afterAll(limparPassageirosDeTeste)

  test('cadastro leva aos detalhes com os dados formatados', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const nome = nomeDeTeste('Detalhes')
    await cadastrar(page, nome)

    // O cadastro termina nos detalhes; a lista é aberta para navegar até eles.
    await page.goto('/passageiros')
    await itemDaLista(page, nome).getByRole('link', { name: nome }).click()
    await expect(page).toHaveURL(/\/passageiros\/[0-9a-f-]{36}/)
    await expect(page.getByRole('heading', { name: nome, level: 1 })).toBeVisible()
    await expect(page.getByText('(11) 91234-5678')).toBeVisible()
    await expect(page.getByText(/R\$\s12,50/)).toBeVisible()
    await expect(page.getByText('Sem observação')).toBeVisible()
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible()
    const data = /\d{2}\/\d{2}\/\d{4}/
    await expect(page.getByText('Cadastrado em').locator('xpath=following-sibling::dd')).toHaveText(
      data,
    )
    await expect(
      page.getByText('Última alteração').locator('xpath=following-sibling::dd'),
    ).toHaveText(data)
    await expect(page.getByRole('link', { name: '(11) 91234-5678' })).toHaveAttribute(
      'href',
      'tel:+5511912345678',
    )
  })

  test('voltar retorna à lista com a mesma busca', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const nome = nomeDeTeste('Voltar')
    await cadastrar(page, nome)

    await page.goto('/passageiros')
    const busca = page.getByLabel('Buscar por nome')
    await busca.fill(nome)
    await expect(page).toHaveURL(/[?&]busca=/)
    await itemDaLista(page, nome).getByRole('link', { name: nome }).click()
    await expect(page.getByRole('heading', { name: nome, level: 1 })).toBeVisible()

    await page.getByRole('main').getByRole('link', { name: 'Passageiros', exact: true }).click()
    await expect(page).toHaveURL(/\/passageiros\?busca=/)
    await expect(page.getByLabel('Buscar por nome')).toHaveValue(nome)
  })

  test('id inválido ou inexistente mostra página não encontrada', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')

    await page.goto('/passageiros/abc')
    await expect(page.getByText('Página não encontrada')).toBeVisible()
    await page.goto('/passageiros/00000000-0000-4000-8000-000000000000')
    await expect(page.getByText('Página não encontrada')).toBeVisible()
  })
})

test.describe('US3 – edição', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.afterAll(limparPassageirosDeTeste)

  async function abrirDetalhes(page: Page, nome: string) {
    await page.goto('/passageiros')
    await itemDaLista(page, nome).getByRole('link', { name: nome }).click()
    await expect(page.getByRole('heading', { name: nome, level: 1 })).toBeVisible()
  }

  test('editar valor e observação, e cancelar sem alterar', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const nome = nomeDeTeste('Editar')
    await cadastrar(page, nome)
    await abrirDetalhes(page, nome)

    await page.getByRole('link', { name: 'Editar' }).click()
    await expect(page).toHaveURL(/\/passageiros\/[0-9a-f-]{36}\/editar$/)
    await expect(page.getByLabel('Nome')).toHaveValue(nome)
    await expect(page.getByLabel('Telefone')).toHaveValue('(11) 91234-5678')
    await expect(page.getByLabel('Valor padrão por trajeto')).toHaveValue('12,50')

    await page.getByRole('link', { name: 'Cancelar' }).click()
    await expect(page).toHaveURL(/\/passageiros\/[0-9a-f-]{36}$/)
    await expect(page.getByText(/R\$\s12,50/)).toBeVisible()

    await page.getByRole('link', { name: 'Editar' }).click()
    await page.getByLabel('Valor padrão por trajeto').fill('12')
    await page.getByLabel(/Observação/).fill('Paga por Pix')
    await page.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText('Passageiro atualizado')).toBeVisible()
    await expect(page).toHaveURL(/\/passageiros\/[0-9a-f-]{36}$/)
    await expect(page.getByText(/R\$\s12,00/)).toBeVisible()
    await expect(page.getByText('Paga por Pix')).toBeVisible()
  })

  test('renomear para o nome de outro ativo é recusado', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const outro = nomeDeTeste('Outro')
    const nome = nomeDeTeste('Renomear')
    await cadastrar(page, outro)
    await cadastrar(page, nome)
    await abrirDetalhes(page, nome)

    await page.getByRole('link', { name: 'Editar' }).click()
    await page.getByLabel('Nome').fill(outro)
    await page.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText('Já existe um passageiro ativo com esse nome.')).toBeVisible()
    await expect(page).toHaveURL(/\/editar$/)
  })

  test('sem rolagem horizontal nos detalhes e na edição', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const nome = nomeDeTeste('Layout')
    await cadastrar(page, nome)
    await abrirDetalhes(page, nome)
    expect(await semRolagemHorizontal(page), 'rolagem horizontal nos detalhes').toBe(true)

    await page.getByRole('link', { name: 'Editar' }).click()
    await expect(page.getByRole('heading', { name: 'Editar passageiro' })).toBeVisible()
    expect(await semRolagemHorizontal(page), 'rolagem horizontal na edição').toBe(true)
  })
})

test.describe('US4 – arquivar, reativar e excluir', () => {
  test.skip(!email || !senha, 'Defina E2E_EMAIL e E2E_SENHA para rodar estes cenários.')
  test.afterAll(limparPassageirosDeTeste)

  async function abrirDetalhes(page: Page, nome: string, situacao = '') {
    await page.goto(`/passageiros${situacao}`)
    await itemDaLista(page, nome).getByRole('link', { name: nome }).click()
    await expect(page.getByRole('heading', { name: nome, level: 1 })).toBeVisible()
  }

  function dialogo(page: Page) {
    return page.getByRole('alertdialog')
  }

  test('arquivar, ver em Arquivados e cancelar os diálogos', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const nome = nomeDeTeste('Arquivar')
    await cadastrar(page, nome)
    await abrirDetalhes(page, nome)

    // Cancelar não altera nada.
    await page.getByRole('button', { name: 'Arquivar', exact: true }).click()
    await expect(dialogo(page).getByText('Arquivar passageiro?')).toBeVisible()
    await dialogo(page).getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialogo(page)).toHaveCount(0)
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Arquivar', exact: true }).click()
    await dialogo(page).getByRole('button', { name: 'Arquivar', exact: true }).click()
    await expect(page.getByText('Passageiro arquivado')).toBeVisible()
    await expect(page.getByText(/Arquivado em \d{2}\/\d{2}\/\d{4}/)).toBeVisible()
    await expect(page.getByText('Este passageiro está arquivado', { exact: false })).toBeVisible()

    await page.goto('/passageiros')
    await expect(itemDaLista(page, nome)).toHaveCount(0)
    await page.getByRole('link', { name: 'Arquivados' }).click()
    await expect(page).toHaveURL(/situacao=arquivados/)
    await expect(itemDaLista(page, nome)).toBeVisible()
  })

  test('reativar é recusado se já há um ativo com o mesmo nome', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const nome = nomeDeTeste('Reativar')
    await cadastrar(page, nome)
    await abrirDetalhes(page, nome)
    await page.getByRole('button', { name: 'Arquivar', exact: true }).click()
    await dialogo(page).getByRole('button', { name: 'Arquivar', exact: true }).click()
    await expect(page.getByText('Passageiro arquivado')).toBeVisible()

    // Novo ativo com o mesmo nome (o índice único só vale entre os ativos).
    await cadastrar(page, nome)
    await abrirDetalhes(page, nome, '?situacao=arquivados')
    await page.getByRole('button', { name: 'Reativar' }).click()
    await expect(
      page.getByText(
        'Já existe um passageiro ativo com esse nome. Renomeie um deles antes de reativar.',
      ),
    ).toBeVisible()
  })

  test('reativar sem conflito volta a ativo', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const nome = nomeDeTeste('Volta')
    await cadastrar(page, nome)
    await abrirDetalhes(page, nome)
    await page.getByRole('button', { name: 'Arquivar', exact: true }).click()
    await dialogo(page).getByRole('button', { name: 'Arquivar', exact: true }).click()
    await expect(page.getByText('Passageiro arquivado')).toBeVisible()

    await page.getByRole('button', { name: 'Reativar' }).click()
    await expect(page.getByText('Passageiro reativado')).toBeVisible()
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible()
  })

  test('excluir com confirmação remove o passageiro de todos os filtros', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    const nome = nomeDeTeste('Excluir')
    await cadastrar(page, nome)
    await abrirDetalhes(page, nome)

    await page.getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(dialogo(page).getByText('Excluir passageiro?')).toBeVisible()
    await dialogo(page).getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('heading', { name: nome, level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Excluir', exact: true }).click()
    await dialogo(page).getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(page.getByText('Passageiro excluído')).toBeVisible()
    await expect(page).toHaveURL(/\/passageiros(\?.*)?$/)
    await expect(itemDaLista(page, nome)).toHaveCount(0)
    await page.goto('/passageiros?situacao=arquivados')
    await expect(itemDaLista(page, nome)).toHaveCount(0)
  })

  test('sem rolagem horizontal na lista de arquivados', async ({ page }) => {
    await entrarComContaDeTeste(page, '/passageiros')
    await page.goto('/passageiros?situacao=arquivados')
    await expect(page.getByRole('heading', { name: 'Passageiros', level: 1 })).toBeVisible()
    expect(await semRolagemHorizontal(page)).toBe(true)
  })
})
