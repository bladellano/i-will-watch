import { expect, test, type Page } from '@playwright/test'

export const USER = {
  email: process.env.TEST_USER_A_EMAIL ?? '',
  password: process.env.TEST_USER_A_PASSWORD ?? '',
}

/** Pula o teste (com aviso) quando não há usuário de teste configurado. */
export function requireTestUser() {
  test.skip(!USER.email || !USER.password, 'Configure .env.test.local (veja .env.test.example).')
}

export async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(USER.email)
  await page.getByLabel('Senha').fill(USER.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Suas listas' })).toBeVisible()
}

/** Dá nome único aos dados criados pelos testes, para facilitar limpeza manual. */
export const uniqueName = (prefix: string) => `e2e-${prefix}-${Date.now()}`
