/* EN CONSTRUCCIÓN · tests del núcleo v2, paso 3.2b: bandera salud/funcional (B-049, DEC-035). No tocan el motor actual ni la interfaz. */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/core-v2/reparto.js');
const C = require('../js/core-v2/cardio.js');
const E = require('../js/engine.js');
const CAT = require('../js/core-v2/catalogo.js');

const base = (o) => Object.assign({ sex: 'F', level: 'intermediate', daysPerWeek: 4, division: 'bikini_w', goal: 'cut', tiempoDisponibleMin: 75 }, o);
const FUNC = ['functional.bulgarian_db', 'functional.step_up', 'functional.farmer_carry'];
const funcionales = ses => ses.ejercicios.filter(e => FUNC.includes(e.varianteId));

test('sin la bandera no entra ningún funcional y el plan es el mismo que con la bandera en falso', () => {
  const a = R.generarPlan(base()), b = R.generarPlan(base({ healthGoal: false }));
  assert.deepEqual(a, b);
  a.sesiones.forEach(s => assert.equal(funcionales(s).length, 0));
  assert.deepEqual(a.avisos.funcionalesSinLugar, []);
});

test('con la bandera, cada día de cuádriceps lleva un funcional fijo; el paseo del granjero va el último día, con 2 series', () => {
  [3, 4, 5, 6].forEach(d => {
    const p = R.generarPlan(base({ daysPerWeek: d, healthGoal: true }));
    const dias = p.sesiones.filter(s => R.SPLITS[d].some(([nombre, clave]) => nombre === s.nombre && R.TIPOS[clave].grupos.includes('quads')));
    assert.ok(dias.length >= 2, `${d} días`);
    dias.forEach(s => assert.equal(funcionales(s).length, 1, `${d} días, ${s.nombre}`));
    const ultimo = dias[dias.length - 1];
    assert.equal(funcionales(ultimo)[0].varianteId, 'functional.farmer_carry');
    assert.equal(funcionales(ultimo)[0].series, 2);
    dias.slice(0, -1).forEach(s => assert.notEqual(funcionales(s)[0].varianteId, 'functional.farmer_carry'));
  });
});

test('en 3 días de cuerpo completo rotan búlgara, step-up y paseo; búlgara y step-up cuentan como volumen y el paseo no', () => {
  const p = R.generarPlan(base({ daysPerWeek: 3, healthGoal: true }));
  assert.deepEqual(p.sesiones.map(s => funcionales(s)[0].varianteId), FUNC);
  // el fraccionado de cada sesión es la suma de lo que aporta cada ejercicio según el catálogo: la búlgara y el step-up suman, el paseo no
  p.sesiones.forEach(ses => {
    const fr = {};
    ses.ejercicios.forEach(e => { const w = R.pesosDe(CAT, e.varianteId); Object.keys(w).forEach(m => { fr[m] = (fr[m] || 0) + w[m] * e.series; }); });
    Object.keys(fr).forEach(m => assert.ok(Math.abs((ses.fraccionado[m] || 0) - fr[m]) < 0.011, `${ses.nombre} ${m}`));
  });
  assert.deepEqual(R.pesosDe(CAT, 'functional.farmer_carry'), {});
  assert.ok((R.pesosDe(CAT, 'functional.bulgarian_db').quads || 0) > 0);
  assert.ok(p.sesiones[0].ejercicios.find(e => e.varianteId === 'functional.bulgarian_db').series >= 2);
});

test('DEC-005: el día de sentadilla incluye la sentadilla trasera y la búlgara, con la búlgara después', () => {
  const p = R.generarPlan(base({ healthGoal: true }));
  const dia = p.sesiones.find(s => /sentadilla/.test(s.nombre));
  const ids = dia.ejercicios.map(e => e.varianteId);
  assert.ok(ids.includes('quads.squat_back') && ids.includes('functional.bulgarian_db'));
  assert.ok(ids.indexOf('functional.bulgarian_db') > ids.indexOf('quads.squat_back'));
});

test('los funcionales no ocupan los lugares de los prioritarios: los 3 prioritarios siguen en el plan y sin aviso', () => {
  const prior = ['quads.squat_back', 'glutes.hip_thrust', 'quads.leg_press'];
  const p = R.generarPlan(base({ healthGoal: true, prioritarios: prior }));
  const q = R.generarPlan(base({ prioritarios: prior }));
  assert.deepEqual(p.avisos.prioritariosSinLugar, q.avisos.prioritariosSinLugar);
  const ids = p.sesiones.flatMap(s => s.ejercicios.map(e => e.varianteId));
  prior.forEach(id => { if (!q.avisos.prioritariosSinLugar.includes(id)) assert.ok(ids.includes(id), id); });
  assert.ok(ids.some(id => FUNC.includes(id)));
});

test('con poco tiempo el funcional no entra y el aviso lo dice, y la sesión nunca pasa de su capacidad', () => {
  const justo = R.generarPlan(base({ healthGoal: true, tiempoDisponibleMin: 10 }));
  assert.ok(justo.avisos.funcionalesSinLugar.length > 0);
  justo.avisos.funcionalesSinLugar.forEach(a => { assert.ok(FUNC.includes(a.varianteId)); assert.match(a.motivo, /tiempo|tope/); });
  justo.sesiones.forEach(s => assert.ok(s.minutos <= s.capacidadMin + 1e-9));
});

/* ---------- Cardio ---------- */

test('cardio: en definición con la bandera son 3 × 50 = 150 min (el piso de la OMS) y cumple; sin la bandera no', () => {
  const c = C.prescribirCardio(base({ healthGoal: true }));
  assert.equal(c.minutosSemana, 150); assert.equal(c.cumpleMinimoOms, true); assert.deepEqual(c.fuentes, ['ACSM_CARDIO', 'WHO_PA']);
  const s = C.prescribirCardio(base());
  assert.ok(s.minutosSemana < 150); assert.equal(s.cumpleMinimoOms, null); assert.deepEqual(s.fuentes, ['ACSM_CARDIO']);
  assert.deepEqual(C.prescribirCardio(base({ goal: 'bulk', healthGoal: true })).fuentes, []);
});

test('hasta el corte: el cardio de core-v2 es idéntico al del motor actual en todos los objetivos, niveles y con/sin bandera', () => {
  ['cut', 'maintain', 'bulk'].forEach(goal => ['beginner', 'intermediate', 'advanced'].forEach(level => [false, true].forEach(healthGoal => {
    const perfil = { name: 'T', sex: 'M', age: 30, heightCm: 178, weightKg: 85, level, daysPerWeek: 4, division: 'general_m', goal, healthGoal };
    const v = E.buildPlan(perfil, '2026-11-08').training.cardio;
    const n = C.prescribirCardio(perfil);
    assert.deepEqual([n.sesiones, n.minutos, n.tipo, n.regla], [v.sessions, v.minutes, v.type, v.rule], `${goal}/${level}/${healthGoal}`);
  })));
});
