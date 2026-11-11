import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchOpenCaptures } from '../services/capture.service'
import type { Capture } from '../types'

export const useCapturesStore = defineStore('captures', () => {
  const items = ref<Capture[]>([])
  const loading = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      items.value = await fetchOpenCaptures()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro inesperado.'
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, load }
})
