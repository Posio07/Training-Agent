/* Tests del corte (B-039, paso 3.9): los que conservaban la intención de un test del motor viejo y había que reescribir
 * contra el núcleo nuevo. Cada uno dice de qué fila de `docs/research/inventario-generador.md` (sección 6, grupo B)
 * viene. El resto de las filas del grupo B ya las cubren otros archivos; el PR del corte lo detalla. */
const test = require('node:test');
const assert = require('node:assert/strict');
const CAT = require('../js/core-v2/catalogo.js');
const REG = require('../js/core-v2/registro.js');
const REP = require('../js/core-v2/reparto.js');
const PLAN = require('../js/core-v2/plan.js');
const HUELLAS = require('./fixtures/core-v2-plan-hashes.json');

const pesos = id => REP.pesosDe(CAT, id);
// Series fraccionadas por músculo de una lista de [varianteId, series].
const fraccionado = lista => lista.reduce((acc, [id, series]) => {
  Object.entries(pesos(id)).forEach(([m, w]) => { acc[m] = (acc[m] || 0) + w * series; });
  return acc;
}, {});
const variantesDe = base => CAT.VARIANTES.filter(v => v.hereda === base).map(v => v.id);
const una = base => variantesDe(base)[0];
const planDe = datos => REP.generarPlan(datos);
const redondo = v => Math.round(v * 100) / 100;
const { profiles: PERFILES } = require('../../scripts/perfiles-barrido.js');

/* ---------- B 85 · el músculo y los aportes del plan salen de los datos v2 ---------- */

test('B-039 (B85): el aporte de cada variante sale del CSV (directa 1, indirecta 0,5, ninguna y a_verificar 0) y el grupo donde se programa cuenta siempre 1', () => {
  CAT.VARIANTES.forEach(v => {
    const esperado = {};
    CAT.aportesDe(v.id).forEach(r => {
      if (r.evidencia === 'a_verificar') return;
      const w = r.relacion === 'directa' ? 1 : r.relacion === 'indirecta' ? 0.5 : 0;
      if (w > 0) esperado[r.muscle] = w;
    });
    // DEC-016: el grupo donde se programa el ejercicio cuenta siempre como directo, sea cual sea su evidencia.
    if (!v.sinAporte) esperado[CAT.grupoDe(v.id)] = 1;
    assert.deepEqual(pesos(v.id), esperado, `${v.id}: aportes`);
    // Nunca un peso a medida por ejercicio.
    Object.values(pesos(v.id)).forEach(w => assert.ok([0.5, 1].includes(w), `${v.id}: peso a medida ${w}`));
  });
  // El hip thrust solo aporta a glúteos; la búlgara de glúteo se programa en glúteo y es directa de cuádriceps.
  assert.deepEqual(pesos(una('glutes.hip_thrust')), { glutes: 1 });
  assert.equal(CAT.grupoDe(una('glutes.bulgarian_hip')), 'glutes');
  assert.deepEqual(pesos(una('glutes.bulgarian_hip')), { glutes: 1, quads: 1 });
});

/* ---------- B 86 · el conteo fraccionado es una convención global del registro ---------- */

test('B-039 (B86): el conteo fraccionado usa directa = 1, indirecta = 0,5 y ninguna / a_verificar = 0, y los tres números viven en el registro', () => {
  assert.equal(REG.valor('PESO_SERIE_DIRECTA'), 1);
  assert.equal(REG.valor('PESO_SERIE_INDIRECTA'), 0.5);
  assert.equal(REG.valor('PESO_SIN_RELACION'), 0);
  const indirecta = REG.REGLAS.find(r => r.id === 'PESO_SERIE_INDIRECTA');
  assert.equal(indirecta.nivel, 'E4', 'el 0,5 es criterio de diseño, no un dato medido');
  assert.match(indirecta.fuente, /convención del modelo de mejor ajuste/);
  // 4 series de prensa: cuádriceps directa (4), glúteo indirecta (2). 3 de hip thrust: glúteo 3, isquios 0 (ninguna).
  assert.deepEqual(fraccionado([[una('quads.leg_press'), 4], [una('glutes.hip_thrust'), 3]]), { quads: 4, glutes: 5 });
  // a_verificar cuenta 0 en las relaciones que NO son el grupo del ejercicio: el deltoides del press inclinado.
  const inclinado = una('chest.incline_press_db');
  assert.equal(CAT.aportesDe(inclinado).find(r => r.muscle === 'shoulders').evidencia, 'a_verificar');
  assert.equal(fraccionado([[inclinado, 4]]).shoulders, undefined);
  // DEC-016: el pectoral del press inclinado también está a_verificar, pero es su grupo: suma 1 por serie.
  assert.equal(CAT.aportesDe(inclinado).find(r => r.muscle === 'chest').evidencia, 'a_verificar');
  assert.equal(fraccionado([[inclinado, 4]]).chest, 4);
  // El paseo del granjero no suma a nadie.
  assert.deepEqual(fraccionado([[una('functional.farmer_carry'), 2]]), {});
});

