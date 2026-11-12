<script setup lang="ts">
import { computed } from 'vue'
import { Heart } from 'lucide-vue-next'

/** Coração com contagem. Reutilizável em qualquer card de obra: o pai decide o que acontece em `toggle`. */
const props = defineProps<{
  count: number
  liked: boolean
  /** Obra do próprio usuário: mostra só a contagem, sem permitir curtir. */
  own?: boolean
  busy?: boolean
  title?: string
}>()
const emit = defineEmits<{ toggle: [] }>()

const countLabel = computed(() => (props.count === 1 ? '1 curtida' : `${props.count} curtidas`))
</script>

<template>
  <span
    v-if="own"
    class="inline-flex items-center gap-1 text-xs tabular-nums text-slate-400"
    :aria-label="`${countLabel} na sua obra`"
  >
    <Heart class="size-3.5" aria-hidden="true" />
    {{ count }}
  </span>
  <button
    v-else
    type="button"
    :aria-pressed="liked"
    :aria-label="`${liked ? 'Remover curtida de' : 'Curtir'} ${title ?? 'esta obra'} (${countLabel})`"
    :disabled="busy"
    class="inline-flex min-h-6 items-center gap-1 rounded text-xs tabular-nums transition active:scale-95 disabled:opacity-60"
    :class="liked ? 'text-rose-400 hover:text-rose-300' : 'text-slate-400 hover:text-rose-300'"
    @click="emit('toggle')"
  >
    <Heart class="size-3.5" :class="liked ? 'fill-current' : ''" aria-hidden="true" />
    {{ count }}
  </button>
</template>
