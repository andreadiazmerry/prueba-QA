# e2e · Playwright (TypeScript)

Pruebas end-to-end de UI y de API de EnergIA.

## Requisitos

- Node 20+.
- La app corriendo: desde la raíz, `docker compose up -d --build` (front en `http://localhost:3000`, API en `http://localhost:8080`).

## Instalar y correr (un solo comando)

```bash
cd e2e && npm install && npx playwright install chromium && npx playwright test
```

Después, solo `npx playwright test`. Reporte HTML: `npx playwright show-report`.

Contra el modo desarrollo (Vite en 5173):

```bash
BASE_URL=http://localhost:5173 npx playwright test
```

También en Firefox: `npx playwright install firefox && ALL_BROWSERS=1 npx playwright test`.

Variables opcionales: `BASE_URL`, `API_URL`, `E2E_EMAIL`, `E2E_PASSWORD`.

## Qué hay

```
e2e/
├── playwright.config.ts      # baseURL, timezoneId America/Bogota, locale es-CO, Chromium (+ Firefox opcional), trazas/video al fallar
├── data/                     # oráculo (valores esperados de la documentación) y usuario
├── pages/                    # Page Objects: LoginPage, MetersPage, MeterDetailPage
├── fixtures/                 # test con page objects inyectados; request de API autenticado
└── tests/
    ├── auth.setup.ts         # login una vez → .auth/operador.json (storageState)
    ├── login.spec.ts         # login válido / inválido / ruta protegida (sin sesión)
    ├── ui/flujo-medidor.spec.ts          # flujo de negocio: Libro → Críticas → buscar 109 → detalle M-109 → validar cifras
    ├── ui/defecto-falso-positivo.spec.ts # DEF-01 (test.fail)
    ├── ui/defecto-zona-horaria.spec.ts   # DEF-04 (test.fail)
    ├── ui/defecto-paginacion.spec.ts     # DEF-05 (test.fail)
    └── api/meters.api.spec.ts            # API: 401, límites de paginación, filtros, reglas de negocio, DEF-01/02/03 (test.fail)
```

Proyectos: `setup` → `chromium` (+ `firefox` con `ALL_BROWSERS=1`) (UI con sesión reutilizada), `api` (sin navegador), `login` (sin sesión).

## Decisiones

- **Locators accesibles** (`getByRole`, `getByLabel`). El único selector por id es `#meter-title`: el h1 del detalle no tiene otro nombre estable, y usar el texto del medidor como nombre sería circular.
- **Cero esperas fijas:** solo auto-waiting y `expect` web-first.
- **Login reutilizable** con `storageState` (proyecto `setup`).
- **Zona horaria** `America/Bogota`: es la de los operadores, y la que expone DEF-04.
- **Datos esperados** en `data/meters.ts`, tomados de la documentación y no de la app.

## Tests de defectos (`test.fail()`)

Están marcados como fallo esperado: hoy aparecen en verde porque fallan. Cuando el defecto se corrija, Playwright marcará el test como *"expected to fail but passed"*, y en ese momento hay que quitar la marca.

| Test | Defecto |
|---|---|
| `ui/defecto-falso-positivo.spec.ts`, `api` "DEF-01 …" | M-106 FALSE_POSITIVE sale ALERT |
| `ui/defecto-zona-horaria.spec.ts` | Hora de planta 5 h antes (12/09 09:00 vs 14:00) |
| `ui/defecto-paginacion.spec.ts` | Siguiente deshabilitado con 12 resultados |
| `api` "DEF-02 …" | Búsqueda `m-109` no encuentra nada |
| `api` "DEF-03 …" | `page=-1` → 500 |

Detalle en `../qa/05-defectos.md`.
