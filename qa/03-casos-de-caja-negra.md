# 03 · Casos de prueba funcionales · caja negra

Entorno: macOS, Chrome, America/Bogota, build `026b991`. API con curl/Playwright `request` y token Bearer.

Técnicas: **PE** partición de equivalencia · **VL** valores límite · **TD** tabla de decisión · **NEG** prueba negativa · **CONS** consistencia entre capas · **EXP** basada en experiencia/riesgo.

## Tabla de decisión del motor

Fuente: backend/README.md, secciones "7. Clasificación", "8. Severidad" y "Estado de alerta de un medidor".

| Regla | Tipo | Condición severidad | Severidad esperada | Estado esperado | Caso del dataset |
|---|---|---|---|---|---|
| R1 | REAL_ANOMALY | variación > 50 % y sigue activa | HIGH | CRITICAL | M-109 ✅ |
| R2 | REAL_ANOMALY | variación > 50 % pero ya no activa | MEDIUM | ALERT | (sin dataset) |
| R3 | REAL_ANOMALY | variación > 20 % y ≤ 50 % | MEDIUM | ALERT | (sin dataset) |
| R4 | REAL_ANOMALY | variación ≤ 20 % | LOW | ALERT | (sin dataset) |
| R5 | DATA_QUALITY | ≥ 12 h sospechosas | HIGH | CRITICAL | M-112 (16 h) ✅ |
| R6 | DATA_QUALITY | < 12 h sospechosas | MEDIUM | ALERT | (sin dataset) |
| R7 | EXPLAINABLE_ANOMALY | siempre | MEDIUM | ALERT | M-104 ✅ |
| R8 | FALSE_POSITIVE | siempre | LOW | **NORMAL** | M-106 ❌ DEF-01 (sale ALERT) |
| R9 | sin anomalía | — | — | NORMAL | 8 medidores (M-103 y M-105 probados) ✅ |

Las reglas sin caso en el dataset (R2, R3, R4, R6) no se pueden probar por UI ni API: quedan como riesgo abierto y se proponen como tests unitarios con datos sintéticos (ver 04-caja-blanca.md).

## Particiones y límites usados

Fuente: backend/README.md (body de `POST /meter/getAll`, login) y Swagger (`/docs`, schema `Pagination`).

| Entrada | Clases válidas | Clases inválidas | Valores a probar | Fuente |
|---|---|---|---|---|
| `pagination.size` | 1..100 | < 1, > 100 | 0, 1, 100, 101, −1 | Swagger: mínimo 1, máximo 100 |
| `pagination.page` | ≥ 1 | ≤ 0 | 0, 1, 2 (última), 99, −1 | Swagger: mínimo 1 |
| Sin body | — | — | body vacío | README: devuelve la página 1 de 10 |
| `filter.meter_id` | texto parcial, sin importar mayúsculas | (la doc no define inválidos) | `109`, `M-109`, `m-109`, texto muy largo | README |
| `filter.status` | NORMAL, ALERT, CRITICAL | cualquier otro valor | `CRITICAL`, `FOO` | README |
| Login | email y clave correctos | clave incorrecta, campos vacíos | — | README (usuario por defecto) |

## Casos

