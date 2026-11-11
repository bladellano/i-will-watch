<script setup lang="ts">
import { RouterView } from 'vue-router'
import OfflineBanner from '@/components/ui/OfflineBanner.vue'
import UpdatePrompt from '@/components/ui/UpdatePrompt.vue'
</script>

<template>
  <OfflineBanner />
  <RouterView />
  <UpdatePrompt />
</template>
