import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useActivityStore } from '@/modules/activity/stores/activity.store'
import { setLike } from '@/modules/likes/services/likes.service'
import { fetchMediaDetails, type MediaDetails } from '@/modules/media/services/media.service'
import { hideNoteFromTimeline, updateNote } from '../services/notes.service'
import { fetchTimeline, TIMELINE_PAGE_SIZE } from '../services/timeline.service'
import type { TimelineEvent, TimelineFilter } from '../types'

const STALE_MS = 60_000

export const useTimelineStore = defineStore('timeline', () => {
  const items = ref<TimelineEvent[]>([])
  const filter = ref<TimelineFilter>('all')
  const loading = ref(false)
  const loadingMore = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const moreError = ref('')
  const hasMore = ref(false)
  const actionError = ref('')
  const busyLikes = ref<string[]>([])
  /** Modal de detalhes da obra (clique na capa): a obra e o item da timeline que o abriu. */
  const details = ref<MediaDetails | null>(null)
  const detailsEvent = ref<TimelineEvent | null>(null)
  /** `event_id` do item cujos detalhes estão sendo buscados ('' quando nenhum). */
  const detailsBusy = ref('')
  const detailsCache = new Map<string, MediaDetails>()
  let lastLoad = 0
  // Descarta respostas de buscas antigas (troca rápida de aba ou "carregar mais" durante um reload).
  let generation = 0

  const isEmpty = computed(() => loaded.value && items.value.length === 0)

  /** Primeira página do filtro atual. Sem `force`, reaproveita a carga de menos de 1 minuto. */
  async function load(force = false): Promise<void> {
    if (!force && loaded.value && Date.now() - lastLoad < STALE_MS) return
    const mine = ++generation
    loading.value = true
    loadingMore.value = false
    error.value = ''
    moreError.value = ''
    try {
      const page = await fetchTimeline(filter.value, null)
      if (mine !== generation) return
      items.value = page
      hasMore.value = page.length === TIMELINE_PAGE_SIZE
      loaded.value = true
      lastLoad = Date.now()
    } catch (e) {
      if (mine !== generation) return
      error.value = e instanceof Error ? e.message : 'Erro inesperado.'
    } finally {
      if (mine === generation) loading.value = false
    }
  }

  async function setFilter(next: TimelineFilter): Promise<void> {
    if (next === filter.value) return
    filter.value = next
    items.value = []
    loaded.value = false
    hasMore.value = false
    await load(true)
  }

  async function loadMore(): Promise<void> {
    const last = items.value[items.value.length - 1]
    if (!last || !hasMore.value || loadingMore.value || loading.value) return
    const mine = generation
    loadingMore.value = true
    moreError.value = ''
    try {
      const page = await fetchTimeline(filter.value, last)
      if (mine !== generation) return
      const known = new Set(items.value.map((i) => i.event_id))
      items.value = [...items.value, ...page.filter((i) => !known.has(i.event_id))]
      hasMore.value = page.length === TIMELINE_PAGE_SIZE
    } catch (e) {
      if (mine !== generation) return
      moreError.value = e instanceof Error ? e.message : 'Erro inesperado.'
    } finally {
      if (mine === generation) loadingMore.value = false
    }
  }

  /** Edita o próprio comentário (as Observações da obra) e reflete o texto e o "editado" no card. */
  async function saveNote(itemId: string, body: string): Promise<void> {
    const saved = await updateNote(itemId, body)
    for (const item of items.value) {
      if (item.event_type === 'comment' && item.item_id === itemId) {
        item.comment_body = saved.notes
        item.comment_edited_at = saved.notes_edited_at
      }
    }
  }

  /** Tira o próprio comentário da timeline (o texto continua nas Observações) e remove o card da lista. */
  async function hideNote(itemId: string): Promise<void> {
    await hideNoteFromTimeline(itemId)
    items.value = items.value.filter((i) => !(i.event_type === 'comment' && i.item_id === itemId))
  }

  /** Desfaz a própria curtida: o item some da timeline e o widget de obras é atualizado. */
  async function undoLike(itemId: string): Promise<void> {
    if (busyLikes.value.includes(itemId)) return
    busyLikes.value.push(itemId)
    actionError.value = ''
    try {
      await setLike(itemId, false)
      items.value = items.value.filter((i) => !(i.event_type === 'like' && i.item_id === itemId && i.is_own))
      void useActivityStore().load(true)
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : 'Erro inesperado.'
    } finally {
      busyLikes.value = busyLikes.value.filter((id) => id !== itemId)
    }
  }

  /** Abre o modal com sinopse, nota TMDB e gêneros da obra. Busca no catálogo uma vez por obra. */
  async function openDetails(event: TimelineEvent): Promise<void> {
    if (detailsBusy.value) return
    actionError.value = ''
    const cached = detailsCache.get(event.media_id)
    if (cached) {
      details.value = cached
      detailsEvent.value = event
      return
    }
    detailsBusy.value = event.event_id
    try {
      const found = await fetchMediaDetails(event.media_id)
      detailsCache.set(event.media_id, found)
      details.value = found
      detailsEvent.value = event
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : 'Erro inesperado.'
    } finally {
      detailsBusy.value = ''
    }
  }

  function closeDetails() {
    details.value = null
    detailsEvent.value = null
  }

  /** Marca os dados como velhos: a próxima abertura da home busca de novo (ex.: depois de comentar). */
  function invalidate() {
    lastLoad = 0
  }

  function reset() {
    generation++
    items.value = []
    filter.value = 'all'
    loading.value = false
    loadingMore.value = false
    loaded.value = false
    error.value = ''
    moreError.value = ''
    actionError.value = ''
    hasMore.value = false
    busyLikes.value = []
    closeDetails()
    detailsBusy.value = ''
    detailsCache.clear()
    lastLoad = 0
  }

  return {
    items,
    filter,
    loading,
    loadingMore,
    loaded,
    error,
    moreError,
    hasMore,
    actionError,
    busyLikes,
    details,
    detailsEvent,
    detailsBusy,
    isEmpty,
    load,
    setFilter,
    loadMore,
    saveNote,
    hideNote,
    undoLike,
    openDetails,
    closeDetails,
    invalidate,
    reset,
  }
})
