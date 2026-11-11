<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Search } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import MediaResultCard from '@/modules/media/components/MediaResultCard.vue'
import { addMedia, posterUrl, releaseYear, searchTmdb } from '@/modules/media/services/media.service'
import {
  MEDIA_TYPE_LABELS,
  WATCH_STATUS_LABELS,
  type TmdbSearchResult,
  type WatchStatus,
} from '@/modules/media/types'
import { fetchLists } from '@/modules/lists/services/lists.service'
import type { UserList } from '@/modules/lists/types'

const query = ref('')
const lastQuery = ref('')
const results = ref<TmdbSearchResult[]>([])
const page = ref(0)
const totalPages = ref(0)
const searched = ref(false)
const searching = ref(false)
const searchError = ref('')

const lists = ref<UserList[]>([])
const selected = ref<TmdbSearchResult | null>(null)
const listId = ref('')
const status = ref<WatchStatus>('ASSISTIR')
const saving = ref(false)
const feedback = ref<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

const canLoadMore = computed(() => page.value > 0 && page.value < totalPages.value)

onMounted(async () => {
  try {
    lists.value = await fetchLists()
    listId.value = lists.value[0]?.id ?? ''
  } catch (e) {
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
})

async function runSearch(nextPage: number) {
  searching.value = true
  searchError.value = ''
  try {
    const response = await searchTmdb(lastQuery.value, nextPage)
    results.value = nextPage === 1 ? response.results : [...results.value, ...response.results]
    page.value = response.page
    totalPages.value = response.total_pages
    searched.value = true
  } catch (e) {
    searchError.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    searching.value = false
  }
}

function onSubmit() {
  const trimmed = query.value.trim()
  if (!trimmed || searching.value) return
  lastQuery.value = trimmed
  selected.value = null
  feedback.value = null
  results.value = []
  void runSearch(1)
}

function onSelect(item: TmdbSearchResult) {
  selected.value = item
  status.value = 'ASSISTIR'
  feedback.value = null
}

async function onConfirm() {
  if (!selected.value || !listId.value) return
  saving.value = true
  feedback.value = null
  try {
    const response = await addMedia({
      tmdbId: selected.value.tmdb_id,
      mediaType: selected.value.media_type,
      listId: listId.value,
      status: status.value,
    })
    const listName = lists.value.find((l) => l.id === listId.value)?.name ?? 'lista'
    feedback.value = response.already_in_list
      ? { type: 'info', text: `"${selected.value.title}" já está na lista ${listName}.` }
      : { type: 'success', text: `"${selected.value.title}" foi adicionada à lista ${listName}.` }
    if (!response.already_in_list) selected.value = null
  } catch (e) {
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <RouterLink :to="{ name: 'home' }" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
      <ArrowLeft class="h-4 w-4" aria-hidden="true" /> Voltar
    </RouterLink>
    <h2 class="text-lg font-medium">Adicionar filme ou série</h2>

    <form class="mt-4 flex gap-2" role="search" @submit.prevent="onSubmit">
      <label for="title" class="sr-only">Título</label>
      <input
        id="title"
        v-model="query"
        type="search"
        maxlength="100"
        placeholder="Digite o título"
        class="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-indigo-400"
      />
      <button
        type="submit"
        :disabled="searching || !query.trim()"
        class="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Search class="h-4 w-4" aria-hidden="true" />
        {{ searching && page === 0 ? 'Buscando…' : 'Buscar' }}
      </button>
    </form>

    <p v-if="searchError" role="alert" class="mt-3 text-sm text-red-400">{{ searchError }}</p>
    <p v-if="feedback" :role="feedback.type === 'error' ? 'alert' : 'status'" class="mt-3 text-sm"
       :class="{ 'text-emerald-400': feedback.type === 'success', 'text-amber-300': feedback.type === 'info', 'text-red-400': feedback.type === 'error' }">
      {{ feedback.text }}
    </p>

    <div class="mt-6 grid gap-6 md:grid-cols-2">
      <section aria-label="Resultados da busca">
        <p v-if="searched && results.length === 0 && !searching" class="text-sm text-slate-400">
          Nenhum filme ou série encontrado para "{{ lastQuery }}".
        </p>
        <ul class="space-y-2">
          <li v-for="item in results" :key="`${item.media_type}-${item.tmdb_id}`">
            <MediaResultCard :item="item" :selected="selected?.tmdb_id === item.tmdb_id && selected?.media_type === item.media_type" @select="onSelect" />
          </li>
        </ul>
        <button
          v-if="canLoadMore"
          type="button"
          :disabled="searching"
          class="mt-3 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          @click="runSearch(page + 1)"
        >
          {{ searching ? 'Carregando…' : 'Carregar mais' }}
        </button>
      </section>

      <section v-if="selected" aria-label="Prévia da obra" class="h-fit rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="flex gap-4">
          <img
            v-if="posterUrl(selected.poster_path)"
            :src="posterUrl(selected.poster_path) ?? undefined"
            :alt="`Capa de ${selected.title}`"
            class="h-48 w-32 shrink-0 rounded-lg object-cover"
          />
          <div class="min-w-0">
            <h3 class="font-semibold">{{ selected.title }}</h3>
            <p v-if="selected.original_title && selected.original_title !== selected.title" class="text-sm text-slate-400">
              {{ selected.original_title }}
            </p>
            <p class="mt-1 text-sm text-slate-400">
              {{ MEDIA_TYPE_LABELS[selected.media_type] }} · {{ releaseYear(selected.release_date) }}
            </p>
            <p v-if="selected.tmdb_rating" class="mt-1 text-sm text-slate-300">
              Nota TMDB: {{ selected.tmdb_rating.toFixed(1) }}
            </p>
          </div>
        </div>
        <p class="mt-3 line-clamp-6 text-sm text-slate-300">{{ selected.overview ?? 'Sinopse não disponível.' }}</p>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label for="list" class="mb-1 block text-sm text-slate-300">Lista</label>
            <select id="list" v-model="listId" class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
              <option v-for="l in lists" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
          </div>
          <div>
            <label for="status" class="mb-1 block text-sm text-slate-300">Status</label>
            <select id="status" v-model="status" class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
              <option v-for="(label, value) in WATCH_STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          :disabled="saving || !listId"
          class="mt-4 w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          @click="onConfirm"
        >
          {{ saving ? 'Adicionando…' : 'Confirmar inclusão' }}
        </button>
      </section>
    </div>
  </AppLayout>
</template>
