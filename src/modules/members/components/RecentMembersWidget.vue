<script setup lang="ts">
import { onMounted, useId } from 'vue'
import { formatAddedAt } from '@/modules/activity/utils/format'
import { useRecentMembersStore } from '../stores/recent-members.store'

const store = useRecentMembersStore()
const headingId = useId()

/** Inicial do nome para o avatar; "Você" vira "V", "Um membro" vira "U". */
function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

onMounted(() => {
  void store.load()
})
</script>

<template>
  <section :aria-labelledby="headingId" class="rounded-xl border border-slate-800 bg-slate-900/60">
    <h2 :id="headingId" class="border-b border-slate-800 px-4 py-3 text-sm font-semibold tracking-tight text-slate-100">
      Últimos membros cadastrados
    </h2>

    <ul v-if="store.loading && !store.loaded" class="divide-y divide-slate-800/70" aria-busy="true" aria-label="Carregando">
      <li v-for="n in 5" :key="n" class="flex animate-pulse gap-3 px-4 py-3 motion-reduce:animate-none">
        <div class="size-10 shrink-0 rounded-full bg-slate-800" />
        <div class="flex-1 space-y-2 py-1">
          <div class="h-3 w-1/2 rounded bg-slate-800" />
          <div class="h-3 w-1/3 rounded bg-slate-800/70" />
        </div>
      </li>
    </ul>

    <div v-else-if="store.error && !store.loaded" role="alert" class="px-4 py-3 text-sm text-red-400">
      {{ store.error }}
      <button type="button" class="ml-1 underline underline-offset-2" @click="store.load(true)">Tentar de novo</button>
    </div>

    <p v-else-if="store.items.length === 0" class="px-4 py-4 text-sm text-slate-400">Ainda não há membros cadastrados.</p>

    <ol v-else class="divide-y divide-slate-800/70">
      <li v-for="member in store.items" :key="member.member_id" class="flex gap-3 px-4 py-3">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300"
          aria-hidden="true"
        >
          {{ initialOf(member.member_name) }}
        </span>
        <p class="min-w-0 text-sm leading-snug text-slate-300">
          <span class="font-medium text-slate-100">{{ member.member_name }}</span>
          entrou em
          <time :datetime="member.joined_at" class="tabular-nums text-slate-400">{{ formatAddedAt(member.joined_at) }}</time>
        </p>
      </li>
    </ol>
  </section>
</template>
