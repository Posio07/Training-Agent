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
    assert.ok(['sin DEC', 'spec núcleo v2'].includes(r.dec) || DECS.has(r.dec), `${r.id}: DEC de origen inexistente (${r.dec})`);
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
    REZAGADOS_TOPE_SERIES: 20, NECESIDAD_MINIMA_SERIES: 4, MAX_SERIES_FRACCIONADAS_MUSCULO_SESION: 11, MAX_EJERCICIOS_PRIORITARIOS: 3,
    DESCANSO_MULTIARTICULAR_S: 150, DESCANSO_AISLAMIENTO_S: 75, DESCANSO_TOP_SET_S: 180, DESCANSO_BACKOFF_S: 150, FACTOR_UNILATERAL: 2,
    TOP_SET_REPETICIONES: [4, 6], TOP_SET_RIR: [1, 2], BACKOFF_REDUCCION_PORCENTAJE: 10, MAX_DIAS_GRUPO_CHICO: 2,
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

test('B-031: lo ambiguo queda marcado (press con agarre neutro: hombro alta, decide Emanuel)', () => {
  const amb = PVM.rows.filter(r => r.ambiguo === 'si').map(r => `${r.exerciseId}/${r.articulacion}`);
  assert.deepEqual(amb, ['shoulders.press_neutral_grip/hombro']);
});

test('aportes por músculo: los heredados de variantes partidas salen a_verificar y conservan la evidencia original', () => {
  C.VARIANTES.forEach(x => {
    const filas = C.aportesDe(x.id);
    filas.forEach(r => {
      if (x.heredado) {
        assert.equal(r.evidencia, 'a_verificar', `${x.id}/${r.muscle}`);
        assert.ok(r.evidenciaOriginal, `${x.id}/${r.muscle}: falta evidenciaOriginal`);
        assert.equal(r.heredadoDe, x.hereda);
      } else assert.notEqual(r.heredadoDe, x.hereda, x.id);
    });
  });
  // Un ejemplo con evidencia original distinta de a_verificar: las dominadas (bíceps verificado).
  assert.ok(C.aportesDe('back.pull_up').some(r => r.evidenciaOriginal && r.evidenciaOriginal !== 'a_verificar'));
  // El ejercicio no partido no se toca.
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
    'shoulders.press_neutral_grip': 'mab',
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
