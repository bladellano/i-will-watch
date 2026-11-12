import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchProfileName, fetchShareLists, updateProfileName, updateShareLists } from '../services/profile.service'
import { isValidName, normalizeName } from '../utils/name'

export const useProfileStore = defineStore('profile', () => {
  const name = ref<string | null>(null)
  const loadedFor = ref<string | null>(null)
  const error = ref('')
  /** Se as listas do membro ficam visíveis para os outros membros (modal do widget). Padrão ligado, como no banco. */
  const shareLists = ref(true)

  async function load(userId: string, force = false) {
    if (!force && loadedFor.value === userId) return
    error.value = ''
    try {
      name.value = await fetchProfileName(userId)
      loadedFor.value = userId
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro inesperado.'
    }
  }

  async function saveName(userId: string, raw: string) {
    if (!isValidName(raw)) throw new Error('Informe um nome de 1 a 80 caracteres.')
    const clean = normalizeName(raw) as string
    await updateProfileName(userId, clean)
    name.value = clean
    loadedFor.value = userId
  }

  async function loadShareLists(userId: string) {
    shareLists.value = await fetchShareLists(userId)
  }

  /** Em caso de falha o valor anterior é mantido e o erro sobe para a tela. */
  async function saveShareLists(userId: string, share: boolean) {
    await updateShareLists(userId, share)
    shareLists.value = share
  }

  function reset() {
    name.value = null
    loadedFor.value = null
    error.value = ''
    shareLists.value = true
  }

  return { name, error, shareLists, load, saveName, loadShareLists, saveShareLists, reset }
})
