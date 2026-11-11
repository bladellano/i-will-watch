import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { login, requireTestUser } from './helpers'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Falha para violações graves (serious/critical); as demais são listadas no relatório. */
async function scan(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  const minor = violations.filter((v) => !blocking.includes(v))
  if (minor.length) console.log(`[a11y] ${label}: ${minor.map((v) => `${v.id} (${v.impact})`).join(', ')}`)
  expect(
    blocking.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    `Violações graves em ${label}`,
  ).toEqual([])
}

test('acessibilidade: telas públicas', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  await scan(page, 'login')
  await page.goto('/cadastro')
  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible()
  await scan(page, 'cadastro')
})

test('acessibilidade: telas autenticadas e diálogos', async ({ page }) => {
  requireTestUser()
  await login(page)
  await scan(page, 'home')

  await page.getByRole('button', { name: 'Nova lista' }).click()
  await expect(page.getByRole('dialog', { name: 'Nova lista' })).toBeVisible()
  await scan(page, 'diálogo nova lista')
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: 'Adicionar filme ou série' }).click()
  await expect(page.getByRole('heading', { name: 'Adicionar filme ou série' })).toBeVisible()
  await scan(page, 'adicionar')

  await page.goto('/capturar')
  await expect(page.getByRole('heading', { name: 'Nova captura' })).toBeVisible()
  await scan(page, 'nova captura')

  await page.goto('/')
  await page.getByRole('main').getByRole('listitem').first().getByRole('link').click()
  await expect(page.getByRole('main')).toBeVisible()
  await scan(page, 'lista')
})

test('teclado: primeiro Tab leva ao link "Ir para o conteúdo"', async ({ page }) => {
  requireTestUser()
  await login(page)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused()
})
