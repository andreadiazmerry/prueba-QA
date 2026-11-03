import { test, expect } from '../../fixtures/api'
import { M106, plant } from '../../data/meters'

/**
 * Tests de API con el request de Playwright.
 * Oráculo: backend/README.md (Endpoints, body de POST /meter/getAll, Estado de alerta).
 */
const GET_ALL = '/api/v1/meter/getAll'

test.describe('API · seguridad', () => {
  test('ruta protegida sin token → 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.API_URL ?? 'http://localhost:8080' })
    const res = await ctx.post(GET_ALL, { data: {} })
    expect(res.status()).toBe(401)
    await ctx.dispose()
  })
})

test.describe('API · POST /meter/getAll · paginación (valores límite)', () => {
  // size: válido 1..100. Límites: 0 (= por defecto 10), 1, 100, 101, -1.
  for (const [size, status] of [[1, 200], [100, 200], [101, 400], [-1, 400]] as const) {
    test(`size=${size} → ${status}`, async ({ api }) => {
      const res = await api.post(GET_ALL, { data: { pagination: { page: 1, size } } })
      expect(res.status()).toBe(status)
    })
  }

  test('sin body → página 1 de 10, count 12', async ({ api }) => {
    const res = await api.post(GET_ALL)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ page: 1, size: 10, count: plant.totalMeters })
    expect(body.rows).toHaveLength(10)
  })

  test('página fuera de rango (99) → 200 con rows vacío', async ({ api }) => {
    const body = await (await api.post(GET_ALL, { data: { pagination: { page: 99, size: 10 } } })).json()
    expect(body.rows).toEqual([])
  })

  // DEF-03: page negativo tumba el handler (panic → 500) en vez de 400 de validación.
  test('DEF-03 · page=-1 → 400 con mensaje de validación', async ({ api }) => {
    test.fail(true, 'DEF-03: hoy responde 500 (slice con índice negativo en httpx.Paginate)')
    const res = await api.post(GET_ALL, { data: { pagination: { page: -1, size: 10 } } })
    expect(res.status()).toBe(400)
  })
})

test.describe('API · POST /meter/getAll · filtros', () => {
  test('status inválido → 400 con el formato de error documentado', async ({ api }) => {
    const res = await api.post(GET_ALL, { data: { filter: { status: 'FOO' } } })
    expect(res.status()).toBe(400)
    expect(await res.json()).toMatchObject({
      status_code: 400,
      errors: ['filter.status debe ser NORMAL, ALERT o CRITICAL'],
      path: GET_ALL,
    })
  })

  test('búsqueda parcial "109" encuentra M-109', async ({ api }) => {
    const body = await (await api.post(GET_ALL, { data: { filter: { meter_id: '109' } } })).json()
    expect(body.rows.map((r: { meter_id: string }) => r.meter_id)).toEqual(['M-109'])
  })

  // DEF-02: la doc dice "sin importar mayúsculas".
  test('DEF-02 · búsqueda "m-109" (minúsculas) encuentra M-109', async ({ api }) => {
    test.fail(true, 'DEF-02: hoy devuelve count 0 (strings.Contains distingue mayúsculas)')
    const body = await (await api.post(GET_ALL, { data: { filter: { meter_id: 'm-109' } } })).json()
    expect(body.count).toBe(1)
  })

  test('orden por severidad DESC: prioridades del motor primero', async ({ api }) => {
    const body = await (await api.post(GET_ALL, { data: { filter: { sort_by: 'severity', sort_order: 'DESC' } } })).json()
    const ids = body.rows.slice(0, 2).map((r: { meter_id: string }) => r.meter_id)
    expect(ids.sort()).toEqual(['M-109', 'M-112'])
  })
})

test.describe('API · reglas de negocio (tabla de decisión tipo → estado)', () => {
  test('DEF-01 · M-106 FALSE_POSITIVE tiene estado NORMAL', async ({ api }) => {
    test.fail(true, 'DEF-01: hoy devuelve ALERT (meter.StatusOf no contempla FALSE_POSITIVE)')
    const res = await api.get(`/api/v1/meter/getById/${M106.id}`)
    const body = await res.json()
    expect(body.anomaly_type).toBe(M106.anomalyType)
    expect(body.status).toBe(M106.expectedStatusApi)
  })

  test('dashboard: 4 anomalías, 2 de atención y orden de prioridad del README', async ({ api }) => {
    const body = await (await api.get('/api/v1/dashboard/getSummary')).json()
    expect(body.total_meters).toBe(plant.totalMeters)
    expect(body.anomalies_detected).toBe(plant.anomalies)
    expect(body.requiring_attention).toBe(plant.requiringAttention)
    expect(body.priorities.map((p: { meter_id: string }) => p.meter_id)).toEqual(plant.priorityOrder)
  })
})
