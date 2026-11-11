import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInWithPassword = vi.fn()
vi.mock('@/services/supabase/client', () => ({
  supabase: { auth: { signInWithPassword } },
}))

const { signIn } = await import('../auth.service')

beforeEach(() => {
  signInWithPassword.mockReset()
  vi.stubGlobal('navigator', { onLine: true })
})

describe('auth.service signIn', () => {
  it('não lança erro quando o login funciona', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    await expect(signIn({ email: 'a@b.com', password: '123456' })).resolves.toBeUndefined()
  })

  it.each([
    ['invalid_credentials', 'E-mail ou senha inválidos.'],
    ['email_not_confirmed', 'Confirme seu e-mail antes de entrar.'],
  ])('traduz o código %s', async (code, message) => {
    signInWithPassword.mockResolvedValue({ error: { message: 'detalhe interno', code } })
    await expect(signIn({ email: 'a@b.com', password: 'x' })).rejects.toThrow(message)
  })

  it('não expõe detalhes internos em erros desconhecidos', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'SQL secreto', code: 'outro' } })
    await expect(signIn({ email: 'a@b.com', password: 'x' })).rejects.toThrow(
      'Não foi possível concluir a operação. Tente novamente.',
    )
  })
})
