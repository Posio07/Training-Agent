/* EN CONSTRUCCIÓN · núcleo v2 (B-039, DEC-023). Este módulo NO está conectado a la interfaz ni al motor
 * actual: el PR del corte lo conecta y borra el motor viejo (docs/specs/nucleo-v2.md, "El corte").
 *
 * Catálogo en dos niveles (docs/specs/nucleo-v2.md, "Modelo de datos"):
 *   - Patrón: el movimiento. El generador planifica por patrón.
 *   - Variante: el ejercicio concreto, con id propio. Desaparecen los ejercicios con "o" en el nombre.
 *
 * Datos de cada variante: aporte por músculo (formato largo, DEC-013) y perfil articular (DEC-021).
 * - Perfil articular: cada variante partida lleva el suyo propio (data/perfil-articular-variantes.csv, B-031),
 *   con el criterio de modelado de docs/specs/validador-fase3.md y sus reglas de desempate. Las demás
 *   variantes conservan su fila de data/perfil-articular.csv.
 * - Aporte por músculo: las variantes partidas HEREDAN las filas del ejercicio original (`hereda`) y se
 *   conservan el estado de verificación del ejercicio original, con la marca `heredadoDe` para rastrearlas (no cuentan 0 por
 *   estar heredadas: la vista previa del reparto no debe mezclar efectos de datos con efectos de diseño); no se inventó ningún dato.
 * En el PR del corte las filas heredadas se materializan en los CSV de data/.
 *
 * Los rangos de repeticiones son datos del catálogo (como en el motor actual), no reglas del registro.
 * Pendientes del corte: el campo `cue` del curl femoral (cita de Maeo 2021, hoy solo `preferida: true`) y
 * `defaultOnly` del remo con apoyo de pecho (DEC-022, hoy lo cubre `habilitaPor` del remo con barra).
 *
 * Los números (descansos, tiempo de ejecución, factor de unilaterales) salen del registro de reglas. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registro.js'), require('../exerciseMuscles.js'), require('../perfilArticular.js'), require('./perfilArticularVariantes.js'));
  else root.CORE_V2_CATALOGO = factory(root.CORE_V2_REGISTRO, root.EXERCISE_MUSCLES, root.PERFIL_ARTICULAR, root.CORE_V2_PERFIL_ARTICULAR_VARIANTES);
})(typeof self !== 'undefined' ? self : this, function (REGISTRO, EXERCISE_MUSCLES, PERFIL_ARTICULAR, PERFIL_VARIANTES) {
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

  // Rangos de repeticiones del catálogo: reglas del registro (E4, criterio de diseño; no tienen fuente puntual).
  const VARIANTES = [
    // Pecho
    v('chest.bench_press_barbell', 'Press banca con barra', 'empuje_horizontal', M, REGISTRO.valor('REPS_RANGO_PESADO')),
    v('chest.incline_press_db', 'Press inclinado con mancuernas', 'empuje_horizontal', M, REGISTRO.valor('REPS_RANGO_MODERADO')),
    v('chest.dip_parallel', 'Fondos en paralelas', 'empuje_horizontal', M, REGISTRO.valor('REPS_RANGO_MODERADO'), 'chest.dip_or_machine_press'),
    v('chest.press_machine', 'Press de pecho en máquina', 'empuje_horizontal', M, REGISTRO.valor('REPS_RANGO_MODERADO'), 'chest.dip_or_machine_press'),
    v('chest.fly_cable', 'Aperturas en polea', 'aislamiento_pecho', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO'), 'chest.fly_cable_pecdeck'),
    v('chest.fly_pecdeck', 'Aperturas en pec-deck', 'aislamiento_pecho', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO'), 'chest.fly_cable_pecdeck'),
    // Espalda
    v('back.pull_up', 'Dominadas', 'tiron_vertical', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'back.vertical_pull'),
    v('back.lat_pulldown', 'Jalón al pecho', 'tiron_vertical', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'back.vertical_pull'),
    // DEC-022: el remo con barra (lumbar alta) solo entra si el usuario lo elige (casilla "Incluir remo con barra").
    v('back.row_barbell', 'Remo con barra', 'tiron_horizontal', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'back.row_barbell', { habilitaPor: 'remoConBarra' }),
    v('back.row_pendlay', 'Remo pendlay', 'tiron_horizontal', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'back.row_barbell', { habilitaPor: 'remoConBarra' }),
    v('back.row_chest_supported_machine', 'Remo con apoyo de pecho en máquina', 'tiron_horizontal', M, REGISTRO.valor('REPS_RANGO_MODERADO'), 'back.row_chest_supported'),
    v('back.row_chest_supported_bench', 'Remo con apoyo de pecho en banco inclinado', 'tiron_horizontal', M, REGISTRO.valor('REPS_RANGO_MODERADO'), 'back.row_chest_supported'),
    v('back.row_cable', 'Remo en polea baja', 'tiron_horizontal', M, REGISTRO.valor('REPS_RANGO_MODERADO'), 'back.row_cable'),
    v('back.row_machine', 'Remo en máquina', 'tiron_horizontal', M, REGISTRO.valor('REPS_RANGO_MODERADO'), 'back.row_cable'),
    v('back.pullover_cable', 'Pullover en polea', 'pullover', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO')),
    // Hombros
    // B-031: el perfil lumbar cambia con la postura (de pie media, sentado con respaldo baja), así que el press con
    // mancuernas tiene dos variantes. La de sentado es nueva respecto del catálogo viejo (lo pidió Emanuel).
    v('shoulders.press_overhead_barbell', 'Press militar con barra de pie', 'empuje_vertical', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'shoulders.press_overhead'),
    v('shoulders.press_overhead_db', 'Press militar con mancuernas de pie', 'empuje_vertical', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'shoulders.press_overhead'),
    v('shoulders.press_overhead_db_seated', 'Press militar con mancuernas sentado con respaldo', 'empuje_vertical', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'shoulders.press_overhead'),
    v('shoulders.lateral_raise_db', 'Elevaciones laterales con mancuerna', 'deltoide_lateral', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO')),
    v('shoulders.lateral_raise_cable', 'Elevaciones laterales en polea', 'deltoide_lateral', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO_ALTO')),
    v('shoulders.face_pull', 'Face pull', 'deltoide_posterior', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO_ALTO'), 'shoulders.rear_delt_facepull'),
    v('shoulders.rear_delt_fly', 'Pájaros (deltoides posterior)', 'deltoide_posterior', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO_ALTO'), 'shoulders.rear_delt_facepull'),
    // DEC-009: sustitutos del press por encima de la cabeza con lesión de hombro declarada; no son elegibles para top set (DEC-008).
    v('shoulders.press_landmine', 'Press landmine', 'empuje_vertical', M, REGISTRO.valor('REPS_RANGO_MODERADO'), 'shoulders.press_landmine_neutral', { soloConLesion: 'shoulder', sinTopSet: true }),
    v('shoulders.press_neutral_grip', 'Press con agarre neutro', 'empuje_vertical', M, REGISTRO.valor('REPS_RANGO_MODERADO'), 'shoulders.press_landmine_neutral', { soloConLesion: 'shoulder', sinTopSet: true }),
    // Cuádriceps
    v('quads.squat_back', 'Sentadilla trasera', 'sentadilla', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'quads.squat_back_or_hack'),
    v('quads.squat_hack', 'Sentadilla en hack', 'sentadilla', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'quads.squat_back_or_hack'),
    v('quads.leg_press', 'Prensa de piernas', 'prensa', M, REGISTRO.valor('REPS_RANGO_MODERADO')),
    v('quads.lunge', 'Zancadas', 'zancada', M, REGISTRO.valor('REPS_RANGO_MODERADO'), 'quads.lunge_or_bulgarian', { unilateral: true }),
    v('quads.bulgarian_split_squat', 'Sentadilla búlgara', 'zancada', M, REGISTRO.valor('REPS_RANGO_MODERADO'), 'quads.lunge_or_bulgarian', { unilateral: true }),
    v('quads.leg_extension', 'Extensión de cuádriceps', 'extension_rodilla', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO')),
    // Isquios
    v('hamstrings.rdl', 'Peso muerto rumano', 'bisagra', M, REGISTRO.valor('REPS_RANGO_PESADO')),
    v('hamstrings.leg_curl_lying', 'Curl femoral tumbado', 'flexion_rodilla', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO'), 'hamstrings.leg_curl'),
    v('hamstrings.leg_curl_seated', 'Curl femoral sentado', 'flexion_rodilla', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO'), 'hamstrings.leg_curl', { preferida: true }),
    // Glúteos
    v('glutes.hip_thrust', 'Hip thrust con barra', 'puente_cadera', M, REGISTRO.valor('REPS_RANGO_PESADO')),
    v('glutes.bulgarian_hip', 'Sentadilla búlgara con énfasis en cadera', 'zancada', M, REGISTRO.valor('REPS_RANGO_MODERADO'), null, { unilateral: true }),
    v('glutes.hip_abduction_machine', 'Abducción de cadera en máquina', 'abduccion_cadera', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO_ALTO')),
    v('glutes.kickback_cable', 'Patada de glúteo en polea', 'patada_gluteo', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO_ALTO'), null, { unilateral: true }),
    // Pantorrillas
    v('calves.calf_raise_standing', 'Elevación de talones de pie', 'pantorrilla', A, REGISTRO.valor('REPS_RANGO_MODERADO')),
    v('calves.calf_raise_seated', 'Elevación de talones sentado', 'pantorrilla', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO_ALTO')),
    // Bíceps
    v('biceps.curl_barbell', 'Curl con barra', 'curl_biceps', A, REGISTRO.valor('REPS_RANGO_MODERADO')),
    v('biceps.curl_ez', 'Curl con barra Z', 'curl_biceps', A, REGISTRO.valor('REPS_RANGO_MODERADO'), 'biceps.curl_barbell'),
    v('biceps.curl_incline', 'Curl inclinado con mancuernas', 'curl_biceps', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO')),
    // Tríceps
    v('triceps.close_grip_press', 'Press cerrado', 'press_triceps', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'triceps.close_grip_or_dips'),
    v('triceps.dips', 'Fondos de tríceps', 'press_triceps', M, REGISTRO.valor('REPS_RANGO_PESADO'), 'triceps.close_grip_or_dips'),
    v('triceps.pushdown_cable', 'Extensión de tríceps en polea', 'extension_triceps', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO')),
    // Abdomen
    v('abs.crunch_cable', 'Crunch en polea', 'flexion_abdominal', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO'), 'abs.crunch_or_wheel'),
    v('abs.ab_wheel', 'Rueda abdominal', 'flexion_abdominal', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO'), 'abs.crunch_or_wheel'),
    v('abs.hanging_leg_raise', 'Elevaciones de piernas colgado', 'elevacion_piernas', A, REGISTRO.valor('REPS_RANGO_AISLAMIENTO')),
    v('abs.vacuum', 'Vacuum abdominal', 'vacuum', A, REGISTRO.valor('REPS_RANGO_VACUUM'), null, { soloDivisiones: 'Classic / Physique' }),
    // Funcionales (DEC-005): solo con la bandera salud/funcional.
    v('functional.bulgarian_db', 'Sentadilla búlgara con mancuernas', 'zancada', M, REGISTRO.valor('REPS_RANGO_MODERADO'), null, { unilateral: true, habilitaPor: 'healthGoal' }),
    v('functional.step_up', 'Step-up con carga', 'zancada', M, REGISTRO.valor('REPS_RANGO_MODERADO'), null, { unilateral: true, habilitaPor: 'healthGoal' }),
    // Sin aporte de hipertrofia (DEC-005, DEC-010): sin filas de músculo; se agrega aparte y no cuenta como volumen.
    v('functional.farmer_carry', 'Paseo del granjero', 'carga_transportada', M, REGISTRO.valor('REPS_RANGO_CARGA_TRANSPORTADA'), null, { habilitaPor: 'healthGoal', sinAporte: true }),
  ];

  // Una variante es "partida" si comparte el ejercicio de origen con otra: sus aportes por músculo son heredados.
  const comparten = {};
  VARIANTES.forEach(x => { comparten[x.hereda] = (comparten[x.hereda] || 0) + 1; });
  VARIANTES.forEach(x => { x.heredado = comparten[x.hereda] > 1; });

  // DEC-008: el top set solo va a multiarticulares bilaterales con carga libre o guiada pesada. Lista cerrada a propósito:
  // sentadilla trasera y hack, press banca, press militar (barra y mancuernas), peso muerto rumano, remo con barra y
  // pendlay, dominadas y jalón. Nunca unilaterales ni máquinas de press (por eso la prensa y los fondos no están).
  const TOPSET_ELEGIBLES = ['quads.squat_back', 'quads.squat_hack', 'chest.bench_press_barbell', 'shoulders.press_overhead_barbell', 'shoulders.press_overhead_db',
    'shoulders.press_overhead_db_seated', 'hamstrings.rdl', 'back.row_barbell', 'back.row_pendlay', 'back.pull_up', 'back.lat_pulldown'];
  VARIANTES.forEach(x => { x.topSetElegible = TOPSET_ELEGIBLES.includes(x.id); });

  // Variantes con barra cargada con discos: la pantalla de sesión les muestra la barra con la carga (hoy BARBELL_PATTERNS del catálogo viejo).
  const CON_BARRA = ['quads.squat_back', 'chest.bench_press_barbell', 'shoulders.press_overhead_barbell', 'hamstrings.rdl', 'back.row_barbell', 'back.row_pendlay', 'glutes.hip_thrust'];
  VARIANTES.forEach(x => { x.barra = CON_BARRA.includes(x.id); });

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

  // Aportes por músculo. Las filas heredadas (variantes partidas) conservan el estado de verificación del ejercicio
  // original y llevan la marca `heredadoDe` (id del ejercicio original) para rastrearlas; cuentan igual que la fila
  // original en el conteo fraccionado (decidido por Emanuel, 2026-11-08).
  const aportesDe = id => {
    const x = VARIANTE_POR_ID[id];
    if (!x) return [];
    return EXERCISE_MUSCLES.rows.filter(r => r.exerciseId === x.hereda).map(r => x.heredado
      ? Object.assign({}, r, { exerciseId: id, heredadoDe: x.hereda })
      : Object.assign({}, r));
  };
  const grupoDe = id => {
    const x = VARIANTE_POR_ID[id];
    return x ? (EXERCISE_MUSCLES.buckets[x.hereda] || null) : null;
  };
  // Perfil articular: el propio de la variante partida o, si no se partió, el de su fila de data/perfil-articular.csv.
  const perfilArticularDe = id => {
    const x = VARIANTE_POR_ID[id];
    const out = {};
    if (!x) return out;
    const propias = PERFIL_VARIANTES.rows.filter(r => r.exerciseId === id);
    (propias.length ? propias : PERFIL_ARTICULAR.rows.filter(r => r.exerciseId === x.hereda)).forEach(r => { out[r.articulacion] = r; });
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

  // Variante excluida por alguna de las zonas de lesión declaradas (DEC-009, capa 3; mapa del registro).
  const excluidaPorLesion = (id, zonas) => {
    const mapa = REGISTRO.valor('EXCLUSIONES_POR_LESION');
    return (zonas || []).some(z => (mapa[z] || []).includes(id));
  };

  /* Catálogo viejo emulado (solo para la vista previa del reparto, hasta el corte): cada ejercicio del motor actual
   * como UNA entrada, con los datos del original (músculos, perfil articular de la variante más exigente) y los
   * mismos indicadores (remo con barra opcional, remo con apoyo solo sin esa casilla, sustitutos por lesión,
   * funcionales). Permite separar en la comparación lo que cambia por el reparto de lo que cambia por el catálogo. */
  function catalogoViejoEmulado(K) {
    const viejos = [];
    [K.EXERCISES, K.FUNCTIONAL_EXERCISES].forEach(g => Object.keys(g).forEach(m => g[m].forEach(e => viejos.push(e))));
    const variantes = viejos.map(o => {
      const rep = VARIANTES.find(x => x.hereda === o.id);
      const v = Object.assign({}, rep, { id: o.id, nombre: o.name, hereda: o.id, heredado: false, reps: o.reps, tipo: o.type === 'compound' ? M : A, unilateral: !!o.unilateral, viejo: true });
      delete v.habilitaPor; delete v.soloConLesion; delete v.sinTopSet; delete v.preferida;
      if (o.optIn) v.habilitaPor = 'remoConBarra';
      if (o.defaultOnly) v.soloSinRemoConBarra = true;
      if (o.injuryOnly) { v.soloConLesion = o.injuryOnly; v.sinTopSet = true; }
      if (K.FUNCTIONAL_EXERCISES && Object.keys(K.FUNCTIONAL_EXERCISES).some(m => K.FUNCTIONAL_EXERCISES[m].some(f => f.id === o.id))) v.habilitaPor = 'healthGoal';
      if (o.cue) v.preferida = false;
      return v;
    });
    const porId = {};
    variantes.forEach(v => { porId[v.id] = v; });
    const repDe = id => VARIANTES.find(x => x.hereda === id);
    return {
      nombre: 'viejo', PATRONES, VARIANTES: variantes,
      patronPorId: id => PATRON_POR_ID[id] || null,
      variantePorId: id => porId[id] || null,
      aportesDe: id => EXERCISE_MUSCLES.rows.filter(r => r.exerciseId === id).map(r => Object.assign({}, r)),
      grupoDe: id => EXERCISE_MUSCLES.buckets[id] || null,
      perfilArticularDe: id => { const out = {}; PERFIL_ARTICULAR.rows.filter(r => r.exerciseId === id).forEach(r => { out[r.articulacion] = r; }); return out; },
      segundosPorSerie: id => {
        const x = porId[id];
        const descanso = x.tipo === M ? REGISTRO.valor('DESCANSO_MULTIARTICULAR_S') : REGISTRO.valor('DESCANSO_AISLAMIENTO_S');
        return (x.unilateral ? REGISTRO.valor('FACTOR_UNILATERAL') : 1) * (descanso + REGISTRO.valor('SEGUNDOS_EJECUCION_SERIE'));
      },
      excluidaPorLesion: (id, zonas) => excluidaPorLesion(repDe(id).id, zonas),
    };
  }

  return { nombre: 'nuevo', PATRONES, VARIANTES, patronPorId: id => PATRON_POR_ID[id] || null, variantePorId, variantesDePatron, aportesDe, grupoDe, perfilArticularDe, segundosPorSerie, excluidaPorLesion, catalogoViejoEmulado };
});
