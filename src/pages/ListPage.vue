<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Film, Pin, PinOff, Plus, Search } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import MediaDetailsDialog from '@/modules/media/components/MediaDetailsDialog.vue'
import { fetchList } from '@/modules/lists/services/lists.service'
import { fetchListItems, setListItemPinned } from '@/modules/lists/services/list-items.service'
import { sortListItems } from '@/modules/lists/utils/order'
import type { ListDetails, ListItem } from '@/modules/lists/types'
import { posterUrl, releaseYear } from '@/modules/media/services/media.service'
import { statusBadgeClass } from '@/modules/media/utils/status-style'
import { MEDIA_TYPE_LABELS, WATCH_STATUS_LABELS, type MediaType, type WatchStatus } from '@/modules/media/types'

const route = useRoute()
const listId = computed(() => String(route.params.listaId))

const list = ref<ListDetails | null>(null)
const items = ref<ListItem[]>([])
const loading = ref(true)
const error = ref('')

const statusFilter = ref<'' | WatchStatus>('')
const typeFilter = ref<'' | MediaType>('')
const search = ref('')
const detailsItem = ref<ListItem | null>(null)
const pinBusyId = ref<string | null>(null)
const pinError = ref('')

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const filtered = computed(() => {
  const term = normalize(search.value.trim())
  return items.value.filter((item) => {
    if (statusFilter.value && item.status !== statusFilter.value) return false
    if (typeFilter.value && item.media.media_type !== typeFilter.value) return false
    if (!term) return true
    return normalize(item.media.title).includes(term) || normalize(item.media.original_title ?? '').includes(term)
  })
})

const sorted = computed(() => sortListItems(filtered.value))

async function togglePin(item: ListItem) {
  pinBusyId.value = item.id
  pinError.value = ''
  const pinned = !item.is_pinned
  try {
    await setListItemPinned(item.id, pinned)
    items.value = items.value.map((i) => (i.id === item.id ? { ...i, is_pinned: pinned } : i))
  } catch (e) {
    pinError.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    pinBusyId.value = null
  }
}

