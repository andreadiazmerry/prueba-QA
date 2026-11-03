import { expect, type Page } from '@playwright/test'

export class LoginPage {
  constructor(private readonly page: Page) {}

  readonly email = () => this.page.getByLabel('Email')
  readonly password = () => this.page.getByLabel('Contraseña')
  readonly submit = () => this.page.getByRole('button', { name: 'Entrar' })

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.email().fill(email)
    await this.password().fill(password)
    await this.submit().click()
  }

  async expectLoggedIn() {
    await expect(this.page.getByRole('heading', { level: 1, name: 'Despacho' })).toBeVisible()
  }
}
