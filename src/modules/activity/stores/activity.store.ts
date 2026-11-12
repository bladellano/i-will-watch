import { ref } from 'vue'
import { defineStore } from 'pinia'
import { setLike } from '@/modules/likes/services/likes.service'
import { fetchRecentAdditions } from '../services/activity.service'
import type { RecentAddition } from '../types'

const STALE_MS = 60_000

export const useActivityStore = defineStore('activity', () => {
  const items = ref<RecentAddition[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const likeError = ref('')
  const busyLikes = ref<string[]>([])
  let lastLoad = 0
  let inflight: Promise<void> | null = null

  /** Carrega uma vez por minuto (várias instâncias do widget compartilham a mesma busca). */
  function load(force = false): Promise<void> {
    if (inflight) return inflight
    if (!force && loaded.value && Date.now() - lastLoad < STALE_MS) return Promise.resolve()
    loading.value = true
    error.value = ''
    inflight = fetchRecentAdditions(25)
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

  /** Curtir/descurtir com atualização otimista; reverte se o servidor recusar. */
  async function toggleLike(itemId: string) {
    const item = items.value.find((i) => i.item_id === itemId)
    if (!item || item.is_own || busyLikes.value.includes(itemId)) return
    const next = !item.liked_by_me
    const delta = next ? 1 : -1
    likeError.value = ''
    busyLikes.value.push(itemId)
    item.liked_by_me = next
    item.like_count = Math.max(0, item.like_count + delta)
    try {
      await setLike(itemId, next)
    } catch (e) {
      item.liked_by_me = !next
      item.like_count = Math.max(0, item.like_count - delta)
      likeError.value = e instanceof Error ? e.message : 'Erro inesperado.'
    } finally {
      busyLikes.value = busyLikes.value.filter((id) => id !== itemId)
    }
  }

  function reset() {
    likeError.value = ''
    busyLikes.value = []
    items.value = []
    loaded.value = false
    error.value = ''
    lastLoad = 0
  }

  return { items, loading, loaded, error, likeError, busyLikes, load, toggleLike, reset }
})
