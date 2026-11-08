/* EN CONSTRUCCIÓN · tests del núcleo v2, paso 3.1: plan guardado (B-039). No tocan el motor actual ni la interfaz. */
const test = require('node:test');
const assert = require('node:assert/strict');
const PLAN = require('../js/core-v2/plan.js');
const SNAP = require('../../scripts/snapshot-core-v2.js');
const fixture = require('./fixtures/core-v2-plan-hashes.json');

const perfil = () => ({ name: 'Ana', sex: 'F', level: 'intermediate', daysPerWeek: 4, division: 'bikini_w', goal: 'cut', laggingMuscles: ['glutes'], weightKg: 60 });
const nuevo = (p, id) => PLAN.crearPlan(p || perfil(), { id: id || 'plan-1', ahora: '2026-11-08' });

test('el plan guardado lleva id, fecha, versión del motor, firma, plan y aceptaciones vacías', () => {
  const g = nuevo();
  assert.equal(g.id, 'plan-1'); assert.equal(g.creadoEn, '2026-11-08'); assert.equal(g.versionMotor, PLAN.VERSION_MOTOR);
  assert.equal(g.plan.sesiones.length, 4); assert.deepEqual(g.aceptaciones, []);
  assert.throws(() => PLAN.crearPlan(perfil(), {}), /id/);
});

test('un plan al día no se regenera: nada cambió, ni el nombre ni el peso (no son disparadores)', () => {
  const g = nuevo();
  assert.deepEqual(PLAN.estadoDelPlan(g, perfil()), { regenerar: false, motivos: [], versionNueva: false });
  const otro = Object.assign(perfil(), { name: 'Otra', weightKg: 99, age: 40 });
  assert.equal(PLAN.estadoDelPlan(g, otro).regenerar, false);
});

test('cada campo de la spec regenera el plan por sí solo, y dice cuál fue', () => {
  const g = nuevo();
  const cambios = {
    tiempo: { tiempoDisponibleMin: 50 },
    dias: { daysPerWeek: 5 },
    objetivo: { goal: 'bulk' },
    nivel: { level: 'advanced' },
    division: { division: 'wellness_w' },
    rezagados: { laggingMuscles: ['glutes', 'back'] },
    prioritarios: { prioritarios: ['glutes.hip_thrust'] },
    lesiones: { injuryZones: ['knee'] },
    remoConBarra: { barbellRow: true },
    banderaSalud: { healthGoal: true },
  };
  assert.deepEqual(Object.keys(cambios).sort(), [...PLAN.CAMPOS].sort(), 'cada campo del módulo tiene su caso');
  Object.entries(cambios).forEach(([campo, delta]) => {
    const e = PLAN.estadoDelPlan(g, Object.assign(perfil(), delta));
    assert.equal(e.regenerar, true, campo);
    assert.deepEqual(e.motivos, [campo], `${campo}: motivos ${e.motivos}`);
  });
});

test('el tiempo por día también regenera, y el cambio de un solo día se refleja en la capacidad de esa sesión', () => {
  const g = nuevo(Object.assign(perfil(), { tiempoDisponibleMin: 60, tiempoPorDia: { 2: 40 } }));
  assert.deepEqual(g.firma.tiempo, { general: 60, porDia: { 2: 40 } });
  assert.deepEqual(g.plan.sesiones.map(s => s.capacidadMin), [60, 60, 40, 60]);
  const e = PLAN.estadoDelPlan(g, Object.assign(perfil(), { tiempoDisponibleMin: 60, tiempoPorDia: { 2: 45 } }));
  assert.deepEqual(e.motivos, ['tiempo']);
});

test('orden de los rezagados y de las lesiones no regenera; el orden de los prioritarios sí (el primero gana)', () => {
  const g = nuevo(Object.assign(perfil(), { laggingMuscles: ['glutes', 'back'], injuryZones: ['knee', 'hip'] }));
  assert.equal(PLAN.estadoDelPlan(g, Object.assign(perfil(), { laggingMuscles: ['back', 'glutes'], injuryZones: ['hip', 'knee'] })).regenerar, false);
  const p = nuevo(Object.assign(perfil(), { prioritarios: ['back.pull_up', 'back.lat_pulldown'] }));
  assert.equal(PLAN.estadoDelPlan(p, Object.assign(perfil(), { prioritarios: ['back.lat_pulldown', 'back.pull_up'] })).regenerar, true);
});

