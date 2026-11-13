<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { LogOut, Clapperboard, UserRound } from 'lucide-vue-next'
import { RouterLink, useRouter } from 'vue-router'
import { useActivityStore } from '@/modules/activity/stores/activity.store'
import RecentAdditionsWidget from '@/modules/activity/components/RecentAdditionsWidget.vue'
import RecentMembersWidget from '@/modules/members/components/RecentMembersWidget.vue'
import { useRecentMembersStore } from '@/modules/members/stores/recent-members.store'
import { useTimelineStore } from '@/modules/timeline/stores/timeline.store'
import { useProfileStore } from '@/modules/profile/stores/profile.store'
import { displayName } from '@/modules/profile/utils/name'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { signOut } from '@/modules/auth/services/auth.service'

const auth = useAuthStore()
const router = useRouter()
const profile = useProfileStore()
const activity = useActivityStore()
const recentMembers = useRecentMembersStore()
const timeline = useTimelineStore()
const shownName = computed(() => displayName(profile.name, auth.user?.email))

onMounted(() => {
  if (auth.user?.id) void profile.load(auth.user.id)
})

async function onSignOut() {
  await signOut()
  profile.reset()
  activity.reset()
  recentMembers.reset()
  timeline.reset()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <a
      href="#conteudo"
      class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-indigo-500 focus:px-3 focus:py-2 focus:text-white"
    >
      Ir para o conteúdo
    </a>
    <header class="border-b border-slate-800">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2 font-semibold">
          <Clapperboard class="h-5 w-5 text-indigo-400" aria-hidden="true" />
          <h1>
            <RouterLink
              :to="{ name: 'home' }"
              class="rounded-md hover:text-indigo-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Home
            </RouterLink>
          </h1>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <RouterLink
            :to="{ name: 'profile' }"
            class="inline-flex max-w-48 items-center gap-1 rounded-lg px-2 py-1.5 text-slate-300 hover:bg-slate-800 sm:max-w-64"
            :aria-label="`Meu perfil (${shownName})`"
          >
            <UserRound class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="truncate">{{ shownName }}</span>
          </RouterLink>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
            @click="onSignOut"
          >
            <LogOut class="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </div>
    </header>
    <main id="conteudo" tabindex="-1" class="mx-auto max-w-5xl px-4 py-6 outline-none">
      <slot />
    </main>
    <!-- Telas largas: widgets nas margens do conteúdo (membros à esquerda, obras à direita). Nas demais, a HomePage os exibe inline. -->
    <aside
      aria-label="Membros recentes"
      class="fixed top-20 right-1/2 mr-[33.5rem] hidden w-72 min-[1700px]:block"
    >
      <RecentMembersWidget />
    </aside>
    <aside
      aria-label="Atividade recente"
      class="fixed top-20 left-1/2 ml-[33.5rem] hidden w-72 min-[1700px]:block"
    >
      <RecentAdditionsWidget />
    </aside>
  </div>
</template>
