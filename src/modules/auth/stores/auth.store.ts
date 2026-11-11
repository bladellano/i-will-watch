import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase/client'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const initialized = ref(false)
  let initPromise: Promise<void> | null = null

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => session.value !== null)

  /** Carrega a sessão existente uma única vez e passa a acompanhar mudanças. */
  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        const { data } = await supabase.auth.getSession()
        session.value = data.session
        supabase.auth.onAuthStateChange((_event, next) => {
          session.value = next
        })
        initialized.value = true
      })()
    }
    return initPromise
  }

  return { session, user, isAuthenticated, initialized, init }
})
