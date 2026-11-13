<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId } from 'vue'
import { Ellipsis, EyeOff, Pencil } from 'lucide-vue-next'

/** Menu "⋯" do autor (editar, tirar da timeline). Teclado: Enter/Espaço abre, setas navegam, Esc fecha e devolve o foco. */
defineProps<{ label: string }>()
const emit = defineEmits<{ edit: []; remove: [] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menuId = useId()

function items(): HTMLElement[] {
  return Array.from(root.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
}

function onPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) close()
}

async function openMenu() {
  open.value = true
  document.addEventListener('pointerdown', onPointerDown)
  await nextTick()
  items()[0]?.focus()
}

function close(returnFocus = false) {
  open.value = false
  document.removeEventListener('pointerdown', onPointerDown)
  if (returnFocus) void nextTick(() => trigger.value?.focus())
}

function pick(action: 'edit' | 'remove') {
  close()
  if (action === 'edit') emit('edit')
  else emit('remove')
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    close(true)
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  const list = items()
  const index = list.indexOf(document.activeElement as HTMLElement)
  const step = event.key === 'ArrowDown' ? 1 : -1
  list[(index + step + list.length) % list.length]?.focus()
}

onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="root" class="relative" @keydown="onKeydown">
    <button
      ref="trigger"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      :aria-label="label"
      class="flex size-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      @click="open ? close() : openMenu()"
    >
      <Ellipsis class="size-4" aria-hidden="true" />
    </button>
    <ul
      v-if="open"
      :id="menuId"
      role="menu"
      class="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-lg"
    >
      <li role="none">
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 focus-visible:bg-slate-800"
          @click="pick('edit')"
        >
          <Pencil class="size-4" aria-hidden="true" /> Editar
        </button>
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-300 hover:bg-slate-800 focus-visible:bg-slate-800"
          @click="pick('remove')"
        >
          <EyeOff class="size-4" aria-hidden="true" /> Tirar da timeline
        </button>
      </li>
    </ul>
  </div>
</template>
