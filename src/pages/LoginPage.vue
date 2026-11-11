<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthForm from '@/modules/auth/components/AuthForm.vue'
import { signIn, type Credentials } from '@/modules/auth/services/auth.service'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref('')

async function onSubmit(credentials: Credentials) {
  loading.value = true
  error.value = ''
  try {
    await signIn(credentials)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    // Aceita apenas caminhos internos para evitar redirecionamento externo.
    await router.push(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <h2 class="mb-4 text-lg font-medium">Entrar</h2>
    <AuthForm
      submit-label="Entrar"
      autocomplete-password="current-password"
      :loading="loading"
      :error="error"
      @submit="onSubmit"
    />
    <p class="mt-4 text-center text-sm text-slate-400">
      Não tem conta?
      <RouterLink :to="{ name: 'register' }" class="text-indigo-400 underline underline-offset-2 hover:text-indigo-300">Cadastre-se</RouterLink>
    </p>
  </AuthLayout>
</template>
