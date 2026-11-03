# 04 · Pruebas de caja blanca

Código revisado en el commit `026b991`. Elegí los módulos por los riesgos R1, R2 y R5 del plan: 4 módulos, uno por cada defecto encontrado en caja negra.

## 1. Módulos revisados

### 1.1 `backend/internal/meter` (estado, filtros y orden) · riesgo R1/R5

**`enums.go` · `StatusOf()` (líneas 25–38)**

```go
// StatusOf traduce el resultado del motor a un estado de alerta:
//   - sin anomalía, o falso positivo (el motor dice "no escalar"): NORMAL
//   - severidad HIGH: CRITICAL
//   - cualquier otra anomalía: ALERT
func StatusOf(a *model.Anomaly) Status {
switch {
case a == nil:                         // sin anomalía → NORMAL
    return StatusNormal
case a.Severity == model.SeverityHigh: // HIGH → CRITICAL
    return StatusCritical
default:                               // todo lo demás → ALERT
    return StatusAlert
}
```

- **El comentario de la función dice “falso positivo → NORMAL”, pero el código no lo implementa.** Tiene 3 ramas y la regla documentada tiene 4 casos: **falta `a.Type == FALSE_POSITIVE` (o `!a.Anomaly`) → NORMAL**. M-106 cae en `default` → ALERT. → **DEF-01**.
- El modelo ya trae `Anomaly: false` para M-106 (`/anomaly/getAll`), así que la información está disponible: solo falta la rama.
- El efecto se propaga al dashboard (`status_counts`), al filtro por estado y al orden por severidad.

**`service.go` · `GetAll()` (línea 59)**

```go
if search != "" && !strings.Contains(sm.MeterID, search) {
```

- `strings.Contains` distingue mayúsculas y `Normalize()` (dto.go) solo hace `TrimSpace` del `meter_id`, sin `ToUpper`. → **DEF-02**.
- Contraste: `GetByID()` sí hace `strings.ToUpper` (por eso `/getById/m-109` funciona). Las dos rutas del mismo módulo no son coherentes.

### 1.2 `backend/internal/httpx/paging.go` (paginación) · riesgo R5

```go
if p.Page == 0 { p.Page = DefaultPage }        // solo cubre el 0
...
if p.Size < 1 || p.Size > MaxPageSize { ... }   // size sí se valida
...
start := min((p.Page-1)*p.Size, len(items))     // línea 48: con page=-1 → start=-20
Rows:  append([]T{}, items[start:end]...)       // panic: slice bounds out of range [:-10]
```

- `Normalize()` valida `size` pero **no** valida `page < 0`. Partición inválida sin cubrir. → **DEF-03** (500 + panic en el log).
- El middleware de recover evita que se caiga el proceso, pero el cliente recibe un 500 en vez de un 400 con mensaje.

### 1.3 `frontend/src/lib/format.ts` (fechas) · riesgo R2

