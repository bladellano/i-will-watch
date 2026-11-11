<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => { void registration.update() }, 60 * 60 * 1000)
  },
})
</script>

<template>
  <div v-if="needRefresh" role="alert" class="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border border-indigo-400/40 bg-slate-900 p-3 text-sm text-slate-100 shadow-lg">
    <span>Nova versão disponível.</span>
    <span class="flex gap-2">
      <button type="button" class="rounded-md bg-indigo-500 px-3 py-1.5 font-medium text-white" @click="updateServiceWorker(true)">Atualizar</button>
      <button type="button" class="rounded-md px-3 py-1.5 text-slate-300" @click="needRefresh = false">Depois</button>
    </span>
  </div>
</template>
