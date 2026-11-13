<script setup lang="ts">
import { computed } from 'vue'
import { Film, Tv } from 'lucide-vue-next'
import CopyToListSelect from '@/modules/lists/components/CopyToListSelect.vue'
import { posterUrl, releaseYear } from '@/modules/media/services/media.service'
import { useTimelineStore } from '../stores/timeline.store'
import type { TimelineEvent } from '../types'
import { avatarClass, avatarInitial } from '../utils/avatar'
import { formatRelativeTime } from '../utils/relative-time'
import CommentBody from './CommentBody.vue'

const props = defineProps<{ event: TimelineEvent }>()
const store = useTimelineStore()

const when = computed(() => formatRelativeTime(props.event.occurred_at))
const itemId = computed(() => props.event.item_id ?? '')

const save = (body: string) => store.saveNote(itemId.value, body)
const remove = () => store.hideNote(itemId.value)
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
        comentou em
        <span class="font-medium text-indigo-300">{{ event.title }}</span>
        <span class="tabular-nums text-slate-400"> ({{ releaseYear(event.release_date) }})</span>
      </p>
      <time :datetime="event.occurred_at" class="text-xs text-slate-400">{{ when }}</time>

      <div class="mt-2 flex gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
        <button
          type="button"
          class="h-20 w-14 shrink-0 overflow-hidden rounded bg-slate-800 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
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
        <CommentBody
          class="min-w-0 flex-1"
          :body="event.comment_body ?? ''"
          :edited-at="event.comment_edited_at"
          :editable="event.is_own"
          :save="save"
          :remove="remove"
        />
      </div>

      <CopyToListSelect v-if="!event.is_own" :tmdb-id="event.tmdb_id" :media-type="event.media_type" :title="event.title" />
    </div>
  </li>
</template>
