/* EN CONSTRUCCIÓN · tests del núcleo v2: aviso de frecuencia mínima de los grupos mayores (DEC-036). Es un aviso dentro del aviso único, no una restricción. */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/core-v2/reparto.js');
const A = require('../js/core-v2/aviso.js');
const PLAN = require('../js/core-v2/plan.js');
const REG = require('../js/core-v2/registro.js');

const base = { sex: 'M', level: 'novice', daysPerWeek: 3, division: 'physique_m', goal: 'cut' }; // isquiotibiales solo entrena 1 día
const holgado = { sex: 'F', level: 'novice', daysPerWeek: 3, division: 'bikini_w', goal: 'maintain', tiempoDisponibleMin: 120 };

test('un grupo mayor que entrena menos días que el mínimo va al aviso único, con sus sesiones; los que llegan al mínimo no', () => {
  const p = R.generarPlan(base), minimo = REG.valor('FRECUENCIA_MINIMA_GRUPOS_MAYORES');
  assert.deepEqual(p.avisoUnico.frecuenciaBaja, [{ musculo: 'hamstrings', sesiones: 1, minimo }]);
  R.GRUPOS_MAYORES.forEach(m => assert.equal(p.avisoUnico.frecuenciaBaja.some(x => x.musculo === m), p.semanal[m].sesiones < minimo, m));
  assert.equal(R.generarPlan(holgado).avisoUnico, null, 'sin falta de nada y con la frecuencia bien, no hay aviso');
});

test('es un aviso, no una restricción: el plan es el mismo reparto (no fuerza ninguna sesión extra del grupo)', () => {
  const p = R.generarPlan(base);
  assert.equal(p.semanal.hamstrings.sesiones, 1);
  assert.ok(p.sesiones.every(s => s.minutos <= s.capacidadMin + 1e-9));
});

test('el aviso único lo dice en lenguaje simple, se puede aceptar y no ofrece más tiempo si solo es la frecuencia', () => {
  const g = PLAN.crearPlan(base, { id: 'a', ahora: '2026-11-09' }), av = A.construirAviso(g.plan);
  assert.equal(av.hay, true);
  assert.ok(av.lineas.some(l => /Isquiotibiales: se entrena 1 día por semana y lo recomendado es al menos 2/.test(l)));
  assert.ok(av.sesionesAfectadas.length > 0);
  assert.equal(av.salidas.find(s => s.id === 'mas-tiempo').disponible, false);
  assert.equal(av.salidas.find(s => s.id === 'mas-dias').disponible, true);
  assert.equal(av.soloR1, false);
  const r = A.aplicarSalida(av.salidas.find(s => s.id === 'aceptar'), base, g, { ahora: '2026-11-09' });
  assert.equal(A.avisoPendiente(av, base, r.planGuardado).hay, false, 'aceptadas las sesiones, el aviso deja de pedirse');
});

test('más días resuelve el aviso: con un día más, isquiotibiales llega al mínimo', () => {
  const cuatro = R.generarPlan(Object.assign({}, base, { daysPerWeek: 4 }));
  assert.ok(!(cuatro.avisoUnico && cuatro.avisoUnico.frecuenciaBaja.some(x => x.musculo === 'hamstrings')));
});

test('la regla está en el registro como aviso, implementada y con su nivel de evidencia', () => {
  const r = REG.regla('FRECUENCIA_MINIMA_GRUPOS_MAYORES');
  assert.equal(r.estado, 'implementada'); assert.equal(r.tipo, 'aviso'); assert.equal(r.nivel, 'E1'); assert.equal(r.valor, 2);
});
