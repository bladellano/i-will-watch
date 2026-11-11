<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ArrowLeft, ImagePlus } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { createCapture, normalizeUrl, validateImage } from '@/modules/capture/services/capture.service'

const auth = useAuthStore()
const router = useRouter()

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const title = ref('')
const url = ref('')
const source = ref('')
const saving = ref(false)
const error = ref('')

const canSave = computed(() => !saving.value && (file.value !== null || title.value.trim() !== '' || url.value.trim() !== ''))

function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const chosen = input.files?.[0] ?? null
  error.value = ''
  clearPreview()
  file.value = null
  if (!chosen) return
  const invalid = validateImage(chosen)
  if (invalid) {
    error.value = invalid
    input.value = ''
    return
  }
  file.value = chosen
  previewUrl.value = URL.createObjectURL(chosen)
}

async function onSubmit() {
  const userId = auth.user?.id
  if (!userId || !canSave.value) return
  error.value = ''
  saving.value = true
  try {
    const id = await createCapture({
      userId,
      file: file.value,
      title: title.value,
      url: normalizeUrl(url.value),
      source: source.value,
    })
    await router.push({ name: 'capture', params: { id } })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro inesperado.'
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(clearPreview)
</script>

<template>
  <AppLayout>
    <RouterLink :to="{ name: 'home' }" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
      <ArrowLeft class="h-4 w-4" aria-hidden="true" /> Voltar
    </RouterLink>
    <h2 class="text-lg font-medium">Nova captura</h2>
    <p class="mt-1 text-sm text-slate-400">
      Salve a indicação agora e identifique depois. Nada é enviado a uma IA nesta etapa.
    </p>

    <form class="mt-5 max-w-xl space-y-4" novalidate @submit.prevent="onSubmit">
      <div>
        <label for="image" class="mb-1 block text-sm text-slate-300">Imagem ou captura de tela (JPEG, PNG ou WebP, até 5 MB)</label>
        <label
          for="image"
          class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 p-6 text-sm text-slate-300 hover:bg-slate-900"
        >
          <ImagePlus class="h-5 w-5" aria-hidden="true" />
          {{ file ? file.name : 'Escolher imagem' }}
        </label>
        <input id="image" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onFileChange" />
        <img v-if="previewUrl" :src="previewUrl" alt="Prévia da imagem escolhida" class="mt-3 max-h-64 rounded-lg" />
      </div>
      <div>
        <label for="cap-title" class="mb-1 block text-sm text-slate-300">Título (opcional)</label>
        <input
          id="cap-title"
          v-model="title"
          type="text"
          maxlength="200"
          class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-indigo-400"
        />
      </div>
      <div>
        <label for="cap-url" class="mb-1 block text-sm text-slate-300">URL de referência (opcional)</label>
        <input
          id="cap-url"
          v-model="url"
          type="url"
          inputmode="url"
          maxlength="2048"
          placeholder="https://"
          class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-indigo-400"
        />
      </div>
      <div>
        <label for="cap-source" class="mb-1 block text-sm text-slate-300">Origem da indicação (opcional)</label>
        <input
          id="cap-source"
          v-model="source"
          type="text"
          list="source-suggestions"
          maxlength="100"
          placeholder="Ex.: WhatsApp, amigo, rede social"
          class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-indigo-400"
        />
        <datalist id="source-suggestions">
          <option value="WhatsApp" />
          <option value="E-mail" />
          <option value="Redes sociais" />
          <option value="Site" />
          <option value="Amigo" />
        </datalist>
      </div>
      <p v-if="error" role="alert" class="text-sm text-red-400">{{ error }}</p>
      <button
        type="submit"
        :disabled="!canSave"
        class="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ saving ? 'Salvando…' : 'Salvar captura' }}
      </button>
      <p class="text-xs text-slate-400">Informe ao menos uma imagem, um título ou uma URL.</p>
    </form>
  </AppLayout>
</template>
