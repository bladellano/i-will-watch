<script setup lang="ts">
import { ref, watch } from 'vue'
import { posterUrl, releaseYear } from '../services/media.service'
import { MEDIA_TYPE_LABELS, WATCH_STATUS_LABELS, type TmdbSearchResult, type WatchStatus } from '../types'
import type { UserList } from '@/modules/lists/types'

const props = defineProps<{ item: TmdbSearchResult; lists: UserList[]; busy: boolean }>()
const emit = defineEmits<{ confirm: [choice: { listId: string; status: WatchStatus }] }>()

const listId = ref('')
const status = ref<WatchStatus>('ASSISTIR')

watch(
  () => props.lists,
  (lists) => {
    if (!listId.value && lists[0]) listId.value = lists[0].id
  },
  { immediate: true },
)
watch(
  () => props.item,
  () => {
    status.value = 'ASSISTIR'
  },
)
</script>

<template>
  <section aria-label="Prévia da obra" class="h-fit rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <div class="flex gap-4">
      <img
        v-if="posterUrl(props.item.poster_path)"
        :src="posterUrl(props.item.poster_path) ?? undefined"
        :alt="`Capa de ${props.item.title}`"
        class="h-48 w-32 shrink-0 rounded-lg object-cover"
      />
      <div class="min-w-0">
        <h3 class="font-semibold">{{ props.item.title }}</h3>
        <p v-if="props.item.original_title && props.item.original_title !== props.item.title" class="text-sm text-slate-400">
          {{ props.item.original_title }}
        </p>
        <p class="mt-1 text-sm text-slate-400">
          {{ MEDIA_TYPE_LABELS[props.item.media_type] }} · {{ releaseYear(props.item.release_date) }}
        </p>
        <p v-if="props.item.tmdb_rating" class="mt-1 text-sm text-slate-300">Nota TMDB: {{ props.item.tmdb_rating.toFixed(1) }}</p>
      </div>
    </div>
    <p class="mt-3 line-clamp-6 text-sm text-slate-300">{{ props.item.overview ?? 'Sinopse não disponível.' }}</p>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label for="confirm-list" class="mb-1 block text-sm text-slate-300">Lista</label>
        <select id="confirm-list" v-model="listId" class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
          <option v-for="l in props.lists" :key="l.id" :value="l.id">{{ l.name }}</option>
        </select>
      </div>
      <div>
        <label for="confirm-status" class="mb-1 block text-sm text-slate-300">Status</label>
        <select id="confirm-status" v-model="status" class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
          <option v-for="(label, value) in WATCH_STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
    </div>
    <button
      type="button"
      :disabled="props.busy || !listId"
      class="mt-4 w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      @click="emit('confirm', { listId, status })"
    >
      {{ props.busy ? 'Adicionando…' : 'Confirmar inclusão' }}
    </button>
  </section>
</template>
