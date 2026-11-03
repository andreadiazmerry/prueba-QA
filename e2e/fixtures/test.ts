import { test as base } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { MetersPage } from '../pages/MetersPage'
import { MeterDetailPage } from '../pages/MeterDetailPage'

/** Fixtures: cada test recibe sus page objects listos, sin repetir "new XPage(page)". */
export const test = base.extend<{
  loginPage: LoginPage
  metersPage: MetersPage
  meterDetail: MeterDetailPage
}>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  metersPage: async ({ page }, use) => use(new MetersPage(page)),
  meterDetail: async ({ page }, use) => use(new MeterDetailPage(page)),
})

export { expect } from '@playwright/test'
