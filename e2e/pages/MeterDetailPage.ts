import type { Page } from '@playwright/test'

/** Detalle de un medidor (/medidores/:id). */
export class MeterDetailPage {
  constructor(private readonly page: Page) {}

  readonly title = () => this.page.locator('#meter-title') // h1 con el ID del medidor
  readonly header = () => this.page.getByRole('region', { name: /M-\d+/ }).first()
  readonly lastReading = () => this.page.getByText(/Última lectura/).locator('span')

  /** Valor de una tarjeta de cifra clave: "Consumo actual · 24 h", "Baseline diario", "Variación", "Severidad". */
  field(label: string) {
    return this.header().locator('div', { has: this.page.getByText(label, { exact: true }) }).last()
  }
}
