<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { MoreVertical, Pencil, Trash2 } from 'lucide-vue-next'

const props = defineProps<{ listName: string; canDelete: boolean }>()
const emit = defineEmits<{ edit: []; remove: [] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
watch(open, (v) => {
  if (v) {
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
  } else {
    document.removeEventListener('click', onDocClick)
    document.removeEventListener('keydown', onKey)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})

function pick(action: 'edit' | 'remove') {
  open.value = false
  if (action === 'edit') emit('edit')
  else emit('remove')
}
</script>

<template>
  <div ref="root" class="relative shrink-0">
    <button
      type="button"
      class="rounded-md p-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      :aria-label="`Opções da lista ${props.listName}`"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <MoreVertical class="h-5 w-5" aria-hidden="true" />
    </button>
    <div
      v-if="open"
      role="menu"
      class="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
    >
      <button type="button" role="menuitem" class="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-800" @click="pick('edit')">
        <Pencil class="h-4 w-4" aria-hidden="true" /> Editar
      </button>
      <button
        v-if="canDelete"
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-800"
        @click="pick('remove')"
      >
        <Trash2 class="h-4 w-4" aria-hidden="true" /> Excluir
      </button>
    </div>
  </div>
</template>
