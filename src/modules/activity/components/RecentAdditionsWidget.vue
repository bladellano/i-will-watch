<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { Film, Tv } from 'lucide-vue-next'
import { posterUrl, releaseYear } from '@/modules/media/services/media.service'
import MediaDetailsDialog from '@/modules/media/components/MediaDetailsDialog.vue'
import LikeButton from '@/modules/likes/components/LikeButton.vue'
import { useActivityStore } from '../stores/activity.store'
import { formatAddedAt } from '../utils/format'

const store = useActivityStore()
const headingId = useId()
const selectedId = ref<string | null>(null)
// Derivado do store: o modal mostra sempre a contagem atual de curtidas.
const selected = computed(() => store.items.find((i) => i.item_id === selectedId.value) ?? null)

onMounted(() => {
  void store.load()
})
</script>

<template>
  <section :aria-labelledby="headingId" class="rounded-xl border border-slate-800 bg-slate-900/60">
    <h2 :id="headingId" class="border-b border-slate-800 px-4 py-3 text-sm font-semibold tracking-tight text-slate-100">
      Últimas obras adicionadas
    </h2>

    <ul v-if="store.loading && !store.loaded" class="divide-y divide-slate-800/70" aria-busy="true" aria-label="Carregando">
      <li v-for="n in 5" :key="n" class="flex animate-pulse gap-3 px-4 py-3 motion-reduce:animate-none">
        <div class="h-14 w-10 shrink-0 rounded bg-slate-800" />
        <div class="flex-1 space-y-2 py-1">
          <div class="h-3 w-3/4 rounded bg-slate-800" />
          <div class="h-3 w-1/2 rounded bg-slate-800/70" />
        </div>
      </li>
    </ul>

    <div v-else-if="store.error && !store.loaded" role="alert" class="px-4 py-3 text-sm text-red-400">
      {{ store.error }}
      <button type="button" class="ml-1 underline underline-offset-2" @click="store.load(true)">Tentar de novo</button>
    </div>

    <p v-else-if="store.items.length === 0" class="px-4 py-4 text-sm text-slate-400">Ainda não há obras adicionadas.</p>

    <ol v-else class="divide-y divide-slate-800/70">
      <li v-for="item in store.items" :key="item.item_id" class="flex gap-3 px-4 py-3">
        <button
          type="button"
          class="h-14 w-10 shrink-0 overflow-hidden rounded transition hover:brightness-110 active:scale-[0.98]"
          :aria-label="`Ver detalhes de ${item.title}`"
          @click="selectedId = item.item_id"
        >
          <img
            v-if="posterUrl(item.poster_path, 'w185')"
            :src="posterUrl(item.poster_path, 'w185') ?? undefined"
            alt=""
            loading="lazy"
            class="h-full w-full object-cover"
          />
          <span v-else class="flex h-full w-full items-center justify-center bg-slate-800 text-slate-500">
            <Tv v-if="item.media_type === 'tv'" class="h-4 w-4" aria-hidden="true" />
            <Film v-else class="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
        <p class="min-w-0 text-sm leading-snug text-slate-300">
          <span class="font-medium text-slate-100">{{ item.member_name }}</span>
          adicionou
          <span class="font-medium text-slate-100">{{ item.title }}</span>
          <span class="tabular-nums text-slate-400"> ({{ releaseYear(item.release_date) }})</span>
          <span class="mt-0.5 flex items-center gap-3">
            <time :datetime="item.added_at" class="text-xs tabular-nums text-slate-400">
              {{ formatAddedAt(item.added_at) }}
            </time>
            <LikeButton
              :count="item.like_count"
              :liked="item.liked_by_me"
              :own="item.is_own"
              :busy="store.busyLikes.includes(item.item_id)"
              :title="item.title"
              @toggle="store.toggleLike(item.item_id)"
            />
          </span>
        </p>
      </li>
    </ol>
    <p v-if="store.likeError" role="alert" class="border-t border-slate-800 px-4 py-2 text-xs text-red-400">
      {{ store.likeError }}
    </p>
  </section>
  <MediaDetailsDialog :media="selected" @close="selectedId = null">
    <template #actions>
      <LikeButton
        v-if="selected"
        :count="selected.like_count"
        :liked="selected.liked_by_me"
        :own="selected.is_own"
        :busy="store.busyLikes.includes(selected.item_id)"
        :title="selected.title"
        @toggle="store.toggleLike(selected.item_id)"
      />
    </template>
  </MediaDetailsDialog>
</template>
