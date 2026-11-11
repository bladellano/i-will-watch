<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
</script>

<template>
  <AppLayout>
    <h2 class="text-lg font-medium">Suas listas</h2>
    <p class="mt-2 text-sm text-slate-400">A visualização das listas chega na próxima etapa.</p>
    <RouterLink
      :to="{ name: 'add-media' }"
      class="mt-4 inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400"
    >
      <Plus class="h-4 w-4" aria-hidden="true" />
      Adicionar filme ou série
    </RouterLink>
  </AppLayout>
</template>
