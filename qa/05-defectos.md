# 05 · Reporte de defectos

**Entorno común:** macOS (MacBook Air) · Chrome actual · zona horaria America/Bogota (UTC−5) · Docker Desktop 4.97 · build `026b991` (main) · usuario `admin@energia.local`. Reproducido también en Linux + Chromium headless (Playwright 1.63).

Severidad = impacto en el usuario/negocio. Prioridad = urgencia de corregir.

| ID | Título | Severidad | Prioridad | Capa |
|---|---|---|---|---|
| DEF-01 | Un falso positivo (M-106) aparece como "Alerta" en vez de "Normal" | Alta | Alta | Backend |
| DEF-04 | La hora de planta se muestra 5 h antes en Colombia | Alta | Alta | Frontend |
| DEF-05 | "Siguiente" deshabilitado: no se puede ir a la página 2 del libro | Media | Alta | Frontend |
| DEF-02 | La búsqueda de medidor distingue mayúsculas | Baja | Media | Backend |
| DEF-03 | `page` negativo en `/meter/getAll` responde 500 (panic) | Media | Baja | Backend |

---

## DEF-01 · Un falso positivo (M-106) aparece como "Alerta" en vez de "Normal"

- **Severidad: Alta.** El producto existe para separar lo que hay que escalar de lo que no. El operador ve una alerta que el propio motor dice "No escalar", y los KPI salen mal (2 alertas en vez de 1).
- **Prioridad: Alta.** Afecta la pantalla principal y la confianza en el sistema. El arreglo es de una línea.
- **Pasos:**
  1. Login.
  2. Ir a **Medidores** (o mirar el Libro de medidores en Despacho).
  3. Mirar la fila **M-106**.
  4. API: `GET /api/v1/meter/getById/M-106` y `GET /api/v1/dashboard/getSummary`.
- **Esperado:** M-106 en estado **Normal** (`NORMAL`). Conteo de la planta: **9 normales · 1 alerta · 2 críticas**.
  Fuente: backend/README.md · tabla "Estado de alerta de un medidor": *"Sin anomalía, o `FALSE_POSITIVE` → `NORMAL`"*.
- **Obtenido:** M-106 en **Alerta** (`"status": "ALERT"`, `"anomaly_type": "FALSE_POSITIVE"`). Conteo `8 · 2 · 2`. El filtro **Alertas** también incluye M-106. En la misma pantalla, su tarjeta de orden dice "No escalar": la UI se contradice.
- **Evidencia:** `evidencias/DEF-01-falso-positivo-alert.txt`, `evidencias/DEF-01-libro-m106-alerta.png`.
- **Causa raíz probable:** `backend/internal/meter/enums.go`, `StatusOf()` (líneas 29–38). No hay rama para FALSE_POSITIVE y cae en `default → StatusAlert`. Fix sugerido: `case a == nil || !a.Anomaly: return StatusNormal`.
- **Cómo detectarlo automáticamente:** caso FALSE_POSITIVE en `TestStatusOf` (ver 04-caja-blanca.md). Corregir `TestDashboardSummary`, que hoy afirma 8/2/2. Playwright: `tests/api/meters.api.spec.ts` (DEF-01) y `tests/ui/defecto-falso-positivo.spec.ts`.

---

## DEF-04 · La hora de planta se muestra 5 h antes en Colombia

- **Severidad: Alta.** Todas las horas de la operación salen corridas. El operador ve "Detectada 12/09 09:00" para un cambio que empezó a las 14:00, y la última lectura como 18:00 cuando es 23:00. Una inspección en sitio basada en la pantalla mira la ventana equivocada. Cerca de la medianoche, además, cambia el día.
- **Prioridad: Alta.** Todos los usuarios están en America/Bogota: les pasa al 100 % de ellos.
- **Pasos:**
  1. Navegador con zona horaria America/Bogota (cualquier equipo configurado en Colombia).
  2. Login → **Despacho** → tarjeta de la orden 1 (M-109).
  3. Comparar "Detectada …" (arriba a la derecha) con el texto "desde 12/09 14:00".
  4. Abrir **M-109** → "Última lectura … (hora de planta)".
- **Esperado:** "Detectada **12/09 14:00**" y "Última lectura **14/09 23:00**". Fuentes: el texto del motor y backend/README.md (*"58 horas seguidas … desde el 12/09 14:00"*), la API (`detected_at: 2026-09-12T14:00:00Z`, `last_reading_at: 2026-09-14T23:00:00Z`) y el subtítulo de la propia UI: *"hora de planta"*.
- **Obtenido:** "Detectada **12/09 09:00**" y "Última lectura **14/09 18:00**". En el Libro de medidores, todas las filas muestran 18:00.
- **Evidencia:** `evidencias/DEF-04-despacho-detectada-0900.png`, `evidencias/DEF-04-detalle-ultima-lectura-1800.png`.
- **Causa raíz probable:** `frontend/src/lib/format.ts`, `formatPlantTime()` (línea 57). Usa `getDate/getMonth/getHours/getMinutes` (hora local) en vez de `getUTC*`, al contrario de su propio comentario y de las funciones vecinas.
- **Por qué no lo vieron los tests:** `vite.config.ts` fuerza `TZ: 'UTC'` en Vitest, y en UTC hora local = hora UTC.
- **Cómo detectarlo automáticamente:** test unitario con `TZ=America/Bogota` (04-caja-blanca.md) y Playwright con `timezoneId: 'America/Bogota'`: `tests/ui/defecto-zona-horaria.spec.ts` (`test.fail()`).

