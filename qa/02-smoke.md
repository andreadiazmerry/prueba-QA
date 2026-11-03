# 02 · Pruebas de humo (smoke)

**Objetivo:** responder en menos de 5 minutos "¿este build se puede probar?". Si un caso falla, el build se devuelve.

**Build:** `026b991` · **Entorno:** macOS + Docker Desktop, Chrome, America/Bogota · **Fecha:** 2026-11-02

| ID | Verificación | Por qué está en el smoke | Resultado |
|---|---|---|---|
| SM-01 | `GET /health` → `200 {"status":"ok"}` | Sin backend no hay nada que probar | ✅ Pasa |
| SM-02 | `http://localhost:3000` carga la pantalla de login | El front se construyó y nginx lo sirve | ✅ Pasa |
| SM-03 | Login con `admin@energia.local / admin123` lleva a la página **Despacho** | Puerta de entrada a todo lo demás | ✅ Pasa |
| SM-04 | `POST /api/v1/meter/getAll` sin token → `401` | La protección de rutas está activa (un build sin auth no debe salir) | ✅ Pasa |
| SM-05 | Despacho muestra 4 órdenes y el indicador "Medidores 12" | El motor corrió al arrancar y cargó los CSV | ✅ Pasa |
| SM-06 | Libro de medidores carga la tabla con 10 filas y el total "1–10 de 12 medidores" | La pantalla más usada carga datos | ✅ Pasa (ver nota) |
| SM-07 | Abrir `M-109` muestra su detalle (consumo, baseline, variación, gráficas) | Navegación a detalle y endpoint `getById` | ✅ Pasa |
| SM-08 | **Run AI Analysis** termina en estado **Completado** | Única acción que ejecuta un proceso (asíncrono) | ✅ Pasa (`AN-0002`, 2 nov 20:11:11, Motor (plantilla)) |

**Nota SM-06:** durante las pruebas funcionales se encontró que el botón "Siguiente" no permite ir a la página 2 (**DEF-05**). No bloquea el smoke porque el resto del producto se puede probar, pero queda reportado como defecto.

**Veredicto:** 8/8 → el build **es apto para pruebas**. Se continúa con las pruebas funcionales.

Automatizados en Playwright: SM-03 (`tests/auth.setup.ts`, `tests/login.spec.ts`), SM-04 (`tests/api/meters.api.spec.ts`), SM-06 y SM-07 (`tests/ui/flujo-medidor.spec.ts`).