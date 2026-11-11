<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ExternalLink, Search, Sparkles, Trash2 } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import MediaResultCard from '@/modules/media/components/MediaResultCard.vue'
import MediaConfirmPanel from '@/modules/media/components/MediaConfirmPanel.vue'
import { addMedia } from '@/modules/media/services/media.service'
import type { TmdbSearchResult, WatchStatus } from '@/modules/media/types'
import { fetchLists } from '@/modules/lists/services/lists.service'
import type { UserList } from '@/modules/lists/types'
import { discardCapture, fetchCapture, getImageUrl, identifyCapture } from '@/modules/capture/services/capture.service'
import { CAPTURE_STATUS_LABELS, CONFIDENCE_LABELS, type Capture } from '@/modules/capture/types'

const route = useRoute()
const router = useRouter()
const captureId = computed(() => String(route.params.id))

const capture = ref<Capture | null>(null)
const imageUrl = ref<string | null>(null)
const lists = ref<UserList[]>([])
const loading = ref(true)
const loadError = ref('')

const confirmAi = ref(false)
const identifying = ref(false)
const confirmDiscard = ref(false)
const discarding = ref(false)
const selected = ref<TmdbSearchResult | null>(null)
const saving = ref(false)
const feedback = ref<{ type: 'error' | 'info'; text: string } | null>(null)

const matches = computed(() => capture.value?.ai_result?.matches ?? [])
const canIdentify = computed(
  () => capture.value !== null && ['pending', 'failed', 'processing'].includes(capture.value.status) && !identifying.value,
)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [found, userLists] = await Promise.all([fetchCapture(captureId.value), fetchLists()])
    if (!found) {
      loadError.value = 'Captura não encontrada.'
      return
    }
    capture.value = found
    lists.value = userLists
    imageUrl.value = found.image_path ? await getImageUrl(found.image_path) : null
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** Só roda após o usuário confirmar o aviso de uso de IA e custo. */
async function onIdentify() {
  confirmAi.value = false
  identifying.value = true
  feedback.value = null
  try {
    await identifyCapture(captureId.value)
  } catch (e) {
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    identifying.value = false
  }
  capture.value = await fetchCapture(captureId.value)
}

async function onDiscard() {
  if (!capture.value) return
  discarding.value = true
  try {
    await discardCapture(capture.value)
    await router.push({ name: 'home' })
  } catch (e) {
    confirmDiscard.value = false
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    discarding.value = false
  }
}

