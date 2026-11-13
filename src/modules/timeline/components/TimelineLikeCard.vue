<script setup lang="ts">
import { computed } from 'vue'
import { Film, Heart, Tv } from 'lucide-vue-next'
import CopyToListSelect from '@/modules/lists/components/CopyToListSelect.vue'
import { posterUrl, releaseYear } from '@/modules/media/services/media.service'
import { useTimelineStore } from '../stores/timeline.store'
import type { TimelineEvent } from '../types'
import { avatarClass, avatarInitial } from '../utils/avatar'
import { formatRelativeTime } from '../utils/relative-time'

const props = defineProps<{ event: TimelineEvent }>()
const store = useTimelineStore()

const when = computed(() => formatRelativeTime(props.event.occurred_at))
const ownerIsMe = computed(() => props.event.owner_name === 'Você')
const busy = computed(() => !!props.event.item_id && store.busyLikes.includes(props.event.item_id))
</script>

<template>
  <li class="flex gap-3 px-4 py-4">
    <span
      class="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      :class="avatarClass(event.actor_name)"
      aria-hidden="true"
    >
      {{ avatarInitial(event.actor_name) }}
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-sm leading-snug text-slate-300">
        <span class="font-semibold text-slate-100">{{ event.actor_name }}</span>
        curtiu
        <template v-if="ownerIsMe">a sua adição:</template>
        <template v-else>a adição de {{ event.owner_name }}: </template>
        <span class="font-medium text-indigo-300"> {{ event.title }}</span>
        <span class="tabular-nums text-slate-400"> ({{ releaseYear(event.release_date) }})</span>
      </p>
      <div class="mt-0.5 flex flex-wrap items-center gap-3">
        <time :datetime="event.occurred_at" class="text-xs text-slate-400">{{ when }}</time>
        <button
          v-if="event.is_own && event.item_id"
          type="button"
          :disabled="busy"
          class="inline-flex min-h-6 items-center gap-1 rounded text-xs text-rose-400 hover:text-rose-300 disabled:opacity-60"
          :aria-label="`Remover minha curtida de ${event.title}`"
          @click="store.undoLike(event.item_id)"
        >
          <Heart class="size-3.5 fill-current" aria-hidden="true" /> Desfazer curtida
        </button>
      </div>
      <CopyToListSelect v-if="!event.is_own" :tmdb-id="event.tmdb_id" :media-type="event.media_type" :title="event.title" />
    </div>
    <button
      type="button"
      class="h-16 w-11 shrink-0 overflow-hidden rounded bg-slate-800 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      :aria-label="`Ver detalhes de ${event.title}`"
      :disabled="store.detailsBusy !== ''"
      @click="store.openDetails(event)"
    >
      <img
        v-if="posterUrl(event.poster_path, 'w185')"
        :src="posterUrl(event.poster_path, 'w185') ?? undefined"
        alt=""
        loading="lazy"
        class="h-full w-full object-cover"
      />
      <span v-else class="flex h-full w-full items-center justify-center text-slate-500">
        <Tv v-if="event.media_type === 'tv'" class="size-4" aria-hidden="true" />
        <Film v-else class="size-4" aria-hidden="true" />
      </span>
    </button>
  </li>
</template>
