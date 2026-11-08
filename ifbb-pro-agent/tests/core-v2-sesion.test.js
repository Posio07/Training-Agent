/* EN CONSTRUCCIÓN · tests del núcleo v2, paso 3.3: sesión por variantes y "hoy tengo X min" (B-039). No tocan el motor actual ni la interfaz. */
const test = require('node:test');
const assert = require('node:assert/strict');
const SES = require('../js/core-v2/sesion.js');
const C = require('../js/core-v2/catalogo.js');
const R = require('../js/core-v2/registro.js');
const REP = require('../js/core-v2/reparto.js');
const SS = require('../js/sessionStore.js');

const perfil = () => ({ sex: 'M', level: 'intermediate', daysPerWeek: 5, division: 'physique_m', goal: 'cut', laggingMuscles: ['quads'] });
const plan = () => REP.generarPlan(perfil());
const fila = (exerciseId, date, sessionId, setType, n, weight, reps, savedAt) => ({ exerciseId, date, sessionId, setType, setNumber: n, weight, reps, savedAt: savedAt || 0 });
const idx = (sesion, patron) => sesion.ejercicios.findIndex(e => e.patron === patron);

test('las variantes de un ejercicio son las del mismo patrón, habilitadas por el perfil y que no están ya en la sesión', () => {
  const s = plan().sesiones.find(x => x.principal === 'tiron_vertical');
  const i = idx(s, 'tiron_vertical');
  const op = SES.variantesDelEjercicio(s, i, perfil(), []);
  assert.deepEqual(op.map(o => o.varianteId).sort(), ['back.lat_pulldown', 'back.pull_up']);
  assert.equal(op.filter(o => o.planificada).length, 1);
  // El remo con barra solo aparece con la casilla; el sustituto por lesión solo con la lesión.
  const j = idx(s, 'tiron_horizontal');
  assert.ok(!SES.variantesDelEjercicio(s, j, perfil(), []).some(o => /row_barbell|pendlay/.test(o.varianteId)));
  assert.ok(SES.variantesDelEjercicio(s, j, Object.assign(perfil(), { barbellRow: true }), []).some(o => o.varianteId === 'back.row_barbell'));
  // Una variante excluida por la lesión declarada no se ofrece, y el sustituto por lesión aparece solo con ella.
  const e = plan().sesiones.find(x => x.tipo === 'Empuje');
  const k = idx(e, 'empuje_vertical');
  const sin = SES.variantesDelEjercicio(e, k, perfil(), []).map(o => o.varianteId);
  assert.ok(sin.includes('shoulders.press_overhead_barbell') && !sin.includes('shoulders.press_landmine'));
  const con = SES.variantesDelEjercicio(e, k, Object.assign(perfil(), { injuryZones: ['shoulder'] }), []).map(o => o.varianteId);
  assert.ok(con.every(id => !R.valor('EXCLUSIONES_POR_LESION').shoulder.includes(id)), 'ninguna excluida');
  assert.ok(con.includes('shoulders.press_landmine'), 'el sustituto por lesión aparece');
  // Una variante que ya está en la sesión no se ofrece para otro ejercicio del mismo patrón.
  const dup = Object.assign({}, s, { ejercicios: s.ejercicios.concat([Object.assign({}, s.ejercicios[i], { varianteId: 'back.lat_pulldown', nombre: 'Jalón al pecho' })]) });
  const dupOp = SES.variantesDelEjercicio(dup, i, perfil(), []).map(o => o.varianteId);
  assert.ok(!dupOp.includes('back.lat_pulldown') || s.ejercicios[i].varianteId === 'back.lat_pulldown');
  assert.throws(() => SES.variantesDelEjercicio(s, 99, perfil(), []), /inexistente/);
});

