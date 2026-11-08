/* EN CONSTRUCCIÓN · tests del núcleo v2, paso 1 (catálogo y registro; B-039). No tocan el motor actual ni la
 * interfaz. Los tests marcados "hasta el corte" comparan contra el motor viejo y se borran en el PR del corte. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../js/core-v2/registro.js');
const C = require('../js/core-v2/catalogo.js');
const K = require('../js/knowledge.js');
const PV = require('../../scripts/build-perfil-articular-variantes.js');
const PVM = require('../js/core-v2/perfilArticularVariantes.js');

const DIR = path.join(__dirname, '..', 'js', 'core-v2');
const DECS = new Set([...fs.readFileSync(path.join(__dirname, '..', '..', 'DECISIONS.md'), 'utf8').matchAll(/^## (DEC-\d+)/gm)].map(m => m[1]));

/* ---------- Registro ---------- */

test('registro: cada regla lleva id, valor, nivel E1 a E4, fuente, tipo, paso, estado y DEC de origen', () => {
  const ids = new Set();
  R.REGLAS.forEach(r => {
    assert.ok(/^[A-Z0-9_]+$/.test(r.id), `id inválido: ${r.id}`);
    assert.ok(!ids.has(r.id), `id repetido: ${r.id}`);
    ids.add(r.id);
    assert.notEqual(r.valor, undefined, `${r.id}: sin valor`);
    assert.ok(['E1', 'E2', 'E3', 'E4'].includes(r.nivel), `${r.id}: nivel ${r.nivel}`);
    assert.ok(typeof r.fuente === 'string' && r.fuente.length > 0, `${r.id}: sin fuente`);
    assert.ok(['estricta', 'aviso'].includes(r.tipo), `${r.id}: tipo ${r.tipo}`);
    assert.ok([1, 2, 3, 4, 5, 6, 7, 'fuera'].includes(r.paso), `${r.id}: paso ${r.paso}`);
    assert.ok(['implementada', 'pendiente'].includes(r.estado), `${r.id}: estado ${r.estado}`);
    // El DEC de origen no se inventa: es 'sin DEC', 'spec núcleo v2' o un DEC que existe en DECISIONS.md.
    assert.ok(['sin DEC', 'spec núcleo v2', 'propuesta del agente'].includes(r.dec) || DECS.has(r.dec), `${r.id}: DEC de origen inexistente (${r.dec})`);
    assert.ok(typeof r.origen === 'string' && r.origen.length > 0, `${r.id}: sin origen`);
    assert.ok(Array.isArray(r.fuentes), `${r.id}: fuentes no es lista`);
  });
});

test('registro: E1 a E3 llevan fuente real; "criterio de diseño" solo en E4', () => {
  R.REGLAS.forEach(r => {
    if (r.nivel !== 'E4') assert.notEqual(r.fuente, 'criterio de diseño', `${r.id}: ${r.nivel} no puede ser criterio de diseño`);
  });
  // Las tres entradas de la necesidad semanal llevan el texto exacto que pidió Emanuel (2026-11-07).
  const texto = 'rango general consistente con la literatura; valores puntuales sin respaldo, criterio de diseño E4';
  ['NECESIDAD_SEMANAL_POR_NIVEL', 'FACTOR_NECESIDAD_DEFINICION', 'FACTOR_NECESIDAD_ENFASIS'].forEach(id => {
    assert.equal(R.regla(id).fuente, texto, id);
    assert.equal(R.regla(id).nivel, 'E4', id);
    assert.deepEqual(R.regla(id).fuentes, [], `${id}: no debe citar SCHOENFELD_VOL ni HELMS_TRAIN`);
  });
});

test('registro: el estado coincide con el uso real (implementada = la lee código de core-v2)', () => {
  const archivos = fs.readdirSync(DIR).filter(f => f.endsWith('.js') && f !== 'registro.js');
  const codigo = archivos.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n');
  R.REGLAS.forEach(r => {
    const leida = new RegExp(`(?:valor|regla)\\('${r.id}'\\)`).test(codigo);
    assert.equal(leida, r.estado === 'implementada', `${r.id}: estado ${r.estado}, pero ${leida ? 'sí' : 'no'} la lee el código`);
  });
});

test('registro: ningún descanso baja del piso respaldado; el mínimo de grupo chico es piso × factor', () => {
  const piso = R.valor('DESCANSO_PISO_RESPALDADO_S');
  R.REGLAS.filter(r => /^DESCANSO_(?!PISO)/.test(r.id)).forEach(r => assert.ok(r.valor >= piso, `${r.id}: ${r.valor} s < ${piso} s`));
  assert.equal(R.valor('MINIMO_SEMANAL_GRUPO_CHICO'), R.valor('PISO_SEMANAL_GRUPO') * R.valor('FACTOR_PISO_MANTENIMIENTO'));
});

test('registro: los ids de fuente existen en KNOWLEDGE.SOURCES', () => {
  R.REGLAS.forEach(r => r.fuentes.forEach(f => assert.ok(K.SOURCES[f], `${r.id}: fuente ${f} no existe`)));
});

test('B-039: una fuente aparece solo cuando la regla que respalda está activa', () => {
  const base = { goal: 'cut', healthGoal: false };
  assert.ok(!R.fuentesActivas(base).includes('WHO_PA'), 'la OMS no debe aparecer sin la bandera');
  assert.ok(R.fuentesActivas({ goal: 'cut', healthGoal: true }).includes('WHO_PA'), 'la OMS aparece con la bandera en definición');
  assert.ok(!R.fuentesActivas({ goal: 'bulk', healthGoal: true }).includes('WHO_PA'), 'la OMS no aparece fuera de definición');
  assert.ok(!R.fuentesActivas({ goal: 'maintain', healthGoal: false }).includes('WHO_PA'));
  // El top set y sus fuentes existen solo en definición.
  assert.ok(R.fuentesActivas({ goal: 'cut' }).includes('BICKEL_2011'));
  assert.ok(!R.fuentesActivas({ goal: 'bulk' }).includes('BICKEL_2011'));
  // Las etiquetas viejas de volumen no vuelven por la puerta de atrás.
  ['cut', 'bulk', 'maintain'].forEach(goal => ['SCHOENFELD_VOL', 'HELMS_TRAIN'].forEach(f => assert.ok(!R.fuentesActivas({ goal, healthGoal: true }).includes(f), f)));
});

