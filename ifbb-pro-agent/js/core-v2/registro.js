/* EN CONSTRUCCIÓN · núcleo v2 (B-039, DEC-023). Este módulo NO está conectado a la interfaz ni al motor
 * actual: el PR del corte lo conecta y borra el motor viejo (docs/specs/nucleo-v2.md, "El corte").
 *
 * Registro único de reglas (docs/specs/nucleo-v2.md, "Registro único de reglas"). Todo número del núcleo
 * vive acá y en ningún otro lado. Cada entrada lleva:
 *   id, valor, unidad, dec (DEC de origen), nivel (E1 a E4), fuente (texto citable o "criterio de diseño"),
 *   fuentes (ids de KNOWLEDGE.SOURCES que respalda la regla), tipo (estricta | aviso), paso (del algoritmo
 *   de reparto, 1 a 7, o 'fuera' si es de un bloque fuera del núcleo), estado (implementada | pendiente),
 *   cuando (condición del perfil para que la regla, y sus fuentes, estén activas; sin ella, siempre activa)
 *   y origen (nombre en VALIDATOR_RULES o dónde estaba escrito el número en engine.js).
 *
 * Requisito de B-039: una fuente aparece en el plan solo cuando la regla que respalda está activa
 * (por ejemplo, la cita de la OMS solo con la bandera salud/funcional): ver fuentesActivas().
 *
 * `estado`: 'implementada' si el código de core-v2 la lee con regla() o valor(); 'pendiente' si ninguna
 * lógica la lee todavía (la usará el reparto, paso 2 de la construcción). Un test comprueba el estado
 * contra el uso real (CLAUDE.md, regla 3). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CORE_V2_REGISTRO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CRITERIO = 'criterio de diseño';
  const SIN_RESPALDO_PUNTUAL = 'rango general consistente con la literatura; valores puntuales sin respaldo, criterio de diseño E4';
  const PELLAND = 'Pelland JC et al. 2026, Sports Med 56(2):481-505, doi 10.1007/s40279-025-02344-w';
  const ACSM_2026 = 'ACSM 2026, postura sobre prescripción del entrenamiento de fuerza: infografía oficial (~10 series por grupo muscular a la semana para hipertrofia)';
  const SPIERING = 'Spiering et al. 2021, J Strength Cond Res 35(5):1449-1458 (revisión narrativa; respalda el concepto de mantener con menos volumen, no la cifra)';
  const KEOGH_TUNG = 'Keogh y Winwood 2017, Sports Med 47(3):479-501 (PMID 27328853) y Tung et al. 2024, BMJ Open Sport Exerc Med 10(4):e001884 (PMID 39650568): dónde ocurren las lesiones, no cómo evitarlas';
  const OMS_2020 = 'Bull FC et al. 2020, Br J Sports Med 54(24):1451-1462, doi 10.1136/bjsports-2020-102955 (PMID 33239350); directrices de la OMS 2020 (ISBN 9789240015128): 150 a 300 min por semana de actividad aeróbica moderada, el extremo inferior como mínimo de salud para la población general (aplicarlo a un plan de definición es una extrapolación)';

  const DEFINICION = { goal: 'cut' };
  const SALUD_EN_DEFINICION = { goal: 'cut', healthGoal: true };

  // e(): una entrada del registro. `estado` arranca en 'pendiente'; las que lee catalogo.js se marcan abajo.
  const e = (id, valor, unidad, dec, nivel, fuente, props) => Object.assign({
    id, valor, unidad, dec, nivel, fuente, fuentes: [], tipo: 'estricta', paso: null, estado: 'pendiente', cuando: null, origen: null,
  }, props);

  const REGLAS = [
    /* ---- Paso 1 · capacidad en minutos (DEC-024) ---- */
    e('SEGUNDOS_EJECUCION_SERIE', 45, 's', 'DEC-024', 'E4', CRITERIO, { paso: 1, estado: 'implementada', origen: 'VALIDATOR_RULES.setExecutionSeconds', nota: 'Transición más ejecución por serie. Supuesto fijo: se calibrará con los tiempos reales del modo sesión.' }),
    e('DESCANSO_MULTIARTICULAR_S', 150, 's', 'DEC-024', 'E4', CRITERIO, { paso: 1, estado: 'implementada', origen: 'engine.js (descanso 150 s)', nota: 'Cae dentro del rango de los datos (Rosa 2023, solo evidencia aguda).' }),
    e('DESCANSO_AISLAMIENTO_S', 75, 's', 'DEC-024', 'E4', CRITERIO, { paso: 1, estado: 'implementada', origen: 'engine.js (descanso 75 s)', nota: 'Cae en la zona ambigua de 60–90 s.' }),
    e('DESCANSO_PISO_RESPALDADO_S', 60, 's', 'DEC-024', 'E2', 'Singer et al. 2024, Front Sports Act Living 6:1429789 (PMID 39205815) y otras; leídas en resumen. E2 con salvedad: respalda un piso de 60 a 90 s, no los valores por tipo de ejercicio', { paso: 1, origen: 'DECISIONS.md DEC-024', nota: 'Ningún descanso del registro puede bajar de este piso (test).' }),
    e('FACTOR_UNILATERAL', 2, '×', 'DEC-007', 'E4', CRITERIO, { paso: 1, estado: 'implementada', origen: 'engine.js (unilateralFactor)', nota: 'Los unilaterales cuentan ambos lados.' }),

    /* ---- Paso 2 · restricciones de seguridad ---- */
    e('MAX_LUMBAR_ALTA_POR_SESION', 1, 'ejercicios', 'DEC-022', 'E4', KEOGH_TUNG, { paso: 2, estado: 'implementada', tipo: 'aviso', origen: 'VALIDATOR_RULES.maxLumbarHighPerSession', nota: 'A2. Ninguna fuente prueba que el tope prevenga lesiones.' }),
    e('SEPARACION_SENTADILLA_BISAGRA', true, 'regla', 'DEC-022', 'E4', KEOGH_TUNG, { paso: 2, estado: 'implementada', origen: 'VALIDATOR_RULES.hingeSquatSeparation', nota: 'A3. Pasa a propiedad del tipo de sesión (pierna con sentadilla y pierna con bisagra).' }),
    e('UMBRAL_DOLOR_BANDERA', 5, '0-10', 'DEC-011', 'E4', 'Pain-Monitoring Model (Thomeé 1997; adaptado en Silbernagel et al. 2007, Am J Sports Med 35(6):897-906, PMID 17307888). Umbral verificado en una fuente secundaria (Sprague et al. 2021)', { paso: 2, fuentes: ['SILBERNAGEL_2007'], origen: 'VALIDATOR_RULES.painFlagThreshold', nota: 'A6. Marcado para revisión en el motor actual.' }),
    e('DOLOR_SESIONES_MINIMAS', 2, 'sesiones', 'DEC-011', 'E4', CRITERIO, { paso: 2, origen: 'VALIDATOR_RULES.painAdviceMinSessions', nota: 'Sesiones distintas con dolor sobre el umbral en el mismo patrón.' }),
    e('DOLOR_VENTANA_DIAS', 28, 'días', 'DEC-011', 'E4', CRITERIO, { paso: 2, origen: 'VALIDATOR_RULES.painAdviceWindowDays', nota: 'Últimas 4 semanas, contadas hacia atrás.' }),

    /* ---- Paso 3 · estructura ---- */
    e('MAX_EJERCICIOS_PRIORITARIOS', 3, 'variantes', 'spec núcleo v2', 'E4', CRITERIO, { paso: 3, estado: 'implementada', origen: 'docs/specs/nucleo-v2.md', nota: 'Decidido por Emanuel (2026-11-07).' }),
    e('MAX_DIAS_GRUPO_CHICO', 2, 'días por semana', 'DEC-026', 'E4', CRITERIO, { paso: 3, estado: 'implementada', origen: 'engine.js (máximo de días de un grupo chico)', nota: 'Se conserva como compatibilidad de grupos chicos (T6, aprobado el 2026-11-07).' }),
    e('SERIES_MIN_POR_EJERCICIO', 2, 'series', 'DEC-026', 'E4', CRITERIO, { paso: 5, estado: 'implementada', origen: 'engine.js (mínimo de series por ejercicio)', nota: 'Propuesta de paso: se confirma al construir el reparto.' }),
    e('TOP_SET_SOLO_EN_DEFINICION', true, 'regla', 'DEC-002', 'E4', CRITERIO, { paso: 6, estado: 'implementada', cuando: DEFINICION, origen: 'DEC-002 y DEC-008', nota: 'El top set existe solo en definición (decidido el 2026-11-08).' }),

    /* ---- Paso 4 · necesidad semanal y demandas mínimas ---- */
    e('NECESIDAD_SEMANAL_POR_NIVEL', { advanced: 18, intermediate: 14, novice: 10 }, 'series por semana', 'DEC-026', 'E4', SIN_RESPALDO_PUNTUAL, { paso: 4, estado: 'implementada', origen: 'engine.js (volumen base 18/14/10)' }),
    e('FACTOR_NECESIDAD_DEFINICION', 0.85, '×', 'DEC-001', 'E4', SIN_RESPALDO_PUNTUAL, { paso: 4, estado: 'implementada', cuando: DEFINICION, origen: 'engine.js (×0,85)', nota: 'Se aplica una sola vez, sobre la necesidad.' }),
    e('FACTOR_NECESIDAD_ENFASIS', 1.25, '×', 'DEC-001', 'E4', SIN_RESPALDO_PUNTUAL, { paso: 4, estado: 'implementada', origen: 'engine.js (×1,25 énfasis y rezagados)', nota: 'Rezagados y énfasis de la división; se aplica una sola vez, sobre la necesidad.' }),
    e('FACTOR_NECESIDAD_ENFASIS_REDUCIDO', 0.5, '×', 'DEC-001', 'E4', CRITERIO, { paso: 4, estado: 'implementada', origen: 'engine.js (×0,5 énfasis reducido)', nota: 'Aprobado el 2026-11-07 como criterio de diseño.' }),
    e('FACTOR_NECESIDAD_GRUPO_CHICO', 0.6, '×', 'DEC-026', 'E4', CRITERIO, { paso: 4, estado: 'implementada', origen: 'engine.js (×0,6 grupos chicos)', nota: 'Aprobado el 2026-11-07 como criterio de diseño.' }),
    e('REZAGADOS_TOPE_SERIES', 20, 'series por semana', 'DEC-001', 'E4', CRITERIO, { paso: 4, estado: 'implementada', origen: 'engine.js (tope de 20 para rezagados)', nota: 'Aprobado el 2026-11-07 como criterio de diseño.' }),
    // El mínimo de 4 series por semana (NECESIDAD_MINIMA_SERIES) se eliminó en el paso 2: era redundante (DEC-026, análisis del 2026-11-08).
    e('PISO_SEMANAL_GRUPO', 10, 'series fraccionadas por semana', 'DEC-017', 'E1', ACSM_2026, { paso: 4, estado: 'implementada', origen: 'VALIDATOR_RULES.minWeeklySetsPerMuscle', nota: 'Piso protector de los grupos mayores; se informa para todos (T11, aprobado). Verificado contra el material oficial del ACSM, no contra el artículo completo.' }),
    e('FACTOR_PISO_MANTENIMIENTO', 0.5, '×', 'DEC-017', 'E4', SPIERING, { paso: 4, estado: 'implementada', fuentes: ['SPIERING_MANT_2021'], origen: 'VALIDATOR_RULES.maintenanceFloorFactor', nota: 'Convención alineada con DEC-001: el grupo con énfasis reducido solo se mantiene.' }),
    e('MINIMO_SEMANAL_GRUPO_CHICO', 5, 'series fraccionadas por semana', 'DEC-020', 'E4', SPIERING, { paso: 4, estado: 'implementada', fuentes: ['SPIERING_MANT_2021'], origen: 'VALIDATOR_RULES.groupMinimumWeeklySets', derivadoDe: ['PISO_SEMANAL_GRUPO', 'FACTOR_PISO_MANTENIMIENTO'], nota: 'Derivado: piso × factor de mantenimiento. Un test comprueba que sigue siendo el producto.' }),
    e('FRECUENCIA_MINIMA_GRUPOS_MAYORES', 2, 'sesiones por semana', 'DEC-010', 'E1', 'ACSM 2026, postura sobre prescripción del entrenamiento de fuerza (resumen)', { paso: 4, origen: 'VALIDATOR_RULES.minWeeklyFrequencyMajorGroups', nota: 'Pendiente en el motor actual: ninguna lógica la lee.' }),

    /* ---- Paso 5 · relleno por cobertura marginal ---- */
    e('MAX_SERIES_FRACCIONADAS_MUSCULO_SESION', 11, 'series fraccionadas', 'DEC-025', 'E3', 'Remmert et al., meta-regresiones del volumen por sesión (preprint sin revisión por pares, SportRχiv, https://sportrxiv.org/index.php/server/preprint/view/537); punto sin mejora detectable fijado de forma arbitraria por los autores, que dicen que no es un límite superior', { paso: 5, estado: 'implementada', origen: 'VALIDATOR_RULES.maxFractionalSetsPerMuscleSession', nota: 'R1. Desde el corte es restricción del reparto (DEC-025); ganan las demandas mínimas si chocan.' }),
    e('PESO_SERIE_DIRECTA', 1, 'series', 'DEC-014', 'E2', PELLAND + ' (E2 con salvedad; leído solo en resumen)', { paso: 5, estado: 'implementada', origen: 'VALIDATOR_RULES.directSetWeight', nota: 'Conteo fraccionado: convención global, nunca por ejercicio.' }),
    e('PESO_SERIE_INDIRECTA', 0.5, 'series', 'DEC-014', 'E4', PELLAND + ': 0,5 es la convención del modelo de mejor ajuste, declarada por los autores como supuesto y heurística', { paso: 5, estado: 'implementada', origen: 'VALIDATOR_RULES.secondaryMuscleWeight', nota: 'El valor 0,5 es criterio de diseño.' }),
    e('PESO_SIN_RELACION', 0, 'series', 'DEC-014', 'E4', CRITERIO, { paso: 5, estado: 'implementada', origen: 'VALIDATOR_RULES.noRelationWeight', nota: 'Relación ninguna o a_verificar cuenta 0.' }),

    /* ---- Paso 6 · orden y top set ---- */
    e('ORDEN_POR_DEMANDA', true, 'regla', 'DEC-022', 'E4', 'Nunes et al. 2021, Eur J Sport Sci, https://pubmed.ncbi.nlm.nih.gov/32077380/ (la hipertrofia es similar en cualquier orden; solo resumen). Que el motivo sea proteger la espalda es criterio de diseño', { paso: 6, estado: 'implementada', origen: 'VALIDATOR_RULES.sessionOrderByDemand', nota: 'A1. Que el orden no cuesta hipertrofia es E2; el motivo de seguridad es E4.' }),
    e('TOP_SET_REPETICIONES', [4, 6], 'repeticiones', 'DEC-002', 'E4', CRITERIO, { paso: 6, estado: 'implementada', cuando: DEFINICION, origen: 'engine.js (top set 4–6)' }),
    e('TOP_SET_RIR', [1, 2], 'RIR', 'DEC-002', 'E4', CRITERIO, { paso: 6, estado: 'implementada', cuando: DEFINICION, origen: 'engine.js (RIR 1–2)' }),
    e('BACKOFF_REDUCCION_PORCENTAJE', 10, '%', 'DEC-002', 'E4', 'Formato top set y back-off: criterio de diseño sobre Helms, Bickel y ACSM 2009. Respaldan mantener la intensidad con menos volumen, no el formato en sí', { paso: 6, estado: 'implementada', cuando: DEFINICION, fuentes: ['BICKEL_2011', 'SPIERING_MANT_2021'], origen: 'engine.js (back-offs al −10 %)' }),
    e('DESCANSO_TOP_SET_S', 180, 's', 'DEC-024', 'E4', CRITERIO, { paso: 1, estado: 'implementada', cuando: DEFINICION, origen: 'engine.js (180 s del top set)' }),
    e('DESCANSO_BACKOFF_S', 150, 's', 'DEC-024', 'E4', CRITERIO, { paso: 1, estado: 'implementada', cuando: DEFINICION, origen: 'engine.js (150 s de back-off)' }),

    /* ---- Paso 2 de la construcción · reparto: entradas nuevas (propuestas, nivel 2) ---- */
    e('TIEMPO_DISPONIBLE_POR_DEFECTO_MIN', 75, 'min por sesión', 'propuesta del agente', 'E4', CRITERIO, { paso: 1, estado: 'implementada', origen: 'propuesta del agente (nivel 2)', nota: 'Capacidad de la sesión cuando el perfil no declara su tiempo. 75 min está dentro del rango de las sesiones del motor actual (53 a 82 min en el perfil de Emanuel). Emanuel lo confirma o lo cambia.' }),
    e('ENFASIS_POR_DIVISION', {
      bodybuilding_m: { up: ['back', 'quads'], down: [] },
      classic_m: { up: ['shoulders', 'back', 'quads'], down: [] },
      physique_m: { up: ['shoulders', 'back', 'abs'], down: ['quads', 'hamstrings', 'glutes'] },
      physique_w: { up: ['shoulders', 'back', 'quads'], down: [] },
      figure_w: { up: ['shoulders', 'back', 'glutes'], down: [] },
      bikini_w: { up: ['glutes', 'hamstrings', 'shoulders'], down: ['quads', 'chest', 'biceps', 'triceps'] },
      wellness_w: { up: ['glutes', 'quads', 'hamstrings'], down: ['chest', 'shoulders', 'biceps', 'triceps'] },
      general_m: { up: [], down: [] },
      general_w: { up: [], down: [] },
    }, 'grupos', 'DEC-001', 'E4', CRITERIO, { paso: 4, estado: 'implementada', origen: 'engine.js (EMPHASIS_MAP)', nota: 'Tabla de datos (grupos con énfasis ×1,25 y reducido ×0,5 por división), copiada tal cual del motor actual.' }),
    e('EXCLUSIONES_POR_LESION', {
      shoulder: ['chest.dip_parallel', 'chest.press_machine', 'shoulders.press_overhead_barbell', 'shoulders.press_overhead_db', 'shoulders.press_overhead_db_seated', 'triceps.close_grip_press', 'triceps.dips'],
      elbow: ['biceps.curl_barbell', 'biceps.curl_ez', 'triceps.close_grip_press', 'triceps.dips'],
      wrist: ['chest.bench_press_barbell', 'back.row_barbell', 'back.row_pendlay', 'biceps.curl_barbell', 'biceps.curl_ez'],
      lower_back: ['back.row_barbell', 'back.row_pendlay', 'quads.squat_back', 'quads.squat_hack', 'hamstrings.rdl'],
      hip: ['quads.squat_back', 'quads.squat_hack', 'quads.lunge', 'quads.bulgarian_split_squat', 'glutes.bulgarian_hip', 'functional.bulgarian_db'],
      knee: ['quads.squat_back', 'quads.squat_hack', 'quads.lunge', 'quads.bulgarian_split_squat', 'quads.leg_extension', 'functional.bulgarian_db'],
      ankle: ['quads.lunge', 'quads.bulgarian_split_squat', 'glutes.bulgarian_hip', 'calves.calf_raise_standing', 'functional.bulgarian_db'],
    }, 'variantes por zona', 'DEC-009', 'E4', CRITERIO, { paso: 2, estado: 'implementada', origen: 'knowledge.js (INJURY_EXCLUSIONS)', nota: 'Mapa cerrado de DEC-009 (capa 3) expresado por variante. Hasta el corte un test lo compara con el mapa del motor actual.' }),

    /* ---- Fuera del núcleo v2 · cardio y funcionales (los números se registran; la lógica no cambia) ---- */
    e('CARDIO_MINIMO_SALUD', 150, 'min por semana', 'DEC-005', 'E1', OMS_2020, { paso: 'fuera', cuando: SALUD_EN_DEFINICION, fuentes: ['WHO_PA'], origen: 'engine.js (piso de 150 min con la bandera)', nota: 'Solo con la bandera salud/funcional en definición. Si aplica a todas las fases queda abierto en B-040.' }),
    e('CARDIO_SALUD_SESIONES', 3, 'sesiones por semana', 'DEC-005', 'E4', CRITERIO, { paso: 'fuera', cuando: SALUD_EN_DEFINICION, origen: 'engine.js (3 sesiones con la bandera)' }),
    e('CARDIO_SALUD_MINUTOS', 50, 'min por sesión', 'DEC-005', 'E4', CRITERIO, { paso: 'fuera', cuando: SALUD_EN_DEFINICION, origen: 'engine.js (50 min con la bandera)' }),
    e('CARDIO_INTENSIDAD_PORCENTAJE_FCMAX', [60, 70], '% de la FC máxima', 'DEC-026', 'E4', CRITERIO, { paso: 'fuera', cuando: DEFINICION, fuentes: ['ACSM_CARDIO'], origen: 'engine.js (60–70 % FCmáx)', nota: 'Solo se leyeron los metadatos de ACSM_CARDIO; el contenido de esta cifra no se verificó.' }),
    e('CARDIO_DEFINICION_SESIONES_AVANZADO', 3, 'sesiones por semana', 'DEC-026', 'E4', CRITERIO, { paso: 'fuera', cuando: DEFINICION, origen: 'engine.js (cardio de definición, nivel avanzado)' }),
    e('CARDIO_DEFINICION_SESIONES', 2, 'sesiones por semana', 'DEC-026', 'E4', CRITERIO, { paso: 'fuera', cuando: DEFINICION, origen: 'engine.js (cardio de definición, otros niveles)' }),
    e('CARDIO_DEFINICION_MINUTOS', 25, 'min por sesión', 'DEC-026', 'E4', CRITERIO, { paso: 'fuera', cuando: DEFINICION, origen: 'engine.js (cardio de definición)' }),
    e('CARDIO_MANTENIMIENTO_SESIONES', 2, 'sesiones por semana', 'DEC-026', 'E4', CRITERIO, { paso: 'fuera', origen: 'engine.js (cardio de mantenimiento y volumen)', nota: '50 min por semana en total: criterio de diseño, sin cita de la OMS (2026-11-08).' }),
    e('CARDIO_MANTENIMIENTO_MINUTOS', 25, 'min por sesión', 'DEC-026', 'E4', CRITERIO, { paso: 'fuera', origen: 'engine.js (cardio de mantenimiento y volumen)' }),
    e('SERIES_EXTRA_FUNCIONAL_SIN_VOLUMEN', 2, 'series', 'DEC-005', 'E4', CRITERIO, { paso: 'fuera', cuando: { healthGoal: true }, origen: 'VALIDATOR_RULES.functionalNoVolumeExtraSets', nota: 'Paseo del granjero: se agrega aparte y no cuenta como volumen. Marcado para revisión en el motor actual.' }),

    /* ---- Reglas de progresión de volumen (R3): configuradas en el motor actual, sin lector ---- */
    e('AUMENTO_SEMANAL_MAXIMO_PORCENTAJE', 20, '%', 'DEC-010', 'E4', 'FAPESP: la progresión óptima de volumen no está definida (https://bv.fapesp.br/en/bolsas/223465/URL)', { paso: 'fuera', tipo: 'aviso', origen: 'VALIDATOR_RULES.maxWeeklyVolumeIncreasePct', nota: 'Pendiente en el motor actual: ninguna lógica la lee.' }),
    e('RATIO_AGUDO_CRONICO_MAXIMO', 1.3, 'razón', 'DEC-010', 'E4', 'Gabbett, ratio de carga aguda/crónica (https://research.usq.edu.au/item/q6y98/workload-monitoring-and-athlete-management)', { paso: 'fuera', tipo: 'aviso', origen: 'VALIDATOR_RULES.maxAcuteChronicRatio', nota: 'Pendiente en el motor actual: ninguna lógica la lee.' }),
    e('VENTANA_HISTORIAL_SEMANAS', 4, 'semanas', 'DEC-010', 'E4', CRITERIO, { paso: 'fuera', origen: 'VALIDATOR_RULES.historyWindowWeeks', nota: 'Pendiente en el motor actual: ninguna lógica la lee.' }),
    e('HISTORIAL_MINIMO_SEMANAS_RAMPA', 2, 'semanas', 'DEC-010', 'E4', CRITERIO, { paso: 'fuera', origen: 'VALIDATOR_RULES.minHistoryWeeksForRamp', nota: 'Pendiente en el motor actual: ninguna lógica la lee.' }),
  ];

  const POR_ID = {};
  REGLAS.forEach(r => { if (POR_ID[r.id]) throw new Error('Regla duplicada en el registro: ' + r.id); POR_ID[r.id] = r; });

  // Las reglas que lee código de core-v2 (catalogo.js) pasan a 'implementada' desde su propia definición
  // (arriba); acá solo se valida que el id existe cuando alguien lo pide.
  function regla(id) {
    if (!POR_ID[id]) throw new Error('Regla inexistente en el registro: ' + id);
    return POR_ID[id];
  }
  const valor = id => regla(id).valor;

  // ¿La condición `cuando` de la regla se cumple con este perfil? Una condición es un objeto de igualdades
  // sobre campos del perfil ({ goal: 'cut', healthGoal: true }); sin condición, la regla siempre está activa.
  function estaActiva(r, perfil) {
    if (!r.cuando) return true;
    const p = perfil || {};
    return Object.keys(r.cuando).every(k => p[k] === r.cuando[k]);
  }
  const reglasActivas = perfil => REGLAS.filter(r => estaActiva(r, perfil));

  // Requisito de B-039: una fuente aparece en el plan solo si alguna regla activa la respalda.
  function fuentesActivas(perfil) {
    const ids = new Set();
    reglasActivas(perfil).forEach(r => r.fuentes.forEach(f => ids.add(f)));
    return [...ids].sort();
  }

  return { REGLAS, regla, valor, estaActiva, reglasActivas, fuentesActivas };
});
