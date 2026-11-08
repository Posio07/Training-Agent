/* EN CONSTRUCCIÓN · tests del núcleo v2, paso 3.5: números de intensidad, progresión y descarga en el registro (B-039). */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../js/core-v2/textos.js');
const R = require('../js/core-v2/registro.js');
const K = require('../js/knowledge.js');
const E = require('../js/engine.js');

test('hasta el corte: los tres textos armados desde el registro son idénticos a los del motor actual', () => {
  const t = E.buildPlan({ name: 'T', sex: 'M', age: 30, heightCm: 178, weightKg: 85, level: 'intermediate', daysPerWeek: 4, division: 'general_m', goal: 'bulk' }, '2026-11-08').training;
  assert.equal(T.intensidad(), t.intensity);
  assert.equal(T.progresion(), t.progression);
  assert.equal(T.descarga(), t.deload);
});

test('cada número de los textos es una regla del registro: E4, con fuente, DEC-033 y estado implementada', () => {
  T.IDS.forEach(id => {
    const r = R.regla(id);
    assert.equal(r.nivel, 'E4', id); assert.equal(r.dec, 'DEC-033', id); assert.equal(r.estado, 'implementada', id);
    assert.ok(r.fuente.length > 20, `${id}: sin fuente`); assert.equal(r.paso, 'fuera', id);
  });
  assert.equal(T.IDS.length, 11);
});

test('los valores son los del motor actual (se registran tal cual; los cambios son de nivel 2)', () => {
  const v = id => R.valor(id);
  assert.deepEqual(v('INTENSIDAD_REPETICIONES_PRINCIPAL'), [6, 12]); assert.deepEqual(v('INTENSIDAD_PORCENTAJE_1RM'), [70, 80]); assert.deepEqual(v('INTENSIDAD_RIR'), [1, 3]);
  assert.equal(v('INTENSIDAD_REPETICIONES_MAX_AISLAMIENTO'), 15);
  assert.deepEqual(v('PROGRESION_CARGA_TREN_SUPERIOR'), [2, 5]); assert.deepEqual(v('PROGRESION_CARGA_TREN_INFERIOR'), [5, 10]); assert.equal(v('PROGRESION_DOBLE'), true);
  assert.deepEqual(v('DESCARGA_INTERVALO_SEMANAS'), [4, 6]); assert.equal(v('DESCARGA_CAIDAS_DE_RENDIMIENTO_SESIONES'), 2);
  assert.equal(v('DESCARGA_REDUCCION_VOLUMEN_PORCENTAJE'), 50); assert.equal(v('DESCARGA_DURACION_SEMANAS'), 1);
});

test('los textos siguen al registro: cambiar un valor cambia el texto, sin números escritos en textos.js', () => {
  const r = R.regla('INTENSIDAD_RIR'), original = r.valor;
  try { r.valor = [2, 3]; assert.match(T.intensidad(), /a 2-3 repeticiones del fallo/); } finally { r.valor = original; }
  const d = R.regla('DESCARGA_REDUCCION_VOLUMEN_PORCENTAJE'), dOrig = d.valor, w = R.regla('DESCARGA_DURACION_SEMANAS'), wOrig = w.valor;
  try { d.valor = 40; w.valor = 2; assert.match(T.descarga(), /reduce el volumen al 40 % durante 2 semanas/); } finally { d.valor = dOrig; w.valor = wOrig; }
  const p = R.regla('PROGRESION_DOBLE'), pOrig = p.valor;
  try { p.valor = false; assert.doesNotMatch(T.progresion(), /Doble progresión/); } finally { p.valor = pOrig; }
});

test('las fuentes de los textos son ids de KNOWLEDGE.SOURCES y salen solo de las reglas activas', () => {
  const f = T.fuentesDeTextos({ goal: 'bulk' });
  assert.deepEqual(f, ['ACSM_RT', 'HELMS_TRAIN']);
  f.forEach(id => assert.ok(K.SOURCES[id], id));
  // Si ninguna regla activa respalda una fuente, no aparece: se simula desactivando las reglas con una condición que el perfil no cumple.
  const guardado = T.IDS.map(id => [R.regla(id), R.regla(id).cuando]);
  try { guardado.forEach(([r]) => { r.cuando = { goal: 'nunca' }; }); assert.deepEqual(T.fuentesDeTextos({ goal: 'bulk' }), []); } finally { guardado.forEach(([r, c]) => { r.cuando = c; }); }
});