test('hasta el corte: los valores del registro coinciden con VALIDATOR_RULES del motor actual', () => {
  const V = K.VALIDATOR_RULES;
  const pares = {
    SEGUNDOS_EJECUCION_SERIE: 'setExecutionSeconds', MAX_LUMBAR_ALTA_POR_SESION: 'maxLumbarHighPerSession', SEPARACION_SENTADILLA_BISAGRA: 'hingeSquatSeparation',
    UMBRAL_DOLOR_BANDERA: 'painFlagThreshold', DOLOR_SESIONES_MINIMAS: 'painAdviceMinSessions', DOLOR_VENTANA_DIAS: 'painAdviceWindowDays',
    PISO_SEMANAL_GRUPO: 'minWeeklySetsPerMuscle', FACTOR_PISO_MANTENIMIENTO: 'maintenanceFloorFactor', MINIMO_SEMANAL_GRUPO_CHICO: 'groupMinimumWeeklySets',
    FRECUENCIA_MINIMA_GRUPOS_MAYORES: 'minWeeklyFrequencyMajorGroups', MAX_SERIES_FRACCIONADAS_MUSCULO_SESION: 'maxFractionalSetsPerMuscleSession',
    PESO_SERIE_DIRECTA: 'directSetWeight', PESO_SERIE_INDIRECTA: 'secondaryMuscleWeight', PESO_SIN_RELACION: 'noRelationWeight', ORDEN_POR_DEMANDA: 'sessionOrderByDemand',
    SERIES_EXTRA_FUNCIONAL_SIN_VOLUMEN: 'functionalNoVolumeExtraSets', AUMENTO_SEMANAL_MAXIMO_PORCENTAJE: 'maxWeeklyVolumeIncreasePct', RATIO_AGUDO_CRONICO_MAXIMO: 'maxAcuteChronicRatio',
    VENTANA_HISTORIAL_SEMANAS: 'historyWindowWeeks', HISTORIAL_MINIMO_SEMANAS_RAMPA: 'minHistoryWeeksForRamp',
  };
  Object.entries(pares).forEach(([nuevo, viejo]) => {
    assert.ok(V[viejo], `${viejo} no existe en el motor actual`);
    assert.deepEqual(R.valor(nuevo), V[viejo].value, `${nuevo} ≠ ${viejo}`);
    // Único nivel que cambia a propósito: el conteo fraccionado es E2 con salvedad (spec del núcleo v2, 2026-11-07); el motor actual lo rotula E4.
    if (nuevo !== 'PESO_SERIE_DIRECTA') assert.equal(R.regla(nuevo).nivel, V[viejo].level, `${nuevo}: nivel distinto de ${viejo}`);
  });
  // Todo VALIDATOR_RULES (salvo el tope de 25 series, que DEC-024 elimina) tiene su par en el registro.
  const cubiertas = new Set(Object.values(pares));
  Object.keys(V).filter(k => k !== 'sessionSetCap').forEach(k => assert.ok(cubiertas.has(k), `VALIDATOR_RULES.${k} no tiene entrada en el registro`));
});

/* ---------- Catálogo ---------- */

