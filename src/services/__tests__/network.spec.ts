import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestError } from '../network'

afterEach(() => vi.unstubAllGlobals())

describe('requestError', () => {
  it('usa a mensagem padrão quando há conexão', () => {
    vi.stubGlobal('navigator', { onLine: true })
    expect(requestError('Falhou.').message).toBe('Falhou.')
  })

  it('avisa sobre falta de conexão quando offline', () => {
    vi.stubGlobal('navigator', { onLine: false })
    expect(requestError('Falhou.').message).toMatch(/Sem conexão/)
  })
})
