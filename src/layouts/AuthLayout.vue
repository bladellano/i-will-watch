<script setup lang="ts">
import { computed } from 'vue'
import { Clapperboard } from 'lucide-vue-next'

const props = defineProps<{ backgroundSrc?: string }>()

const fadeMask = 'linear-gradient(to bottom, black 0%, transparent 70%)'
const backgroundStyle = computed(() =>
  props.backgroundSrc
    ? {
        backgroundImage: `url(${props.backgroundSrc})`,
        maskImage: fadeMask,
        WebkitMaskImage: fadeMask,
      }
    : undefined,
)
</script>

<template>
  <main class="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-slate-100">
    <div
      v-if="backgroundSrc"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 bg-cover bg-top bg-no-repeat opacity-60"
      :style="backgroundStyle"
    />
    <div class="w-full max-w-sm">
      <div class="mb-8 flex items-center justify-center gap-2">
        <Clapperboard class="h-7 w-7 text-indigo-400" aria-hidden="true" />
        <h1 class="text-xl font-semibold">Minha lista de filmes e séries</h1>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <slot />
      </div>
      <footer class="mt-6 text-center text-xs text-slate-500">
        <p class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span>Desenvolvido por</span>
          <a
            href="https://www.instagram.com/_caiodellano_/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-slate-400 underline underline-offset-2 hover:text-slate-200"
          >Caio Silva</a>
          <span aria-hidden="true">·</span>
          <span class="rounded-full border border-orange-500/60 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-orange-400">Versão Beta</span>
        </p>
        <p class="mt-2">© 2026 · Todos os direitos reservados.</p>
      </footer>
    </div>
  </main>
</template>
