import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

// Credenciais do usuário de teste: mesmas fontes do teste de RLS (.env, .env.local, .env.test, .env.test.local).
const fileEnv = loadEnv('test', process.cwd(), '')
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value
}
if (!process.env.TEST_USER_A_EMAIL || !process.env.TEST_USER_A_PASSWORD) {
  console.warn('[e2e] TEST_USER_A_EMAIL/TEST_USER_A_PASSWORD ausentes: testes com login serão pulados (veja .env.test.example).')
}

const PORT = 4173

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    serviceWorkers: 'block', // evita cache do PWA interferindo nos testes
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build-only && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
