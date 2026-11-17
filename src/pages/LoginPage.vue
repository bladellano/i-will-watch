<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthForm from '@/modules/auth/components/AuthForm.vue'
import GoogleSignInButton from '@/modules/auth/components/GoogleSignInButton.vue'
import { signIn, signInWithGoogle, type Credentials } from '@/modules/auth/services/auth.service'
import { safeRedirect } from '@/modules/auth/utils/redirect'
import loginBackground from '@/assets/images/login-background.webp'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref('')

const redirectPath = computed(() => safeRedirect(route.query.redirect))

async function onSubmit(credentials: Credentials) {
  loading.value = true
  error.value = ''
  try {
    await signIn(credentials)
    await router.push(redirectPath.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    loading.value = false
  }
}

async function onGoogle() {
  loading.value = true
  error.value = ''
  try {
    // Volta para a tela de origem (ex.: /capturar) com a captura preservada no fluxo do app.
    await signInWithGoogle(`${window.location.origin}${redirectPath.value}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro inesperado.'
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout :background-src="loginBackground">
    <h2 class="mb-4 text-lg font-medium">Entrar</h2>
    <GoogleSignInButton label="Continuar com Google" :loading="loading" class="mb-4" @click="onGoogle" />
    <p v-if="error" role="alert" class="mb-4 text-sm text-red-400">{{ error }}</p>
    <div class="mb-4 flex items-center gap-3 text-xs text-slate-500" aria-hidden="true">
      <span class="h-px flex-1 bg-slate-800" />ou com e-mail<span class="h-px flex-1 bg-slate-800" />
    </div>
    <AuthForm
      submit-label="Entrar"
      autocomplete-password="current-password"
      :loading="loading"
      :error="error"
      @submit="onSubmit"
    />
    <section aria-labelledby="sobre-app" class="mt-6 border-t border-slate-800 pt-5 text-sm leading-relaxed text-slate-400">
      <h3 id="sobre-app" class="mb-2 font-medium text-slate-200">Sobre a aplicação</h3>
      <p class="mb-3 font-medium text-slate-200">Organize seus filmes e séries em um só lugar!</p>
      <p class="mb-3">
        Esta aplicação foi criada para facilitar o registro e a organização de filmes e séries que você encontra durante sua
        navegação pela internet, redes sociais ou recomendações de amigos.
      </p>
      <p class="mb-3">
        Encontrou um título interessante? Adicione-o à sua coleção, registre informações como nome, ano de lançamento e imagem
        da capa, e organize tudo em listas personalizadas.
      </p>
      <p class="mb-3">
        Assim, você não precisa mais depender de anotações, mensagens ou e-mails para lembrar daquele filme ou série que deseja
        assistir.
      </p>
      <p>Sua próxima sessão começa com uma boa lista! 👌</p>
    </section>
    <p class="mt-4 text-center text-sm text-slate-400">
      Não tem conta?
      <RouterLink :to="{ name: 'register' }" class="text-indigo-400 underline underline-offset-2 hover:text-indigo-300">Cadastre-se</RouterLink>
    </p>
  </AuthLayout>
</template>
