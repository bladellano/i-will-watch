import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchProfileName = vi.fn()
const updateProfileName = vi.fn()
vi.mock('../../services/profile.service', () => ({ fetchProfileName, updateProfileName }))

const { useProfileStore } = await import('../profile.store')

beforeEach(() => {
  setActivePinia(createPinia())
  fetchProfileName.mockReset()
  updateProfileName.mockReset()
})

describe('profile store', () => {
  it('carrega o nome uma vez por usuário', async () => {
    fetchProfileName.mockResolvedValue('Ana')
    const store = useProfileStore()
    await store.load('u1')
    await store.load('u1')
    expect(store.name).toBe('Ana')
    expect(fetchProfileName).toHaveBeenCalledOnce()
    await store.load('u1', true)
    expect(fetchProfileName).toHaveBeenCalledTimes(2)
  })

  it('guarda o erro de carregamento', async () => {
    fetchProfileName.mockRejectedValue(new Error('Não foi possível carregar seu perfil.'))
    const store = useProfileStore()
    await store.load('u1')
    expect(store.error).toBe('Não foi possível carregar seu perfil.')
  })

  it('salva o nome normalizado', async () => {
    const store = useProfileStore()
    await store.saveName('u1', '  Ana   Maria ')
    expect(updateProfileName).toHaveBeenCalledWith('u1', 'Ana Maria')
    expect(store.name).toBe('Ana Maria')
  })

  it('rejeita nome vazio ou longo sem chamar o serviço', async () => {
    const store = useProfileStore()
    await expect(store.saveName('u1', '   ')).rejects.toThrow('1 a 80')
    await expect(store.saveName('u1', 'a'.repeat(81))).rejects.toThrow('1 a 80')
    expect(updateProfileName).not.toHaveBeenCalled()
  })

  it('reset limpa o estado', async () => {
    fetchProfileName.mockResolvedValue('Ana')
    const store = useProfileStore()
    await store.load('u1')
    store.reset()
    expect(store.name).toBeNull()
  })
})