```ts
// Se leen las partes UTC para NO convertirla a la zona del navegador.
export function formatPlantTime(iso: string): string {
  const d = toDate(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}` // línea 57
}
```

- El comentario dice "partes UTC", pero usa `getDate/getMonth/getHours` (**hora local**). Las funciones vecinas `formatPlantDate` y `formatPlantDay` sí usan `getUTC*`. → **DEF-04**.
- En America/Bogota (UTC−5) toda hora de planta sale 5 h antes y, cerca de la medianoche, **con el día anterior** (01/09 00:00 → 31/08 19:00).
- Se usa en: Despacho (Detectada), Libro (Última lectura), detalle de medidor, investigación y gráficas horarias.

### 1.4 `frontend/src/features/meters/components/Pagination.tsx` · riesgo R5

```ts
const pages = Math.max(1, Math.floor(count / size))   // línea 13
...
<Button onClick={() => onPage(page + 1)} disabled={page >= pages}>Siguiente</Button>
```

- `Math.floor(12 / 10)` = 1 → `pages = 1` → con `page = 1`, `page >= pages` es verdadero → **Siguiente deshabilitado**. Debería ser `Math.ceil` (= 2). → **DEF-05**.
- Valores límite: count 10 → 1 página ✅; 11 → da 1, debería ser 2 ❌; 20 → 2 ✅; 21 → da 2, debería ser 3 ❌. Solo funciona cuando el total es múltiplo exacto del tamaño de página.
- La API sí pagina bien (`count: 12`, `page: 2` devuelve M-111 y M-112): el error es solo del cálculo en el front.

## 2. Tests existentes

| Suite | Resultado | Cobertura (`go test -cover`) |
|---|---|---|
| `go test ./...` | ✅ todo pasa | analysis 100 %, quality 89,7 %, stats 89,5 %, changes 82,4 %, baseline 80 %, meter 79,6 %, server 78,9 %, ai 71,7 %, auth 28,3 %, **classify 6,9 %**, httpx/dashboard/anomaly/store 0 % (directo) |
| `pnpm test` (Vitest) | ✅ 11 tests en 3 archivos | `format`, `useMeterFilters`, `marks` |

**¿Qué cubren?** Bien el motor estadístico con los CSV reales (`TestAnalyzeRealData`: tipos, severidades y orden de los 4 casos), la mediana/MAD/z, la detección de tramos, la validación básica del body y la autenticación (401, token vencido).

**¿Qué no cubren y por qué no confío en todos?**

1. **`TestStatusOf` no tiene el caso FALSE_POSITIVE.** Prueba nil, HIGH, MEDIUM y LOW, pero no la regla que distingue FALSE_POSITIVE. Por eso DEF-01 pasa.
2. **`TestDashboardSummary` confirma el defecto.** Afirma `normal 8 · alert 2 · critical 2`: el test se escribió con la salida actual y no con la regla de la doc (9 · 1 · 2). Cuando se corrija DEF-01, **este test va a fallar**, y hay que cambiar el test, no revertir el fix.
3. **Los tests del front corren en UTC.** `vite.config.ts` → `test.env.TZ = 'UTC'`. El test `muestra la hora de planta sin convertirla a la zona del navegador` pasa porque en UTC `getHours() === getUTCHours()`. El test no puede detectar justo lo que dice probar. → DEF-04 invisible.
4. **Búsqueda solo con datos en mayúsculas** (`"109"`, `"M-11"`): ningún caso en minúsculas, aunque la doc lo promete.
5. **Paginación sin valores inválidos de `page`**: `TestNormalizeRejectsInvalid` usa `size: 500` pero ningún `page` negativo.
6. **`classify` con 6,9 %**: las reglas de severidad (> 50 % y activa, > 20 %, ≥ 12 h) solo se prueban de forma indirecta con el dataset real. Las reglas R2, R3, R4 y R6 de la tabla de decisión (REAL_ANOMALY no activa, MEDIUM o LOW; DATA_QUALITY MEDIUM) no existen en el dataset, así que esas ramas no tienen ningún test.
7. **`Pagination.tsx` no tiene ningún test.** Los 3 archivos de Vitest son `format`, `useMeterFilters` y `marks`. Un test con `count: 12, size: 10` habría mostrado DEF-05.

## 3. Tests unitarios propuestos (hoy fallan)

**Go · `backend/internal/meter/defects_test.go`**

```go
// DEF-01: FALSE_POSITIVE → NORMAL (backend/README.md · Estado de alerta).
func TestStatusOfFalsePositiveIsNormal(t *testing.T) {
	a := &model.Anomaly{Anomaly: false, Type: model.TypeFalsePositive, Severity: model.SeverityLow}
	if got := StatusOf(a); got != StatusNormal {
		t.Errorf("StatusOf(FALSE_POSITIVE) = %s, esperaba NORMAL", got)
	}
}

// DEF-02: búsqueda sin importar mayúsculas.
func TestGetAllSearchIsCaseInsensitive(t *testing.T) {
	svc := newTestService(t)
	req := PagedRequest{Filter: Filter{MeterID: "m-109"}}
	req.Normalize()
	if res := svc.GetAll(req); res.Count != 1 {
		t.Errorf("\"m-109\" debería encontrar M-109, obtuve count %d", res.Count)
	}
}

// DEF-03: page negativo debe ser un error de validación, no un panic.
func TestNormalizeRejectsNegativePage(t *testing.T) {
	req := PagedRequest{Pagination: httpx.Pagination{Page: -1, Size: 10}}
	if errs := req.Normalize(); len(errs) == 0 {
		t.Error("page=-1 debería devolver un error de validación")
	}
}
```

Salida actual:

```
--- FAIL: TestStatusOfFalsePositiveIsNormal   StatusOf(FALSE_POSITIVE) = ALERT, esperaba NORMAL
--- FAIL: TestGetAllSearchIsCaseInsensitive   "m-109" debería encontrar M-109, obtuve count 0
--- FAIL: TestNormalizeRejectsNegativePage    page=-1 debería devolver un error de validación
```

**Vitest · `frontend/src/lib/format.bogota.test.ts`**

```ts
import { formatPlantTime } from '@/lib/format'

describe('hora de planta en America/Bogota', () => {
  const original = process.env.TZ
  beforeAll(() => { process.env.TZ = 'America/Bogota' })
  afterAll(() => { process.env.TZ = original })

  it('14:00 de planta sigue siendo 14:00', () => {
    expect(formatPlantTime('2026-09-12T14:00:00Z')).toBe('12/09 14:00')
  })
})
```

Salida actual: `expected '12/09 09:00' to be '12/09 14:00'`.

**Vitest · `frontend/src/features/meters/components/Pagination.test.tsx`** (DEF-05)

```tsx
import { render, screen } from '@testing-library/react'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('con 12 resultados y 10 por página habilita Siguiente', () => {
    render(<Pagination page={1} size={10} count={12} onPage={() => {}} />)
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeEnabled()
  })
})
```

Hoy falla: con `Math.floor`, `pages = 1` y el botón queda deshabilitado.


**Otros tests propuestos (no escritos):**
- Tabla de decisión completa de `classify.Severity` con datos sintéticos (REAL 51 % activa / 51 % no activa / 21 % / 20 %; DATA_QUALITY 11 h / 12 h).
- `TestDashboardSummary` → esperar 9 · 1 · 2.
- Ejecutar la suite de Vitest dos veces en CI: `TZ=UTC` y `TZ=America/Bogota`.

> Estos tests no se agregaron al código de la app: la regla es no tocar el código, y si se agregan, `go test ./...` queda en rojo hasta que se corrijan los defectos. Están listos para entrar junto con el fix.
