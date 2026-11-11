import { expect, test } from '@playwright/test'
import { login, requireTestUser } from './helpers'

test('perfil: editar o nome e vê-lo no cabeçalho', async ({ page }) => {
  requireTestUser()
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await login(page)

  await page.getByRole('link', { name: /^Meu perfil/ }).click()
  await expect(page.getByRole('heading', { name: 'Meu perfil' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toHaveAttribute('readonly', '')

  await page.getByLabel('Nome').fill('  Teste   E2E  ')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('status')).toContainText('Nome salvo.')
  await expect(page.getByLabel('Nome')).toHaveValue('Teste E2E')
  await expect(page.getByRole('banner').getByRole('link', { name: /Teste E2E/ })).toBeVisible()

  // Persiste após recarregar
  await page.reload()
  await expect(page.getByRole('banner').getByRole('link', { name: /Teste E2E/ })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('cadastro exige o nome', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByLabel('E-mail').fill('alguem@exemplo.com')
  await page.getByLabel('Senha').fill('123456')
  const submit = page.getByRole('button', { name: 'Cadastrar' })
  await expect(submit).toBeDisabled()
  await page.getByLabel('Nome').fill('Ana')
  await expect(submit).toBeEnabled()
})
