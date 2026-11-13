<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useProfileStore } from '@/modules/profile/stores/profile.store'
import { NAME_MAX_LENGTH } from '@/modules/profile/utils/name'

const auth = useAuthStore()
const profile = useProfileStore()

const name = ref('')
const saving = ref(false)
const feedback = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const sharingSaving = ref(false)
const sharingFeedback = ref<{ type: 'success' | 'error'; text: string } | null>(null)

onMounted(async () => {
  const id = auth.user?.id
  if (!id) return
  await profile.load(id, true)
  name.value = profile.name ?? ''
  try {
    await Promise.all([profile.loadShareLists(id), profile.loadShareActivity(id)])
  } catch (e) {
    sharingFeedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
})

async function onSubmit() {
  const id = auth.user?.id
  if (!id) return
  saving.value = true
  feedback.value = null
  try {
    await profile.saveName(id, name.value)
    name.value = profile.name ?? ''
    feedback.value = { type: 'success', text: 'Nome salvo.' }
  } catch (e) {
    feedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    saving.value = false
  }
}

async function onToggleActivity(event: Event) {
  const id = auth.user?.id
  if (!id) return
  const input = event.target as HTMLInputElement
  const next = input.checked
  sharingSaving.value = true
  sharingFeedback.value = null
  try {
    await profile.saveShareActivity(id, next)
    sharingFeedback.value = {
      type: 'success',
      text: next
        ? 'Suas observações e curtidas agora aparecem na timeline da comunidade.'
        : 'Suas observações e curtidas não aparecem mais na timeline da comunidade.',
    }
  } catch (e) {
    input.checked = !next
    sharingFeedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    sharingSaving.value = false
  }
}

async function onToggleSharing(event: Event) {
  const id = auth.user?.id
  if (!id) return
  const input = event.target as HTMLInputElement
  const next = input.checked
  sharingSaving.value = true
  sharingFeedback.value = null
  try {
    await profile.saveShareLists(id, next)
    sharingFeedback.value = {
      type: 'success',
      text: next ? 'Suas listas agora aparecem para os outros membros.' : 'Suas listas não aparecem mais para os outros membros.',
    }
  } catch (e) {
    input.checked = !next
    sharingFeedback.value = { type: 'error', text: e instanceof Error ? e.message : 'Erro inesperado.' }
  } finally {
    sharingSaving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <RouterLink :to="{ name: 'home' }" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
      <ArrowLeft class="h-4 w-4" aria-hidden="true" /> Início
    </RouterLink>
    <h2 class="text-lg font-medium">Meu perfil</h2>

    <form class="mt-5 max-w-md space-y-4" novalidate @submit.prevent="onSubmit">
      <div>
        <label for="profile-email" class="mb-1 block text-sm text-slate-300">E-mail</label>
        <input
          id="profile-email"
          :value="auth.user?.email ?? ''"
          type="email"
          readonly
          class="w-full rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-slate-400"
        />
      </div>
      <div>
        <label for="profile-name" class="mb-1 block text-sm text-slate-300">Nome</label>
        <input
          id="profile-name"
          v-model="name"
          type="text"
          :maxlength="NAME_MAX_LENGTH"
          autocomplete="name"
          required
          class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-indigo-400"
        />
      </div>
      <p v-if="profile.error" role="alert" class="text-sm text-red-400">{{ profile.error }}</p>
      <p v-if="feedback" :role="feedback.type === 'error' ? 'alert' : 'status'" class="text-sm" :class="feedback.type === 'error' ? 'text-red-400' : 'text-emerald-400'">
        {{ feedback.text }}
      </p>
      <button
        type="submit"
        :disabled="saving || !name.trim()"
        class="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ saving ? 'Salvando…' : 'Salvar' }}
      </button>
    </form>

    <section class="mt-8 max-w-md" aria-labelledby="sharing-heading">
      <h3 id="sharing-heading" class="text-sm font-medium text-slate-200">Compartilhamento</h3>
      <label class="mt-2 flex items-start gap-3 text-sm text-slate-300">
        <input
          type="checkbox"
          role="switch"
          class="mt-1 size-4 accent-indigo-500"
          :checked="profile.shareLists"
          :disabled="sharingSaving"
          @change="onToggleSharing"
        />
        <span>
          Mostrar minhas listas para outros membros
          <span class="block text-xs text-slate-400">
            Os outros membros veem o nome e as obras das suas listas, sem notas nem avaliações.
          </span>
        </span>
      </label>
      <label class="mt-4 flex items-start gap-3 text-sm text-slate-300">
        <input
          type="checkbox"
          role="switch"
          class="mt-1 size-4 accent-indigo-500"
          :checked="profile.shareActivity"
          :disabled="sharingSaving"
          @change="onToggleActivity"
        />
        <span>
          Mostrar minha atividade na comunidade
          <span class="block text-xs text-slate-400">
            Suas observações publicadas e suas curtidas aparecem na timeline da home. Ao desligar, tudo some para os outros membros, sem apagar nada.
          </span>
        </span>
      </label>
      <p
        v-if="sharingFeedback"
        :role="sharingFeedback.type === 'error' ? 'alert' : 'status'"
        class="mt-2 text-sm"
        :class="sharingFeedback.type === 'error' ? 'text-red-400' : 'text-emerald-400'"
      >
        {{ sharingFeedback.text }}
      </p>
    </section>
  </AppLayout>
</template>
