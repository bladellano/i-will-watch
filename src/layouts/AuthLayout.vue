<script setup lang="ts">
import { Clapperboard } from 'lucide-vue-next'
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
    <div class="w-full max-w-sm">
      <div class="mb-8 flex items-center justify-center gap-2">
        <Clapperboard class="h-7 w-7 text-indigo-400" aria-hidden="true" />
        <h1 class="text-xl font-semibold">Minha lista de filmes e séries</h1>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <slot />
      </div>
    </div>
  </main>
</template>