test('por defecto arranca con la última variante usada del patrón; sin historial, con la planificada', () => {
  const s = plan().sesiones.find(x => x.principal === 'tiron_vertical');
  const i = idx(s, 'tiron_vertical');
  const planificada = s.ejercicios[i].varianteId;
  const otra = planificada === 'back.pull_up' ? 'back.lat_pulldown' : 'back.pull_up';
  assert.equal(SES.varianteInicial(s, i, perfil(), []), planificada);
  const w = [fila(otra, '2026-11-01', 's1', 'normal', 1, 50, 8, 1), fila(planificada, '2026-10-01', 's0', 'normal', 1, 40, 8, 1)];
  assert.equal(SES.ultimaVariante(w, 'tiron_vertical'), otra, 'gana la fila más reciente por fecha');
  assert.equal(SES.varianteInicial(s, i, perfil(), w), otra);
  // Misma fecha: gana la hora.
  const mismo = [fila(planificada, '2026-11-01', 'a', 'normal', 1, 50, 8, 100), fila(otra, '2026-11-01', 'b', 'normal', 1, 50, 8, 900)];
  assert.equal(SES.ultimaVariante(mismo, 'tiron_vertical'), otra);
  // Si la última usada ya no está habilitada (lesión), vuelve a la planificada.
  const lesion = Object.assign(perfil(), { injuryZones: ['shoulder'] });
  const prohibida = R.valor('EXCLUSIONES_POR_LESION').shoulder.find(id => C.variantePorId(id).patron === 'tiron_vertical');
  if (prohibida) assert.notEqual(SES.varianteInicial(s, i, lesion, [fila(prohibida, '2026-11-01', 's', 'normal', 1, 1, 1)]), prohibida);
  assert.equal(SES.ultimaVariante([fila('no.existe', '2026-11-01', 's', 'normal', 1, 1, 1)], 'tiron_vertical'), null);
});

test('cambiar de variante avisa (A2, top set) y nunca bloquea; una variante no disponible sí se rechaza', () => {
  const s = plan().sesiones.find(x => x.principal === 'tiron_vertical');
  const i = idx(s, 'tiron_vertical'), otra = s.ejercicios[i].varianteId === 'back.pull_up' ? 'back.lat_pulldown' : 'back.pull_up';
  const ok = SES.evaluarCambio(s, i, otra, perfil());
  assert.equal(ok.permitido, true); assert.deepEqual(ok.avisos, []);
  const no = SES.evaluarCambio(s, i, 'chest.bench_press_barbell', perfil());
  assert.equal(no.permitido, false);
  // Top set: el press de pecho en máquina no es elegible (DEC-008).
  const e = plan().sesiones.find(x => x.principal === 'empuje_horizontal');
  const k = idx(e, 'empuje_horizontal');
  assert.ok(e.ejercicios[k].topSet);
  const c = SES.evaluarCambio(e, k, 'chest.press_machine', perfil());
  assert.ok(c.avisos.some(a => a.regla === 'top-set'));
  // A2: poner un remo con barra (lumbar alta) en un día que ya tiene otro de lumbar alta avisa.
  const pierna = plan().sesiones.find(x => x.principal === 'sentadilla');
  assert.equal(pierna.ejercicios.filter(x => C.perfilArticularDe(x.varianteId).lumbar.nivel === 'alta').length, 1);
  const j = pierna.ejercicios.findIndex(x => x.patron === 'flexion_rodilla');
  const fake = Object.assign({}, C, { variantePorId: id => C.variantePorId(id), perfilArticularDe: id => (id === 'hamstrings.leg_curl_lying' ? { lumbar: { nivel: 'alta' } } : C.perfilArticularDe(id)) });
  const a2 = SES.evaluarCambio(pierna, j, 'hamstrings.leg_curl_lying', perfil(), fake);
  assert.ok(a2.avisos.some(a => a.regla === 'A2'));
});

