<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { ArrowLeft, Film, Tv, X } from 'lucide-vue-next'
import { posterUrl, releaseYear } from '@/modules/media/services/media.service'
import { MEDIA_TYPE_LABELS } from '@/modules/media/types'
import CopyToListSelect from '@/modules/lists/components/CopyToListSelect.vue'
import { useMembersStore } from '../stores/members.store'
import type { MemberRef } from '../types'

const props = defineProps<{ member: MemberRef | null }>()
const emit = defineEmits<{ close: [] }>()

const store = useMembersStore()
const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()

const heading = computed(() => {
  if (store.activeList) return store.activeList.name
  return store.memberName === 'Um membro' ? 'Listas do membro' : `Listas de ${store.memberName}`
})

function countLabel(n: number): string {
  return `${n} ${n === 1 ? 'obra' : 'obras'}`
}

watch(
  () => props.member,
  (member) => {
    const el = dialog.value
    if (!el) return
    if (member) {
      if (!el.open) el.showModal()
      void store.openMember(member.id, member.name)
    } else {
      store.reset()
      if (el.open) el.close()
    }
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
    class="m-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-0 text-slate-100 backdrop:bg-black/70"
    @cancel.prevent="emit('close')"
    @click="onDialogClick"
  >
    <div v-if="props.member" class="relative flex max-h-[85dvh] flex-col">
      <header class="flex items-center gap-1 border-b border-slate-800 py-3 pl-2 pr-14">
        <button
          v-if="store.activeList"
          type="button"
          class="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          @click="store.backToLists()"
        >
          <ArrowLeft class="size-4" aria-hidden="true" />
          Voltar
        </button>
        <h3 :id="titleId" class="min-w-0 truncate px-2 text-base font-semibold">{{ heading }}</h3>
      </header>

      <button
        type="button"
        class="absolute right-2 top-2 flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        aria-label="Fechar"
        @click="emit('close')"
      >
        <X class="size-5" aria-hidden="true" />
      </button>

      <div class="overflow-y-auto p-4">
        <template v-if="!store.activeList">
          <p v-if="store.listsLoading" class="text-sm text-slate-400" aria-busy="true">Carregando listas…</p>
          <div v-else-if="store.listsError" role="alert" class="text-sm text-red-400">
            {{ store.listsError }}
            <button type="button" class="ml-1 underline underline-offset-2" @click="store.retry()">Tentar de novo</button>
          </div>
          <p v-else-if="store.lists.length === 0" class="text-sm text-slate-400">Este membro ainda não tem listas.</p>
          <ul v-else class="divide-y divide-slate-800/70">
            <li v-for="list in store.lists" :key="list.id">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:text-indigo-300"
                @click="store.openList(list)"
              >
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium">{{ list.name }}</span>
                  <span v-if="list.description" class="block truncate text-xs text-slate-400">{{ list.description }}</span>
                </span>
                <span class="shrink-0 text-xs tabular-nums text-slate-400">{{ countLabel(list.item_count) }}</span>
              </button>
            </li>
          </ul>
        </template>

        <template v-else>
          <p v-if="store.itemsLoading" class="text-sm text-slate-400" aria-busy="true">Carregando obras…</p>
          <div v-else-if="store.itemsError" role="alert" class="text-sm text-red-400">
            {{ store.itemsError }}
            <button type="button" class="ml-1 underline underline-offset-2" @click="store.retry()">Tentar de novo</button>
          </div>
          <p v-else-if="store.items.length === 0" class="text-sm text-slate-400">Nenhuma obra nesta lista.</p>
          <ul v-else class="divide-y divide-slate-800/70">
            <li v-for="item in store.items" :key="item.id" class="flex gap-3 py-3">
              <span class="h-14 w-10 shrink-0 overflow-hidden rounded bg-slate-800">
                <img
                  v-if="posterUrl(item.poster_path, 'w185')"
                  :src="posterUrl(item.poster_path, 'w185') ?? undefined"
                  alt=""
                  loading="lazy"
                  class="h-full w-full object-cover"
                />
                <span v-else class="flex h-full w-full items-center justify-center text-slate-500">
                  <Tv v-if="item.media_type === 'tv'" class="size-4" aria-hidden="true" />
                  <Film v-else class="size-4" aria-hidden="true" />
                </span>
              </span>
              <div class="min-w-0 flex-1">
                <span class="block text-sm font-medium leading-snug">{{ item.title }}</span>
                <span class="block text-xs text-slate-400">
                  {{ MEDIA_TYPE_LABELS[item.media_type] }} · {{ releaseYear(item.release_date) }}
                </span>
                <CopyToListSelect :tmdb-id="item.tmdb_id" :media-type="item.media_type" :title="item.title" />
              </div>
            </li>
          </ul>
        </template>
      </div>
    </div>
  </dialog>
</template>
