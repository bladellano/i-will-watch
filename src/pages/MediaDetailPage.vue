<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { hideNoteFromTimeline } from '@/modules/timeline/services/notes.service'
import { useTimelineStore } from '@/modules/timeline/stores/timeline.store'
import { COMMENT_MAX_LENGTH } from '@/modules/timeline/utils/comment'
import { fetchListItem, removeListItem, updateListItem } from '@/modules/lists/services/list-items.service'
import type { ListItem } from '@/modules/lists/types'
import { parseRating } from '@/modules/lists/utils/rating'
import { dateInputToIso, isoToDateInput, todayDateInput } from '@/modules/lists/utils/dates'
import { posterUrl, releaseYear } from '@/modules/media/services/media.service'
import { MEDIA_TYPE_LABELS, WATCH_STATUS_LABELS, type WatchStatus } from '@/modules/media/types'

const route = useRoute()
const router = useRouter()
const timeline = useTimelineStore()
const listId = computed(() => String(route.params.listaId))
const itemId = computed(() => String(route.params.vinculoId))

const item = ref<ListItem | null>(null)
const loading = ref(true)
const loadError = ref('')

const status = ref<WatchStatus>('ASSISTIR')
const ratingText = ref<string | number>('')
const notes = ref('')
const watchedDate = ref('')

const saving = ref(false)
const feedback = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const confirmRemove = ref(false)
const removing = ref(false)
const hidingNote = ref(false)

/** Estado das Observações já salvas na timeline: publicada, tirada pelo dono ou ainda não publicada. */
const noteState = computed<'visible' | 'hidden' | 'none'>(() => {
  const current = item.value
  if (!current?.notes) return 'none'
  if (current.notes_hidden) return 'hidden'
  return current.notes_published_at ? 'visible' : 'none'
})

const tmdbUrl = computed(() =>
  item.value ? `https://www.themoviedb.org/${item.value.media.media_type}/${item.value.media.tmdb_id}` : '',
)

function fillForm(source: ListItem) {
  status.value = source.status
  ratingText.value = source.personal_rating ? String(source.personal_rating) : ''
  notes.value = source.notes ?? ''
  watchedDate.value = isoToDateInput(source.watched_at)
}

async function load() {
  loading.value = true
  loadError.value = ''
  item.value = null
  try {
    const found = await fetchListItem(listId.value, itemId.value)
    if (!found) {
      loadError.value = 'Obra não encontrada nesta lista.'
      return
    }
    item.value = found
    fillForm(found)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    loading.value = false
  }
}

watch([listId, itemId], load, { immediate: true })

/** Marcar como ASSISTIDO preenche a data de hoje; sair desse status limpa a data. */
function onStatusChange() {
  if (status.value === 'ASSISTIDO') {
    if (!watchedDate.value) watchedDate.value = todayDateInput()
  } else {
    watchedDate.value = ''
  }
}

async function onSave() {
  if (!item.value) return
  feedback.value = null

  const parsed = parseRating(ratingText.value)
  if (!parsed.ok) {
    feedback.value = { type: 'error', text: 'A nota deve ser um número inteiro de 1 a 10.' }
    return
  }
  const rating = parsed.value

  let watchedAt: string | null = null
  if (status.value === 'ASSISTIDO') {
    watchedAt = dateInputToIso(watchedDate.value) ?? new Date().toISOString()
  }

  saving.value = true
  try {
    const patch = {
      status: status.value,
      personal_rating: rating,
      notes: notes.value.trim() || null,
      watched_at: watchedAt,
    }
    const saved = await updateListItem(item.value.id, patch)
    item.value = { ...item.value, ...patch, ...saved }
    fillForm(item.value)
    timeline.invalidate()
    feedback.value = {
      type: 'success',
      text: noteState.value === 'visible' ? 'Alterações salvas. As observações estão na timeline da comunidade.' : 'Alterações salvas.',
    }
  } catch (e) {
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    saving.value = false
  }
}

async function onHideNote() {
  if (!item.value || hidingNote.value) return
  hidingNote.value = true
  feedback.value = null
  try {
    await hideNoteFromTimeline(item.value.id)
    item.value = { ...item.value, notes_hidden: true }
    timeline.invalidate()
  } catch (e) {
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    hidingNote.value = false
  }
}

async function onRemove() {
  if (!item.value) return
  removing.value = true
  try {
    await removeListItem(item.value.id)
    await router.push({ name: 'list', params: { listaId: listId.value } })
  } catch (e) {
    confirmRemove.value = false
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    removing.value = false
  }
}
</script>

