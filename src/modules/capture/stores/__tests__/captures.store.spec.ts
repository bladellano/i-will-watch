import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchOpenCaptures = vi.fn()
vi.mock('../../services/capture.service', () => ({ fetchOpenCaptures }))

const { useCapturesStore } = await import('../captures.store')

beforeEach(() => {
  setActivePinia(createPinia())
  fetchOpenCaptures.mockReset()
})

describe('captures store', () => {
  it('carrega capturas pendentes', async () => {
    fetchOpenCaptures.mockResolvedValue([{ id: 'c1' }])
    const store = useCapturesStore()
    await store.load()
    expect(store.items).toEqual([{ id: 'c1' }])
    expect(store.error).toBe('')
  })

  it('limpa o erro anterior em uma nova tentativa bem-sucedida', async () => {
    const store = useCapturesStore()
    fetchOpenCaptures.mockRejectedValueOnce(new Error('Não foi possível carregar as capturas.'))
    await store.load()
    expect(store.error).toBe('Não foi possível carregar as capturas.')
    fetchOpenCaptures.mockResolvedValueOnce([])
    await store.load()
    expect(store.error).toBe('')
  })

  it('usa mensagem genérica para erros que não são Error', async () => {
    fetchOpenCaptures.mockRejectedValue('x')
    const store = useCapturesStore()
    await store.load()
    expect(store.error).toBe('Erro inesperado.')
  })
})
