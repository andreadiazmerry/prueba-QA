import { test, expect } from '../../fixtures/test'
import { M109 } from '../../data/meters'

/**
 * Flujo E2E de negocio: el operador entra al libro de medidores, filtra las críticas,
 * busca M-109, abre el detalle y valida las cifras clave contra la documentación.
 * (La sesión viene del proyecto "setup" vía storageState: no hay login aquí.)
 */
test.describe('Libro de medidores → detalle de M-109', () => {
  test('filtra críticas, busca M-109 y valida sus datos clave', async ({ page, metersPage, meterDetail }) => {
    await page.goto('/')
    await metersPage.goto()

    // 1. Filtro por estado "Críticas": solo M-109 y M-112 (los dos HIGH del README).
    await metersPage.filterByStatus('Críticas')
    await expect(page).toHaveURL(/estado=CRITICAL/)
    await expect(metersPage.rows()).toHaveCount(2)
    await expect(metersPage.table().getByRole('rowheader')).toHaveText(['M-109', 'M-112'])

    // 2. Búsqueda parcial: "109" encuentra M-109 (backend/README.md · meter_id).
    await metersPage.searchMeter('109')
    await expect(metersPage.rows()).toHaveCount(1)
    const row = metersPage.row(M109.id)
    await expect(row).toContainText(M109.status)
    await expect(row).toContainText(M109.consumption)
    await expect(row).toContainText(M109.variation)

    // 3. Detalle: cifras de negocio contra el oráculo.
    await metersPage.openMeter(M109.id)
    await expect(page).toHaveURL(/\/medidores\/M-109$/)
    await expect(meterDetail.title()).toHaveText(M109.id)
    await expect(meterDetail.header()).toContainText(M109.status)
    await expect(meterDetail.header()).toContainText(M109.consumption)
    await expect(meterDetail.header()).toContainText(M109.baseline)
    await expect(meterDetail.header()).toContainText(M109.variation)
    await expect(meterDetail.header()).toContainText(M109.severity)
    await expect(meterDetail.header()).toContainText(M109.typeLabel)
  })
})
