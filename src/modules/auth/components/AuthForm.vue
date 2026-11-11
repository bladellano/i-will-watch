<script setup lang="ts">
import { computed, ref } from 'vue'
import { NAME_MAX_LENGTH, normalizeName } from '@/modules/profile/utils/name'

const props = defineProps<{
  submitLabel: string
  loading: boolean
  error: string
  autocompletePassword: 'current-password' | 'new-password'
  withName?: boolean
}>()

const emit = defineEmits<{ submit: [credentials: { email: string; password: string; name?: string }] }>()

const name = ref('')
const email = ref('')
const password = ref('')

const nameOk = computed(() => !props.withName || normalizeName(name.value) !== null)

function onSubmit() {
  emit('submit', {
    email: email.value.trim(),
    password: password.value,
    ...(props.withName ? { name: normalizeName(name.value) ?? '' } : {}),
  })
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="onSubmit">
    <div v-if="props.withName">
      <label for="name" class="mb-1 block text-sm font-medium text-slate-200">Nome</label>
      <input
        id="name"
        v-model="name"
        type="text"
        required
        :maxlength="NAME_MAX_LENGTH"
        autocomplete="name"
        class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400"
      />
    </div>
    <div>
      <label for="email" class="mb-1 block text-sm font-medium text-slate-200">E-mail</label>
      <input
        id="email"
        v-model="email"
        type="email"
        required
        autocomplete="email"
        class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400"
      />
    </div>
    <div>
      <label for="password" class="mb-1 block text-sm font-medium text-slate-200">Senha</label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        minlength="6"
        :autocomplete="props.autocompletePassword"
        class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400"
      />
    </div>
    <p v-if="props.error" role="alert" class="text-sm text-red-400">{{ props.error }}</p>
    <button
      type="submit"
      :disabled="props.loading || !email || password.length < 6 || !nameOk"
      class="w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {{ props.loading ? 'Aguarde…' : props.submitLabel }}
    </button>
  </form>
</template>