| ID | Título | Técnica | Capa | Precondición | Pasos | Datos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|---|---|---|
| CN-01 | Login válido | PE | UI | En /login | Llenar email y contraseña, Entrar | admin@energia.local / admin123 | Entra a Despacho; muestra "Operador" | Igual | ✅ |
| CN-02 | Login con contraseña incorrecta | PE, NEG | UI+API | — | POST /auth/login | clave `x` | 401 "Email o contraseña incorrectos"; la UI muestra un error y no entra | Igual | ✅ |
| CN-03 | Login con campos vacíos | VL, NEG | API | — | POST /auth/login | `{}` | 400 con errores por campo | 400 `email es obligatorio`, `password es obligatorio` | ✅ |
| CN-04 | Ruta protegida sin token o con token inválido | NEG | API+UI | Sin sesión | GET /auth/me; abrir /medidores | Bearer `abc` | 401 "Token inválido o expirado"; UI redirige a /login | Igual | ✅ |
| CN-05 | Estado de un FALSE_POSITIVE | TD (R8), CONS | API+UI | Login | GET /meter/getById/M-106; ver Libro | M-106 | `status: NORMAL`; UI "Normal" | API `ALERT`; UI "Alerta" | ❌ **DEF-01** |
| CN-06 | Estado de REAL_ANOMALY HIGH | TD (R1) | API+UI | Login | getById M-109 | M-109 | CRITICAL / Crítica, severidad HIGH | Igual | ✅ |
| CN-07 | Estado de DATA_QUALITY ≥12 h | TD (R5) | API | Login | getById M-112 | M-112 | DATA_QUALITY, HIGH, CRITICAL | Igual (16 h sospechosas) | ✅ |
| CN-08 | Estado de EXPLAINABLE_ANOMALY | TD (R7) | API | Login | getById M-104 | M-104 | MEDIUM, ALERT | Igual | ✅ |
| CN-09 | Orden de prioridad de las anomalías | TD (Priorización), CONS | API+UI | Login | GET /anomaly/getAll; ver Despacho | — | M-109, M-112, M-104, M-106 (README) | Igual | ✅ |
| CN-10 | Conteo por estado en el dashboard | CONS | API+UI | Login | GET /dashboard/getSummary; ver "Estado de la planta" | — | Con R8: 9 normales · 1 alerta · 2 críticas | 8 · 2 · 2 (API y UI) | ❌ **DEF-01** |
| CN-11 | Cifras de M-109 en lista vs. doc | CONS | API+UI | Login | Ver fila M-109 y su detalle | — | 2.207,6 kWh · baseline 1.052,2 · +109,8 % (backend/README) | Igual en API, lista y detalle | ✅ |
| CN-12 | Hora de detección de M-109 en Despacho | CONS, EXP | UI | Login, navegador en America/Bogota | Ver tarjeta de la orden 1 | — | "Detectada 12/09 14:00" (misma hora que "desde 12/09 14:00" del texto y `detected_at` de la API) | "Detectada 12/09 09:00" | ❌ **DEF-04** |
| CN-13 | Última lectura en hora de planta | CONS, VL (último dato) | UI | Login, America/Bogota | Libro y detalle de M-109 | Dataset 01/09 00:00 → 14/09 23:00 | 14/09 23:00 | 14/09 18:00 | ❌ **DEF-04** |
| CN-14 | Búsqueda parcial | PE | API+UI | Login | getAll `meter_id` | `109` | Solo M-109 | Igual | ✅ |
| CN-15 | Búsqueda sin importar mayúsculas | PE, CONS | API+UI | Login | getAll `meter_id`; buscar en UI | `m-109` | M-109 ("sin importar mayúsculas", backend/README) | count 0; UI "Ningún medidor coincide" | ❌ **DEF-02** |
| CN-16 | Búsqueda con texto muy largo | VL, NEG | API | Login | getAll | 50 y 51 caracteres | La doc no define un máximo: 200 con 0 resultados | 50 → 200; 51 → 400 "no puede superar 50 caracteres" | ⚠️ **OBS-05** |
| CN-17 | `size` en los límites | VL | API | Login | getAll | 0, 1, 100, 101, −1 | 1 y 100 → 200; 0, 101 y −1 → 400 (Swagger: mínimo 1, máximo 100) | 1, 100 → 200; 101, −1 → 400; **0 → 200** con 10 filas | ⚠️ **OBS-06** |
| CN-18 | `page` en los límites | VL, NEG | API | Login | getAll | 0, 1, 2, 99, −1 | 1 → 10 filas; 2 (última) → 2 filas; 99 → `[]`; 0 y −1 → 400 (Swagger: mínimo 1) | 1, 2, 99 como se esperaba; 0 → 200 (OBS-06); **−1 → 500** "Error interno" | ❌ **DEF-03** |
| CN-19 | Filtro por estado inválido | NEG | API | Login | getAll | `status: FOO` | 400 con formato de error documentado | Igual | ✅ |
| CN-20 | Campo desconocido en el body | NEG | API | Login | getAll | `{"filtr":{}}` | 400 | 400 `unknown field "filtr"` | ✅ |
| CN-21 | Orden por consumo | PE | API+UI | Login | getAll; Libro → Ordenar por Consumo, Mayor a menor | `sort_by: consumption`, `sort_order: DESC` | M-109 primero (mayor consumo, 2.207,6 kWh) | Igual | ✅ |
| CN-22 | Filtro "Críticas" en UI | PE, CONS | UI | Login | Libro → Críticas | — | M-109 y M-112; URL `?estado=CRITICAL` | Igual | ✅ |
| CN-23 | Detalle de medidor inexistente | NEG | API+UI | Login | getById; abrir /medidores/M-999 | M-999 | 404 "Medidor no encontrado"; UI "No existe el medidor M-999" | Igual | ✅ |
| CN-24 | Run AI Analysis | EXP | API+UI | Login | Botón Run AI Analysis / POST /ai/analyze y polling | — | 202 → COMPLETED con los 7 pasos | AN-0002 · Completado · 2 nov 20:11:11 · Motor (plantilla) | ✅ |
| CN-26 | Paginación en UI con 12 resultados | VL, EXP | UI+API | Login | Libro de medidores (sin filtro o buscando `M-1`) → Siguiente; API getAll page 1 y 2 | 12 medidores, 10 por página | "1–10 de 12", Siguiente habilitado, página 2 con M-111 y M-112 | API: `count 12`, page 2 trae M-111 y M-112. UI: Siguiente deshabilitado | ❌ **DEF-05** |
| CN-27 | Medidores sin anomalía en los bordes de la clase | PE, TD (R9) | API+UI | Login | Ver M-103 y M-105 en el Libro y por API | M-103 +1,24 %, M-105 −1,13 % | Normal, sin severidad ni anomalía | Igual | ✅ |
| CN-25 | Subtítulo de Despacho vs. tarjetas | CONS | UI | Login | Ver Despacho | — | Mismo número de órdenes en subtítulo y tarjetas | Subtítulo "3 órdenes abiertas" / tarjetas "Orden 1 de 4" | ⚠️ **OBS-01** |

