import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInWithPassword = vi.fn()
const signInWithOAuth = vi.fn()
vi.mock('@/services/supabase/client', () => ({
  supabase: { auth: { signInWithPassword, signInWithOAuth } },
}))

const { signIn, signInWithGoogle } = await import('../auth.service')

beforeEach(() => {
  signInWithPassword.mockReset()
  signInWithOAuth.mockReset()
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

describe('auth.service signInWithGoogle', () => {
  it('inicia o OAuth do Google com o redirect informado', async () => {
    signInWithOAuth.mockResolvedValue({ error: null })
    await signInWithGoogle('http://localhost:5173/capturar')
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:5173/capturar' },
    })
  })

  it('traduz falhas do provedor sem expor detalhes internos', async () => {
    signInWithOAuth.mockResolvedValue({ error: { message: 'detalhe interno', code: 'outro' } })
    await expect(signInWithGoogle('http://localhost:5173/')).rejects.toThrow(
      'Não foi possível concluir a operação. Tente novamente.',
    )
  })
})
