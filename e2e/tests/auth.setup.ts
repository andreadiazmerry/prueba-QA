import { test as setup } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { operador } from '../data/users'
import { AUTH_FILE } from '../playwright.config'

/** Login una sola vez; el resto de los tests de UI reutiliza la sesión (storageState). */
setup('login como operador', async ({ page }) => {
  const login = new LoginPage(page)
  await login.goto()
  await login.login(operador.email, operador.password)
  await login.expectLoggedIn()
  await page.context().storageState({ path: AUTH_FILE })
})
