import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchMemberLists = vi.fn()
const fetchMemberListItems = vi.fn()
vi.mock('../../services/members.service', () => ({ fetchMemberLists, fetchMemberListItems }))

const { useMembersStore } = await import('../members.store')

const list = (over = {}) => ({ id: 'l1', name: 'Favoritos', description: null, is_default: false, item_count: 2, ...over })

beforeEach(() => {
  setActivePinia(createPinia())
  fetchMemberLists.mockReset()
  fetchMemberListItems.mockReset()
})

describe('members store', () => {
  it('abre as listas do membro', async () => {
    fetchMemberLists.mockResolvedValue([list()])
    const store = useMembersStore()
    await store.openMember('m1', 'Ana')
    expect(fetchMemberLists).toHaveBeenCalledWith('m1')
    expect(store.memberName).toBe('Ana')
    expect(store.lists).toHaveLength(1)
    expect(store.listsLoading).toBe(false)
  })

  it('abre uma lista, mostra as obras e volta para as listas', async () => {
    fetchMemberLists.mockResolvedValue([list()])
    fetchMemberListItems.mockResolvedValue([{ id: 'i1', title: 'Matrix' }])
    const store = useMembersStore()
    await store.openMember('m1', 'Ana')
    await store.openList(store.lists[0])
    expect(fetchMemberListItems).toHaveBeenCalledWith('l1')
    expect(store.items).toEqual([{ id: 'i1', title: 'Matrix' }])
    store.backToLists()
    expect(store.activeList).toBeNull()
    expect(store.items).toEqual([])
  })

  it('guarda o erro das listas e tenta de novo', async () => {
    fetchMemberLists.mockRejectedValueOnce(new Error('Não foi possível carregar as listas deste membro.'))
    const store = useMembersStore()
    await store.openMember('m1', 'Ana')
    expect(store.listsError).toMatch(/listas/)
    fetchMemberLists.mockResolvedValueOnce([list()])
    await store.retry()
    expect(store.listsError).toBe('')
    expect(store.lists).toHaveLength(1)
  })

  it('guarda o erro das obras e tenta de novo a lista aberta', async () => {
    fetchMemberLists.mockResolvedValue([list()])
    fetchMemberListItems.mockRejectedValueOnce(new Error('Não foi possível carregar as obras desta lista.'))
    const store = useMembersStore()
    await store.openMember('m1', 'Ana')
    await store.openList(store.lists[0])
    expect(store.itemsError).toMatch(/obras/)
    fetchMemberListItems.mockResolvedValueOnce([{ id: 'i1', title: 'Matrix' }])
    await store.retry()
    expect(store.itemsError).toBe('')
    expect(store.items).toHaveLength(1)
  })

  it('descarta a resposta de uma lista aberta antes da mais recente', async () => {
    fetchMemberLists.mockResolvedValue([list({ id: 'l1' }), list({ id: 'l2', name: 'Outra' })])
    let resolveFirst: (value: unknown) => void = () => {}
    fetchMemberListItems.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
    fetchMemberListItems.mockResolvedValueOnce([{ id: 'b1', title: 'Segunda' }])
    const store = useMembersStore()
    await store.openMember('m1', 'Ana')
    const first = store.openList(store.lists[0])
    await store.openList(store.lists[1])
    resolveFirst([{ id: 'a1', title: 'Primeira' }])
    await first
    expect(store.activeList?.id).toBe('l2')
    expect(store.items).toEqual([{ id: 'b1', title: 'Segunda' }])
  })

  it('reset limpa o estado e descarta buscas em andamento', async () => {
    let resolveLists: (value: unknown) => void = () => {}
    fetchMemberLists.mockImplementationOnce(() => new Promise((r) => (resolveLists = r)))
    const store = useMembersStore()
    const pending = store.openMember('m1', 'Ana')
    store.reset()
    resolveLists([list()])
    await pending
    expect(store.memberId).toBeNull()
    expect(store.lists).toEqual([])
  })
})
