import { expect, type Locator, type Page } from '@playwright/test'

/** Libro de medidores (/medidores): filtros por estado, búsqueda, orden y tabla. */
export class MetersPage {
  constructor(private readonly page: Page) {}

  readonly heading = () => this.page.getByRole('heading', { level: 1, name: 'Libro de medidores' })
  readonly table = () => this.page.getByRole('table')
  readonly rows = () => this.table().locator('tbody').getByRole('row')
  readonly search = () => this.page.getByRole('combobox', { name: 'Medidor' })
  readonly searchButton = () => this.page.getByRole('button', { name: 'Buscar medidor' })
  readonly statusTab = (label: 'Todos' | 'Normales' | 'Alertas' | 'Críticas') =>
    this.page.getByRole('group', { name: 'Estado' }).getByText(label, { exact: true })

  async goto() {
    await this.page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Medidores' }).click()
    await expect(this.heading()).toBeVisible()
  }

  async filterByStatus(label: 'Todos' | 'Normales' | 'Alertas' | 'Críticas') {
    await this.statusTab(label).click()
  }

  async searchMeter(text: string) {
    await this.search().fill(text)
    await this.searchButton().click()
  }

  row(meterId: string): Locator {
    return this.rows().filter({ has: this.page.getByRole('rowheader', { name: meterId, exact: true }) })
  }

  async openMeter(meterId: string) {
    await this.row(meterId).getByRole('link', { name: meterId, exact: true }).click()
  }
}