test('regenerar da un plan nuevo con id nuevo y sin aceptaciones', () => {
  let g = PLAN.aceptarSesion(nuevo(), 1, '2026-11-08');
  assert.equal(g.aceptaciones.length, 1);
  const r = PLAN.regenerar(perfil(), { id: 'plan-2', ahora: '2026-11-09' });
  assert.equal(r.id, 'plan-2'); assert.deepEqual(r.aceptaciones, []); assert.equal(r.creadoEn, '2026-11-09');
});

test('una versión nueva del motor avisa pero NO regenera sola', () => {
  const g = Object.assign(nuevo(), { versionMotor: 'core-v2.0' });
  const e = PLAN.estadoDelPlan(g, perfil());
  assert.equal(e.versionNueva, true); assert.equal(e.regenerar, false);
  assert.deepEqual(PLAN.estadoDelPlan(null, perfil()), { regenerar: true, motivos: ['sin plan'], versionNueva: false });
});

test('la aceptación es de una sesión concreta de un plan concreto: se guarda en el plan, sin mutar el original', () => {
  const g = nuevo();
  const a = PLAN.aceptarSesion(g, 2, '2026-11-08');
  assert.deepEqual(g.aceptaciones, [], 'no muta');
  assert.equal(a.aceptaciones.length, 1);
  assert.equal(a.aceptaciones[0].sesion, 2); assert.equal(a.aceptaciones[0].planId, 'plan-1'); assert.equal(a.aceptaciones[0].nombre, g.plan.sesiones[2].nombre);
  assert.equal(PLAN.aceptacionVigente(a, perfil(), 2), true);
  assert.equal(PLAN.aceptacionVigente(a, perfil(), 1), false, 'otra sesión no está aceptada');
  assert.throws(() => PLAN.aceptarSesion(g, 9, 'x'), /inexistente/);
  assert.equal(PLAN.aceptarSesion(a, 2, '2026-11-10').aceptaciones.length, 1, 'aceptar dos veces la misma sesión no duplica');
});

test('la aceptación caduca al cambiar el tiempo, los días o el objetivo, pero no al cambiar otro campo', () => {
  const a = PLAN.aceptarSesion(nuevo(), 0, '2026-11-08');
  assert.equal(PLAN.aceptacionVigente(a, perfil(), 0), true);
  assert.equal(PLAN.aceptacionVigente(a, Object.assign(perfil(), { tiempoDisponibleMin: 50 }), 0), false, 'tiempo');
  assert.equal(PLAN.aceptacionVigente(a, Object.assign(perfil(), { daysPerWeek: 5 }), 0), false, 'días');
  assert.equal(PLAN.aceptacionVigente(a, Object.assign(perfil(), { goal: 'bulk' }), 0), false, 'objetivo');
  assert.equal(PLAN.aceptacionVigente(a, Object.assign(perfil(), { level: 'advanced' }), 0), true, 'el nivel no la caduca (sí regenera el plan, y con él se va la aceptación)');
  assert.equal(PLAN.aceptacionVigente(null, perfil(), 0), false);
  // Una aceptación de otro plan (otro id) no vale.
  assert.equal(PLAN.aceptacionVigente(Object.assign({}, a, { id: 'plan-9' }), perfil(), 0), false);
});

test('leerPlanGuardado descarta lo mal formado (sin migraciones, DEC-023)', () => {
  const g = nuevo();
  assert.equal(PLAN.leerPlanGuardado(g), g);
  [null, undefined, {}, { id: 'x' }, Object.assign({}, g, { plan: null }), Object.assign({}, g, { aceptaciones: null }), Object.assign({}, g, { id: '' })].forEach(x => assert.equal(PLAN.leerPlanGuardado(x), null));
  assert.equal(PLAN.leerPlanGuardado(JSON.parse(JSON.stringify(g))).id, 'plan-1', 'sobrevive a JSON (almacenamiento)');
});

test('la huella de 10 perfiles de referencia está al día: si la salida de core-v2 cambia, hay que subir VERSION_MOTOR y regenerar', () => {
  const ahora = SNAP.calcular();
  assert.equal(fixture.versionMotor, PLAN.VERSION_MOTOR);
  assert.deepEqual(ahora.cases, fixture.cases, 'cambió la salida del plan: sube VERSION_MOTOR y corre node scripts/snapshot-core-v2.js');
  assert.equal(Object.keys(fixture.cases).length, 10);
});
