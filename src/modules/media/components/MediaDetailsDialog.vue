<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { ExternalLink, X } from 'lucide-vue-next'
import { posterUrl, releaseYear } from '../services/media.service'
import { MEDIA_TYPE_LABELS, type MediaType } from '../types'

export interface MediaPreview {
  tmdb_id: number
  media_type: MediaType
  title: string
  original_title: string | null
  release_date: string | null
  overview: string | null
  poster_path: string | null
  tmdb_rating: number | null
  genres?: string[] | null
}

const props = defineProps<{ media: MediaPreview | null }>()
const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()

watch(
  () => props.media,
  (media) => {
    const el = dialog.value
    if (!el) return
    if (media && !el.open) el.showModal()
    if (!media && el.open) el.close()
  },
  { flush: 'post' },
)

/** Clique no fundo (fora do conteúdo) fecha o modal. */
function onDialogClick(event: MouseEvent) {
  if (event.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="m-auto w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-0 text-slate-100 backdrop:bg-black/70"
    @cancel.prevent="emit('close')"
    @click="onDialogClick"
  >
    <div v-if="props.media" class="relative max-h-[85dvh] overflow-y-auto p-5">
      <button
        type="button"
        class="absolute right-2 top-2 flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        aria-label="Fechar"
        @click="emit('close')"
      >
        <X class="size-5" aria-hidden="true" />
      </button>

      <div class="flex gap-4 pr-8">
        <img
          v-if="posterUrl(props.media.poster_path)"
          :src="posterUrl(props.media.poster_path) ?? undefined"
          :alt="`Capa de ${props.media.title}`"
          class="h-44 w-30 shrink-0 rounded-lg object-cover"
        />
        <div class="min-w-0">
          <h3 :id="titleId" class="text-lg font-semibold leading-snug">{{ props.media.title }}</h3>
          <p
            v-if="props.media.original_title && props.media.original_title !== props.media.title"
            class="text-sm text-slate-400"
          >
            Título original: {{ props.media.original_title }}
          </p>
          <p class="mt-1 text-sm text-slate-300">
            {{ MEDIA_TYPE_LABELS[props.media.media_type] }} · {{ releaseYear(props.media.release_date) }}
          </p>
          <p v-if="props.media.tmdb_rating" class="mt-1 text-sm text-slate-300 tabular-nums">
            Nota TMDB: {{ props.media.tmdb_rating.toFixed(1) }}
          </p>
          <ul v-if="props.media.genres && props.media.genres.length > 0" class="mt-2 flex flex-wrap gap-1.5">
            <li v-for="genre in props.media.genres" :key="genre" class="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
              {{ genre }}
            </li>
          </ul>
        </div>
      </div>

      <p class="mt-4 text-sm leading-relaxed text-slate-300">{{ props.media.overview || 'Sinopse não disponível.' }}</p>

      <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <slot name="actions" />
        <a
        :href="`https://www.themoviedb.org/${props.media.media_type}/${props.media.tmdb_id}`"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-sm text-indigo-400 underline underline-offset-2 hover:text-indigo-300"
      >
        Ver no TMDB <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  </dialog>
</template>
