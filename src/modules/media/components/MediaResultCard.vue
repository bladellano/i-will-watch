<script setup lang="ts">
import { Film, Tv } from 'lucide-vue-next'
import { posterUrl, releaseYear } from '../services/media.service'
import { MEDIA_TYPE_LABELS, type TmdbSearchResult } from '../types'

const props = defineProps<{ item: TmdbSearchResult; selected: boolean }>()
const emit = defineEmits<{ select: [item: TmdbSearchResult] }>()
</script>

<template>
  <button
    type="button"
    :aria-pressed="props.selected"
    class="flex w-full gap-3 rounded-xl border p-2 text-left transition hover:bg-slate-800/60"
    :class="props.selected ? 'border-indigo-400 bg-slate-800/60' : 'border-slate-800'"
    @click="emit('select', props.item)"
  >
    <img
      v-if="posterUrl(props.item.poster_path, 'w185')"
      :src="posterUrl(props.item.poster_path, 'w185') ?? undefined"
      :alt="`Capa de ${props.item.title}`"
      loading="lazy"
      class="h-24 w-16 shrink-0 rounded-md object-cover"
    />
    <div v-else class="flex h-24 w-16 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-500">
      <Film class="h-6 w-6" aria-hidden="true" />
    </div>
    <div class="min-w-0">
      <p class="truncate font-medium">{{ props.item.title }}</p>
      <p class="mt-1 flex items-center gap-1 text-sm text-slate-400">
        <Tv v-if="props.item.media_type === 'tv'" class="h-4 w-4" aria-hidden="true" />
        <Film v-else class="h-4 w-4" aria-hidden="true" />
        {{ MEDIA_TYPE_LABELS[props.item.media_type] }} · {{ releaseYear(props.item.release_date) }}
      </p>
    </div>
  </button>
</template>
