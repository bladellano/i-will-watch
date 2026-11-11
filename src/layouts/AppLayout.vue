<script setup lang="ts">
import { LogOut, Clapperboard } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { signOut } from '@/modules/auth/services/auth.service'

const auth = useAuthStore()
const router = useRouter()

async function onSignOut() {
  await signOut()
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
          <h1>Minha lista</h1>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <span class="hidden truncate text-slate-400 sm:inline">{{ auth.user?.email }}</span>
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
  </div>
</template>
