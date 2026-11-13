<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'
import { addMedia } from '@/modules/media/services/media.service'
import type { MediaType } from '@/modules/media/types'
import { useListsStore } from '../stores/lists.store'

const props = defineProps<{ tmdbId: number; mediaType: MediaType; title: string }>()

const store = useListsStore()
const selectId = useId()
const selected = ref('')
const busy = ref(false)
const feedback = ref<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

onMounted(() => {
  if (store.lists.length === 0 && !store.loading) void store.load()
})

/** Escolher a lista já copia a obra (status "Assistir"): um toque, sem passo de confirmação. */
async function onChange() {
  const listId = selected.value
  if (!listId || busy.value) return
  const listName = store.lists.find((l) => l.id === listId)?.name ?? 'lista'
  busy.value = true
  feedback.value = null
  try {
    const response = await addMedia({
      tmdbId: props.tmdbId,
      mediaType: props.mediaType,
      listId,
      status: 'ASSISTIR',
    })
    feedback.value = response.already_in_list
      ? { type: 'info', text: `Já está na lista ${listName}.` }
      : { type: 'success', text: `Adicionada à lista ${listName}.` }
  } catch (e) {
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    busy.value = false
    selected.value = ''
  }
}
</script>

<template>
  <div class="mt-1.5 text-xs">
    <label :for="selectId" class="sr-only">Copiar {{ props.title }} para uma das minhas listas</label>
    <select
      :id="selectId"
      v-model="selected"
      :disabled="busy || store.lists.length === 0"
      class="max-w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 disabled:opacity-50"
      @change="onChange"
    >
      <option value="">{{ busy ? 'Copiando…' : 'Copiar para minha lista…' }}</option>
      <option v-for="l in store.lists" :key="l.id" :value="l.id">{{ l.name }}</option>
    </select>
    <p
      v-if="feedback"
      :role="feedback.type === 'error' ? 'alert' : 'status'"
      class="mt-1"
      :class="feedback.type === 'error' ? 'text-red-400' : feedback.type === 'success' ? 'text-emerald-400' : 'text-slate-400'"
    >
      {{ feedback.text }}
    </p>
  </div>
</template>