**Resumen:** 27 casos · 17 ✅ · 7 ❌ (5 defectos distintos) · 3 ⚠️ (observaciones).

**Observaciones (OBS):** OBS-01 a OBS-06; las ⚠️ de la tabla son OBS-01, OBS-05 y OBS-06.

## Observaciones (no son defectos confirmados)

- **OBS-01** · El subtítulo cuenta 3 órdenes (excluye el falso positivo) y las tarjetas dicen "Orden X de 4". Puede ser intencional (M-106 "No escalar"), pero confunde al operador. Sugerencia: unificar el criterio o decir "3 órdenes abiertas · 1 descartada".
- **OBS-02** · La variación de M-109 sale **+110,5 %** en la orden y **+109,8 %** en la tabla. Según la doc es correcto (ventana de 58 h vs. últimas 24 h), pero la UI no aclara la diferencia.
- **OBS-03** · "Confianza IA 0,90": el promedio de 0,95 · 0,95 · 0,86 · 0,86 es 0,905. Con redondeo usual daría 0,91; sale 0,90 por la representación en coma flotante. Impacto bajo.
- **OBS-04** · Login acepta el email en mayúsculas (`ADMIN@energia.local`). Razonable, pero no está documentado.
- **OBS-05** · La API rechaza `meter_id` de más de 50 caracteres ("no puede superar 50 caracteres"), pero ese límite no está en la documentación ni en Swagger. Sugerencia: documentarlo (`maxLength: 50`).
- **OBS-06** · `size: 0` y `page: 0` responden 200 con valores por defecto (10 y 1), pero Swagger define `minimum: 1`. La doc y la API no coinciden: o se rechazan con 400, o se documenta que 0 significa "por defecto".