import { expect, test } from '@playwright/test'
import { login, requireTestUser, uniqueName } from './helpers'

// A IA NUNCA é chamada de verdade: a função identify-media é interceptada (sem custo OpenAI).
test('captura: aviso de custo, limite simulado e descarte', async ({ page }) => {
  requireTestUser()
  const title = uniqueName('captura')
  let identifyCalls = 0

  await page.route('**/functions/v1/identify-media', async (route) => {
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
    }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    identifyCalls += 1
    return route.fulfill({
      status: 429,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Limite de 10 identificações por IA a cada 24 horas atingido. Use a busca manual.' }),
    })
  })

  await login(page)
  await page.getByRole('link', { name: 'Nova captura' }).click()
  await page.getByLabel('Título (opcional)').fill(title)
  await page.getByLabel('Origem da indicação (opcional)').fill('Amigo')
  await page.getByRole('button', { name: 'Salvar captura' }).click()

  // Salvar não aciona IA
  await expect(page.getByRole('heading', { name: 'Captura' })).toBeVisible()
  expect(identifyCalls).toBe(0)

  // Cancelar o aviso de custo não aciona IA
  await page.getByRole('button', { name: 'Identificar com IA' }).click()
  const aiDialog = page.getByRole('dialog', { name: 'Identificar com IA' })
  await expect(aiDialog).toContainText('pode gerar custo')
  await aiDialog.getByRole('button', { name: 'Cancelar' }).click()
  expect(identifyCalls).toBe(0)

  // Confirmar aciona uma única chamada (simulada) e mostra a mensagem do servidor
  await page.getByRole('button', { name: 'Identificar com IA' }).click()
  await aiDialog.getByRole('button', { name: 'Identificar' }).click()
  await expect(page.getByRole('alert').first()).toContainText('Limite de 10 identificações')
  expect(identifyCalls).toBe(1)

  // A captura aparece como pendente na home
  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.getByRole('region', { name: 'Capturas pendentes' })).toContainText(title)

  // Descartar (limpeza)
  await page.getByRole('link', { name: title }).click()
  await page.getByRole('button', { name: 'Descartar' }).click()
  await page.getByRole('dialog', { name: 'Descartar captura' }).getByRole('button', { name: 'Descartar' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('region', { name: 'Capturas pendentes' })).not.toContainText(title)
})