test('los ejercicios de la sesión salen en el formato de sessionStore, con el id de la variante, y sessionStore los acepta', () => {
  const s = plan().sesiones[0];
  const ex = SES.ejerciciosParaSesion(s);
  assert.equal(ex.length, s.ejercicios.length);
  ex.forEach((e, k) => {
    assert.equal(e.exerciseId, s.ejercicios[k].varianteId); assert.equal(e.sets.length, s.ejercicios[k].series);
    assert.ok(['compound', 'isolation'].includes(e.type)); assert.ok(e.durationMin > 0); assert.equal(e.cambiadaDe, null);
  });
  const principal = ex.find(e => e.pattern === s.principal);
  assert.equal(principal.sets[0].setType, 'top'); assert.equal(principal.sets[0].repsLabel, '4-6');
  assert.ok(principal.sets.slice(1).every(x => x.setType === 'backoff'));
  assert.equal(principal.sets.length, s.ejercicios.find(e => e.patron === s.principal).series, 'el top set cuenta como una de las series');
  const rec = SS.newSession({ profileId: 'p1', sessionId: 's1', dayIndex: 0, dayName: s.nombre, short: false, exercises: ex, now: 1 });
  assert.equal(SS.isValid(rec), true);
  // La fila registrada lleva el id de la variante: el progreso es por variante.
  SS.markDone(rec, 0, 0, { weight: 60, reps: 5, pain: null }, 2);
  const row = SS.workoutRow(rec, 0, 0, '2026-11-08');
  assert.equal(row.exerciseId, s.ejercicios[0].varianteId);
});

test('elegir otra variante cambia el ejercicio de la sesión: nombre, id, repeticiones y descanso; el top set se pierde si no es elegible', () => {
  const s = plan().sesiones.find(x => x.principal === 'empuje_horizontal');
  const k = idx(s, 'empuje_horizontal');
  const ex = SES.ejerciciosParaSesion(s, { [k]: 'chest.press_machine' });
  assert.equal(ex[k].exerciseId, 'chest.press_machine'); assert.equal(ex[k].cambiadaDe, s.ejercicios[k].nombre);
  assert.ok(ex[k].sets.every(x => x.setType === 'normal'), 'sin top set (no elegible)');
  assert.equal(ex[k].sets.length, s.ejercicios[k].series, 'el volumen no cambia');
  const mismo = SES.ejerciciosParaSesion(s, { [k]: s.ejercicios[k].varianteId });
  assert.equal(mismo[k].cambiadaDe, null);
});

test('la barra cargada con discos solo se marca en las variantes con barra (como BARBELL_PATTERNS del motor actual)', () => {
  const marcadas = C.VARIANTES.filter(v => v.barra).map(v => v.id).sort();
  assert.deepEqual(marcadas, ['back.row_barbell', 'back.row_pendlay', 'chest.bench_press_barbell', 'glutes.hip_thrust', 'hamstrings.rdl', 'quads.squat_back', 'shoulders.press_overhead_barbell']);
  const s = plan().sesiones.find(x => x.principal === 'empuje_horizontal');
  assert.equal(SES.ejerciciosParaSesion(s).find(e => e.exerciseId === 'chest.bench_press_barbell').barra, true);
});

test('la última vez y el progreso son por variante y no incluyen la sesión actual', () => {
  const w = [
    fila('chest.bench_press_barbell', '2026-11-01', 's1', 'top', 1, 80, 5, 1), fila('chest.bench_press_barbell', '2026-11-01', 's1', 'backoff', 1, 72, 8, 2),
    fila('chest.bench_press_barbell', '2026-11-05', 's2', 'top', 1, 82.5, 5, 1), fila('chest.bench_press_barbell', '2026-11-05', 's2', 'backoff', 1, 74, 8, 2),
    fila('chest.incline_press_db', '2026-11-06', 's3', 'normal', 1, 30, 10, 1),
  ];
  const u = SES.ultimaVez(w, 'chest.bench_press_barbell');
  assert.equal(u.sessionId, 's2'); assert.deepEqual(u.sets.map(x => [x.setType, x.weight]), [['top', 82.5], ['backoff', 74]]);
  assert.equal(SES.ultimaVez(w, 'chest.bench_press_barbell', 's2').sessionId, 's1', 'sin la sesión actual');
  assert.equal(SES.ultimaVez(w, 'quads.leg_press'), null);
  const p = SES.progreso(w, 'chest.bench_press_barbell');
  assert.deepEqual(p.map(x => x.date), ['2026-11-01', '2026-11-05']);
  assert.equal(p[1].mejor.weight, 82.5); assert.equal(p[1].mejor.e1rm, Math.round(82.5 * (1 + 5 / 30) * 10) / 10);
  assert.deepEqual(SES.progreso(w, 'chest.incline_press_db').length, 1, 'cada variante lleva su progreso');
});