<template>
  <AppLayout>
    <RouterLink :to="{ name: 'list', params: { listaId: listId } }" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
      <ArrowLeft class="h-4 w-4" aria-hidden="true" /> Voltar à lista
    </RouterLink>

    <p v-if="loading" role="status" class="text-sm text-slate-400">Carregando…</p>
    <p v-else-if="loadError" role="alert" class="text-sm text-red-400">
      {{ loadError }}
      <button type="button" class="ml-2 underline" @click="load">Tentar de novo</button>
    </p>

    <template v-else-if="item">
      <div
        v-if="posterUrl(item.media.backdrop_path)"
        class="mb-5 h-40 w-full rounded-xl bg-cover bg-center sm:h-56"
        :style="{ backgroundImage: `url(${posterUrl(item.media.backdrop_path)})` }"
        role="img"
        :aria-label="`Imagem de fundo de ${item.media.title}`"
      />

      <div class="flex gap-4">
        <img
          v-if="posterUrl(item.media.poster_path)"
          :src="posterUrl(item.media.poster_path) ?? undefined"
          :alt="`Capa de ${item.media.title}`"
          class="h-48 w-32 shrink-0 rounded-lg object-cover"
        />
        <div class="min-w-0">
          <h2 class="text-xl font-semibold">{{ item.media.title }}</h2>
          <p v-if="item.media.original_title && item.media.original_title !== item.media.title" class="text-sm text-slate-400">
            Título original: {{ item.media.original_title }}
          </p>
          <p class="mt-1 text-sm text-slate-300">
            {{ MEDIA_TYPE_LABELS[item.media.media_type] }} · {{ releaseYear(item.media.release_date) }}
          </p>
          <p v-if="item.media.tmdb_rating" class="mt-1 text-sm text-slate-300">Nota TMDB: {{ item.media.tmdb_rating.toFixed(1) }}</p>
          <ul v-if="item.media.genres.length > 0" class="mt-2 flex flex-wrap gap-1.5">
            <li v-for="genre in item.media.genres" :key="genre" class="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
              {{ genre }}
            </li>
          </ul>
          <a :href="tmdbUrl" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1 text-sm text-indigo-400 hover:underline">
            Ver no TMDB <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      <p class="mt-4 text-sm leading-relaxed text-slate-300">{{ item.media.overview ?? 'Sinopse não disponível.' }}</p>

      <form class="mt-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4" novalidate @submit.prevent="onSave">
        <h3 class="font-medium">Seus dados</h3>
        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label for="status" class="mb-1 block text-sm text-slate-300">Status</label>
            <select id="status" v-model="status" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" @change="onStatusChange">
              <option v-for="(label, value) in WATCH_STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
            </select>
          </div>
          <div>
            <label for="rating" class="mb-1 block text-sm text-slate-300">Nota (1 a 10, opcional)</label>
            <input
              id="rating"
              v-model="ratingText"
              type="number"
              min="1"
              max="10"
              step="1"
              inputmode="numeric"
              class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </div>
          <div v-if="status === 'ASSISTIDO'">
            <label for="watched" class="mb-1 block text-sm text-slate-300">Assistido em</label>
            <input id="watched" v-model="watchedDate" type="date" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          </div>
        </div>
        <div>
          <label for="notes" class="mb-1 block text-sm text-slate-300">Observações</label>
          <textarea
            id="notes"
            v-model="notes"
            rows="4"
            :maxlength="COMMENT_MAX_LENGTH"
            aria-describedby="notes-help"
            class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
          <div class="mt-1 flex flex-wrap items-start justify-between gap-2">
            <p id="notes-help" class="text-xs text-slate-400">
              Ao salvar, este texto aparece na timeline da comunidade. Para esconder sua atividade, ajuste o
              <RouterLink :to="{ name: 'profile' }" class="underline underline-offset-2 hover:text-slate-200">perfil</RouterLink>.
            </p>
            <span class="text-xs tabular-nums text-slate-400">{{ notes.trim().length }}/{{ COMMENT_MAX_LENGTH }}</span>
          </div>
          <p v-if="noteState === 'visible'" class="mt-1 flex flex-wrap items-center gap-2 text-xs text-emerald-400">
            Publicado na timeline.
            <button
              type="button"
              :disabled="hidingNote"
              class="text-slate-300 underline underline-offset-2 hover:text-slate-100 disabled:opacity-50"
              @click="onHideNote"
            >
              {{ hidingNote ? 'Aguarde…' : 'Tirar da timeline' }}
            </button>
          </p>
          <p v-else-if="noteState === 'hidden'" class="mt-1 text-xs text-slate-400">
            Fora da timeline. Edite o texto e salve para publicá-lo de novo.
          </p>
        </div>
        <p v-if="feedback" :role="feedback.type === 'error' ? 'alert' : 'status'" class="text-sm" :class="feedback.type === 'error' ? 'text-red-400' : 'text-emerald-400'">
          {{ feedback.text }}
        </p>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <button
            type="submit"
            :disabled="saving"
            class="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {{ saving ? 'Salvando…' : 'Salvar alterações' }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-red-300 hover:bg-slate-800"
            @click="confirmRemove = true"
          >
            <Trash2 class="h-4 w-4" aria-hidden="true" /> Remover da lista
          </button>
        </div>
      </form>

      <ConfirmDialog
        :open="confirmRemove"
        title="Remover da lista"
        :message="`Remover &quot;${item.media.title}&quot; desta lista? A obra continua nas suas outras listas.`"
        confirm-label="Remover"
        :busy="removing"
        @confirm="onRemove"
        @cancel="confirmRemove = false"
      />
    </template>
  </AppLayout>
</template>