async function onConfirm(choice: { listId: string; status: WatchStatus }) {
  if (!selected.value) return
  saving.value = true
  feedback.value = null
  try {
    await addMedia({
      tmdbId: selected.value.tmdb_id,
      mediaType: selected.value.media_type,
      listId: choice.listId,
      status: choice.status,
      captureId: captureId.value,
    })
    await router.push({ name: 'list', params: { listaId: choice.listId } })
  } catch (e) {
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <RouterLink :to="{ name: 'home' }" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
      <ArrowLeft class="h-4 w-4" aria-hidden="true" /> Início
    </RouterLink>

    <p v-if="loading" class="text-sm text-slate-400">Carregando…</p>
    <p v-else-if="loadError" role="alert" class="text-sm text-red-400">
      {{ loadError }}
      <button type="button" class="ml-2 underline" @click="load">Tentar de novo</button>
    </p>

    <template v-else-if="capture">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-medium">Captura</h2>
        <span class="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs">{{ CAPTURE_STATUS_LABELS[capture.status] }}</span>
      </div>

      <div v-if="capture.status === 'completed'" class="mt-4 text-sm text-slate-300">
        Esta captura já foi concluída.
        <RouterLink :to="{ name: 'home' }" class="text-indigo-400 hover:underline">Voltar às listas</RouterLink>
      </div>

      <template v-else>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <img v-if="imageUrl" :src="imageUrl" alt="Imagem da captura" class="max-h-96 rounded-lg object-contain" />
          <dl class="space-y-2 text-sm">
            <div v-if="capture.input_title"><dt class="text-slate-400">Título informado</dt><dd>{{ capture.input_title }}</dd></div>
            <div v-if="capture.source"><dt class="text-slate-400">Origem</dt><dd>{{ capture.source }}</dd></div>
            <div v-if="capture.input_url">
              <dt class="text-slate-400">URL de referência</dt>
              <dd>
                <a :href="capture.input_url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 break-all text-indigo-400 hover:underline">
                  {{ capture.input_url }} <ExternalLink class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              </dd>
            </div>
            <p v-if="!capture.input_title && !capture.source && !capture.input_url && !imageUrl" class="text-slate-400">Sem dados adicionais.</p>
          </dl>
        </div>

        <p v-if="capture.status === 'failed' && capture.error_message" role="alert" class="mt-4 text-sm text-amber-300">
          {{ capture.error_message }}
        </p>
        <p v-if="capture.status === 'processing'" class="mt-4 text-sm text-slate-300">
          Identificação em andamento. Atualize a página em instantes.
        </p>
        <p v-if="feedback" role="alert" class="mt-4 text-sm" :class="feedback.type === 'error' ? 'text-red-400' : 'text-amber-300'">
          {{ feedback.text }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-if="capture.status !== 'needs_review'"
            type="button"
            :disabled="!canIdentify"
            class="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            @click="confirmAi = true"
          >
            <Sparkles class="h-4 w-4" aria-hidden="true" />
            {{ identifying ? 'Identificando…' : capture.status === 'failed' ? 'Tentar identificar com IA de novo' : 'Identificar com IA' }}
          </button>
          <RouterLink
            :to="{ name: 'add-media', query: { capture: capture.id, ...(capture.input_title ? { q: capture.input_title } : {}) } }"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
          >
            <Search class="h-4 w-4" aria-hidden="true" /> Buscar manualmente
          </RouterLink>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-red-300 hover:bg-slate-800"
            @click="confirmDiscard = true"
          >
            <Trash2 class="h-4 w-4" aria-hidden="true" /> Descartar
          </button>
        </div>

        <section v-if="capture.status === 'needs_review'" class="mt-6" aria-label="Candidatos">
          <h3 class="font-medium">Candidatos encontrados</h3>
          <p class="mt-1 text-sm text-slate-400">A IA pode errar: confira e escolha a obra correta antes de adicionar.</p>
          <div class="mt-3 grid gap-6 md:grid-cols-2">
            <ul class="space-y-2">
              <li v-for="match in matches" :key="`${match.media_type}-${match.tmdb_id}`">
                <MediaResultCard
                  :item="match"
                  :selected="selected?.tmdb_id === match.tmdb_id && selected?.media_type === match.media_type"
                  :note="match.confidence === 'low' ? `${CONFIDENCE_LABELS[match.confidence]} — confira com atenção` : CONFIDENCE_LABELS[match.confidence]"
                  @select="selected = $event"
                />
              </li>
            </ul>
            <MediaConfirmPanel v-if="selected" :item="selected" :lists="lists" :busy="saving" @confirm="onConfirm" />
          </div>
        </section>
      </template>

      <ConfirmDialog
        :open="confirmAi"
        title="Identificar com IA"
        message="Este recurso usa IA (OpenAI): a imagem e o contexto informado serão enviados para análise e isso pode gerar custo. Há um limite de 10 identificações a cada 24 horas. Deseja continuar?"
        confirm-label="Identificar"
        @confirm="onIdentify"
        @cancel="confirmAi = false"
      />
      <ConfirmDialog
        :open="confirmDiscard"
        title="Descartar captura"
        message="A captura e a imagem enviada serão apagadas. Esta ação não pode ser desfeita."
        confirm-label="Descartar"
        :busy="discarding"
        @confirm="onDiscard"
        @cancel="confirmDiscard = false"
      />
    </template>
  </AppLayout>
</template>
