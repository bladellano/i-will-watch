<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Film, Plus, Search } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import { fetchList } from '@/modules/lists/services/lists.service'
import { fetchListItems } from '@/modules/lists/services/list-items.service'
import type { ListDetails, ListItem } from '@/modules/lists/types'
import { posterUrl, releaseYear } from '@/modules/media/services/media.service'
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

      <p v-if="items.length === 0" class="mt-6 text-sm text-slate-400">
        Esta lista está vazia. Use "Adicionar" para incluir um filme ou série.
      </p>
      <p v-else-if="filtered.length === 0" class="mt-6 text-sm text-slate-400">Nenhuma obra corresponde aos filtros.</p>

      <ul v-else class="mt-5 grid gap-3 sm:grid-cols-2">
        <li v-for="item in filtered" :key="item.id">
          <RouterLink
            :to="{ name: 'list-item', params: { listaId: listId, vinculoId: item.id } }"
            class="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-2 hover:bg-slate-800/60"
          >
            <img
              v-if="posterUrl(item.media.poster_path, 'w185')"
              :src="posterUrl(item.media.poster_path, 'w185') ?? undefined"
              :alt="`Capa de ${item.media.title}`"
              loading="lazy"
              class="h-24 w-16 shrink-0 rounded-md object-cover"
            />
            <div v-else class="flex h-24 w-16 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-500">
              <Film class="h-6 w-6" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <p class="truncate font-medium">{{ item.media.title }}</p>
              <p class="mt-1 text-sm text-slate-400">
                {{ MEDIA_TYPE_LABELS[item.media.media_type] }} · {{ releaseYear(item.media.release_date) }}
              </p>
              <p class="mt-2 text-xs">
                <span class="rounded-full bg-slate-800 px-2 py-0.5 text-slate-200">{{ WATCH_STATUS_LABELS[item.status] }}</span>
                <span v-if="item.personal_rating" class="ml-2 text-slate-300">★ {{ item.personal_rating }}/10</span>
              </p>
            </div>
          </RouterLink>
        </li>
      </ul>
    </template>
  </AppLayout>
</template>