---

## DEF-02 · La búsqueda de medidor distingue mayúsculas

- **Severidad: Baja.** Hay alternativas: escribir en mayúsculas, el número solo ("109") o elegir del autocompletar.
- **Prioridad: Media.** Contradice la documentación de la API y es común escribir en minúsculas. El arreglo es trivial.
- **Pasos:**
  1. Login → **Medidores**.
  2. Escribir `m-109` en "Medidor" → Buscar.
  3. API: `POST /api/v1/meter/getAll` con `{"filter":{"meter_id":"m-109"}}`.
- **Esperado:** aparece M-109. Fuente: backend/README.md · `meter_id`: *"Búsqueda parcial, sin importar mayúsculas"*.
- **Obtenido:** "Ningún medidor coincide con los filtros" / `count: 0`. Con `M-109` o `109` sí funciona.
- **Evidencia:** `evidencias/DEF-02-busqueda-mayusculas.txt`, `evidencias/DEF-02-ui-busqueda-m-109.png`.
- **Causa raíz probable:** `backend/internal/meter/service.go`, línea 59 (`strings.Contains(sm.MeterID, search)`). `Normalize()` en `dto.go` no pasa `meter_id` a mayúsculas, aunque `GetByID` sí lo hace.
- **Cómo detectarlo automáticamente:** `TestGetAllSearchIsCaseInsensitive`; Playwright `tests/api/meters.api.spec.ts` (DEF-02).

---

## DEF-03 · `page` negativo en `POST /meter/getAll` responde 500 (panic)

- **Severidad: Media.** Error no controlado del servidor (panic) ante una entrada inválida: viola el contrato de errores y es un vector de ruido en logs. No tumba el proceso: el middleware de recover lo atrapa.
- **Prioridad: Baja.** La UI nunca envía páginas negativas (`useMeterFilters` lo sanea). Solo es alcanzable por API directa.
- **Pasos:** `POST /api/v1/meter/getAll` con token y body `{"pagination":{"page":-1,"size":10}}`.
- **Esperado:** `400` con `errors: ["pagination.page debe ser mayor o igual a 1"]`, igual que `size` fuera de rango. Fuente: Swagger (`page` minimum 1) y backend/README.md (*"Los errores responden siempre con el mismo formato"* con 400 para filtros inválidos).
- **Obtenido:** `500 "Error interno del servidor"`. En el log: `ERROR panic error="runtime error: slice bounds out of range [:-10]"`.
- **Evidencia:** `evidencias/DEF-03-page-negativo-500.txt`.
- **Causa raíz probable:** `backend/internal/httpx/paging.go`. `Normalize()` solo reemplaza `page == 0` y no valida `page < 0`. Luego `Paginate()` (línea 48) calcula `start` negativo y hace el slice.
- **Cómo detectarlo automáticamente:** `TestNormalizeRejectsNegativePage`; Playwright `tests/api/meters.api.spec.ts` (DEF-03). Sugerencia: fuzzing de los campos numéricos del body.

---

## DEF-05 · "Siguiente" queda deshabilitado aunque haya más páginas

*Encontrado en prueba exploratoria del buscador (búsqueda `M-1`).*

- **Severidad: Media.** El operador no puede llegar a la página 2 del Libro de medidores. Con el orden por defecto (por medidor), **M-111 y M-112 quedan inaccesibles por paginación, y M-112 es un medidor CRÍTICO**. Hay rodeos (ordenar por severidad, buscar el medidor, cambiar `?pagina=2` en la URL), pero la función de paginar no sirve.
- **Prioridad: Alta.** Afecta siempre (con y sin filtros, para cualquier resultado que no sea múltiplo exacto de 10). El arreglo es de una palabra.
- **Pasos:**
  1. Login → **Medidores**.
  2. Escribir `M-1` en "Medidor" → Buscar (o no filtrar nada).
  3. Mirar la paginación abajo de la tabla.
- **Esperado:** "1–10 de 12 medidores" con **Siguiente habilitado**; al hacer clic, la página 2 muestra M-111 y M-112. Fuente: sentido común y la propia UI, que dice que hay 12 resultados; la API devuelve `count: 12`, y `page: 2` responde con M-111 y M-112.
- **Obtenido:** "1–10 de 12 medidores" con **Anterior y Siguiente deshabilitados**.
- **Evidencia:** `evidencias/DEF-05-paginacion-siguiente-deshabilitado.png`.
- **Causa raíz probable:** `frontend/src/features/meters/components/Pagination.tsx`, línea 13: `Math.max(1, Math.floor(count / size))`. Con 12/10 da 1 página; debería ser `Math.ceil` (2 páginas).
- **Valores límite que lo muestran:** count 10 → 1 página (bien), count 11 → debería ser 2 y da 1 (mal), count 20 → 2 (bien), count 21 → debería ser 3 y da 2 (mal). Solo funciona cuando el total es múltiplo exacto de 10.
- **Cómo detectarlo automáticamente:** test de componente de `Pagination` con count 11/size 10 → Siguiente habilitado. Playwright: `tests/ui/defecto-paginacion.spec.ts` (`test.fail()`).
