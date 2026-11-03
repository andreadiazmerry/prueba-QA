import { test, expect } from '../../fixtures/test'
import { M109 } from '../../data/meters'

/**
 * DEF-04 · La "hora de planta" se muestra convertida a la zona del navegador.
 *
 * El dataset va del 01/09 00:00 al 14/09 23:00 en hora de planta y la API lo marca como UTC.
 * frontend/src/lib/format.ts · formatPlantTime() usa getDate()/getHours() (hora local) en vez de
 * getUTCDate()/getUTCHours(). En America/Bogota (UTC−5) toda hora de planta sale 5 h antes.
 *
 * Los tests unitarios del front no lo ven porque vite.config.ts fuerza TZ=UTC.
 * Este test corre con timezoneId America/Bogota (playwright.config.ts), como un operador real.
 *
 * test.fail(): hoy falla (= pasa en el reporte). Cuando se corrija, Playwright avisará
 * "expected to fail" y hay que quitar la marca.
 */
test.describe('DEF-04 · hora de planta en America/Bogota', () => {
  test.fail()

  test('la última lectura de M-109 se muestra en hora de planta (14/09 23:00)', async ({ page, meterDetail }) => {
    await page.goto('/medidores/M-109')
    await expect(meterDetail.title()).toHaveText(M109.id)
    await expect(meterDetail.lastReading()).toHaveText(M109.lastReadingPlant)
  })

  test('la orden de M-109 en Despacho muestra la detección a la misma hora que su explicación (12/09 14:00)', async ({ page }) => {
    await page.goto('/')
    const lead = page.getByRole('article').filter({ hasText: M109.id }).first()
    await expect(lead).toContainText(`desde ${M109.changeStartPlant}`) // texto del motor: correcto
    await expect(lead).toContainText(`Detectada ${M109.changeStartPlant}`) // UI: hoy dice 12/09 09:00
  })
})
