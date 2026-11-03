/**
 * Oráculo: valores esperados tomados de la documentación (README.md y backend/README.md),
 * no del código. Si la doc cambia, se cambia aquí y no en los tests.
 */
export const M109 = {
  id: 'M-109',
  status: 'Crítica',
  typeLabel: 'Anomalía real',
  consumption: '2.207,6 kWh', // backend/README.md · "M-109: 2.207,6 kWh contra 1.052,15 kWh, +109,8%"
  baseline: '1.052,2 kWh',
  variation: '+109,8 %',
  severity: 'Alta',
  /** Inicio del cambio en hora de planta (README: "desde 12/09 14:00"). */
  changeStartPlant: '12/09 14:00',
  /** Última lectura del dataset en hora de planta: 14 días horarios, 1/09 00:00 → 14/09 23:00. */
  lastReadingPlant: '14/09 23:00',
}

export const M106 = {
  id: 'M-106',
  anomalyType: 'FALSE_POSITIVE',
  /** backend/README.md · tabla "Estado de alerta": FALSE_POSITIVE → NORMAL. */
  expectedStatusApi: 'NORMAL',
  expectedStatusUi: 'Normal',
}

/** backend/README.md · "4 anomalías detectadas · 2 requieren atención prioritaria", 12 medidores. */
export const plant = {
  totalMeters: 12,
  anomalies: 4,
  requiringAttention: 2,
  /** Con la regla FALSE_POSITIVE → NORMAL: 9 normales, 1 alerta (M-104), 2 críticas (M-109, M-112). */
  expectedCounts: { normal: 9, alert: 1, critical: 2 },
  priorityOrder: ['M-109', 'M-112', 'M-104', 'M-106'],
}
