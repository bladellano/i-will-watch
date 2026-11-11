import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchListSummaries = vi.fn()
const createList = vi.fn()
const updateList = vi.fn()
const deleteList = vi.fn()
vi.mock('../../services/lists.service', () => ({ fetchListSummaries, createList, updateList, deleteList }))

const { useListsStore } = await import('../lists.store')

beforeEach(() => {
  setActivePinia(createPinia())
  for (const fn of [fetchListSummaries, createList, updateList, deleteList]) fn.mockReset()
})

describe('lists store', () => {
  it('carrega as listas', async () => {
    fetchListSummaries.mockResolvedValue([{ id: '1', name: 'Padrão' }])
    const store = useListsStore()
    await store.load()
    expect(store.lists).toHaveLength(1)
    expect(store.error).toBe('')
    expect(store.loading).toBe(false)
  })

  it('guarda a mensagem de erro quando o carregamento falha', async () => {
    fetchListSummaries.mockRejectedValue(new Error('Não foi possível carregar suas listas.'))
    const store = useListsStore()
    await store.load()
    expect(store.error).toBe('Não foi possível carregar suas listas.')
    expect(store.loading).toBe(false)
  })

  it('recarrega depois de criar, editar e remover', async () => {
    fetchListSummaries.mockResolvedValue([])
    const store = useListsStore()
    await store.create({ name: 'Nova', description: '' })
    await store.update('1', { name: 'Editada', description: '' })
    await store.remove('1')
    expect(createList).toHaveBeenCalledOnce()
    expect(updateList).toHaveBeenCalledWith('1', { name: 'Editada', description: '' })
    expect(deleteList).toHaveBeenCalledWith('1')
    expect(fetchListSummaries).toHaveBeenCalledTimes(3)
  })

  it('propaga o erro de criação para a tela tratar', async () => {
    createList.mockRejectedValue(new Error('Não foi possível criar a lista.'))
    const store = useListsStore()
    await expect(store.create({ name: 'x', description: '' })).rejects.toThrow('criar a lista')
  })
})
