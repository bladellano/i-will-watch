import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchRecentAdditions = vi.fn()
vi.mock('../../services/activity.service', () => ({ fetchRecentAdditions }))
const setLike = vi.fn()
vi.mock('@/modules/likes/services/likes.service', () => ({ setLike }))

const { useActivityStore } = await import('../activity.store')

beforeEach(() => {
  setActivePinia(createPinia())
  fetchRecentAdditions.mockReset()
  setLike.mockReset()
})

describe('activity store', () => {
  it('carrega as 25 adições mais recentes', async () => {
    fetchRecentAdditions.mockResolvedValue([{ item_id: '1' }])
    const store = useActivityStore()
    await store.load()
    expect(fetchRecentAdditions).toHaveBeenCalledWith(25)
    expect(store.items).toHaveLength(1)
    expect(store.loading).toBe(false)
  })

  it('várias instâncias simultâneas compartilham uma única busca', async () => {
    fetchRecentAdditions.mockResolvedValue([])
    const store = useActivityStore()
    await Promise.all([store.load(), store.load()])
    expect(fetchRecentAdditions).toHaveBeenCalledOnce()
  })

  it('não busca de novo dentro de 1 minuto, mas permite forçar', async () => {
    fetchRecentAdditions.mockResolvedValue([])
    const store = useActivityStore()
    await store.load()
    await store.load()
    expect(fetchRecentAdditions).toHaveBeenCalledOnce()
    await store.load(true)
    expect(fetchRecentAdditions).toHaveBeenCalledTimes(2)
  })

  it('guarda o erro e tenta de novo depois', async () => {
    fetchRecentAdditions.mockRejectedValueOnce(new Error('Não foi possível carregar as últimas obras adicionadas.'))
    const store = useActivityStore()
    await store.load()
    expect(store.error).toMatch(/últimas obras/)
    fetchRecentAdditions.mockResolvedValueOnce([])
    await store.load()
    expect(store.error).toBe('')
  })

  describe('curtidas', () => {
    const row = (over = {}) => ({ item_id: 'x', like_count: 2, liked_by_me: false, is_own: false, ...over })

    it('curte de forma otimista e confirma no serviço', async () => {
      fetchRecentAdditions.mockResolvedValue([row()])
      setLike.mockResolvedValue(undefined)
      const store = useActivityStore()
      await store.load()
      const pending = store.toggleLike('x')
      expect(store.items[0]).toMatchObject({ liked_by_me: true, like_count: 3 })
      await pending
      expect(setLike).toHaveBeenCalledWith('x', true)
      expect(store.busyLikes).toEqual([])
    })

    it('descurta ao clicar de novo', async () => {
      fetchRecentAdditions.mockResolvedValue([row({ liked_by_me: true, like_count: 3 })])
      setLike.mockResolvedValue(undefined)
      const store = useActivityStore()
      await store.load()
      await store.toggleLike('x')
      expect(setLike).toHaveBeenCalledWith('x', false)
      expect(store.items[0]).toMatchObject({ liked_by_me: false, like_count: 2 })
    })

    it('reverte e mostra erro se o servidor recusar', async () => {
      fetchRecentAdditions.mockResolvedValue([row()])
      setLike.mockRejectedValue(new Error('Não foi possível curtir. Tente novamente.'))
      const store = useActivityStore()
      await store.load()
      await store.toggleLike('x')
      expect(store.items[0]).toMatchObject({ liked_by_me: false, like_count: 2 })
      expect(store.likeError).toMatch(/curtir/)
    })

    it('ignora a própria obra e cliques durante o envio', async () => {
      fetchRecentAdditions.mockResolvedValue([row({ is_own: true }), row({ item_id: 'y' })])
      let release: () => void = () => {}
      setLike.mockReturnValue(new Promise<void>((r) => (release = r)))
      const store = useActivityStore()
      await store.load()
      await store.toggleLike('x')
      expect(setLike).not.toHaveBeenCalled()
      const first = store.toggleLike('y')
      await store.toggleLike('y')
      expect(setLike).toHaveBeenCalledOnce()
      release()
      await first
    })
  })
})
