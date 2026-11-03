/** Usuario por defecto de la app (backend/README.md · Login). Sobrescribible por entorno. */
export const operador = {
  email: process.env.E2E_EMAIL ?? 'admin@energia.local',
  password: process.env.E2E_PASSWORD ?? 'admin123',
  name: 'Operador',
}