/* ---------- B 89 y B 90 · la búlgara de glúteo y el hip thrust ----------
 * Los dos tests del motor viejo comprobaban el conteo de estos dos ejercicios DENTRO de un plan generado. En el núcleo
 * nuevo ninguno de los dos llega a entrar en el barrido de 360 planes: el hip thrust pierde siempre contra la abducción
 * de cadera por "necesidad por minuto" (B-042, punto 6; decidido por Emanuel: quien lo quiera lo marca como
 * prioritario) y la búlgara de glúteo compite con la sentadilla y la zancada del mismo patrón. Así que la intención se
 * conserva en dos partes: el aporte de cada uno (que es lo que se medía) y la comprobación, sobre el barrido completo,
 * de que las series fraccionadas de una sesión son exactamente la suma de los aportes de sus ejercicios, sin que
 * ningún paso del reparto agregue o compense volumen por su cuenta. */

test('B-039 (B89): la búlgara de glúteo se programa en glúteo y suma 1 a glúteo y 1 a cuádriceps', () => {
  const bulgara = una('glutes.bulgarian_hip');
  assert.equal(CAT.grupoDe(bulgara), 'glutes', 'se programa en glúteo aunque sea directa de cuádriceps');
  assert.deepEqual(fraccionado([[bulgara, 4]]), { glutes: 4, quads: 4 });
  // Su patrón (zancada) no es obligatorio de ningún tipo de sesión, así que hoy no entra en el barrido ni como
  // prioritario: el aviso único lo dice (B-060).
  const pl = planDe({ sex: 'F', level: 'advanced', daysPerWeek: 4, division: 'bikini_w', goal: 'bulk', laggingMuscles: ['glutes'], prioritarios: [bulgara] });
  assert.ok(!pl.sesiones.some(s => s.ejercicios.some(e => e.varianteId === bulgara)));
  assert.deepEqual(pl.avisos.prioritariosSinLugar, [bulgara], 'un prioritario sin lugar se avisa, no se pierde en silencio');
});

test('B-039 (B90): con isquios en "ninguna", el hip thrust no suma isquios', () => {
  const hip = una('glutes.hip_thrust');
  assert.equal(CAT.aportesDe(hip).find(r => r.muscle === 'hamstrings').relacion, 'ninguna');
  assert.equal(fraccionado([[hip, 4]]).hamstrings, undefined);
  assert.deepEqual(fraccionado([[hip, 4]]), { glutes: 4 }, 'el hip thrust solo aporta a glúteos');
});

test('B-039 (B89/B90): en los 360 planes del barrido, las series fraccionadas de cada sesión son exactamente la suma de los aportes de sus ejercicios', () => {
  let sesiones = 0;
  PERFILES.forEach(d => [3, 4, 5, 6].forEach(dias => {
    planDe(Object.assign({}, d, { daysPerWeek: dias })).sesiones.forEach(s => {
      sesiones++;
      const esperado = fraccionado(s.ejercicios.map(e => [e.varianteId, e.series]));
      const visto = Object.keys(s.fraccionado).filter(m => s.fraccionado[m] > 0);
      assert.deepEqual(visto.slice().sort(), Object.keys(esperado).sort(), `${s.nombre}: músculos contados`);
      visto.forEach(m => assert.equal(redondo(s.fraccionado[m]), redondo(esperado[m]), `${s.nombre} / ${m}`));
    });
  }));
  assert.equal(sesiones, 1620, 'el barrido son 90 perfiles × (3 + 4 + 5 + 6) sesiones');
});

/* ---------- B 111 · el pecho cuenta el press inclinado en un plan real ---------- */

test('B-039 (B111): en los perfiles de referencia el pecho cuenta el press inclinado, 1 serie fraccionada por serie', () => {
  const inclinadas = variantesDe('chest.incline_press_db');
  let encontrado = 0;
  Object.entries(HUELLAS.perfiles).forEach(([clave, datos]) => {
    const g = PLAN.crearPlan(datos, { id: 'p-' + clave, ahora: '2026-11-09' });
    g.plan.sesiones.forEach(s => {
      const mias = s.ejercicios.filter(e => inclinadas.includes(e.varianteId));
      if (!mias.length) return;
      encontrado++;
      const series = mias.reduce((a, e) => a + e.series, 0);
      const sinInclinado = fraccionado(s.ejercicios.filter(e => !inclinadas.includes(e.varianteId)).map(e => [e.varianteId, e.series]));
      assert.equal(Math.round((s.fraccionado.chest || 0) * 100) / 100, Math.round(((sinInclinado.chest || 0) + series) * 100) / 100,
        `${clave} ${s.nombre}: el press inclinado suma 1 por serie al pecho`);
    });
  });
  assert.ok(encontrado >= 3, `el press inclinado tiene que aparecer en varias sesiones de referencia (aparece en ${encontrado})`);
});
