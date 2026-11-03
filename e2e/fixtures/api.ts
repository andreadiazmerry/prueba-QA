import { test as base, type APIRequestContext } from '@playwright/test'
import { operador } from '../data/users'

/** Fixture de API: un request ya autenticado con Bearer token. */
export const test = base.extend<{ api: APIRequestContext }, { token: string }>({
  token: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({ baseURL: process.env.API_URL ?? 'http://localhost:8080' })
      const res = await ctx.post('/api/v1/auth/login', { data: { email: operador.email, password: operador.password } })
      const { access_token } = await res.json()
      await ctx.dispose()
      await use(access_token)
    },
    { scope: 'worker' },
  ],
  api: async ({ playwright, token }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.API_URL ?? 'http://localhost:8080',
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    })
    await use(ctx)
    await ctx.dispose()
  },
})

export { expect } from '@playwright/test'