test('"hoy tengo X min": la misma sesión con el tiempo del día, que cabe, sin tocar el plan guardado ni el perfil', () => {
  const p = perfil();
  const guardado = { plan: REP.generarPlan(p) };
  const antes = JSON.stringify(guardado);
  const corta = SES.sesionConTiempo(p, 2, 30);
  assert.equal(corta.rutinaCorta, true); assert.equal(corta.minutosFijados, 30); assert.equal(corta.cabe, undefined);
  assert.ok(corta.minutos <= 30); assert.equal(corta.nombre, guardado.plan.sesiones[2].nombre);
  assert.ok(corta.series < guardado.plan.sesiones[2].series, 'con menos tiempo, menos series');
  assert.equal(JSON.stringify(guardado), antes, 'el plan guardado no cambia');
  assert.equal(p.tiempoPorDia, undefined, 'el perfil no cambia');
  // Con más tiempo que el del plan, la sesión puede crecer; los patrones obligatorios del tipo siguen ahí.
  const larga = SES.sesionConTiempo(p, 2, 120);
  assert.ok(larga.series >= corta.series);
  const ie = guardado.plan.sesiones.findIndex(s => s.tipo === 'Empuje');
  ['empuje_horizontal', 'empuje_vertical'].forEach(pt => assert.ok(SES.sesionConTiempo(p, ie, 30).ejercicios.some(e => e.patron === pt)));
  assert.throws(() => SES.sesionConTiempo(p, 2, 0), /inválidos/);
  assert.throws(() => SES.sesionConTiempo(p, 99, 30), /inexistente/);
  // La sesión corta también se convierte en ejercicios de sessionStore.
  const rec = SS.newSession({ profileId: 'p', sessionId: 'c', dayIndex: 2, dayName: corta.nombre, short: true, exercises: SES.ejerciciosParaSesion(corta), now: 1 });
  assert.equal(SS.isValid(rec), true);
});

test('la última vez de una variante desempata por hora cuando hay dos sesiones el mismo día', () => {
  const w = [fila('chest.bench_press_barbell', '2026-11-05', 'tarde', 'top', 1, 90, 5, 900), fila('chest.bench_press_barbell', '2026-11-05', 'manana', 'top', 1, 80, 5, 100)];
  assert.equal(SES.ultimaVez(w, 'chest.bench_press_barbell').sessionId, 'tarde');
  assert.equal(SES.ultimaVez(w.slice().reverse(), 'chest.bench_press_barbell').sessionId, 'tarde');
});

test('la rutina corta nunca pasa del tiempo fijado, en los 10 perfiles de referencia y con 20, 30 y 45 minutos', () => {
  const base = require('./fixtures/plan-identity-baseline.json').cases;
  Object.values(base).forEach(({ profile }) => [20, 30, 45].forEach(min => {
    const dias = REP.generarPlan(profile).sesiones.length;
    for (let i = 0; i < dias; i++) { const s = SES.sesionConTiempo(profile, i, min); assert.ok(s.minutos <= min, `${profile.name} día ${i + 1} con ${min} min: ${s.minutos}`); }
  }));
});
