import { defineConfig, devices } from '@playwright/test'

/**
 * BASE_URL: front servido por Docker (3000) por defecto.
 * API_URL: backend en Go (8080).
 * Ejemplo modo desarrollo: BASE_URL=http://localhost:5173 npx playwright test
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
export const API_URL = process.env.API_URL ?? 'http://localhost:8080'
export const AUTH_FILE = '.auth/operador.json'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    // Usuarios reales: operadores de planta en Colombia.
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // 1. Login una sola vez y se guarda la sesión (storageState).
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    // 2. UI: reutiliza la sesión.
    {
      name: 'chromium',
      testMatch: /ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
    // Firefox opcional: ALL_BROWSERS=1 npx playwright test
    ...(process.env.ALL_BROWSERS
      ? [
          {
            name: 'firefox',
            testMatch: /ui\/.*\.spec\.ts/,
            use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 }, storageState: AUTH_FILE },
            dependencies: ['setup'],
          },
        ]
      : []),

    // 3. API: sin navegador, con el request de Playwright.
    { name: 'api', testMatch: /api\/.*\.spec\.ts/, use: { baseURL: API_URL } },

    // 4. Login por UI: sin sesión previa.
    { name: 'login', testMatch: /login\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
})
