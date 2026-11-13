import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchProfileName = vi.fn()
const updateProfileName = vi.fn()
const fetchShareLists = vi.fn()
const updateShareLists = vi.fn()
const fetchShareActivity = vi.fn()
const updateShareActivity = vi.fn()
vi.mock('../../services/profile.service', () => ({
  fetchProfileName,
  updateProfileName,
  fetchShareLists,
  updateShareLists,
  fetchShareActivity,
  updateShareActivity,
}))

const { useProfileStore } = await import('../profile.store')

beforeEach(() => {
  setActivePinia(createPinia())
  fetchProfileName.mockReset()
  updateProfileName.mockReset()
  fetchShareActivity.mockReset()
  updateShareActivity.mockReset()
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

describe('compartilhamento de listas', () => {
  beforeEach(() => {
    fetchShareLists.mockReset()
    updateShareLists.mockReset()
  })

  it('começa ligado, como o padrão do banco', () => {
    expect(useProfileStore().shareLists).toBe(true)
  })

  it('carrega a preferência salva, inclusive desligada', async () => {
    const store = useProfileStore()
    fetchShareLists.mockResolvedValue(false)
    await store.loadShareLists('u1')
    expect(store.shareLists).toBe(false)
  })

  it('salva a preferência', async () => {
    updateShareLists.mockResolvedValue(undefined)
    const store = useProfileStore()
    await store.saveShareLists('u1', true)
    expect(updateShareLists).toHaveBeenCalledWith('u1', true)
    expect(store.shareLists).toBe(true)
  })

  it('mantém o valor anterior se o servidor recusar', async () => {
    updateShareLists.mockRejectedValue(new Error('Não foi possível salvar sua preferência de compartilhamento.'))
    const store = useProfileStore()
    await expect(store.saveShareLists('u1', false)).rejects.toThrow()
    expect(store.shareLists).toBe(true)
  })
  describe('atividade na comunidade', () => {
    it('começa ligada, como o padrão do banco', () => {
      expect(useProfileStore().shareActivity).toBe(true)
    })

    it('carrega a preferência salva, inclusive desligada', async () => {
      fetchShareActivity.mockResolvedValue(false)
      const store = useProfileStore()
      await store.loadShareActivity('u1')
      expect(store.shareActivity).toBe(false)
    })

    it('salva a preferência', async () => {
      updateShareActivity.mockResolvedValue(undefined)
      const store = useProfileStore()
      await store.saveShareActivity('u1', false)
      expect(updateShareActivity).toHaveBeenCalledWith('u1', false)
      expect(store.shareActivity).toBe(false)
    })

    it('mantém o valor anterior se o servidor recusar', async () => {
      updateShareActivity.mockRejectedValue(new Error('Não foi possível salvar sua preferência de atividade.'))
      const store = useProfileStore()
      await expect(store.saveShareActivity('u1', false)).rejects.toThrow()
      expect(store.shareActivity).toBe(true)
    })
  })
})
