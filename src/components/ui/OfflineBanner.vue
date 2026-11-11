<script setup lang="ts">
import { useOnline } from '@/composables/useOnline'

const { online } = useOnline()
</script>

<template>
  <div v-if="!online" role="status" class="fixed inset-x-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-slate-950">
    Sem conexão. O app precisa de internet para listas, buscas e capturas.
  </div>
</template>
