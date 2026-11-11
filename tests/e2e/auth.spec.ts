import { expect, test } from '@playwright/test'
import { login, requireTestUser } from './helpers'

test.describe('autenticação', () => {
  test('rota privada redireciona para o login quando não há sessão', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  })

  test('formulário só habilita com e-mail e senha válidos', async ({ page }) => {
    await page.goto('/login')
    const submit = page.getByRole('button', { name: 'Entrar' })
    await expect(submit).toBeDisabled()
    await page.getByLabel('E-mail').fill('alguem@exemplo.com')
    await page.getByLabel('Senha').fill('12345')
    await expect(submit).toBeDisabled()
    await page.getByLabel('Senha').fill('123456')
    await expect(submit).toBeEnabled()
  })

  test('credenciais inválidas mostram erro sem expor detalhes internos', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('inexistente@exemplo.com')
    await page.getByLabel('Senha').fill('senha-errada-123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos.')
  })

  test('login, sessão persistente e logout', async ({ page }) => {
    requireTestUser()
    await login(page)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Suas listas' })).toBeVisible()
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})
