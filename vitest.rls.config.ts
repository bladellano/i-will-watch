import { defineConfig, loadEnv } from 'vite'

// Teste de RLS: roda contra o Supabase real, com 2 usuários de teste (.env.test.local).
export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.spec.ts'],
    env: loadEnv(mode === 'production' ? 'test' : mode, process.cwd(), ''),
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
}))
