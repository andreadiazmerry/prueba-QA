# 01 · Plan de pruebas · EnergIA

**Autora:** Andrea Diaz · QA · **Fecha:** 02-11-2026


## Resumen ejecutivo

## 1. Alcance

El objetivo de este plan es verificar que la plataforma cumpla los requisitos técnicos y
funcionales descritos en la documentación: que detecte, clasifique y priorice correctamente
las anomalías de los medidores y que el operador vea información correcta. A continuación se
definen los componentes que se probarán y los que quedan por fuera.

### Medidores

Se probarán los 4 medidores con anomalía (uno por cada tipo de resultado del motor) y 2 de
los 8 medidores sin anomalía:

- M-109 · anomalía real (se empieza por este: es prioridad 1).
- M-112 · calidad de datos.
- M-104 · anomalía explicable.
- M-106 · falso positivo.
- M-103 · sin anomalía (+1,24 %).
- M-105 · sin anomalía (−1,13 %).

Los medidores sin anomalía se eligieron por partición de equivalencia: los 8 están en la
misma clase ("sin anomalía → estado Normal"), así que el sistema debe tratarlos igual y basta
con probar representantes. Se tomaron los dos más cercanos a los bordes de la clase (mayor
variación positiva y mayor variación negativa), porque son los que tienen más probabilidad de
clasificarse mal. Si estos dos salen Normal, los otros 6 (con variación entre −0,91 % y
+0,72 %) quedan cubiertos.

### Funcionalidades que se prueban

- Login y protección de rutas: entrar con usuario y clave, y que sin sesión no se pueda ver
  nada (ni en pantalla ni en la API).
- Despacho: las órdenes priorizadas y los indicadores de "Estado de la planta".
- Libro de medidores: filtros por estado, búsqueda, orden y paginación.
- Detalle de medidor, incluyendo que las fechas se muestren en hora de planta.
- API: respuestas comparadas contra Swagger y backend/README.md.
- Reglas del motor: que cada tipo de anomalía tenga el estado, la severidad y la prioridad
  que dice la documentación.
- Run AI Analysis: que el análisis termine correctamente.

### Qué no se prueba y por qué

- Rendimiento y carga: son pocos datos (4.032 lecturas) cargados en memoria; el riesgo es bajo.
- Redacción con OpenAI: requiere una API key que no está disponible. Se probó el modo sin key,
  que usa el texto del motor.
- Seguridad avanzada (ataques, fuerza bruta): no cabe en el tiempo de la prueba.
- Accesibilidad completa: solo se revisó que botones y campos tengan nombre.
- Instalación en servidor: no es parte del producto que usa el operador.
- Celular y otros navegadores: solo se probó en Chrome.

## 2. Análisis de riesgos (impacto × probabilidad)

El mayor impacto de una falla es que el operador tome una decision equivocada: investigar en sitio un falso positivo, ignorar una anomalia real o revisar la ventana de tiempo equivocada. Eso genera costos operativos (visitas innecesarias, equipos con falla que siguen consumiendo), ademas de que afectaria la credibilidad y confianza que tienen los clientes con Bia. 

Riesgos priorizados:
-Clasificacion y estado de cada medidor: Prioridad ALTA.
Esto es debido a que si falla, se escala lo que no hay que escalar o se ignora una anomalia real. 

-Fechas y horas: Prioridad ALTA.
Si falla un medidor se investiga en la ventana equivocada.

-Pririzacion de las ordenes: Prioridad ALTA.
Es importante para poder atender primero lo mas importante, si falla se atiende lo menos importante primero.

-Consistencia entre API, pantalla y documentacion: Prioridad MEDIA.
Se pueden llegar a toma de decisiones con cifras distintas dependiendo de la pantalla que se use.

-Filtros, busqueda y paginacion: Prioridad Media.
Esto puede hacer que el operador no encuentre un medidor o hay errores 500.

-Autenticacion: Prioridad Media.
El operador puede no acceder a la aplicacion, produciendo un acceso indebido o bloqueo de operadores.

-Run AI Analysis: Prioridad Baja.
Se pueden dar analisis colgado o duplicado.

## 3. Tipos de prueba por capa

-SMOKE (UI+API): Verificacion minimande que el build se puede probar. 
Ver 02-smoke.md.
-FUNCIONAL DE CAJA NEGRA: partición de equivalencia, valores límite, tablas de decisión, pruebas negativas y consistencia entre capas. 
Ver 03-casos-caja-negra.md.
-EXPLORATORIA(UI): sesiones cortas guiadas por los riesgos.
-CAJA BLANCA:Revisión de ramas y condiciones, y de la cobertura de los tests existentes.
Ver 04-caja-blanca.md.
-Regresión automatizada: flujo E2E de negocio en la UI, tests de API con request y un test por defecto, con timezoneId: America/Bogota. 
Ver ../e2e/.

## 4. Criterios de entrada y salida

**Entrada**
- La app levanta con `docker compose up -d --build` (o en modo desarrollo) y `/health` responde `{"status":"ok"}`.
- El login funciona con las credenciales por defecto.
- Smoke en verde (si falla, el build se devuelve sin más pruebas).

**Salida**
- 100 % de los casos de prioridad Alta ejecutados.
- 0 defectos abiertos de severidad Crítica o Alta (hoy: 2 abiertos → **no cumple**).
- Suite de Playwright en verde y sin `test.fail()` pendientes de defectos Altos.
- Defectos Media/Baja documentados con dueño y fecha.

## 5. Entorno

macOS (MacBook Air), Docker Desktop 4.97, Chrome actual; zona horaria America/Bogota (UTC−5). Backend Go, frontend React 19 + Vite. Verificación cruzada en Linux con Chromium headless (Playwright 1.63).

## 6. Uso de IA

Usé Claude (Anthropic) como asistente para:
- Leer más rápido la documentación y el código.
- Generar el esqueleto del proyecto de Playwright (config, page objects, fixtures).