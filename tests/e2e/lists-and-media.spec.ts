import { expect, test } from '@playwright/test'
import { login, requireTestUser, uniqueName } from './helpers'

// Fluxo crítico completo: criar lista → adicionar obra (TMDB real) → editar status/nota → remover → excluir lista.
test('lista, obra, status e nota', async ({ page }) => {
  requireTestUser()
  const listName = uniqueName('lista')
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await login(page)

  // Criar lista
  await page.getByRole('button', { name: 'Nova lista' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova lista' })
  await dialog.getByLabel('Nome').fill(listName)
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('heading', { name: listName })).toBeVisible()

  // Adicionar obra pela busca manual
  await page.getByRole('link', { name: 'Adicionar filme ou série' }).click()
  await page.getByRole('searchbox', { name: 'Título' }).fill('Matrix')
  await page.getByRole('button', { name: 'Buscar' }).click()
  const firstResult = page.getByRole('region', { name: 'Resultados da busca' }).getByRole('button').first()
  await firstResult.click()
  await page.getByLabel('Lista', { exact: true }).selectOption({ label: listName })
  await page.getByRole('button', { name: 'Confirmar inclusão' }).click()
  await expect(page.getByRole('status')).toContainText(`foi adicionada à lista ${listName}`)

  // Abrir a lista e a obra
  await page.getByRole('link', { name: 'Voltar' }).click()
  await page.getByRole('link', { name: listName }).click()
  await expect(page.getByText('1 obra').or(page.getByRole('list').getByRole('link').first())).toBeVisible()

  // Fixar e desfixar a obra
  await page.getByRole('button', { name: /^Fixar / }).first().click()
  await expect(page.getByRole('button', { name: /^Desafixar / }).first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Fixado', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Desafixar / }).first().click()
  await expect(page.getByText('Fixado', { exact: true })).toHaveCount(0)
  // Clicar na capa abre o modal de detalhes; Esc fecha
  await page.getByRole('button', { name: /^Ver detalhes de / }).first().click()
  const details = page.getByRole('dialog').filter({ hasText: 'Ver no TMDB' })
  await expect(details).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(details).toBeHidden()
  await page.getByRole('button', { name: /^Ver detalhes de / }).first().click()
  await details.getByRole('button', { name: 'Fechar' }).click()
  await expect(details).toBeHidden()
  await page.getByRole('main').getByRole('list').getByRole('link').first().click()

  // Marcar como assistida com nota
  await page.getByLabel('Status').selectOption('ASSISTIDO')
  await page.getByLabel('Nota (1 a 10, opcional)').fill('9')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status')).toContainText('Alterações salvas.')

  // Persistência após recarregar
  await page.reload()
  await expect(page.getByLabel('Status')).toHaveValue('ASSISTIDO')
  await expect(page.getByLabel('Nota (1 a 10, opcional)')).toHaveValue('9')

  // Editar uma obra já salva (regressão: erro de JS ao salvar depois de editar a nota)
  await page.getByLabel('Nota (1 a 10, opcional)').fill('8')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status')).toContainText('Alterações salvas.')

  // Validação de nota
  await page.getByLabel('Nota (1 a 10, opcional)').fill('11')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('alert')).toContainText('de 1 a 10')

  // Remover da lista (com confirmação)
  await page.getByRole('button', { name: 'Remover da lista' }).click()
  await page.getByRole('dialog', { name: 'Remover da lista' }).getByRole('button', { name: 'Remover' }).click()
  await expect(page.getByText('Esta lista está vazia.')).toBeVisible()

  // Excluir a lista
  await page.getByRole('link', { name: 'Listas' }).click()
  await page.getByRole('button', { name: `Excluir lista ${listName}` }).click()
  await page.getByRole('dialog', { name: 'Excluir lista' }).getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByRole('heading', { name: listName })).toHaveCount(0)

  // Nenhum erro de JavaScript não tratado durante o fluxo
  expect(pageErrors).toEqual([])
})

test('a lista default não oferece exclusão', async ({ page }) => {
  requireTestUser()
  await login(page)
  await expect(page.getByRole('heading', { name: 'Últimas obras adicionadas' })).toBeVisible()
  const defaultCard = page.getByRole('listitem').filter({ hasText: /padr/i }).first()
  await expect(defaultCard.getByRole('button', { name: /Editar lista/ })).toBeVisible()
  await expect(defaultCard.getByRole('button', { name: /Excluir lista/ })).toHaveCount(0)
})
