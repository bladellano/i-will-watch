<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, Camera, Crown, FolderPlus, Plus } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import CommunityTimeline from '@/modules/timeline/components/CommunityTimeline.vue'
import RecentAdditionsWidget from '@/modules/activity/components/RecentAdditionsWidget.vue'
import RecentMembersWidget from '@/modules/members/components/RecentMembersWidget.vue'
import ListFormDialog from '@/modules/lists/components/ListFormDialog.vue'
import ListActionsMenu from '@/modules/lists/components/ListActionsMenu.vue'
import ListPosterStack from '@/modules/lists/components/ListPosterStack.vue'
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

const featured = computed(() => store.lists.find((l) => l.is_default) ?? store.lists[0] ?? null)
const others = computed(() => store.lists.filter((l) => l.id !== featured.value?.id))
const totalItems = computed(() => store.lists.reduce((sum, l) => sum + l.item_count, 0))

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
    <section
      aria-labelledby="lists-title"
      class="rounded-2xl border border-indigo-500/60 bg-slate-900/50 p-4 shadow-[0_0_0_1px_rgba(99,102,241,0.15)] sm:p-6"
    >
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="lists-title" class="text-2xl font-bold tracking-tight sm:text-3xl">Suas listas</h2>
          <p class="mt-1 text-indigo-300/90">Organize suas obras por tema</p>
          <p class="mt-1 text-sm text-slate-400">
            {{ store.lists.length }} {{ store.lists.length === 1 ? 'lista' : 'listas' }} · {{ totalItems }}
            {{ totalItems === 1 ? 'obra' : 'obras' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            @click="openCreate"
          >
            <FolderPlus class="h-4 w-4" aria-hidden="true" /> Nova lista
          </button>
          <RouterLink
            :to="{ name: 'capture-new' }"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
          >
            <Camera class="h-4 w-4" aria-hidden="true" /> Nova captura
          </RouterLink>
          <RouterLink
            :to="{ name: 'add-media' }"
            class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            <Plus class="h-4 w-4" aria-hidden="true" /> Adicionar filme ou série
          </RouterLink>
        </div>
      </header>

      <p v-if="actionError" role="alert" class="mt-3 text-sm text-red-400">{{ actionError }}</p>

      <p v-if="store.loading && store.lists.length === 0" role="status" class="mt-6 text-sm text-slate-400">Carregando listas…</p>
      <div v-else-if="store.error" role="alert" class="mt-6 text-sm text-red-400">
        {{ store.error }}
        <button type="button" class="ml-2 underline" @click="store.load()">Tentar de novo</button>
      </div>
      <p v-else-if="store.lists.length === 0" class="mt-6 text-sm text-slate-400">Você ainda não tem listas.</p>

      <div v-else class="mt-6 space-y-3">
        <div
          v-if="featured"
          class="flex flex-wrap items-center gap-4 rounded-2xl border border-indigo-500 bg-indigo-500/5 p-4 sm:gap-6 sm:p-5"
        >
          <RouterLink :to="{ name: 'list', params: { listaId: featured.id } }" class="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
            <ListPosterStack :posters="featured.preview_posters" size="lg" />
            <div class="min-w-0">
              <h3 class="truncate text-xl font-bold sm:text-2xl">{{ featured.name }}</h3>
              <p class="mt-1 text-indigo-300">{{ featured.item_count }} {{ featured.item_count === 1 ? 'obra' : 'obras' }}</p>
              <p v-if="featured.is_default" class="mt-2 inline-flex items-center gap-1.5 text-sm text-indigo-200">
                <Crown class="h-4 w-4" aria-hidden="true" /> Sua coleção principal
              </p>
              <p v-else-if="featured.description" class="mt-2 line-clamp-2 text-sm text-slate-400">{{ featured.description }}</p>
            </div>
          </RouterLink>
          <div class="ml-auto flex items-center gap-2">
            <RouterLink
              :to="{ name: 'list', params: { listaId: featured.id } }"
              class="inline-flex items-center gap-2 rounded-xl border border-indigo-400 px-5 py-2.5 font-medium text-indigo-100 hover:bg-indigo-500/20"
            >
              Abrir lista <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </RouterLink>
            <ListActionsMenu :list-name="featured.name" :can-delete="!featured.is_default" @edit="openEdit(featured)" @remove="deleting = featured" />
          </div>
        </div>

        <ul v-if="others.length > 0" class="grid gap-3 md:grid-cols-2">
          <li
            v-for="list in others"
            :key="list.id"
            class="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition-colors hover:border-indigo-500/60 hover:bg-slate-800/60"
          >
            <RouterLink :to="{ name: 'list', params: { listaId: list.id } }" class="flex min-w-0 flex-1 items-center gap-3">
              <ListPosterStack :posters="list.preview_posters" />
              <div class="min-w-0">
                <h3 class="truncate font-semibold">{{ list.name }}</h3>
                <p class="text-sm text-slate-400">{{ list.item_count }} {{ list.item_count === 1 ? 'obra' : 'obras' }}</p>
              </div>
            </RouterLink>
            <ListActionsMenu :list-name="list.name" :can-delete="!list.is_default" @edit="openEdit(list)" @remove="deleting = list" />
          </li>
        </ul>
      </div>
    </section>

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

    <CommunityTimeline />

    <div class="mt-10 max-w-md min-[1700px]:hidden">
      <RecentAdditionsWidget />
    </div>
    <div class="mt-6 max-w-md min-[1700px]:hidden">
      <RecentMembersWidget />
    </div>

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
