/* Tests del núcleo v2, paso 3.5: números de intensidad, progresión y descarga en el registro (B-039). */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../js/core-v2/textos.js');
const R = require('../js/core-v2/registro.js');
const K = require('../js/knowledge.js');
// Las reglas que arman los tres textos: las de DEC-033 (B-057: la lista `IDS` de textos.js se borró en el corte).
const IDS = () => R.REGLAS.filter(r => r.dec === 'DEC-033').map(r => r.id);

test('los tres textos armados desde el registro son los que mostraba el motor viejo, palabra por palabra (el corte no cambió lo que lee el usuario)', () => {
  assert.equal(T.intensidad(), 'La mayoría de series en 6-12 repeticiones al 70-80 % del 1RM, terminando a 1-3 repeticiones del fallo (RIR). Aislamientos hasta 15 repeticiones.');
  assert.equal(T.progresion(), 'Doble progresión: cuando completes el rango alto de repeticiones en todas las series con buena técnica, sube la carga 2-5 % (tren superior) o 5-10 % (tren inferior) y vuelve al rango bajo.');
  assert.equal(T.descarga(), 'Cada 4-6 semanas, o cuando el rendimiento caiga 2 sesiones seguidas, reduce el volumen a la mitad durante una semana manteniendo la carga.');
});

test('cada número de los textos es una regla del registro: E4, con fuente, DEC-033 y estado implementada', () => {
  IDS().forEach(id => {
    const r = R.regla(id);
    assert.equal(r.nivel, 'E4', id); assert.equal(r.dec, 'DEC-033', id); assert.equal(r.estado, 'implementada', id);
    assert.ok(r.fuente.length > 20, `${id}: sin fuente`); assert.equal(r.paso, 'fuera', id);
  });
  assert.equal(IDS().length, 11);
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
  const guardado = IDS().map(id => [R.regla(id), R.regla(id).cuando]);
  try { guardado.forEach(([r]) => { r.cuando = { goal: 'nunca' }; }); assert.deepEqual(T.fuentesDeTextos({ goal: 'bulk' }), []); } finally { guardado.forEach(([r, c]) => { r.cuando = c; }); }
});

test('cada valor del registro llega a su texto: cambiar cualquiera cambia algún texto (nada escrito a mano en textos.js)', () => {
  const textos = () => [T.intensidad(), T.progresion(), T.descarga()].join('|');
  const base = textos();
  IDS().forEach(id => {
    const r = R.regla(id), original = r.valor;
    if (typeof original === 'boolean') return; // PROGRESION_DOBLE se prueba aparte
    try {
      r.valor = Array.isArray(original) ? original.map(x => x + 3) : original + 3;
      assert.notEqual(textos(), base, `${id}: el texto no cambió`);
    } finally { r.valor = original; }
  });
  assert.equal(textos(), base);
});
