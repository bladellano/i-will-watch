<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fetchWatchProviders, type WatchProvider } from '../services/watch-providers.service'
import type { MediaType } from '../types'

/** País mostrado no card. Os dados dos demais países ficam no cache da função. */
const DISPLAY_REGION = 'PT'
/** Só serviços de assinatura ou gratuitos, para manter a linha discreta. */
const STREAMING_ACCESS = ['sub', 'free']

const props = defineProps<{ tmdbId: number; mediaType: MediaType }>()

const providers = ref<WatchProvider[]>([])

const names = computed(() => {
  const unique = new Set(
    providers.value
      .filter((p) => p.region === DISPLAY_REGION && STREAMING_ACCESS.includes(p.access_type))
      .map((p) => p.provider_name),
  )
  return [...unique]
})

// Consulta só quando a página de detalhes da obra é aberta (nunca na lista) e refaz se a obra mudar.
watch(
  () => [props.tmdbId, props.mediaType] as const,
  async ([tmdbId, mediaType]) => {
    providers.value = []
    try {
      const response = await fetchWatchProviders(tmdbId, mediaType)
      providers.value = response.providers
    } catch {
      // Falha silenciosa: a informação é complementar e não deve atrapalhar a página.
      providers.value = []
    }
  },
  { immediate: true },
)
</script>

<template>
  <p
    v-if="names.length > 0"
    class="mt-2 text-xs text-slate-300"
    :title="`Onde assistir: ${names.join(', ')}`"
  >
    Onde assistir:
    <template v-for="(name, index) in names" :key="name">
      <span class="font-semibold text-emerald-400">{{ name }}</span>
      <span v-if="index < names.length - 1"> · </span>
    </template>
  </p>
</template>
