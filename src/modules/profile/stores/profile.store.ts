import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchProfileName, updateProfileName } from '../services/profile.service'
import { isValidName, normalizeName } from '../utils/name'

export const useProfileStore = defineStore('profile', () => {
  const name = ref<string | null>(null)
  const loadedFor = ref<string | null>(null)
  const error = ref('')

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

  function reset() {
    name.value = null
    loadedFor.value = null
    error.value = ''
  }

  return { name, error, load, saveName, reset }
})
