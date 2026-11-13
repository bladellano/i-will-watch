import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchRecentMembers = vi.fn()
vi.mock('../../services/members.service', () => ({ fetchRecentMembers }))

const { useRecentMembersStore } = await import('../recent-members.store')

beforeEach(() => {
  setActivePinia(createPinia())
  fetchRecentMembers.mockReset()
})

describe('recent members store', () => {
  it('carrega os 25 cadastros mais recentes', async () => {
    fetchRecentMembers.mockResolvedValue([{ member_id: '1' }])
    const store = useRecentMembersStore()
    await store.load()
    expect(fetchRecentMembers).toHaveBeenCalledWith(25)
    expect(store.items).toHaveLength(1)
    expect(store.loading).toBe(false)
  })

  it('várias instâncias simultâneas compartilham uma única busca', async () => {
    fetchRecentMembers.mockResolvedValue([])
    const store = useRecentMembersStore()
    await Promise.all([store.load(), store.load()])
    expect(fetchRecentMembers).toHaveBeenCalledOnce()
  })

  it('não busca de novo dentro de 1 minuto, mas permite forçar', async () => {
    fetchRecentMembers.mockResolvedValue([])
    const store = useRecentMembersStore()
    await store.load()
    await store.load()
    expect(fetchRecentMembers).toHaveBeenCalledOnce()
    await store.load(true)
    expect(fetchRecentMembers).toHaveBeenCalledTimes(2)
  })

  it('guarda o erro e tenta de novo depois', async () => {
    fetchRecentMembers.mockRejectedValueOnce(new Error('Não foi possível carregar os membros cadastrados.'))
    const store = useRecentMembersStore()
    await store.load()
    expect(store.error).toMatch(/membros/)
    fetchRecentMembers.mockResolvedValueOnce([])
    await store.load()
    expect(store.error).toBe('')
  })

  it('reset limpa o estado para o próximo usuário', async () => {
    fetchRecentMembers.mockResolvedValue([{ member_id: '1' }])
    const store = useRecentMembersStore()
    await store.load()
    store.reset()
    expect(store.items).toEqual([])
    expect(store.loaded).toBe(false)
  })
})