test('catálogo: ids únicos, patrón existente y ningún nombre con "o" o "/" entre opciones', () => {
  const ids = new Set();
  C.VARIANTES.forEach(x => {
    assert.ok(!ids.has(x.id), `id repetido: ${x.id}`);
    ids.add(x.id);
    assert.ok(C.patronPorId(x.patron), `${x.id}: patrón ${x.patron}`);
    assert.ok(!/\s[oó]\s|\//.test(x.nombre), `${x.id}: el nombre "${x.nombre}" junta opciones`);
    assert.ok(['multiarticular', 'aislamiento'].includes(x.tipo), x.id);
    assert.ok(Array.isArray(x.reps) && x.reps[0] <= x.reps[1], x.id);
  });
  C.PATRONES.forEach(p => assert.ok(C.variantesDePatron(p.id).length > 0, `el patrón ${p.id} no tiene variantes`));
});

test('catálogo: toda variante tiene perfil articular completo (lumbar, hombro, rodilla) y aporte por músculo', () => {
  C.VARIANTES.forEach(x => {
    const perfil = C.perfilArticularDe(x.id);
    ['lumbar', 'hombro', 'rodilla'].forEach(j => {
      assert.ok(perfil[j], `${x.id}: falta ${j}`);
      assert.ok(['alta', 'media', 'baja'].includes(perfil[j].nivel), `${x.id}/${j}: nivel ${perfil[j].nivel}`);
    });
    if (x.sinAporte) assert.equal(C.aportesDe(x.id).length, 0, `${x.id}: sin aporte no debe tener filas`);
    else assert.ok(C.aportesDe(x.id).some(r => r.relacion === 'directa'), `${x.id}: sin músculo directo`);
    assert.ok(x.sinAporte || C.grupoDe(x.id), `${x.id}: sin grupo`);
  });
});

test('catálogo: los siete patrones principales tienen variantes disponibles por defecto', () => {
  C.PATRONES.filter(p => p.clase === 'principal').forEach(p => {
    const defecto = C.variantesDePatron(p.id).filter(x => !x.habilitaPor && !x.soloConLesion);
    assert.ok(defecto.length > 0, `${p.nombre}: todas sus variantes requieren casilla o lesión`);
  });
  // El remo con barra solo entra con la casilla (DEC-022): tiene que existir otro tirón horizontal por defecto.
  assert.ok(C.variantesDePatron('tiron_horizontal').some(x => !x.habilitaPor));
});

test('catálogo: partir los ejercicios con "o" no agrega ni pierde datos (misma tipo, repeticiones y unilateral)', () => {
  const viejos = {};
  [K.EXERCISES, K.FUNCTIONAL_EXERCISES].forEach(g => Object.values(g).forEach(lista => lista.forEach(e => { viejos[e.id] = e; })));
  C.VARIANTES.forEach(x => {
    const p = viejos[x.hereda];
    assert.ok(p, `${x.id}: hereda de ${x.hereda}, que no existe en el motor actual`);
    assert.equal(x.tipo === 'multiarticular', p.type === 'compound', `${x.id}: tipo distinto del original`);
    assert.deepEqual(x.reps, p.reps, `${x.id}: repeticiones distintas del original`);
    assert.equal(!!x.unilateral, !!p.unilateral, `${x.id}: unilateral distinto del original`);
  });
  // Hasta el corte: todo ejercicio del motor actual está cubierto (como variante o como origen de una).
  Object.keys(viejos).forEach(id => assert.ok(C.VARIANTES.some(x => x.hereda === id), `${id} no tiene variante`));
});

test('catálogo: la duración de una serie sale del registro (150/75 s + 45 s; unilaterales ×2)', () => {
  assert.equal(C.segundosPorSerie('chest.bench_press_barbell'), 195);
  assert.equal(C.segundosPorSerie('chest.fly_cable'), 120);
  assert.equal(C.segundosPorSerie('quads.bulgarian_split_squat'), 390);
  assert.equal(C.segundosPorSerie('glutes.kickback_cable'), 240);
});

test('registro: los números aprobados por Emanuel (spec y trazabilidad, 2026-11-07 y 2026-11-08) están tal cual', () => {
  const aprobados = {
    NECESIDAD_SEMANAL_POR_NIVEL: { advanced: 18, intermediate: 14, novice: 10 },
    FACTOR_NECESIDAD_DEFINICION: 0.85, FACTOR_NECESIDAD_ENFASIS: 1.25, FACTOR_NECESIDAD_ENFASIS_REDUCIDO: 0.5, FACTOR_NECESIDAD_GRUPO_CHICO: 0.6,
    REZAGADOS_TOPE_SERIES: 20, MAX_SERIES_FRACCIONADAS_MUSCULO_SESION: 11, MAX_EJERCICIOS_PRIORITARIOS: 3,
    DESCANSO_MULTIARTICULAR_S: 150, DESCANSO_AISLAMIENTO_S: 75, DESCANSO_TOP_SET_S: 180, DESCANSO_BACKOFF_S: 150, FACTOR_UNILATERAL: 2,
    TOP_SET_REPETICIONES: [4, 6], TOP_SET_RIR: [1, 2], SERIES_MIN_PATRON_PRINCIPAL: 4, EJERCICIO_DIRECTO_SEMANAL_MIN_SERIES: 2, BACKOFF_REDUCCION_PORCENTAJE: 10, MAX_DIAS_GRUPO_CHICO: 2,
    CARDIO_MINIMO_SALUD: 150, CARDIO_SALUD_SESIONES: 3, CARDIO_SALUD_MINUTOS: 50, CARDIO_INTENSIDAD_PORCENTAJE_FCMAX: [60, 70],
    CARDIO_MANTENIMIENTO_SESIONES: 2, CARDIO_MANTENIMIENTO_MINUTOS: 25,
  };
  Object.entries(aprobados).forEach(([id, v]) => assert.deepEqual(R.valor(id), v, id));
  assert.equal(R.regla('CARDIO_MINIMO_SALUD').nivel, 'E1');
  assert.equal(R.regla('CARDIO_MANTENIMIENTO_SESIONES').nivel, 'E4');
  assert.deepEqual(R.regla('CARDIO_MANTENIMIENTO_SESIONES').fuentes, [], 'el cardio de mantenimiento no cita a la OMS (2026-11-08)');
});

test('catálogo: cada ejercicio con "o" del motor actual se parte en una variante por opción (ninguna se pierde)', () => {
  const partidos = {
    'chest.dip_or_machine_press': ['chest.dip_parallel', 'chest.press_machine'],
    'chest.fly_cable_pecdeck': ['chest.fly_cable', 'chest.fly_pecdeck'],
    'back.vertical_pull': ['back.pull_up', 'back.lat_pulldown'],
    'back.row_barbell': ['back.row_barbell', 'back.row_pendlay'],
    'back.row_chest_supported': ['back.row_chest_supported_machine', 'back.row_chest_supported_bench'],
    'back.row_cable': ['back.row_cable', 'back.row_machine'],
    'shoulders.press_overhead': ['shoulders.press_overhead_barbell', 'shoulders.press_overhead_db', 'shoulders.press_overhead_db_seated'],
    'shoulders.rear_delt_facepull': ['shoulders.face_pull', 'shoulders.rear_delt_fly'],
    'shoulders.press_landmine_neutral': ['shoulders.press_landmine', 'shoulders.press_neutral_grip'],
    'quads.squat_back_or_hack': ['quads.squat_back', 'quads.squat_hack'],
    'quads.lunge_or_bulgarian': ['quads.lunge', 'quads.bulgarian_split_squat'],
    'hamstrings.leg_curl': ['hamstrings.leg_curl_lying', 'hamstrings.leg_curl_seated'],
    'biceps.curl_barbell': ['biceps.curl_barbell', 'biceps.curl_ez'],
    'triceps.close_grip_or_dips': ['triceps.close_grip_press', 'triceps.dips'],
    'abs.crunch_or_wheel': ['abs.crunch_cable', 'abs.ab_wheel'],
  };
  const viejos = {};
  [K.EXERCISES, K.FUNCTIONAL_EXERCISES].forEach(g => Object.values(g).forEach(l => l.forEach(e => { viejos[e.id] = e; })));
  Object.entries(partidos).forEach(([viejo, nuevos]) => {
    assert.ok(viejos[viejo], `${viejo} no existe en el motor actual`);
    const reales = C.VARIANTES.filter(x => x.hereda === viejo).map(x => x.id).sort();
    assert.deepEqual(reales, [...nuevos].sort(), `${viejo}: las variantes no coinciden`);
  });
  // Un ejercicio del motor actual cuyo nombre junta opciones tiene que estar en la tabla.
  Object.values(viejos).filter(e => /\s[oó]\s|\//.test(e.name) && !/Vacuum/.test(e.name)).forEach(e => assert.ok(partidos[e.id], `${e.id} ("${e.name}") junta opciones y no está partido`));
  assert.equal(Object.values(partidos).flat().length, 31);
});

/* ---------- B-031 · perfil articular propio de cada variante partida ---------- */

test('B-031: el módulo generado coincide con data/perfil-articular-variantes.csv', () => {
  assert.equal(fs.readFileSync(PV.MODULE_PATH, 'utf8'), PV.buildFromCsvText(fs.readFileSync(PV.CSV_PATH, 'utf8')), 'desactualizado: correr `node scripts/build-perfil-articular-variantes.js`');
});

test('B-031: toda variante partida tiene sus tres articulaciones propias, y solo ellas', () => {
  const partidas = C.VARIANTES.filter(x => x.heredado).map(x => x.id).sort();
  assert.equal(partidas.length, 31);
  const enCsv = [...new Set(PVM.rows.map(r => r.exerciseId))].sort();
  assert.deepEqual(enCsv, partidas, 'los ids del CSV deben ser exactamente las variantes partidas');
  partidas.forEach(id => assert.deepEqual(PVM.rows.filter(r => r.exerciseId === id).map(r => r.articulacion).sort(), ['hombro', 'lumbar', 'rodilla'], id));
  PVM.rows.forEach(r => assert.equal(r.evidencia, 'a_verificar', `${r.exerciseId}/${r.articulacion}: sin fuente leída no puede ser probable`));
});

test('B-031: las variantes que difieren en lumbar u hombro ya no comparten nivel (criterio de la spec y desempates)', () => {
  const nivel = (id, j) => C.perfilArticularDe(id)[j].nivel;
  assert.equal(nivel('quads.squat_back', 'lumbar'), 'alta');
  assert.equal(nivel('quads.squat_hack', 'lumbar'), 'media');
  assert.equal(nivel('quads.squat_back', 'hombro'), 'media');
  assert.equal(nivel('quads.squat_hack', 'hombro'), 'baja');
  assert.equal(nivel('shoulders.press_overhead_barbell', 'lumbar'), 'media');
  assert.equal(nivel('shoulders.press_overhead_db_seated', 'lumbar'), 'baja');
  assert.equal(nivel('back.row_cable', 'lumbar'), 'media');
  assert.equal(nivel('back.row_machine', 'lumbar'), 'baja');
  assert.equal(nivel('back.row_barbell', 'lumbar'), 'alta');
  assert.equal(nivel('back.row_pendlay', 'lumbar'), 'alta');
  assert.equal(nivel('back.row_chest_supported_bench', 'lumbar'), 'baja');
  // Las que no se partieron siguen leyendo su fila de data/perfil-articular.csv.
  assert.equal(nivel('hamstrings.rdl', 'lumbar'), 'alta');
  assert.equal(nivel('chest.bench_press_barbell', 'hombro'), 'alta');
});

test('B-031: ninguna fila del perfil propio queda ambigua (el press con agarre neutro es hombro media, decidido por Emanuel)', () => {
  assert.deepEqual(PVM.rows.filter(r => r.ambiguo === 'si'), []);
  assert.equal(C.perfilArticularDe('shoulders.press_neutral_grip').hombro.nivel, 'media');
});

test('aportes por músculo: los heredados conservan la verificación del original y llevan la marca heredadoDe', () => {
  C.VARIANTES.forEach(x => {
    const originales = EXERCISE_ROWS(x.hereda);
    const filas = C.aportesDe(x.id);
    assert.equal(filas.length, originales.length, x.id);
    filas.forEach((r, i) => {
      const o = originales[i];
      assert.equal(r.evidencia, o.evidencia, `${x.id}/${r.muscle}: debe conservar la evidencia del original`);
      assert.equal(r.relacion, o.relacion, `${x.id}/${r.muscle}: debe conservar la relación del original`);
      if (x.heredado) assert.equal(r.heredadoDe, x.hereda, `${x.id}: falta la marca heredadoDe`);
      else assert.equal(r.heredadoDe, undefined, `${x.id}: no es heredado`);
    });
  });
  // Ejemplo: el bíceps de las dominadas sigue verificado, no a_verificar.
  assert.ok(C.aportesDe('back.pull_up').some(r => r.evidencia === 'verificado'));
  assert.deepEqual(C.aportesDe('chest.bench_press_barbell'), EXERCISE_ROWS('chest.bench_press_barbell'));
});

function EXERCISE_ROWS(id) { return require('../js/exerciseMuscles.js').rows.filter(r => r.exerciseId === id); }

test('B-031: los 31 perfiles propios fijan lumbar/hombro/rodilla (a=alta, m=media, b=baja) según las reglas de desempate', () => {
  // Cambiar un nivel exige revisar la regla de desempate que lo decide (docs/specs/validador-fase3.md) y esta tabla.
  const esperado = {
    'chest.dip_parallel': 'bab',
    'chest.press_machine': 'bab',
    'chest.fly_cable': 'bmb',
    'chest.fly_pecdeck': 'bmb',
    'back.pull_up': 'bmb',
    'back.lat_pulldown': 'bmb',
    'back.row_barbell': 'amb',
    'back.row_pendlay': 'amb',
    'back.row_chest_supported_machine': 'bmb',
    'back.row_chest_supported_bench': 'bmb',
    'back.row_cable': 'mmb',
    'back.row_machine': 'bmb',
    'shoulders.press_overhead_barbell': 'mab',
    'shoulders.press_overhead_db': 'mab',
    'shoulders.press_overhead_db_seated': 'bab',
    'shoulders.face_pull': 'bmb',
    'shoulders.rear_delt_fly': 'bmb',
    'shoulders.press_landmine': 'mmb',
    'shoulders.press_neutral_grip': 'mmb',
    'quads.squat_back': 'ama',
    'quads.squat_hack': 'mba',
    'quads.lunge': 'mba',
    'quads.bulgarian_split_squat': 'mba',
    'hamstrings.leg_curl_lying': 'bbb',
    'hamstrings.leg_curl_seated': 'bbb',
    'biceps.curl_barbell': 'bbb',
    'biceps.curl_ez': 'bbb',
    'triceps.close_grip_press': 'bab',
    'triceps.dips': 'bab',
    'abs.crunch_cable': 'bbb',
    'abs.ab_wheel': 'mmb',
  };
  assert.deepEqual(Object.keys(esperado).sort(), C.VARIANTES.filter(x => x.heredado).map(x => x.id).sort());
  Object.entries(esperado).forEach(([id, lhr]) => {
    const p = C.perfilArticularDe(id);
    assert.equal(p.lumbar.nivel[0] + p.hombro.nivel[0] + p.rodilla.nivel[0], lhr, id);
  });
  // Regla 3 (aislamiento ligero = lumbar baja) y regla 2 (bisagra sostenida = lumbar alta), por nombre.
  ['shoulders.face_pull', 'shoulders.rear_delt_fly', 'biceps.curl_barbell', 'biceps.curl_ez', 'chest.fly_cable', 'chest.fly_pecdeck', 'abs.crunch_cable'].forEach(id => assert.equal(C.perfilArticularDe(id).lumbar.nivel, 'baja', id));
  ['back.row_barbell', 'back.row_pendlay'].forEach(id => assert.equal(C.perfilArticularDe(id).lumbar.nivel, 'alta', id));
  assert.equal(C.perfilArticularDe('shoulders.press_landmine').hombro.nivel, 'media');
});

test('DEC-026: ninguna regla queda sin DEC de origen y las ratificadas apuntan a DEC-026', () => {
  assert.deepEqual(R.REGLAS.filter(r => r.dec === 'sin DEC').map(r => r.id), []);
  const ratificadas = ['NECESIDAD_SEMANAL_POR_NIVEL', 'FACTOR_NECESIDAD_GRUPO_CHICO', 'MAX_DIAS_GRUPO_CHICO', 'SERIES_MIN_POR_EJERCICIO',
    'CARDIO_DEFINICION_SESIONES_AVANZADO', 'CARDIO_DEFINICION_SESIONES', 'CARDIO_DEFINICION_MINUTOS', 'CARDIO_MANTENIMIENTO_SESIONES', 'CARDIO_MANTENIMIENTO_MINUTOS', 'CARDIO_INTENSIDAD_PORCENTAJE_FCMAX'];
  ratificadas.forEach(id => { assert.equal(R.regla(id).dec, 'DEC-026', id); assert.equal(R.regla(id).nivel, 'E4', id); });
  assert.equal(ratificadas.length, 10, 'las 11 de DEC-026 menos el mínimo de 4, que se eliminó en el paso 2');
  assert.throws(() => R.regla('NECESIDAD_MINIMA_SERIES'), /inexistente/, 'el mínimo de 4 series se eliminó en el paso 2 (DEC-026)');
});

/* ---------- Paso 2 · reparto ---------- */
const REP = require('../js/core-v2/reparto.js');
const { profiles: PERFILES_BARRIDO } = require('../../scripts/simular-reglas-articulares.js');
const barrido = [];
[3, 4, 5, 6].forEach(d => PERFILES_BARRIDO.forEach(p => barrido.push({ d, p, plan: REP.generarPlan(Object.assign({}, p, { daysPerWeek: d })) })));
const emanuelRef = { sex: 'M', level: 'intermediate', daysPerWeek: 5, division: 'physique_m', goal: 'cut', laggingMuscles: ['quads', 'hamstrings', 'glutes'] };

test('hasta el corte: las exclusiones por lesión del registro coinciden con el mapa del motor actual (DEC-009)', () => {
  const viejos = {};
  [K.EXERCISES, K.FUNCTIONAL_EXERCISES].forEach(g => Object.keys(g).forEach(m => g[m].forEach(e => { viejos[e.id] = { e, bucket: require('../js/exerciseMuscles.js').buckets[e.id] }; })));
  K.INJURY_ZONES.forEach(z => {
    const esperado = C.VARIANTES.filter(v => { const o = viejos[v.hereda]; const mapa = K.INJURY_EXCLUSIONS[z] && K.INJURY_EXCLUSIONS[z][o.bucket]; return mapa && mapa.includes(o.e.pattern); }).map(v => v.id).sort();
    assert.deepEqual([...R.valor('EXCLUSIONES_POR_LESION')[z]].sort(), esperado, z);
  });
});

test('paso 4: la necesidad aplica 0,85 y 1,25 una sola vez, sin mínimo de 4 (perfil de Emanuel)', () => {
  const d = REP.demandas(REP.normalizarPerfil(emanuelRef));
  // intermedio 14 × 0,85 = 11,9 → 12; énfasis de physique_m (hombros, espalda, abdomen) ×1,25; rezagados ×1,25 con el 0,85 y sin énfasis.
  assert.equal(d.chest.necesidad, 12);
  assert.equal(d.shoulders.necesidad, 15);
  assert.equal(d.back.necesidad, 15);
  assert.equal(d.quads.necesidad, 15);
  assert.equal(d.calves.necesidad, 7); // grupo chico ×0,6
  assert.equal(d.abs.necesidad, 9); // grupo chico ×0,6 y énfasis ×1,25
  assert.equal(d.chest.piso, 10);
  assert.equal(d.quads.piso, 10, 'un rezagado anula la reducción de la división y usa el piso completo (DEC-017)');
});

test('paso 4: sin mínimo de 4 series, y el piso de mantenimiento de un grupo reducido y no rezagado es la mitad', () => {
  const d = REP.demandas(REP.normalizarPerfil({ sex: 'F', level: 'novice', daysPerWeek: 4, division: 'bikini_w', goal: 'cut' }));
  assert.equal(d.biceps.necesidad, 3, '10 × 0,85 × 0,6 × 0,5 = 2,55 → 3: ya no se sube a 4');
  assert.equal(d.quads.piso, R.valor('PISO_SEMANAL_GRUPO') * R.valor('FACTOR_PISO_MANTENIMIENTO'));
  assert.equal(d.biceps.piso, R.valor('MINIMO_SEMANAL_GRUPO_CHICO'));
  assert.ok(d.quads.objetivo >= d.quads.piso);
});

test('paso 4: el tope de 20 de los rezagados se respeta', () => {
  const d = REP.demandas(REP.normalizarPerfil({ level: 'advanced', goal: 'bulk', division: 'general_m', laggingMuscles: ['chest'] }));
  assert.equal(d.chest.necesidad, 20, '18 × 1,25 = 22,5 se recorta a 20');
});

test('paso 1: ninguna sesión supera su capacidad en minutos (360 planes)', () => {
  barrido.forEach(({ d, p, plan }) => plan.sesiones.forEach(s => assert.ok(s.minutos <= s.capacidadMin, `${d} días ${JSON.stringify(p.laggingMuscles)} ${s.nombre}: ${s.minutos} > ${s.capacidadMin}`)));
});

test('paso 1: con menos tiempo la sesión es más corta, y el tiempo del perfil manda', () => {
  const corto = REP.generarPlan(Object.assign({}, emanuelRef, { tiempoDisponibleMin: 40 }));
  const largo = REP.generarPlan(Object.assign({}, emanuelRef, { tiempoDisponibleMin: 90 }));
  corto.sesiones.forEach(s => assert.ok(s.minutos <= 40, `${s.nombre}: ${s.minutos}`));
  assert.ok(corto.sesiones.reduce((a, s) => a + s.series, 0) < largo.sesiones.reduce((a, s) => a + s.series, 0));
  assert.equal(REP.generarPlan(emanuelRef).sesiones[0].capacidadMin, R.valor('TIEMPO_DISPONIBLE_POR_DEFECTO_MIN'));
  // También se puede fijar por día.
  const porDia = REP.generarPlan(Object.assign({}, emanuelRef, { tiempoDisponibleMin: [30, 90, 90, 90, 90] }));
  assert.equal(porDia.sesiones[0].capacidadMin, 30);
  assert.ok(porDia.sesiones[0].minutos <= 30);
});

test('paso 5: R1 es una restricción: ningún músculo pasa de 11 series fraccionadas por sesión, salvo para cubrir una demanda mínima y avisado (360 planes)', () => {
  barrido.forEach(({ d, plan }) => plan.sesiones.forEach(s => Object.entries(s.fraccionado).forEach(([m, v]) => {
    if (v <= R.valor('MAX_SERIES_FRACCIONADAS_MUSCULO_SESION') + 1e-9) return;
    assert.ok(plan.avisos.r1Excedido.some(x => x.sesion === s.nombre), `${d} días ${s.nombre} ${m}: ${v} sin aviso de que una demanda mínima ganó sobre R1`);
  })));
});

test('DEC-025 punto 4: ganan las demandas mínimas: R1 solo se pasa mientras el piso (fraccionado o de series reales) del músculo está sin cubrir', () => {
  const chequear = eventos => eventos.forEach(ev => ev.musculos.forEach(x => {
    const grupoMayor = REP.GRUPOS_MAYORES.includes(x.musculo);
    assert.ok(x.cubiertoAntes < x.piso || (grupoMayor && x.directasAntes < x.piso), `${ev.sesion} ${x.musculo}: R1 se pasó con el mínimo ya cubierto`);
  }));
  chequear(barrido.flatMap(({ plan }) => plan.avisos.r1Excedido));
  // Con R1 de 11, el reparto estricto alcanza para casi todos los planes: el choque se fuerza bajando R1 a 3 solo dentro de la prueba.
  const r1 = R.regla('MAX_SERIES_FRACCIONADAS_MUSCULO_SESION'), original = r1.valor;
  try {
    r1.valor = 3;
    const plan = REP.generarPlan(emanuelRef);
    assert.ok(plan.avisos.r1Excedido.length > 0, 'con R1 de 3 los pisos solo se cubren pasando R1');
    chequear(plan.avisos.r1Excedido);
    REP.GRUPOS_MAYORES.forEach(m => assert.ok(plan.semanal[m].cubierto >= plan.semanal[m].piso && plan.semanal[m].directas >= plan.semanal[m].piso, `${m}: el mínimo debe ganar sobre R1`));
  } finally { r1.valor = original; }
});

test('DEC-014: la garantía de series reales: cada grupo mayor tiene al menos su piso en series directas, o el aviso único lo dice (360 planes)', () => {
  barrido.forEach(({ d, plan }) => REP.GRUPOS_MAYORES.forEach(m => {
    const x = plan.semanal[m];
    if (x.directas >= x.piso - 1e-9) return;
    assert.ok(plan.avisoUnico && plan.avisoUnico.sinCubrir.some(y => y.musculo === m && y.faltaReal > 0), `${d} días ${m}: ${x.directas} directas < piso ${x.piso} sin aviso`);
  }));
});

test('paso 5: lo que R1 impide queda como necesidad sin cubrir y el aviso único lo explica', () => {
  const conR1 = barrido.filter(({ plan }) => Object.values(plan.semanal).some(x => x.causa === 'R1'));
  assert.ok(conR1.length > 0, 'el barrido debería tener planes donde R1 deja necesidad sin cubrir');
  conR1.forEach(({ plan }) => {
    assert.ok(plan.avisoUnico, 'sin aviso único');
    assert.ok(plan.avisoUnico.sinCubrir.some(x => x.causa === 'R1'));
    assert.equal(plan.avisoUnico.salidas.length, 3);
  });
  barrido.filter(({ plan }) => !plan.avisoUnico).forEach(({ plan }) => Object.values(plan.semanal).forEach(x => assert.ok(x.falta <= 1e-9)));
});

test('paso 3: cada sesión tiene los patrones obligatorios de su tipo (o el aviso explica por qué no)', () => {
  barrido.forEach(({ d, plan }) => {
    const sinLugar = new Set(plan.avisos.obligatoriosSinLugar.map(x => `${x.sesion}|${x.patron}`));
    plan.sesiones.forEach((s, i) => {
      const spec = REP.TIPOS[Object.keys(REP.TIPOS).find(k => REP.SPLITS[d][i][1] === k)];
      spec.obligatorios.forEach(pt => assert.ok(s.ejercicios.some(e => e.patron === pt) || sinLugar.has(`${s.nombre}|${pt}`), `${d} días ${s.nombre}: falta ${pt}`));
    });
  });
});

test('paso 3: todo día de tirón tiene tirón vertical y horizontal y su top set es un tirón; la rutina de empuje, empuje horizontal y vertical', () => {
  const plan = REP.generarPlan(emanuelRef);
  const tiron = plan.sesiones.find(s => s.tipo === 'Tirón');
  assert.ok(tiron.ejercicios.some(e => e.patron === 'tiron_vertical') && tiron.ejercicios.some(e => e.patron === 'tiron_horizontal'));
  assert.ok(/^tiron_/.test(tiron.ejercicios.find(e => e.topSet).patron));
  const empuje = plan.sesiones.find(s => s.tipo === 'Empuje');
  assert.ok(empuje.ejercicios.some(e => e.patron === 'empuje_horizontal') && empuje.ejercicios.some(e => e.patron === 'empuje_vertical'));
});

test('paso 6: el top set existe solo en definición, una vez por sesión, en el patrón principal y en una variante elegible (DEC-002, DEC-008)', () => {
  barrido.forEach(({ d, p, plan }) => plan.sesiones.forEach(s => {
    const tops = s.ejercicios.filter(e => e.topSet);
    if (p.goal !== 'cut') return assert.equal(tops.length, 0, `${p.goal} no lleva top set`);
    assert.ok(tops.length <= 1, `${s.nombre}: ${tops.length} top sets`);
    tops.forEach(e => {
      assert.equal(e.patron, s.principal, `${s.nombre}: top set fuera del patrón principal`);
      assert.ok(C.variantePorId(e.varianteId).topSetElegible, `${e.varianteId} no es elegible (DEC-008)`);
      assert.deepEqual(e.topSet.repeticiones, [4, 6]);
    });
    assert.equal(tops.length, 1, `${d} días ${s.nombre}: en definición cada sesión lleva su top set (sin prioritarios)`);
  }));
});

test('paso 6: el top set rota en cuerpo completo (sentadilla, empuje horizontal, bisagra) y alterna en torso (empuje horizontal, tirón vertical)', () => {
  const cc = REP.generarPlan({ sex: 'M', level: 'intermediate', daysPerWeek: 3, division: 'general_m', goal: 'cut' });
  assert.deepEqual(cc.sesiones.map(s => s.principal), ['sentadilla', 'empuje_horizontal', 'bisagra']);
  const t4 = REP.generarPlan({ sex: 'M', level: 'intermediate', daysPerWeek: 4, division: 'general_m', goal: 'cut' });
  assert.deepEqual([t4.sesiones[0].principal, t4.sesiones[2].principal], ['empuje_horizontal', 'tiron_vertical']);
});

test('A1/A2/A3: lumbar alta primero; una sola por sesión salvo el remo con barra elegido, que se avisa; sentadilla y bisagra nunca juntas (360 planes, con y sin remo con barra)', () => {
  const conBarra = [];
  [3, 4, 5, 6].forEach(d => PERFILES_BARRIDO.forEach(p => conBarra.push({ d, plan: REP.generarPlan(Object.assign({}, p, { daysPerWeek: d, barbellRow: true })) })));
  barrido.forEach(({ d, plan }) => assert.equal(plan.avisos.a2.length, 0, `${d} días: sin remo con barra no hay dos de lumbar alta`));
  barrido.concat(conBarra).forEach(({ d, plan }) => plan.sesiones.forEach(s => {
    if (s.lumbarAltaEnSesion > R.valor('MAX_LUMBAR_ALTA_POR_SESION')) {
      assert.ok(plan.avisos.a2.some(x => x.sesion === s.nombre), `${d} días ${s.nombre}: dos de lumbar alta sin aviso`);
      assert.ok(s.ejercicios.some(e => ['back.row_barbell', 'back.row_pendlay'].includes(e.varianteId)), `${s.nombre}: la segunda lumbar alta debe ser el remo con barra`);
    }
    const altas = s.ejercicios.map(e => e.lumbarAlta);
    assert.deepEqual(altas, [...altas].sort((a, b) => b - a), `${s.nombre}: la lumbar alta no va primero`);
    const pats = s.ejercicios.map(e => e.patron);
    assert.ok(!(pats.includes('sentadilla') && pats.includes('bisagra')), `${s.nombre}: sentadilla y bisagra juntas`);
  }));
});

test('A2 es un aviso cuando el usuario elige el remo con barra: se suma a la sentadilla y el plan lo avisa', () => {
  const tipo = REP.TIPOS.cc1, original = tipo.obligatorios.slice();
  try {
    tipo.obligatorios.push('tiron_horizontal'); // escenario forzado: el día de sentadilla pide también un tirón horizontal
    const plan = REP.generarPlan({ sex: 'M', level: 'intermediate', daysPerWeek: 3, division: 'general_m', goal: 'bulk', barbellRow: true, prioritarios: ['back.row_barbell'] });
    const s = plan.sesiones[0];
    assert.equal(s.lumbarAltaEnSesion, 2);
    assert.ok(plan.avisos.a2.some(x => x.sesion === s.nombre));
    const sin = REP.generarPlan({ sex: 'M', level: 'intermediate', daysPerWeek: 3, division: 'general_m', goal: 'bulk', barbellRow: false });
    assert.equal(sin.sesiones[0].lumbarAltaEnSesion, 1, 'sin la casilla del remo con barra no hay dos de lumbar alta');
  } finally { tipo.obligatorios.length = 0; original.forEach(x => tipo.obligatorios.push(x)); }
});

test('A3 por sí sola: aunque la sentadilla no sea de lumbar alta, el día de sentadilla no lleva peso muerto rumano', () => {
  // Catálogo donde la sentadilla trasera (lumbar alta) no está disponible: el día usa el hack (lumbar media) y A2 no frena a la bisagra, solo A3.
  const sinTrasera = Object.assign({}, C, { excluidaPorLesion: (id, z) => id === 'quads.squat_back' || C.excluidaPorLesion(id, z) });
  const plan = REP.generarPlan(emanuelRef, { catalogo: sinTrasera });
  const sent = plan.sesiones.find(s => s.principal === 'sentadilla');
  assert.ok(sent.ejercicios.some(e => e.varianteId === 'quads.squat_hack'));
  assert.ok(!sent.ejercicios.some(e => e.patron === 'bisagra'), 'A3: el día de sentadilla no lleva bisagra');
});

test('paso 2: lesiones declaradas, remo con barra y bandera salud/funcional habilitan o excluyen variantes', () => {
  const ids = plan => plan.sesiones.flatMap(s => s.ejercicios.map(e => e.varianteId));
  const base = ids(REP.generarPlan(emanuelRef));
  assert.ok(!base.includes('back.row_barbell') && !base.includes('back.row_pendlay'), 'el remo con barra solo entra con la casilla');
  assert.ok(!base.some(i => /^functional\./.test(i)), 'los funcionales solo entran con la bandera');
  assert.ok(!base.includes('shoulders.press_landmine'), 'los sustitutos solo entran con la lesión');
  const rodilla = ids(REP.generarPlan(Object.assign({}, emanuelRef, { injuryZones: ['knee'] })));
  R.valor('EXCLUSIONES_POR_LESION').knee.forEach(i => assert.ok(!rodilla.includes(i), `${i} con lesión de rodilla`));
  const hombro = ids(REP.generarPlan(Object.assign({}, emanuelRef, { injuryZones: ['shoulder'] })));
  R.valor('EXCLUSIONES_POR_LESION').shoulder.forEach(i => assert.ok(!hombro.includes(i), `${i} con lesión de hombro`));
  assert.ok(hombro.includes('shoulders.press_landmine') || hombro.includes('shoulders.press_neutral_grip'), 'con lesión de hombro entra un sustituto');
});

test('paso 3: los ejercicios prioritarios entran en todos los días de su patrón, con tope de tres, y la seguridad gana', () => {
  const plan = REP.generarPlan(Object.assign({}, emanuelRef, { prioritarios: ['back.pull_up', 'chest.dip_parallel'] }));
  plan.sesiones.forEach(s => {
    if (s.ejercicios.some(e => e.patron === 'tiron_vertical')) assert.ok(s.ejercicios.some(e => e.varianteId === 'back.pull_up'), `${s.nombre}: falta la dominada prioritaria`);
    if (s.ejercicios.some(e => e.patron === 'empuje_horizontal')) assert.ok(s.ejercicios.some(e => e.varianteId === 'chest.dip_parallel'), `${s.nombre}: faltan los fondos prioritarios`);
  });
  const cuatro = REP.normalizarPerfil({ prioritarios: ['a', 'b', 'c', 'd'] });
  assert.equal(cuatro.prioritarios.length, 3);
  const lesion = REP.generarPlan(Object.assign({}, emanuelRef, { prioritarios: ['chest.dip_parallel'], injuryZones: ['shoulder'] }));
  assert.ok(!lesion.sesiones.some(s => s.ejercicios.some(e => e.varianteId === 'chest.dip_parallel')));
  assert.equal(lesion.avisos.seguridad.length, 1);
});

test('paso 5: grupos chicos en a lo sumo 2 sesiones por semana (T6)', () => {
  barrido.forEach(({ d, plan }) => REP.GRUPOS_CHICOS.forEach(m => {
    const dias = plan.sesiones.filter(s => s.ejercicios.some(e => e.grupo === m)).length;
    assert.ok(dias <= R.valor('MAX_DIAS_GRUPO_CHICO'), `${d} días ${m}: ${dias} sesiones`);
  }));
});

test('paso 5: una variante partida cuenta como el original (la herencia no suma ni resta series fraccionadas)', () => {
  const nuevo = REP.pesosDe(C, 'back.pull_up'), viejo = REP.pesosDe(C.catalogoViejoEmulado(K), 'back.vertical_pull');
  assert.deepEqual(nuevo, viejo);
  assert.ok(nuevo.back === 1 && nuevo.biceps === 0.5);
});

test('splits: los nombres de día son distintos en cada split (de eso depende el indicador "Siguiente", DEC-027)', () => {
  const todos = [3, 4, 5, 6].map(d => REP.SPLITS[d].map(x => x[0]));
  todos.forEach((a, i) => todos.forEach((b, j) => { if (i !== j) a.forEach(n => assert.ok(!b.includes(n), `"${n}" se repite entre splits`)); }));
  [3, 4, 5, 6].forEach(d => assert.equal(REP.SPLITS[d].length, d));
});

test('el reparto es determinista y funciona con el catálogo viejo emulado', () => {
  assert.deepEqual(REP.generarPlan(emanuelRef), REP.generarPlan(emanuelRef));
  const viejo = REP.generarPlan(emanuelRef, { catalogo: C.catalogoViejoEmulado(K) });
  assert.equal(viejo.catalogo, 'viejo');
  viejo.sesiones.forEach(s => assert.ok(s.ejercicios.length > 0));
});

test('registro: el descanso de back-off es el del multiarticular (el reparto cuenta el back-off como una serie normal)', () => {
  assert.equal(R.valor('DESCANSO_BACKOFF_S'), R.valor('DESCANSO_MULTIARTICULAR_S'));
});

test('paso 5: una relación a_verificar cuenta 0, salvo el grupo donde se programa, que cuenta como directo (DEC-016)', () => {
  const w = REP.pesosDe(C, 'chest.incline_press_db');
  assert.equal(w.chest, 1, 'el grupo del ejercicio es directo aunque su fila sea a_verificar');
  assert.equal(w.shoulders, undefined, 'hombros del press inclinado es a_verificar: cuenta 0');
  assert.equal(w.triceps, 0.5);
});

test('paso 6: un prioritario no elegible para top set conserva su lugar y esa sesión queda sin top set (DEC-008)', () => {
  const plan = REP.generarPlan(Object.assign({}, emanuelRef, { prioritarios: ['chest.dip_parallel'] }));
  plan.sesiones.filter(s => s.principal === 'empuje_horizontal').forEach(s => {
    assert.ok(s.ejercicios.some(e => e.varianteId === 'chest.dip_parallel'));
    assert.ok(!s.ejercicios.some(e => e.topSet), `${s.nombre}: los fondos no son elegibles para top set`);
  });
  // Sin prioritarios, el top set del empuje horizontal va a una variante elegible.
  REP.generarPlan(emanuelRef).sesiones.filter(s => s.principal === 'empuje_horizontal').forEach(s => assert.equal(s.ejercicios.find(e => e.topSet).varianteId, 'chest.bench_press_barbell'));
});

test('DEC-014: en el perfil de referencia cada grupo mayor llega a su piso en series directas, sin aviso (la garantía se cumple, no solo se informa)', () => {
  const plan = REP.generarPlan(emanuelRef);
  REP.GRUPOS_MAYORES.forEach(m => assert.ok(plan.semanal[m].directas >= plan.semanal[m].piso, `${m}: ${plan.semanal[m].directas} directas < piso ${plan.semanal[m].piso}`));
  assert.equal(plan.avisoUnico, null);
});

/* ---------- Paso 2b · estructura: patrón principal con volumen propio y ejercicio directo semanal (DEC-029) ---------- */
test('DEC-029: el patrón principal de cada sesión lleva al menos 4 series de trabajo, o el aviso único dice que no cupo (360 planes)', () => {
  barrido.forEach(({ d, plan }) => plan.sesiones.forEach(s => {
    const principal = s.ejercicios.find(e => e.patron === s.principal);
    const reducido = plan.avisos.principalReducido.some(x => x.sesion === s.nombre) || plan.avisos.obligatoriosSinLugar.some(x => x.sesion === s.nombre && x.patron === s.principal);
    if (!principal) return assert.ok(reducido, `${d} días ${s.nombre}: sin patrón principal y sin aviso`);
    assert.ok(principal.series >= R.valor('SERIES_MIN_PATRON_PRINCIPAL') || reducido, `${d} días ${s.nombre}: el principal tiene ${principal.series} series`);
  }));
  const hay = barrido.filter(({ plan }) => plan.sesiones.every(s => (s.ejercicios.find(e => e.patron === s.principal) || { series: 0 }).series >= 4));
  assert.ok(hay.length > barrido.length * 0.8, 'la mayoría de los planes debería llevar el principal con 4 series o más en todas sus sesiones');
});

test('DEC-029: todo grupo del perfil lleva por semana al menos un ejercicio directo con 2 series o más, o el aviso único lo dice (360 planes)', () => {
  barrido.forEach(({ d, plan }) => REP.MUSCULOS.forEach(m => {
    const directos = plan.sesiones.flatMap(s => s.ejercicios).filter(e => e.grupo === m && e.series >= R.valor('EJERCICIO_DIRECTO_SEMANAL_MIN_SERIES'));
    if (directos.length) return;
    assert.ok(plan.avisos.sinDirecto.some(x => x.musculo === m), `${d} días ${m}: sin ejercicio directo y sin aviso`);
  }));
  // Antes bíceps y tríceps podían quedar solo con series indirectas: en el perfil de referencia ahora tienen su ejercicio.
  const plan = REP.generarPlan(emanuelRef);
  ['biceps', 'triceps', 'calves', 'abs'].forEach(m => assert.ok(plan.sesiones.flatMap(s => s.ejercicios).some(e => e.grupo === m && e.series >= 2), m));
  assert.equal(plan.avisoUnico, null);
});

test('DEC-029: sin variantes ni sesión donde ubicar un grupo, el ejercicio directo se avisa (la seguridad gana)', () => {
  // Una lesión de codo y muñeca deja a los bíceps sin variantes directas (curl con barra, barra Z; el inclinado sigue): se fuerza excluyéndolas todas.
  const sinBiceps = Object.assign({}, C, { excluidaPorLesion: (id, z) => /^biceps\./.test(id) || C.excluidaPorLesion(id, z) });
  const plan = REP.generarPlan(emanuelRef, { catalogo: sinBiceps });
  assert.ok(plan.avisos.sinDirecto.some(x => x.musculo === 'biceps'));
  assert.ok(plan.avisoUnico && plan.avisoUnico.sinDirecto.some(x => x.musculo === 'biceps'));
});

test('DEC-025 punto 4: R1 es estricta primero: con R1 de 11 ningún plan del barrido la pasa mientras otra sesión puede alojar la serie', () => {
  barrido.forEach(({ d, plan }) => {
    assert.deepEqual(plan.avisos.r1Excedido, [], `${d} días: R1 se pasó sin necesidad`);
    plan.sesiones.forEach(s => Object.values(s.fraccionado).forEach(v => assert.ok(v <= 11 + 1e-9, `${d} días ${s.nombre}: ${v}`)));
  });
});

test('DEC-029: si el tiempo no alcanza, el patrón principal baja de a una serie y el aviso único lo dice', () => {
  const plan = REP.generarPlan(Object.assign({}, emanuelRef, { tiempoDisponibleMin: 12 }));
  const reducidas = plan.sesiones.filter(s => { const p = s.ejercicios.find(e => e.patron === s.principal); return p && p.series < R.valor('SERIES_MIN_PATRON_PRINCIPAL'); });
  assert.ok(reducidas.length > 0, 'con 12 minutos el principal no cabe con 4 series');
  reducidas.forEach(s => assert.ok(plan.avisos.principalReducido.some(x => x.sesion === s.nombre)));
  assert.ok(plan.avisoUnico && plan.avisoUnico.principalReducido.length > 0);
});

test('DEC-029: un ejercicio con una sola serie no cuenta como el ejercicio directo del grupo', () => {
  const sesiones = REP.generarPlan(emanuelRef).sesiones;
  ['biceps', 'triceps', 'calves', 'abs'].forEach(m => {
    const mejor = Math.max(...sesiones.flatMap(s => s.ejercicios).filter(e => e.grupo === m).map(e => e.series));
    assert.ok(mejor >= 2, `${m}: su mejor ejercicio tiene ${mejor} serie`);
  });
});

/* ---------- DEC-031 · tope de series por ejercicio y sesión ---------- */
const sinTope = [];
[3, 4, 5, 6].forEach(d => PERFILES_BARRIDO.forEach(p => sinTope.push({ d, p, plan: REP.generarPlan(Object.assign({}, p, { daysPerWeek: d }), { sinTopePorEjercicio: true }) })));

test('DEC-031: ningún ejercicio pasa de 5 series en una sesión, salvo que el aviso diga que su patrón no tiene otra variante que quepa (360 planes)', () => {
  const tope = R.valor('MAX_SERIES_POR_EJERCICIO');
  assert.equal(tope, 5);
  barrido.forEach(({ d, plan }) => plan.sesiones.forEach(s => s.ejercicios.filter(e => e.series > tope).forEach(e => {
    assert.ok(plan.avisos.topeExcedido.some(x => x.sesion === s.nombre && x.varianteId === e.varianteId), `${d} días ${s.nombre}: ${e.nombre} ×${e.series} sin aviso`);
  })));
  // Sin el tope hay ejercicios que pasan de 5: la regla hace algo.
  assert.ok(sinTope.some(({ plan }) => plan.sesiones.some(s => s.ejercicios.some(e => e.series > tope))));
});

test('DEC-031: el volumen no se recorta: mismas series por sesión con y sin el tope, y el excedente va a otra variante del mismo patrón con 2 series o más', () => {
  barrido.forEach(({ d, plan }, i) => {
    const antes = sinTope[i].plan;
    plan.sesiones.forEach((s, k) => {
      assert.equal(s.series, antes.sesiones[k].series, `${d} días ${s.nombre}: cambió el total de series`);
      const porPatron = {};
      s.ejercicios.forEach(e => { (porPatron[e.patron] = porPatron[e.patron] || []).push(e); });
      Object.values(porPatron).filter(l => l.length > 1).forEach(l => {
        assert.equal(new Set(l.map(e => e.grupo)).size, 1, `${s.nombre}: el traspaso debe quedar en el mismo grupo`);
        l.forEach(e => assert.ok(e.series >= R.valor('SERIES_MIN_POR_EJERCICIO'), `${s.nombre}: ${e.nombre} ×${e.series}`));
        assert.equal(l.filter(e => e.topSet).length <= 1, true);
      });
    });
  });
});

test('DEC-031: el excedente no lleva top set, ni rompe R1, ni la capacidad, ni A2', () => {
  barrido.forEach(({ d, plan }) => plan.sesiones.forEach(s => {
    assert.ok(s.minutos <= s.capacidadMin, `${d} días ${s.nombre}`);
    assert.ok(s.ejercicios.filter(e => e.topSet).length <= 1);
    assert.ok(s.lumbarAltaEnSesion <= R.valor('MAX_LUMBAR_ALTA_POR_SESION'), `${d} días ${s.nombre}: A2`);
    Object.values(s.fraccionado).forEach(v => assert.ok(v <= 11 + 1e-9 || plan.avisos.r1Excedido.length > 0, `${d} días ${s.nombre}: R1`));
  }));
});

test('DEC-031: si el patrón tiene una sola variante (pullover), el ejercicio se queda con sus series y el aviso lo dice', () => {
  const aviso = barrido.flatMap(({ plan }) => plan.avisos.topeExcedido);
  const solo = aviso.filter(x => C.variantesDePatron(C.variantePorId(x.varianteId).patron).filter(v => v.id !== x.varianteId).length === 0);
  assert.ok(aviso.every(x => x.series > 5));
  assert.ok(solo.length === 0 || solo.every(x => /no hay otra variante/.test(x.motivo)));
});
