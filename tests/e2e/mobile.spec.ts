import { expect, test } from '@playwright/test'
import { login, requireTestUser } from './helpers'

// Regressão: no celular o painel de confirmação ficava abaixo de toda a lista e o botão não aparecia.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('mobile: ao escolher um resultado, o botão de adicionar fica visível', async ({ page }) => {
  requireTestUser()
  await login(page)
  await page.goto('/adicionar')
  await page.getByRole('searchbox', { name: 'Título' }).fill('Matrix')
  await page.getByRole('button', { name: 'Buscar' }).click()
  const results = page.getByRole('region', { name: 'Resultados da busca' }).getByRole('button')
  await results.first().click()
  await expect(page.getByRole('button', { name: 'Confirmar inclusão' })).toBeInViewport()

  // Trocar de resultado também leva ao painel
  await page.getByRole('region', { name: 'Resultados da busca' }).scrollIntoViewIfNeeded()
  await results.nth(1).tap()
  await expect(page.getByRole('button', { name: 'Confirmar inclusão' })).toBeInViewport()
})
