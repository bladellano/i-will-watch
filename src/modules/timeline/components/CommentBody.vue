<script setup lang="ts">
import { nextTick, ref, useId } from 'vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { COMMENT_MAX_LENGTH, isValidComment } from '../utils/comment'
import AuthorMenu from './AuthorMenu.vue'

/**
 * Texto de um comentário. Se o usuário é o autor (`editable`), mostra o menu ⋯ com edição inline e
 * "Tirar da timeline" com confirmação. Quem decide como salvar/excluir é o pai (`save` e `remove`), então o mesmo
 * componente serve à timeline e à página da obra.
 */
const props = defineProps<{
  body: string
  editedAt: string | null
  editable: boolean
  save: (body: string) => Promise<void>
  /** Tira da timeline (não apaga o texto das Observações). */
  remove: () => Promise<void>
}>()

const fieldId = useId()
const field = ref<HTMLTextAreaElement | null>(null)
const editing = ref(false)
const draft = ref('')
const busy = ref(false)
const error = ref('')
const confirmOpen = ref(false)

async function startEdit() {
  draft.value = props.body
  error.value = ''
  editing.value = true
  await nextTick()
  field.value?.focus()
}

async function onSave() {
  if (busy.value || !isValidComment(draft.value)) return
  busy.value = true
  error.value = ''
  try {
    await props.save(draft.value.trim())
    editing.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    busy.value = false
  }
}

async function onDelete() {
  busy.value = true
  error.value = ''
  try {
    await props.remove()
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
  <div>
    <form v-if="editing" novalidate @submit.prevent="onSave">
      <label :for="fieldId" class="sr-only">Editar comentário</label>
      <textarea
        :id="fieldId"
        ref="field"
        v-model="draft"
        rows="4"
        :maxlength="COMMENT_MAX_LENGTH"
        class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        @keydown.esc.stop="editing = false"
      />
      <div class="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs tabular-nums text-slate-400">{{ draft.trim().length }}/{{ COMMENT_MAX_LENGTH }}</span>
        <span class="flex gap-2">
          <button type="button" class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800" @click="editing = false">
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="busy || !isValidComment(draft)"
            class="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {{ busy ? 'Salvando…' : 'Salvar' }}
          </button>
        </span>
      </div>
    </form>

    <div v-else class="flex items-start gap-2">
      <p class="min-w-0 flex-1 whitespace-pre-line break-words text-sm italic leading-relaxed text-slate-200">
        “{{ body }}”
        <span v-if="editedAt" class="not-italic text-xs text-slate-400"> (editado)</span>
      </p>
      <AuthorMenu v-if="editable" label="Opções do comentário" @edit="startEdit" @remove="confirmOpen = true" />
    </div>

    <p v-if="error" role="alert" class="mt-1 text-xs text-red-400">{{ error }}</p>

    <ConfirmDialog
      :open="confirmOpen"
      title="Tirar da timeline"
      message="O comentário sai da timeline para todos, mas o texto continua nas Observações da obra. Se você editar o texto e salvar, ele aparece de novo."
      confirm-label="Tirar da timeline"
      :busy="busy"
      @confirm="onDelete"
      @cancel="confirmOpen = false"
    />
  </div>
</template>
