import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Testes unitários: rápidos, sem rede e sem Supabase real.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.spec.ts'],
  },
})
