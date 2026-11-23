<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

defineProps<{ expanded: boolean; controls: string }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    :aria-expanded="expanded"
    :aria-controls="controls"
    class="inline-flex items-center gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
    @click="emit('toggle')"
  >
    <slot />
    <ChevronDown
      class="size-5 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none"
      :class="expanded ? 'rotate-180' : ''"
      aria-hidden="true"
    />
  </button>
</template>
