/* EN CONSTRUCCIÓN · núcleo v2 (B-039, DEC-023). Este módulo NO está conectado a la interfaz ni al motor
 * actual: el PR del corte lo conecta y borra el motor viejo (docs/specs/nucleo-v2.md, "El corte").
 *
 * Catálogo en dos niveles (docs/specs/nucleo-v2.md, "Modelo de datos"):
 *   - Patrón: el movimiento. El generador planifica por patrón.
 *   - Variante: el ejercicio concreto, con id propio. Desaparecen los ejercicios con "o" en el nombre.
 *
 * Datos de cada variante: aporte por músculo (formato largo, DEC-013) y perfil articular (DEC-021). Las
 * variantes que salen de partir un ejercicio con "o" HEREDAN las filas del ejercicio original (`hereda`):
 * no se inventó ningún dato nuevo. Donde las dos opciones difieren de verdad (por ejemplo sentadilla
 * trasera y hack, B-031) la herencia es un supuesto que Emanuel revisa; `heredado` lo deja a la vista.
 * En el PR del corte las filas heredadas se materializan en los CSV de data/.
 *
 * Los rangos de repeticiones son datos del catálogo (como en el motor actual), no reglas del registro.
 * Pendientes del corte: el campo `cue` del curl femoral (cita de Maeo 2021, hoy solo `preferida: true`) y
 * `defaultOnly` del remo con apoyo de pecho (DEC-022, hoy lo cubre `habilitaPor` del remo con barra).
 *
 * Los números (descansos, tiempo de ejecución, factor de unilaterales) salen del registro de reglas. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registro.js'), require('../exerciseMuscles.js'), require('../perfilArticular.js'));
  else root.CORE_V2_CATALOGO = factory(root.CORE_V2_REGISTRO, root.EXERCISE_MUSCLES, root.PERFIL_ARTICULAR);
})(typeof self !== 'undefined' ? self : this, function (REGISTRO, EXERCISE_MUSCLES, PERFIL_ARTICULAR) {
  'use strict';

  /* Patrones. `clase`: 'principal' (los siete que piden los tipos de sesión), 'complementario' (compuestos que
   * no cuentan como patrón obligatorio) o 'aislamiento' (un músculo). Propuesta de nivel 2: la lista y la clase
   * son criterio de diseño (E4) hasta que Emanuel las revise. */
  const PATRONES = [
    { id: 'empuje_horizontal', nombre: 'Empuje horizontal', clase: 'principal' },
    { id: 'empuje_vertical', nombre: 'Empuje vertical', clase: 'principal' },
    { id: 'tiron_vertical', nombre: 'Tirón vertical', clase: 'principal' },
    { id: 'tiron_horizontal', nombre: 'Tirón horizontal', clase: 'principal' },
    { id: 'sentadilla', nombre: 'Sentadilla', clase: 'principal' },
    { id: 'bisagra', nombre: 'Bisagra', clase: 'principal' },
    { id: 'flexion_rodilla', nombre: 'Flexión de rodilla', clase: 'principal' },
    { id: 'prensa', nombre: 'Prensa de piernas', clase: 'complementario' },
    { id: 'zancada', nombre: 'Zancada y variantes unilaterales', clase: 'complementario' },
    { id: 'puente_cadera', nombre: 'Puente de cadera', clase: 'complementario' },
    { id: 'press_triceps', nombre: 'Press de tríceps (compuesto)', clase: 'complementario' },
    { id: 'carga_transportada', nombre: 'Carga transportada', clase: 'complementario' },
    { id: 'aislamiento_pecho', nombre: 'Aislamiento de pecho', clase: 'aislamiento' },
    { id: 'pullover', nombre: 'Pullover', clase: 'aislamiento' },
    { id: 'deltoide_lateral', nombre: 'Aislamiento de deltoide lateral', clase: 'aislamiento' },
    { id: 'deltoide_posterior', nombre: 'Aislamiento de deltoide posterior', clase: 'aislamiento' },
    { id: 'extension_rodilla', nombre: 'Extensión de rodilla', clase: 'aislamiento' },
    { id: 'abduccion_cadera', nombre: 'Abducción de cadera', clase: 'aislamiento' },
    { id: 'patada_gluteo', nombre: 'Patada de glúteo', clase: 'aislamiento' },
    { id: 'pantorrilla', nombre: 'Aislamiento de pantorrilla', clase: 'aislamiento' },
    { id: 'curl_biceps', nombre: 'Curl de bíceps', clase: 'aislamiento' },
    { id: 'extension_triceps', nombre: 'Extensión de tríceps', clase: 'aislamiento' },
    { id: 'flexion_abdominal', nombre: 'Flexión abdominal', clase: 'aislamiento' },
    { id: 'elevacion_piernas', nombre: 'Elevación de piernas', clase: 'aislamiento' },
    { id: 'vacuum', nombre: 'Vacuum abdominal', clase: 'aislamiento' },
  ];

  const M = 'multiarticular', A = 'aislamiento';
  // v(): una variante. `hereda` = id del ejercicio del motor actual de donde salen sus filas de datos;
  // las variantes que no se partieron conservan su id y heredan de sí mismas (`heredado` = false).
  const v = (id, nombre, patron, tipo, reps, hereda, extra) => Object.assign({ id, nombre, patron, tipo, reps, hereda: hereda || id, heredado: !!hereda && hereda !== id }, extra);

  const VARIANTES = [
    // Pecho
    v('chest.bench_press_barbell', 'Press banca con barra', 'empuje_horizontal', M, [6, 10]),
    v('chest.incline_press_db', 'Press inclinado con mancuernas', 'empuje_horizontal', M, [8, 12]),
    v('chest.dip_parallel', 'Fondos en paralelas', 'empuje_horizontal', M, [8, 12], 'chest.dip_or_machine_press'),
    v('chest.press_machine', 'Press de pecho en máquina', 'empuje_horizontal', M, [8, 12], 'chest.dip_or_machine_press'),
    v('chest.fly_cable', 'Aperturas en polea', 'aislamiento_pecho', A, [10, 15], 'chest.fly_cable_pecdeck'),
    v('chest.fly_pecdeck', 'Aperturas en pec-deck', 'aislamiento_pecho', A, [10, 15], 'chest.fly_cable_pecdeck'),
    // Espalda
    v('back.pull_up', 'Dominadas', 'tiron_vertical', M, [6, 10], 'back.vertical_pull'),
    v('back.lat_pulldown', 'Jalón al pecho', 'tiron_vertical', M, [6, 10], 'back.vertical_pull'),
    // DEC-022: el remo con barra (lumbar alta) solo entra si el usuario lo elige (casilla "Incluir remo con barra").
    v('back.row_barbell', 'Remo con barra', 'tiron_horizontal', M, [6, 10], 'back.row_barbell', { habilitaPor: 'remoConBarra' }),
    v('back.row_pendlay', 'Remo pendlay', 'tiron_horizontal', M, [6, 10], 'back.row_barbell', { habilitaPor: 'remoConBarra' }),
    v('back.row_chest_supported_machine', 'Remo con apoyo de pecho en máquina', 'tiron_horizontal', M, [8, 12], 'back.row_chest_supported'),
    v('back.row_chest_supported_bench', 'Remo con apoyo de pecho en banco inclinado', 'tiron_horizontal', M, [8, 12], 'back.row_chest_supported'),
    v('back.row_cable', 'Remo en polea baja', 'tiron_horizontal', M, [8, 12], 'back.row_cable'),
    v('back.row_machine', 'Remo en máquina', 'tiron_horizontal', M, [8, 12], 'back.row_cable'),
    v('back.pullover_cable', 'Pullover en polea', 'pullover', A, [10, 15]),
    // Hombros
    v('shoulders.press_overhead_barbell', 'Press militar con barra', 'empuje_vertical', M, [6, 10], 'shoulders.press_overhead'),
    v('shoulders.press_overhead_db', 'Press militar con mancuernas', 'empuje_vertical', M, [6, 10], 'shoulders.press_overhead'),
    v('shoulders.lateral_raise_db', 'Elevaciones laterales con mancuerna', 'deltoide_lateral', A, [10, 15]),
    v('shoulders.lateral_raise_cable', 'Elevaciones laterales en polea', 'deltoide_lateral', A, [12, 15]),
    v('shoulders.face_pull', 'Face pull', 'deltoide_posterior', A, [12, 15], 'shoulders.rear_delt_facepull'),
    v('shoulders.rear_delt_fly', 'Pájaros (deltoides posterior)', 'deltoide_posterior', A, [12, 15], 'shoulders.rear_delt_facepull'),
    // DEC-009: sustitutos del press por encima de la cabeza con lesión de hombro declarada; no son elegibles para top set (DEC-008).
    v('shoulders.press_landmine', 'Press landmine', 'empuje_vertical', M, [8, 12], 'shoulders.press_landmine_neutral', { soloConLesion: 'shoulder', sinTopSet: true }),
    v('shoulders.press_neutral_grip', 'Press con agarre neutro', 'empuje_vertical', M, [8, 12], 'shoulders.press_landmine_neutral', { soloConLesion: 'shoulder', sinTopSet: true }),
    // Cuádriceps
    v('quads.squat_back', 'Sentadilla trasera', 'sentadilla', M, [6, 10], 'quads.squat_back_or_hack'),
    v('quads.squat_hack', 'Sentadilla en hack', 'sentadilla', M, [6, 10], 'quads.squat_back_or_hack'),
    v('quads.leg_press', 'Prensa de piernas', 'prensa', M, [8, 12]),
    v('quads.lunge', 'Zancadas', 'zancada', M, [8, 12], 'quads.lunge_or_bulgarian', { unilateral: true }),
    v('quads.bulgarian_split_squat', 'Sentadilla búlgara', 'zancada', M, [8, 12], 'quads.lunge_or_bulgarian', { unilateral: true }),
    v('quads.leg_extension', 'Extensión de cuádriceps', 'extension_rodilla', A, [10, 15]),
    // Isquios
    v('hamstrings.rdl', 'Peso muerto rumano', 'bisagra', M, [6, 10]),
    v('hamstrings.leg_curl_lying', 'Curl femoral tumbado', 'flexion_rodilla', A, [10, 15], 'hamstrings.leg_curl'),
    v('hamstrings.leg_curl_seated', 'Curl femoral sentado', 'flexion_rodilla', A, [10, 15], 'hamstrings.leg_curl', { preferida: true }),
    // Glúteos
    v('glutes.hip_thrust', 'Hip thrust con barra', 'puente_cadera', M, [6, 10]),
    v('glutes.bulgarian_hip', 'Sentadilla búlgara con énfasis en cadera', 'zancada', M, [8, 12], null, { unilateral: true }),
    v('glutes.hip_abduction_machine', 'Abducción de cadera en máquina', 'abduccion_cadera', A, [12, 15]),
    v('glutes.kickback_cable', 'Patada de glúteo en polea', 'patada_gluteo', A, [12, 15], null, { unilateral: true }),
    // Pantorrillas
    v('calves.calf_raise_standing', 'Elevación de talones de pie', 'pantorrilla', A, [8, 12]),
    v('calves.calf_raise_seated', 'Elevación de talones sentado', 'pantorrilla', A, [12, 15]),
    // Bíceps
    v('biceps.curl_barbell', 'Curl con barra', 'curl_biceps', A, [8, 12]),
    v('biceps.curl_ez', 'Curl con barra Z', 'curl_biceps', A, [8, 12], 'biceps.curl_barbell'),
    v('biceps.curl_incline', 'Curl inclinado con mancuernas', 'curl_biceps', A, [10, 15]),
    // Tríceps
    v('triceps.close_grip_press', 'Press cerrado', 'press_triceps', M, [6, 10], 'triceps.close_grip_or_dips'),
    v('triceps.dips', 'Fondos de tríceps', 'press_triceps', M, [6, 10], 'triceps.close_grip_or_dips'),
    v('triceps.pushdown_cable', 'Extensión de tríceps en polea', 'extension_triceps', A, [10, 15]),
    // Abdomen
    v('abs.crunch_cable', 'Crunch en polea', 'flexion_abdominal', A, [10, 15], 'abs.crunch_or_wheel'),
    v('abs.ab_wheel', 'Rueda abdominal', 'flexion_abdominal', A, [10, 15], 'abs.crunch_or_wheel'),
    v('abs.hanging_leg_raise', 'Elevaciones de piernas colgado', 'elevacion_piernas', A, [10, 15]),
    v('abs.vacuum', 'Vacuum abdominal', 'vacuum', A, [5, 8], null, { soloDivisiones: 'Classic / Physique' }),
    // Funcionales (DEC-005): solo con la bandera salud/funcional.
    v('functional.bulgarian_db', 'Sentadilla búlgara con mancuernas', 'zancada', M, [8, 12], null, { unilateral: true, habilitaPor: 'healthGoal' }),
    v('functional.step_up', 'Step-up con carga', 'zancada', M, [8, 12], null, { unilateral: true, habilitaPor: 'healthGoal' }),
    // Sin aporte de hipertrofia (DEC-005, DEC-010): sin filas de músculo; se agrega aparte y no cuenta como volumen.
    v('functional.farmer_carry', 'Paseo del granjero', 'carga_transportada', M, [20, 40], null, { habilitaPor: 'healthGoal', sinAporte: true }),
  ];

  const PATRON_POR_ID = {};
  PATRONES.forEach(p => { PATRON_POR_ID[p.id] = p; });
  const VARIANTE_POR_ID = {};
  VARIANTES.forEach(x => {
    if (VARIANTE_POR_ID[x.id]) throw new Error('Variante duplicada: ' + x.id);
    if (!PATRON_POR_ID[x.patron]) throw new Error('Patrón inexistente en ' + x.id + ': ' + x.patron);
    VARIANTE_POR_ID[x.id] = x;
  });

  const variantePorId = id => VARIANTE_POR_ID[id] || null;
  const variantesDePatron = patron => VARIANTES.filter(x => x.patron === patron);

  // Datos heredados: filas de músculo y de perfil articular del ejercicio original (`hereda`).
  const aportesDe = id => {
    const x = VARIANTE_POR_ID[id];
    return x ? EXERCISE_MUSCLES.rows.filter(r => r.exerciseId === x.hereda) : [];
  };
  const grupoDe = id => {
    const x = VARIANTE_POR_ID[id];
    return x ? (EXERCISE_MUSCLES.buckets[x.hereda] || null) : null;
  };
  const perfilArticularDe = id => {
    const x = VARIANTE_POR_ID[id];
    const out = {};
    if (x) PERFIL_ARTICULAR.rows.filter(r => r.exerciseId === x.hereda).forEach(r => { out[r.articulacion] = r; });
    return out;
  };

  // Duración de una serie (DEC-024): tiempo de ejecución más descanso del tipo de ejercicio; los
  // unilaterales cuentan ambos lados (DEC-007). Todo sale del registro.
  function segundosPorSerie(id) {
    const x = VARIANTE_POR_ID[id];
    if (!x) throw new Error('Variante inexistente: ' + id);
    const descanso = x.tipo === M ? REGISTRO.valor('DESCANSO_MULTIARTICULAR_S') : REGISTRO.valor('DESCANSO_AISLAMIENTO_S');
    const lados = x.unilateral ? REGISTRO.valor('FACTOR_UNILATERAL') : 1;
    return lados * (descanso + REGISTRO.valor('SEGUNDOS_EJECUCION_SERIE'));
  }

  return { PATRONES, VARIANTES, patronPorId: id => PATRON_POR_ID[id] || null, variantePorId, variantesDePatron, aportesDe, grupoDe, perfilArticularDe, segundosPorSerie };
});
