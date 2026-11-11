<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthForm from '@/modules/auth/components/AuthForm.vue'
import { signUp, type Credentials } from '@/modules/auth/services/auth.service'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const needsConfirmation = ref(false)

async function onSubmit(credentials: Credentials & { name?: string }) {
  loading.value = true
  error.value = ''
  try {
    const signedIn = await signUp(credentials)
    if (signedIn) await router.push('/')
    else needsConfirmation.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <h2 class="mb-4 text-lg font-medium">Criar conta</h2>
    <p v-if="needsConfirmation" role="status" class="text-sm text-slate-300">
      Conta criada. Enviamos um e-mail de confirmação; confirme-o e depois
      <RouterLink :to="{ name: 'login' }" class="text-indigo-400 underline underline-offset-2 hover:text-indigo-300">entre</RouterLink>.
    </p>
    <template v-else>
      <AuthForm
        submit-label="Cadastrar"
        autocomplete-password="new-password"
        with-name
        :loading="loading"
        :error="error"
        @submit="onSubmit"
      />
      <p class="mt-4 text-center text-sm text-slate-400">
        Já tem conta?
        <RouterLink :to="{ name: 'login' }" class="text-indigo-400 underline underline-offset-2 hover:text-indigo-300">Entrar</RouterLink>
      </p>
    </template>
  </AuthLayout>
</template>
