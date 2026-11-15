<script setup lang="ts">
import { computed, ref } from 'vue'
import { EyeOff, Film, Tv } from 'lucide-vue-next'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import CopyToListSelect from '@/modules/lists/components/CopyToListSelect.vue'
import { posterUrl, releaseYear } from '@/modules/media/services/media.service'
import { statusBadgeClass } from '@/modules/media/utils/status-style'
import { useTimelineStore } from '../stores/timeline.store'
import type { TimelineEvent } from '../types'
import { avatarClass, avatarInitial } from '../utils/avatar'
import { formatRelativeTime } from '../utils/relative-time'

/** "Começou a assistir": destaque próprio (selo e faixa âmbar), com o mesmo padrão de ações dos outros cards. */
const props = defineProps<{ event: TimelineEvent }>()
const store = useTimelineStore()

const when = computed(() => formatRelativeTime(props.event.occurred_at))
const confirmOpen = ref(false)
const busy = ref(false)
const error = ref('')

async function onHide() {
  if (!props.event.item_id) return
  busy.value = true
  error.value = ''
  try {
    await store.hideWatching(props.event.item_id)
    confirmOpen.value = false
  } catch (e) {
    confirmOpen.value = false
    error.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    busy.value = false
  }
}
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
    <div class="min-w-0 flex-1 border-l-2 border-amber-400/70 pl-3">
      <p class="flex flex-wrap items-center gap-2 text-sm leading-snug text-slate-300">
        <span>
          <span class="font-semibold text-slate-100">{{ event.actor_name }}</span>
          começou a assistir
          <span class="font-medium text-amber-200">{{ event.title }}</span>
          <span class="tabular-nums text-slate-400"> ({{ releaseYear(event.release_date) }})</span>
        </span>
        <span class="rounded-full px-2 py-0.5 text-xs font-medium ring-1" :class="statusBadgeClass('ASSISTINDO')">
          Começou a assistir
        </span>
      </p>
      <time :datetime="event.occurred_at" class="text-xs text-slate-400">{{ when }}</time>

      <div class="mt-2 flex flex-wrap items-center gap-3">
        <button
          v-if="event.is_own && event.item_id"
          type="button"
          class="inline-flex min-h-6 items-center gap-1 rounded text-xs text-slate-300 hover:text-slate-100"
          :aria-label="`Tirar da timeline o evento de ${event.title}`"
          @click="confirmOpen = true"
        >
          <EyeOff class="size-3.5" aria-hidden="true" /> Tirar da timeline
        </button>
      </div>
      <p v-if="error" role="alert" class="mt-1 text-xs text-red-400">{{ error }}</p>
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

    <ConfirmDialog
      :open="confirmOpen"
      title="Tirar da timeline"
      message="O evento sai da timeline para todos. A obra continua em Assistindo na sua lista."
      confirm-label="Tirar da timeline"
      :busy="busy"
      @confirm="onHide"
      @cancel="confirmOpen = false"
    />
  </li>
</template>
