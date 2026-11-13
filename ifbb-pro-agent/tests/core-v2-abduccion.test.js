/* Variantes de la abducción de cadera (DEC-038, B-044): el catálogo, la marca de "evidencia por verificar" y el efecto en el tope
 * por ejercicio (DEC-031). Los datos de músculos y perfil articular los fija datos.test.js; acá se prueba lo que el reparto hace con ellos. */
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/core-v2/catalogo.js');
const REP = require('../js/core-v2/registro.js') && require('../js/core-v2/reparto.js');
const REG = require('../js/core-v2/registro.js');
const PLAN = require('../js/core-v2/plan.js');
const E = require('../js/core-v2/pantallas/entreno.js');
const fx = require('./fixtures/core-v2-plan-hashes.json');

const IDS = ['glutes.hip_abduction_machine', 'glutes.hip_abduction_cable', 'glutes.hip_abduction_sidelying', 'glutes.hip_abduction_band'];
const abd = pl => pl.sesiones.flatMap(s => s.ejercicios.filter(e => e.patron === 'abduccion_cadera').map(e => ({ sesion: s.nombre, id: e.varianteId, series: e.series, marca: e.evidenciaPorVerificar })));

test('DEC-038: el patrón de abducción tiene cuatro variantes, las tres nuevas unilaterales (cuentan ambos lados en el tiempo)', () => {
  assert.deepEqual(C.variantesDePatron('abduccion_cadera').map(v => v.id).sort(), [...IDS].sort());
  IDS.slice(1).forEach(id => {
    assert.equal(C.variantePorId(id).unilateral, true, id);
    assert.equal(C.segundosPorSerie(id), 2 * C.segundosPorSerie('glutes.hip_abduction_machine'), `${id}: el doble que la máquina`);
    assert.equal(C.grupoDe(id), 'glutes');
  });
});

test('DEC-038: "evidencia por verificar" sale de los datos: solo la banda la lleva, y una fila verificada la quita sin tocar código', () => {
  assert.deepEqual(IDS.filter(C.evidenciaPorVerificar), ['glutes.hip_abduction_band']);
  // Los ejercicios que ya estaban a_verificar antes de DEC-038 también llevan la marca (una sola regla, sin lista aparte).
  ['chest.incline_press_db', 'shoulders.face_pull', 'abs.vacuum'].forEach(id => assert.ok(C.evidenciaPorVerificar(id), id));
  ['chest.bench_press_barbell', 'glutes.hip_thrust'].forEach(id => assert.ok(!C.evidenciaPorVerificar(id), id));
});

test('DEC-038: la marca mira la relación con el músculo del grupo del ejercicio, no con cualquier músculo', () => {
  const EM = require('../js/exerciseMuscles.js');
  const fila = { exerciseId: 'chest.bench_press_barbell', muscle: 'triceps', relacion: 'directa', evidencia: 'a_verificar' };
  EM.rows.push(fila);
  try {
    assert.equal(C.evidenciaPorVerificar('chest.bench_press_barbell'), false, 'una fila a_verificar de otro músculo no marca el ejercicio');
    fila.muscle = 'chest';
    assert.equal(C.evidenciaPorVerificar('chest.bench_press_barbell'), true, 'la del músculo de su grupo sí');
  } finally { EM.rows.splice(EM.rows.indexOf(fila), 1); }
});

test('DEC-038: el plan lleva la marca en cada ejercicio y la pantalla de Entreno la muestra solo donde corresponde', () => {
  const p = { sex: 'F', level: 'advanced', daysPerWeek: 4, division: 'bikini_w', goal: 'bulk', laggingMuscles: ['glutes'], tiempoDisponibleMin: 120 };
  const g = PLAN.crearPlan(p, { id: 'p1', ahora: '2026-11-13' });
  const todos = g.plan.sesiones.flatMap(s => s.ejercicios);
  todos.forEach(e => assert.equal(typeof e.evidenciaPorVerificar, 'boolean', e.varianteId));
  todos.forEach(e => assert.equal(e.evidenciaPorVerificar, C.evidenciaPorVerificar(e.varianteId), e.varianteId));
  // Se fuerza un ejercicio marcado y otro no, y la pantalla debe distinguirlos.
  const copia = JSON.parse(JSON.stringify(g)); const ej = copia.plan.sesiones[0].ejercicios;
  copia.plan.sesiones.forEach(s => s.ejercicios.forEach(e => { e.evidenciaPorVerificar = false; })); ej[0].evidenciaPorVerificar = true;
  const html = E.htmlEntreno({ datos: p, guardado: copia });
  assert.equal((html.match(/Evidencia por verificar/g) || []).length, 1);
  ej[0].evidenciaPorVerificar = false;
  assert.ok(!/Evidencia por verificar/.test(E.htmlEntreno({ datos: p, guardado: copia })));
});

test('DEC-031 + DEC-038: con variantes nuevas el excedente de la abducción pasa a otra variante del patrón; si una máquina sigue sobre el tope es porque el aviso lo dice', () => {
  const TOPE = REG.valor('MAX_SERIES_POR_EJERCICIO');
  let conExcedente = 0;
  Object.keys(fx.perfiles).forEach(k => {
    const pl = PLAN.crearPlan(fx.perfiles[k], { id: 'x', ahora: '2026-01-01' }).plan;
    const avisados = pl.avisos.topeExcedido.map(x => x.sesion + '|' + x.varianteId);
    abd(pl).forEach(e => { if (e.series > TOPE) assert.ok(avisados.includes(e.sesion + '|' + e.id), `${k} ${e.sesion}: ${e.id} lleva ${e.series} series sin aviso`); });
    if (abd(pl).some(e => e.id !== IDS[0])) conExcedente++;
  });
  assert.ok(conExcedente >= 5, 'en varios perfiles de referencia el excedente ya tiene adónde ir');
});

test('DEC-038: la banda (a_verificar) entra por necesidad en muy pocas sesiones del barrido y siempre con la marca; polea y lateral tumbado sí se usan', () => {
  // El orden por evidencia del relleno es del paso 2 de DEC-037: mientras tanto el excedente elige por uso, así que la banda puede entrar. Este test
  // fija que su aparición sea rara y visible, no que sea imposible.
  const { profiles } = require('../../scripts/perfiles-barrido.js');
  const veces = { band: 0, sidelying: 0, cable: 0 }; let sesiones = 0;
  profiles.forEach(p => [3, 4, 5, 6].forEach(d => {
    const pl = REP.generarPlan(Object.assign({}, p, { daysPerWeek: d }));
    sesiones += pl.sesiones.length;
    abd(pl).forEach(e => {
      veces[e.id.split('_').pop()] = (veces[e.id.split('_').pop()] || 0) + 1;
      assert.equal(e.marca, e.id.endsWith('band'), `${e.id}: la marca debe coincidir con los datos`);
    });
  }));
  assert.ok(veces.band <= sesiones * 0.01, `la banda aparece en ${veces.band} de ${sesiones} sesiones`);
  assert.ok(veces.cable > 0 && veces.sidelying > 0);
});
