<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import { fetchCommentSummary, type CommentSummaryResponse } from '../services/comment-summary.service'
import type { MediaType } from '../types'

const props = defineProps<{ tmdbId: number; mediaType: MediaType }>()

const headingId = useId()
const loading = ref(false)
const error = ref('')
const result = ref<CommentSummaryResponse | null>(null)
let requestSeq = 0

async function load() {
  const seq = ++requestSeq
  loading.value = true
  error.value = ''
  result.value = null
  try {
    const data = await fetchCommentSummary(props.tmdbId, props.mediaType)
    if (seq === requestSeq) result.value = data
  } catch (e) {
    if (seq === requestSeq) error.value = e instanceof Error ? e.message : 'Não foi possível carregar o resumo dos comentários.'
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

watch(() => [props.tmdbId, props.mediaType], load, { immediate: true })
</script>

<template>
  <section
    v-if="loading || error || result?.status === 'ready'"
    :aria-labelledby="headingId"
    class="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4"
  >
    <h4 :id="headingId" class="flex items-center gap-1.5 text-sm font-medium text-indigo-200">
      <Sparkles class="size-4" aria-hidden="true" /> O que a comunidade achou
    </h4>

    <p v-if="loading" role="status" class="mt-2 text-sm text-slate-400">Resumindo os comentários…</p>

    <p v-else-if="error" class="mt-2 text-sm text-slate-400">
      {{ error }}
      <button type="button" class="ml-1 text-indigo-400 underline underline-offset-2 hover:text-indigo-300" @click="load">
        Tentar de novo
      </button>
    </p>

    <template v-else-if="result?.status === 'ready'">
      <p class="mt-2 text-sm leading-relaxed text-slate-200">{{ result.summary }}</p>
      <ul v-if="result.highlights.length > 0" class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li v-for="(highlight, index) in result.highlights" :key="index">{{ highlight }}</li>
      </ul>
      <p class="mt-3 text-xs text-slate-400">
        Resumo gerado por IA a partir de {{ result.comment_count }} comentários da comunidade. Pode conter imprecisões.
      </p>
    </template>
  </section>
</template>
