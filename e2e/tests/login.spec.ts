import { test, expect } from '../fixtures/test'
import { operador } from '../data/users'

/** Login por UI (sin storageState). Partición de equivalencia: credenciales válidas / inválidas. */
test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => loginPage.goto())

  test('credenciales válidas llevan al Despacho', async ({ loginPage, page }) => {
    await loginPage.login(operador.email, operador.password)
    await loginPage.expectLoggedIn()
    await expect(page.getByText(operador.name)).toBeVisible()
  })

  test('contraseña incorrecta muestra error y no entra', async ({ loginPage, page }) => {
    await loginPage.login(operador.email, 'clave-mala')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('ruta protegida sin sesión redirige a login', async ({ page }) => {
    await page.goto('/medidores')
    await expect(page).toHaveURL(/\/login/)
  })
})
