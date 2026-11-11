<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Camera, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ListFormDialog from '@/modules/lists/components/ListFormDialog.vue'
import { useListsStore } from '@/modules/lists/stores/lists.store'
import { useCapturesStore } from '@/modules/capture/stores/captures.store'
import { CAPTURE_STATUS_LABELS } from '@/modules/capture/types'
import type { ListSummary } from '@/modules/lists/types'

const store = useListsStore()
const captures = useCapturesStore()

const formOpen = ref(false)
const editing = ref<ListSummary | null>(null)
const formBusy = ref(false)
const formError = ref('')

const deleting = ref<ListSummary | null>(null)
const deleteBusy = ref(false)
const actionError = ref('')

onMounted(() => {
  void store.load()
  void captures.load()
})

function openCreate() {
  editing.value = null
  formError.value = ''
  formOpen.value = true
}

function openEdit(list: ListSummary) {
  editing.value = list
  formError.value = ''
  formOpen.value = true
}

async function onSubmit(input: { name: string; description: string }) {
  formBusy.value = true
  formError.value = ''
  try {
    if (editing.value) await store.update(editing.value.id, input)
    else await store.create(input)
    formOpen.value = false
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    formBusy.value = false
  }
}

async function onConfirmDelete() {
  if (!deleting.value) return
  deleteBusy.value = true
  actionError.value = ''
  try {
    await store.remove(deleting.value.id)
    deleting.value = null
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Erro inesperado.'
    deleting.value = null
  } finally {
    deleteBusy.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-medium">Suas listas</h2>
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
          @click="openCreate"
        >
          <FolderPlus class="h-4 w-4" aria-hidden="true" /> Nova lista
        </button>
        <RouterLink
          :to="{ name: 'capture-new' }"
          class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
        >
          <Camera class="h-4 w-4" aria-hidden="true" /> Nova captura
        </RouterLink>
        <RouterLink
          :to="{ name: 'add-media' }"
          class="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          <Plus class="h-4 w-4" aria-hidden="true" /> Adicionar filme ou série
        </RouterLink>
      </div>
    </div>

    <p v-if="actionError" role="alert" class="mt-3 text-sm text-red-400">{{ actionError }}</p>

    <p v-if="store.loading && store.lists.length === 0" role="status" class="mt-6 text-sm text-slate-400">Carregando listas…</p>
    <div v-else-if="store.error" role="alert" class="mt-6 text-sm text-red-400">
      {{ store.error }}
      <button type="button" class="ml-2 underline" @click="store.load()">Tentar de novo</button>
    </div>
    <p v-else-if="store.lists.length === 0" class="mt-6 text-sm text-slate-400">Você ainda não tem listas.</p>

    <ul v-else class="mt-6 grid gap-3 sm:grid-cols-2">
      <li v-for="list in store.lists" :key="list.id" class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="flex items-start justify-between gap-2">
          <RouterLink :to="{ name: 'list', params: { listaId: list.id } }" class="min-w-0 flex-1 hover:underline">
            <h3 class="truncate font-semibold">{{ list.name }}</h3>
          </RouterLink>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              class="rounded-md p-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              :aria-label="`Editar lista ${list.name}`"
              @click="openEdit(list)"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              v-if="!list.is_default"
              type="button"
              class="rounded-md p-2.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
              :aria-label="`Excluir lista ${list.name}`"
              @click="deleting = list"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p v-if="list.description" class="mt-1 line-clamp-2 text-sm text-slate-400">{{ list.description }}</p>
        <p class="mt-2 text-sm text-slate-300">{{ list.item_count }} {{ list.item_count === 1 ? 'obra' : 'obras' }}</p>
      </li>
    </ul>

    <section v-if="captures.items.length > 0 || captures.error" class="mt-10" aria-label="Capturas pendentes">
      <h2 class="text-lg font-medium">Capturas pendentes</h2>
      <p v-if="captures.error" role="alert" class="mt-3 text-sm text-red-400">
        {{ captures.error }}
        <button type="button" class="ml-2 underline" @click="captures.load()">Tentar de novo</button>
      </p>
      <ul class="mt-3 space-y-2">
        <li v-for="item in captures.items" :key="item.id">
          <RouterLink
            :to="{ name: 'capture', params: { id: item.id } }"
            class="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 hover:bg-slate-800/60"
          >
            <span class="min-w-0 truncate">{{ item.input_title ?? (item.image_path ? 'Captura de imagem' : item.input_url) }}</span>
            <span class="shrink-0 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs">{{ CAPTURE_STATUS_LABELS[item.status] }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <ListFormDialog
      :open="formOpen"
      :title="editing ? 'Editar lista' : 'Nova lista'"
      :initial-name="editing?.name ?? ''"
      :initial-description="editing?.description ?? ''"
      :busy="formBusy"
      :error="formError"
      @submit="onSubmit"
      @cancel="formOpen = false"
    />
    <ConfirmDialog
      :open="deleting !== null"
      title="Excluir lista"
      :message="`Excluir a lista &quot;${deleting?.name ?? ''}&quot;? As obras continuam no catálogo e nas outras listas, mas saem desta.`"
      confirm-label="Excluir"
      :busy="deleteBusy"
      @confirm="onConfirmDelete"
      @cancel="deleting = null"
    />
  </AppLayout>
</template>
