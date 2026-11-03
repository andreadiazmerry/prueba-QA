import { test, expect } from '../../fixtures/test'
import { M106 } from '../../data/meters'

/**
 * DEF-01 · Un FALSE_POSITIVE aparece como "Alerta" en vez de "Normal".
 * Oráculo: backend/README.md · "Estado de alerta de un medidor": Sin anomalía, o FALSE_POSITIVE → NORMAL.
 * Causa probable: backend/internal/meter/enums.go · StatusOf() no trata FALSE_POSITIVE.
 */
test.describe('DEF-01 · estado de un falso positivo', () => {
  test.fail()

  test('M-106 (falso positivo) aparece como Normal en el libro de medidores', async ({ metersPage, page }) => {
    await page.goto('/medidores')
    await expect(metersPage.heading()).toBeVisible()
    await expect(metersPage.row(M106.id).getByRole('cell').first()).toHaveText(M106.expectedStatusUi)
  })
})
