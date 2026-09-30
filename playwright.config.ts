import { defineConfig, devices } from '@playwright/test'

// Lê E2E_EMAIL/E2E_SENHA (e demais variáveis) do .env.local, se existir.
try {
  process.loadEnvFile('.env.local')
} catch {
  // Sem .env.local: usa apenas as variáveis do ambiente.
}

// Quando E2E_BASE_URL está definida (ex.: URL de produção), os testes rodam contra ela
// e nenhum servidor local é iniciado.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const usarServidorLocal = !process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 800 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: usarServidorLocal
    ? {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
})