async function load() {
  loading.value = true
  error.value = ''
  list.value = null
  items.value = []
  try {
    const found = await fetchList(listId.value)
    if (!found) {
      error.value = 'Lista não encontrada.'
      return
    }
    list.value = found
    items.value = await fetchListItems(listId.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    loading.value = false
  }
}

watch(listId, load, { immediate: true })
</script>

<template>
  <AppLayout>
    <RouterLink :to="{ name: 'home' }" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
      <ArrowLeft class="h-4 w-4" aria-hidden="true" /> Listas
    </RouterLink>

    <p v-if="loading" role="status" class="text-sm text-slate-400">Carregando…</p>
    <p v-else-if="error" role="alert" class="text-sm text-red-400">
      {{ error }}
      <button type="button" class="ml-2 underline" @click="load">Tentar de novo</button>
    </p>

    <template v-else-if="list">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="truncate text-lg font-medium">{{ list.name }}</h2>
          <p v-if="list.description" class="mt-1 text-sm text-slate-400">{{ list.description }}</p>
        </div>
        <RouterLink
          :to="{ name: 'add-media' }"
          class="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          <Plus class="h-4 w-4" aria-hidden="true" /> Adicionar
        </RouterLink>
      </div>

      <div v-if="items.length > 0" class="mt-5 grid gap-2 sm:grid-cols-3">
        <div class="relative">
          <label for="search" class="sr-only">Buscar por título</label>
          <Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" aria-hidden="true" />
          <input
            id="search"
            v-model="search"
            type="search"
            placeholder="Buscar por título"
            class="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 outline-none focus:border-indigo-400"
          />
        </div>
        <div>
          <label for="status-filter" class="sr-only">Status</label>
          <select id="status-filter" v-model="statusFilter" class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            <option value="">Todos os status</option>
            <option v-for="(label, value) in WATCH_STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div>
          <label for="type-filter" class="sr-only">Tipo</label>
          <select id="type-filter" v-model="typeFilter" class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            <option value="">Filmes e séries</option>
            <option v-for="(label, value) in MEDIA_TYPE_LABELS" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
      </div>

      <p v-if="pinError" role="alert" class="mt-3 text-sm text-red-400">{{ pinError }}</p>
      <p v-if="items.length === 0" class="mt-6 text-sm text-slate-400">
        Esta lista está vazia. Use "Adicionar" para incluir um filme ou série.
      </p>
      <p v-else-if="filtered.length === 0" class="mt-6 text-sm text-slate-400">Nenhuma obra corresponde aos filtros.</p>

      <ul v-else class="mt-5 grid gap-3 sm:grid-cols-2">
        <li v-for="item in sorted" :key="item.id" class="relative">
          <RouterLink
            :to="{ name: 'list-item', params: { listaId: listId, vinculoId: item.id } }"
            :class="[
              'flex h-full gap-3 rounded-xl border bg-slate-900/60 p-2 pr-14 hover:bg-slate-800/60',
              item.is_pinned ? 'border-indigo-400/60 ring-1 ring-indigo-400/30' : 'border-slate-800',
            ]"
          >
            <div class="h-24 w-16 shrink-0" aria-hidden="true" />
            <div class="min-w-0">
              <p class="truncate font-medium">{{ item.media.title }}</p>
              <p class="mt-1 text-sm text-slate-400">
                {{ MEDIA_TYPE_LABELS[item.media.media_type] }} · {{ releaseYear(item.media.release_date) }}
              </p>
              <p class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span :class="['rounded-full px-2 py-0.5 font-medium ring-1', statusBadgeClass(item.status)]">
                  {{ WATCH_STATUS_LABELS[item.status] }}
                </span>
                <span
                  v-if="item.is_pinned"
                  class="rounded-full bg-indigo-500/20 px-2 py-0.5 font-medium text-indigo-200 ring-1 ring-indigo-400/50"
                >
                  Fixado
                </span>
                <span v-if="item.personal_rating" class="text-slate-300">★ {{ item.personal_rating }}/10</span>
              </p>
            </div>
          </RouterLink>
          <button
            type="button"
            class="absolute left-2 top-2 z-10 h-24 w-16 overflow-hidden rounded-md ring-indigo-400 transition hover:brightness-110 active:scale-[0.98]"
            :aria-label="`Ver detalhes de ${item.media.title}`"
            @click="detailsItem = item"
          >
            <img
              v-if="posterUrl(item.media.poster_path, 'w185')"
              :src="posterUrl(item.media.poster_path, 'w185') ?? undefined"
              alt=""
              loading="lazy"
              class="h-full w-full object-cover"
            />
            <span v-else class="flex h-full w-full items-center justify-center bg-slate-800 text-slate-500">
              <Film class="h-6 w-6" aria-hidden="true" />
            </span>
          </button>
          <button
            type="button"
            :aria-pressed="item.is_pinned ? 'true' : 'false'"
            :aria-label="`${item.is_pinned ? 'Desafixar' : 'Fixar'} ${item.media.title}`"
            :title="item.is_pinned ? 'Desafixar' : 'Fixar'"
            :disabled="pinBusyId === item.id"
            :class="[
              'absolute right-1 top-1 z-10 flex size-11 items-center justify-center rounded-lg hover:bg-slate-800 disabled:opacity-50',
              item.is_pinned ? 'text-indigo-300' : 'text-slate-400 hover:text-slate-100',
            ]"
            @click="togglePin(item)"
          >
            <PinOff v-if="item.is_pinned" class="size-5" aria-hidden="true" />
            <Pin v-else class="size-5" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </template>
    <MediaDetailsDialog :media="detailsItem?.media ?? null" @close="detailsItem = null" />
  </AppLayout>
</template>
