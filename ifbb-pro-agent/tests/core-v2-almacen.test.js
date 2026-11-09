/* Tests del núcleo v2, paso 3.9: el almacenamiento definitivo (core-v2/almacen.js). El recorrido con recarga está en tests/e2e-pantallas.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../js/core-v2/almacen.js');
const PLAN = require('../js/core-v2/plan.js');
const E = require('../js/engine.js');
const SS = require('../js/sessionStore.js');

// El estado vacío: lo que devuelve `cargar` sobre un almacenamiento vacío (B-057: `estadoVacio` se borró en el corte).
const VACIO = () => A.cargar({ getItem: () => null, setItem: () => {} });
const datos = { name: 'Ana', sex: 'F', age: 30, heightCm: 165, weightKg: 60, bodyFatPct: 0, level: 'intermediate', daysPerWeek: 4, division: 'bikini_w', goal: 'cut', activity: 'moderate', healthGoal: false, barbellRow: false, laggingMuscles: [] };
const opciones = { id: 'p1', planId: 'pl1', ahora: '2026-11-09' };
const memoria = () => { const m = {}; return { m, getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };

test('un perfil nuevo trae la forma definitiva: datos, medición inicial, series, sesiones, banderas de dolor y plan guardado', () => {
  const p = A.crearPerfil(datos, opciones);
  assert.deepEqual(Object.keys(p).sort(), ['createdAt', 'data', 'id', 'log', 'painFlags', 'planGuardado', 'sessions', 'updatedAt', 'workouts']);
  assert.equal(p.createdAt, '2026-11-09'); assert.deepEqual(p.workouts, []); assert.deepEqual(p.painFlags, {});
  assert.deepEqual(p.log, [{ date: '2026-11-09', weightKg: 60, bodyFatPct: null, waistCm: null, neckCm: null, hipCm: null, notes: 'Datos iniciales' }]);
  assert.equal(p.planGuardado.id, 'pl1'); assert.equal(p.planGuardado.plan.sesiones.length, 4);
  assert.throws(() => A.crearPerfil(datos, { id: 'x' }), /id/);
});

test('guardar y cargar devuelven el mismo estado, en la clave definitiva (distinta de la de la app actual)', () => {
  const st = memoria(), e = A.cargar(memoria());
  e.profiles.push(A.crearPerfil(datos, opciones)); e.activeId = 'p1';
  assert.equal(A.guardar(st, e), true);
  assert.deepEqual(Object.keys(st.m), ['ifbb-agent:v2']); assert.notEqual(A.CLAVE, 'ifbb-agent:v1');
  const r = A.cargar(st);
  assert.deepEqual(r.profiles, e.profiles); assert.equal(r.activeId, 'p1'); assert.equal(A.activo(r).id, 'p1');
  assert.equal(A.guardar(st, e, 'otra'), true); assert.ok('otra' in st.m); assert.equal(A.cargar(st, 'otra').profiles.length, 1);
});

test('sin migraciones: lo ilegible, de otra versión o de la clave vieja se ignora y se empieza vacío', () => {
  const st = memoria();
  assert.deepEqual(A.cargar(st), VACIO());
  st.m['ifbb-agent:v2'] = '{no es json'; assert.deepEqual(A.cargar(st), VACIO());
  st.m['ifbb-agent:v2'] = JSON.stringify({ version: 1, profiles: [{ id: 'x', data: {} }] }); assert.deepEqual(A.cargar(st), VACIO());
  st.m['ifbb-agent:v2'] = JSON.stringify({ profiles: 'no' }); assert.deepEqual(A.cargar(st), VACIO());
  const viejo = memoria(); viejo.m['ifbb-agent:v1'] = JSON.stringify({ profiles: [{ id: 'v', data: datos }], activeId: 'v' });
  assert.deepEqual(A.cargar(viejo), VACIO(), 'los datos de la clave vieja no se leen');
  assert.ok(!A.guardar({ getItem: () => null, setItem: () => { throw new Error('lleno'); } }, VACIO()), 'guardar avisa si no se puede');
  assert.deepEqual(A.cargar({ getItem: () => { throw new Error('bloqueado'); } }), VACIO());
});

test('un perfil sin id o sin datos se descarta; lo que falta se completa; una activa inexistente cae en el primero', () => {
  const st = memoria();
  st.m['ifbb-agent:v2'] = JSON.stringify({ version: 2, activeId: 'nada', profiles: [{ id: 'a', data: datos }, { data: datos }, { id: 'b' }, null, { id: 'c', data: datos, workouts: 'mal', painFlags: [] }] });
  const r = A.cargar(st);
  assert.deepEqual(r.profiles.map(p => p.id), ['a', 'c']); assert.equal(r.activeId, 'a');
  r.profiles.forEach(p => { assert.ok(Array.isArray(p.log) && Array.isArray(p.workouts) && Array.isArray(p.sessions) && p.planGuardado === null); assert.equal(typeof p.painFlags, 'object'); });
  assert.deepEqual(r.profiles[1].workouts, []);
});

test('un plan guardado inválido se descarta al leer y se regenera con asegurarPlan; uno válido se conserva', () => {
  const st = memoria(), e = A.cargar(memoria());
  e.profiles.push(A.crearPerfil(datos, opciones), Object.assign(A.crearPerfil(datos, { id: 'p2', planId: 'pl2', ahora: '2026-11-09' }), { planGuardado: { id: 'roto' } }));
  A.guardar(st, e);
  const r = A.cargar(st);
  assert.equal(r.profiles[0].planGuardado.id, 'pl1'); assert.equal(r.profiles[1].planGuardado, null);
  assert.equal(A.asegurarPlan(r.profiles[0], { planId: 'nuevo', ahora: '2026-11-10' }), false);
  assert.equal(A.asegurarPlan(r.profiles[1], { planId: 'nuevo', ahora: '2026-11-10' }), true);
  assert.equal(r.profiles[1].planGuardado.id, 'nuevo'); assert.ok(PLAN.leerPlanGuardado(r.profiles[1].planGuardado));
});

test('actualizar los datos regenera el plan solo si cambió algo que lo define, y siempre anota la fecha', () => {
  const p = A.crearPerfil(datos, opciones);
  assert.equal(A.actualizarDatos(p, Object.assign({}, datos, { name: 'Otro', weightKg: 61 }), { planId: 'n1', ahora: '2026-11-10' }), false);
  assert.equal(p.planGuardado.id, 'pl1'); assert.equal(p.updatedAt, '2026-11-10'); assert.equal(p.data.name, 'Otro');
  assert.equal(A.actualizarDatos(p, Object.assign({}, datos, { daysPerWeek: 5 }), { planId: 'n2', ahora: '2026-11-11' }), true);
  assert.equal(p.planGuardado.id, 'n2'); assert.equal(p.planGuardado.plan.sesiones.length, 5); assert.deepEqual(p.planGuardado.aceptaciones, []);
});

test('privacidad (DEC-009): el export del motor sigue excluyendo las banderas de dolor y los datos de salud del perfil definitivo', () => {
  const p = A.crearPerfil(Object.assign({}, datos, { health: { screening: { symptoms: true }, diabetes: { type: 'none' }, injuries: [{ zone: 'knee' }] } }), opciones);
  p.painFlags = { lumbar: { marcada: true } };
  p.workouts = [{ exerciseId: 'quads.squat_back', pain: 8, weight: 100, reps: 5 }];
  const out = E.exportProfile(p);
  assert.ok(!('painFlags' in out)); assert.ok(!('health' in out.data));
  assert.ok(out.workouts.every(w => !('pain' in w)));
});

test('la sesión en curso sigue en su propia clave de sessionStore, distinta de la del estado', () => {
  assert.notEqual(SS.STORAGE_KEY, A.CLAVE);
  const st = memoria(); A.guardar(st, VACIO());
  assert.equal(SS.loadActive(st), null);
});

test('el guardador avisa si el almacenamiento está lleno o bloqueado y no avisa si todo va bien', () => {
  const avisos = [], estado = A.cargar(memoria());
  const lleno = A.guardador({ getItem: () => null, setItem: () => { throw new Error('lleno'); } }, estado, m => avisos.push(m));
  assert.equal(lleno(), false); assert.equal(avisos.length, 1); assert.match(avisos[0], /No se pudo guardar/);
  const bien = A.guardador(memoria(), estado, m => avisos.push(m));
  assert.equal(bien(), true); assert.equal(avisos.length, 1);
});

test('privacidad (DEC-009): el export no lleva el plan guardado, que trae las lesiones declaradas', () => {
  const p = A.crearPerfil(Object.assign({}, datos, { injuryZones: ['knee'], injuryDiagnosed: [], injuryPainNow: [] }), opciones);
  assert.ok(p.planGuardado.plan.perfil.zonas.includes('knee'), 'el plan guardado sí lleva la lesión');
  const out = E.exportProfile(p);
  assert.ok(!('planGuardado' in out));
  const texto = JSON.stringify(out);
  assert.ok(!/"zonas"|"lesiones"/.test(texto), 'ni zonas ni lesiones en el export');
});
