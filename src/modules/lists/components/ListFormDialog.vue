<script setup lang="ts">
import { ref, useId, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  initialName: string
  initialDescription: string
  busy: boolean
  error: string
}>()
const emit = defineEmits<{ submit: [input: { name: string; description: string }]; cancel: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()
const name = ref('')
const description = ref('')

watch(
  () => props.open,
  (open) => {
    const el = dialog.value
    if (!el) return
    if (open) {
      name.value = props.initialName
      description.value = props.initialDescription
      if (!el.open) el.showModal()
    } else if (el.open) {
      el.close()
    }
  },
  { flush: 'post' },
)
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="m-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 backdrop:bg-black/60"
    @cancel.prevent="emit('cancel')"
  >
    <form class="space-y-4" novalidate @submit.prevent="emit('submit', { name, description })">
      <h3 :id="titleId" class="text-lg font-semibold">{{ props.title }}</h3>
      <div>
        <label for="list-name" class="mb-1 block text-sm text-slate-300">Nome</label>
        <input
          id="list-name"
          v-model="name"
          type="text"
          maxlength="80"
          required
          class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
        />
      </div>
      <div>
        <label for="list-description" class="mb-1 block text-sm text-slate-300">Descrição (opcional)</label>
        <textarea
          id="list-description"
          v-model="description"
          rows="3"
          maxlength="300"
          class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
        />
      </div>
      <p v-if="props.error" role="alert" class="text-sm text-red-400">{{ props.error }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800" @click="emit('cancel')">
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="props.busy || !name.trim()"
          class="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {{ props.busy ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </form>
  </dialog>
</template>
