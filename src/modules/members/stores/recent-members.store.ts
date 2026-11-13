import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchRecentMembers } from '../services/members.service'
import type { RecentMember } from '../types'

const STALE_MS = 60_000

/** Últimos membros cadastrados. Carrega uma vez por minuto, como o widget de obras. */
export const useRecentMembersStore = defineStore('recentMembers', () => {
  const items = ref<RecentMember[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  let lastLoad = 0
  let inflight: Promise<void> | null = null

  function load(force = false): Promise<void> {
    if (inflight) return inflight
    if (!force && loaded.value && Date.now() - lastLoad < STALE_MS) return Promise.resolve()
    loading.value = true
    error.value = ''
    inflight = fetchRecentMembers(25)
      .then((result) => {
        items.value = result
        loaded.value = true
        lastLoad = Date.now()
      })
      .catch((e) => {
        error.value = e instanceof Error ? e.message : 'Erro inesperado.'
      })
      .finally(() => {
        loading.value = false
        inflight = null
      })
    return inflight
  }

  function reset() {
    items.value = []
    loaded.value = false
    loading.value = false
    error.value = ''
    lastLoad = 0
  }

  return { items, loading, loaded, error, load, reset }
})
