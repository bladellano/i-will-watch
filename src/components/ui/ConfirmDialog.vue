<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
}>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => {
    const el = dialog.value
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  },
  { flush: 'post' },
)
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 backdrop:bg-black/60"
    @cancel.prevent="emit('cancel')"
  >
    <h3 class="text-lg font-semibold">{{ props.title }}</h3>
    <p class="mt-2 text-sm text-slate-300">{{ props.message }}</p>
    <div class="mt-5 flex justify-end gap-2">
      <button type="button" class="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800" @click="emit('cancel')">
        Cancelar
      </button>
      <button
        type="button"
        :disabled="props.busy"
        class="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-50"
        @click="emit('confirm')"
      >
        {{ props.busy ? 'Aguarde…' : props.confirmLabel }}
      </button>
    </div>
  </dialog>
</template>
