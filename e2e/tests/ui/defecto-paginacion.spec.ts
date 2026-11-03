import { test, expect } from '../../fixtures/test'

/**
 * DEF-05 · "Siguiente" queda deshabilitado aunque haya más páginas.
 * 12 medidores, 10 por página → 2 páginas. La UI dice "1–10 de 12" pero no deja ir a la página 2,
 * así que M-111 y M-112 (¡crítico!) no se alcanzan por paginación con el orden por defecto.
 * Causa probable: frontend/src/features/meters/components/Pagination.tsx línea 13:
 * Math.floor(count / size) en vez de Math.ceil.
 * Encontrado por Andrea en prueba exploratoria (buscando "M-1").
 */
test.describe('DEF-05 · paginación del libro de medidores', () => {
  test.fail()

  test('con 12 resultados se puede ir a la página 2 y ver M-112', async ({ page, metersPage }) => {
    await page.goto('/medidores?medidor=M-1')
    const nav = page.getByRole('navigation', { name: 'Paginación' })
    await expect(nav).toContainText('1–10 de 12')
    await expect(nav.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
    await nav.getByRole('button', { name: 'Siguiente' }).click()
    await expect(metersPage.row('M-112')).toBeVisible()
  })
})
