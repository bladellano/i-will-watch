<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Search } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import MediaResultCard from '@/modules/media/components/MediaResultCard.vue'
import MediaConfirmPanel from '@/modules/media/components/MediaConfirmPanel.vue'
import { addMedia, searchTmdb } from '@/modules/media/services/media.service'
import type { TmdbSearchResult, WatchStatus } from '@/modules/media/types'
import { fetchLists } from '@/modules/lists/services/lists.service'
import type { UserList } from '@/modules/lists/types'

const route = useRoute()
const router = useRouter()

// Vindo de uma captura: título pré-preenchido e conclusão da captura ao adicionar.
const captureId = typeof route.query.capture === 'string' ? route.query.capture : undefined

const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const lastQuery = ref('')
const results = ref<TmdbSearchResult[]>([])
const page = ref(0)
const totalPages = ref(0)
const searched = ref(false)
const searching = ref(false)
const searchError = ref('')

const lists = ref<UserList[]>([])
const selected = ref<TmdbSearchResult | null>(null)
const saving = ref(false)
const feedback = ref<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

const canLoadMore = computed(() => page.value > 0 && page.value < totalPages.value)

onMounted(async () => {
  try {
    lists.value = await fetchLists()
  } catch (e) {
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
  if (query.value.trim()) onSubmit()
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
  feedback.value = null
}

async function onConfirm(choice: { listId: string; status: WatchStatus }) {
  if (!selected.value) return
  saving.value = true
  feedback.value = null
  try {
    const response = await addMedia({
      tmdbId: selected.value.tmdb_id,
      mediaType: selected.value.media_type,
      listId: choice.listId,
      status: choice.status,
      captureId,
    })
    if (captureId) {
      // A captura foi concluída pela função; segue para a lista de destino.
      await router.push({ name: 'list', params: { listaId: choice.listId } })
      return
    }
    const listName = lists.value.find((l) => l.id === choice.listId)?.name ?? 'lista'
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
    <RouterLink
      :to="captureId ? { name: 'capture', params: { id: captureId } } : { name: 'home' }"
      class="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
    >
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
    <p
      v-if="feedback"
      :role="feedback.type === 'error' ? 'alert' : 'status'"
      class="mt-3 text-sm"
      :class="{ 'text-emerald-400': feedback.type === 'success', 'text-amber-300': feedback.type === 'info', 'text-red-400': feedback.type === 'error' }"
    >
      {{ feedback.text }}
    </p>

    <div class="mt-6 grid gap-6 md:grid-cols-2">
      <section aria-label="Resultados da busca">
        <p v-if="searched && results.length === 0 && !searching" class="text-sm text-slate-400">
          Nenhum filme ou série encontrado para "{{ lastQuery }}".
        </p>
        <ul class="space-y-2">
          <li v-for="item in results" :key="`${item.media_type}-${item.tmdb_id}`">
            <MediaResultCard
              :item="item"
              :selected="selected?.tmdb_id === item.tmdb_id && selected?.media_type === item.media_type"
              @select="onSelect"
            />
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

      <MediaConfirmPanel v-if="selected" :item="selected" :lists="lists" :busy="saving" @confirm="onConfirm" />
    </div>
  </AppLayout>
</template>
