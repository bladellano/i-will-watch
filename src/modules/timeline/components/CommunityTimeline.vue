<script setup lang="ts">
import { onMounted, useId } from 'vue'
import { Users } from 'lucide-vue-next'
import CopyToListSelect from '@/modules/lists/components/CopyToListSelect.vue'
import MediaDetailsDialog from '@/modules/media/components/MediaDetailsDialog.vue'
import { useTimelineStore } from '../stores/timeline.store'
import type { TimelineFilter } from '../types'
import TimelineCommentCard from './TimelineCommentCard.vue'
import TimelineLikeCard from './TimelineLikeCard.vue'

const store = useTimelineStore()
const headingId = useId()

const FILTERS: { value: TimelineFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'comment', label: 'Comentários' },
  { value: 'like', label: 'Curtidas' },
]

const EMPTY_TEXT: Record<TimelineFilter, string> = {
  all: 'Ainda não há atividade na comunidade. Abra uma obra da sua lista e deixe o primeiro comentário.',
  comment: 'Ainda não há comentários. Abra uma obra da sua lista e deixe o primeiro.',
  like: 'Ainda não há curtidas na comunidade.',
}

onMounted(() => {
  void store.load()
})
</script>

<template>
  <section :aria-labelledby="headingId" class="mt-10 rounded-xl border border-slate-800 bg-slate-900/60">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
      <div class="flex items-center gap-3">
        <Users class="size-5 shrink-0 text-indigo-300" aria-hidden="true" />
        <div>
          <h2 :id="headingId" class="text-base font-semibold tracking-tight text-slate-100">Timeline da comunidade</h2>
          <p class="text-xs text-slate-400">O que os membros estão comentando e curtindo.</p>
        </div>
      </div>
      <div role="group" aria-label="Filtrar a timeline" class="flex gap-2 overflow-x-auto">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          type="button"
          :aria-pressed="store.filter === f.value"
          class="shrink-0 rounded-full border px-3 py-1.5 text-sm transition"
          :class="
            store.filter === f.value
              ? 'border-indigo-400 bg-indigo-500/25 text-indigo-100'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
          "
          @click="store.setFilter(f.value)"
        >
          {{ f.label }}
        </button>
      </div>
    </header>

    <ul v-if="store.loading && !store.loaded" class="divide-y divide-slate-800/70" aria-busy="true" aria-label="Carregando">
      <li v-for="n in 3" :key="n" class="flex animate-pulse gap-3 px-4 py-4 motion-reduce:animate-none">
        <div class="size-10 shrink-0 rounded-full bg-slate-800" />
        <div class="flex-1 space-y-2 py-1">
          <div class="h-3 w-2/3 rounded bg-slate-800" />
          <div class="h-12 w-full rounded bg-slate-800/70" />
        </div>
      </li>
    </ul>

    <div v-else-if="store.error && !store.loaded" role="alert" class="px-4 py-4 text-sm text-red-400">
      {{ store.error }}
      <button type="button" class="ml-1 underline underline-offset-2" @click="store.load(true)">Tentar de novo</button>
    </div>

    <p v-else-if="store.isEmpty" class="px-4 py-5 text-sm text-slate-400">{{ EMPTY_TEXT[store.filter] }}</p>

    <template v-else>
      <ol class="divide-y divide-slate-800/70" :aria-busy="store.loading">
        <template v-for="event in store.items" :key="event.event_id">
          <TimelineCommentCard v-if="event.event_type === 'comment'" :event="event" />
          <TimelineLikeCard v-else :event="event" />
        </template>
      </ol>

      <p v-if="store.actionError" role="alert" class="border-t border-slate-800 px-4 py-2 text-xs text-red-400">
        {{ store.actionError }}
      </p>

      <div v-if="store.hasMore || store.moreError" class="border-t border-slate-800 px-4 py-3 text-center">
        <p v-if="store.moreError" role="alert" class="mb-2 text-sm text-red-400">{{ store.moreError }}</p>
        <button
          type="button"
          :disabled="store.loadingMore"
          class="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          @click="store.loadMore()"
        >
          {{ store.loadingMore ? 'Carregando…' : store.moreError ? 'Tentar de novo' : 'Carregar mais' }}
        </button>
      </div>
    </template>
  </section>
  <MediaDetailsDialog :media="store.details" @close="store.closeDetails()">
    <template #actions>
      <CopyToListSelect
        v-if="store.details && store.detailsEvent && !store.detailsEvent.is_own"
        :key="store.detailsEvent.event_id"
        :tmdb-id="store.details.tmdb_id"
        :media-type="store.details.media_type"
        :title="store.details.title"
      />
    </template>
  </MediaDetailsDialog>
</template>
