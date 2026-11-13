import { expect, test } from '@playwright/test'
import { login, requireTestUser, uniqueName } from './helpers'

// Fluxo da timeline: criar lista → adicionar obra → escrever nas Observações e salvar → ver na home → editar →
// tirar da timeline (o texto continua nas Observações) → editar o texto e salvar publica de novo.
test('Observações salvas aparecem na timeline da home; editar e tirar da timeline', async ({ page }) => {
  requireTestUser()
  const listName = uniqueName('timeline')
  const text = `Comecei ontem, clima dos anos 80. ${uniqueName('obs')}`
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await login(page)

  // Lista + obra (TMDB real), como no fluxo principal.
  await page.getByRole('button', { name: 'Nova lista' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova lista' })
  await dialog.getByLabel('Nome').fill(listName)
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('heading', { name: listName })).toBeVisible()
  await page.getByRole('link', { name: 'Adicionar filme ou série' }).click()
  await page.getByRole('searchbox', { name: 'Título' }).fill('Matrix')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('region', { name: 'Resultados da busca' }).getByRole('button').first().click()
  await page.getByLabel('Lista', { exact: true }).selectOption({ label: listName })
  await page.getByRole('button', { name: 'Confirmar inclusão' }).click()
  await expect(page.getByRole('status')).toContainText(`foi adicionada à lista ${listName}`)
  await page.getByRole('link', { name: 'Voltar' }).click()
  await page.getByRole('link', { name: listName }).click()
  await page.getByRole('main').getByRole('list').getByRole('link').first().click()

  // Observações com aviso de publicação; salvar publica.
  await expect(page.getByText('Ao salvar, este texto aparece na timeline da comunidade')).toBeVisible()
  await page.getByLabel('Observações').fill(text)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status')).toContainText('As observações estão na timeline da comunidade')
  await expect(page.getByText('Publicado na timeline.')).toBeVisible()

  // Aparece na timeline da home.
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Timeline da comunidade' })).toBeVisible()
  const card = page.getByRole('listitem').filter({ hasText: text })
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('Você')
  await expect(card).toContainText('comentou em')

  // Clicar na capa abre o modal de detalhes (como em "Últimas obras adicionadas"); Esc fecha.
  await card.getByRole('button', { name: /^Ver detalhes de / }).click()
  const details = page.getByRole('dialog').filter({ hasText: 'Ver no TMDB' })
  await expect(details).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(details).toBeHidden()

  // Filtros: a aba Curtidas não mostra o comentário; Comentários mostra.
  await page.getByRole('button', { name: 'Curtidas', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Curtidas', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('listitem').filter({ hasText: text })).toHaveCount(0)
  await page.getByRole('button', { name: 'Comentários', exact: true }).click()
  await expect(card).toHaveCount(1)

  // Editar pelo menu ⋯ (teclado: Esc fecha o menu).
  await card.getByRole('button', { name: 'Opções do comentário' }).click()
  await expect(page.getByRole('menuitem', { name: 'Editar' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem', { name: 'Editar' })).toHaveCount(0)
  await card.getByRole('button', { name: 'Opções do comentário' }).click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  await card.getByLabel('Editar comentário').fill(`${text} revisado`)
  await card.getByRole('button', { name: 'Salvar' }).click()
  await expect(card).toContainText('revisado')
  await expect(card).toContainText('(editado)')

  // Tirar da timeline (com confirmação): o card some, mas o texto continua nas Observações.
  await card.getByRole('button', { name: 'Opções do comentário' }).click()
  await page.getByRole('menuitem', { name: 'Tirar da timeline' }).click()
  await page.getByRole('dialog', { name: 'Tirar da timeline' }).getByRole('button', { name: 'Tirar da timeline' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: text })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: text })).toHaveCount(0)

  await page.getByRole('link', { name: listName }).click()
  await page.getByRole('main').getByRole('list').getByRole('link').first().click()
  await expect(page.getByLabel('Observações')).toHaveValue(`${text} revisado`)
  await expect(page.getByText('Fora da timeline.')).toBeVisible()

  // Salvar sem mexer no texto não republica; editar o texto e salvar publica de novo.
  await page.getByLabel('Nota (1 a 10, opcional)').fill('9')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status')).toContainText('Alterações salvas.')
  await expect(page.getByText('Fora da timeline.')).toBeVisible()
  await page.getByLabel('Observações').fill(`${text} segunda versão`)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Publicado na timeline.')).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('listitem').filter({ hasText: `${text} segunda versão` })).toHaveCount(1)

  // Limpeza: excluir a lista de teste.
  await page.getByRole('button', { name: `Excluir lista ${listName}` }).click()
  await page.getByRole('dialog', { name: 'Excluir lista' }).getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByRole('heading', { name: listName })).toHaveCount(0)

  expect(pageErrors).toEqual([])
})

test('perfil: liga e desliga a atividade na comunidade', async ({ page }) => {
  requireTestUser()
  await login(page)
  await page.goto('/perfil')
  const toggle = page.getByRole('switch', { name: /Mostrar minha atividade na comunidade/ })
  await expect(toggle).toBeEnabled()
  const initial = await toggle.isChecked()
  await toggle.click()
  await expect(page.getByRole('status').filter({ hasText: 'timeline da comunidade' })).toBeVisible()
  await expect(toggle).toBeChecked({ checked: !initial })
  // Restaura o valor original.
  await toggle.click()
  await expect(toggle).toBeChecked({ checked: initial })
})
