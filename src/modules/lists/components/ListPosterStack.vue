<script setup lang="ts">
import { computed } from 'vue'
import { Film } from 'lucide-vue-next'
import { posterUrl } from '@/modules/media/services/media.service'

const props = withDefaults(defineProps<{ posters: string[]; size?: 'sm' | 'lg' }>(), { size: 'sm' })

const urls = computed(() =>
  props.posters.map((p) => posterUrl(p, 'w185')).filter((u): u is string => !!u).slice(0, 3),
)
const dims = computed(() => (props.size === 'lg' ? 'h-28 w-[4.75rem] sm:h-36 sm:w-24' : 'h-14 w-10'))
</script>

<template>
  <div class="flex shrink-0 items-center" aria-hidden="true">
    <template v-if="urls.length > 0">
      <img
        v-for="(url, i) in urls"
        :key="url"
        :src="url"
        alt=""
        loading="lazy"
        :class="[dims, i > 0 && (size === 'lg' ? '-ml-6' : '-ml-4'), 'rounded-md object-cover shadow-lg ring-1 ring-slate-950']"
        :style="{ zIndex: 3 - i }"
      />
    </template>
    <div v-else :class="[dims, 'flex items-center justify-center rounded-md bg-slate-800/80 text-slate-500 ring-1 ring-slate-700']">
      <Film :class="size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'" />
    </div>
  </div>
</template>
