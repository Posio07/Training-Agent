/* Tests del núcleo v2, paso 3.2: aviso único (B-039). */
const test = require('node:test');
const assert = require('node:assert/strict');
const AVISO = require('../js/core-v2/aviso.js');
const PLAN = require('../js/core-v2/plan.js');

const apretado = () => ({ sex: 'M', level: 'advanced', daysPerWeek: 3, division: 'classic_m', goal: 'bulk' });
const holgado = () => ({ sex: 'F', level: 'beginner', daysPerWeek: 3, division: 'bikini_w', goal: 'maintain', tiempoDisponibleMin: 120 });
const nuevo = p => PLAN.crearPlan(p, { id: 'p1', ahora: '2026-11-08' });

test('un plan que entra completo no muestra aviso', () => {
  const g = nuevo(holgado());
  assert.equal(g.plan.avisoUnico, null);
  assert.deepEqual(AVISO.construirAviso(g.plan), { hay: false });
});

test('un plan apretado muestra un solo aviso con las tres salidas, en lenguaje simple', () => {
  const g = nuevo(apretado());
  const a = AVISO.construirAviso(g.plan);
  assert.equal(a.hay, true);
  assert.deepEqual(a.salidas.map(s => s.id), ['mas-tiempo', 'mas-dias', 'aceptar']);
  assert.ok(a.lineas.length > 0 && a.lineas.every(l => typeof l === 'string' && !/undefined|NaN|\[object/.test(l)));
  assert.ok(a.lineas.some(l => l.startsWith('Espalda')));
  assert.ok(a.sesionesAfectadas.length > 0);
});

test('"más días" sube un día y no pasa de 6', () => {
  const g = nuevo(apretado());
  const s = AVISO.construirAviso(g.plan).salidas.find(x => x.id === 'mas-dias');
  assert.equal(s.dias, 4);
  const r = AVISO.aplicarSalida(s, apretado(), g);
  assert.equal(r.perfil.daysPerWeek, 4);
  assert.ok(PLAN.estadoDelPlan(g, r.perfil).motivos.includes('dias'));
  const seis = Object.assign(apretado(), { daysPerWeek: 6 });
  const s6 = AVISO.construirAviso(nuevo(seis).plan);
  if (s6.hay) assert.equal(s6.salidas.find(x => x.id === 'mas-dias').disponible, false);
  assert.throws(() => AVISO.aplicarSalida({ id: 'mas-dias', disponible: false }, seis, g), /máximo/);
});

test('"más tiempo" fija minutos solo en las sesiones afectadas y regenera por tiempo', () => {
  const g = nuevo(apretado());
  const s = AVISO.construirAviso(g.plan).salidas[0];
  const r = AVISO.aplicarSalida(s, apretado(), g);
  s.sesiones.forEach((i, k) => assert.equal(r.perfil.tiempoPorDia[i], g.plan.sesiones[i].capacidadMin + AVISO.bloqueMinimoMin()));
  assert.ok(PLAN.estadoDelPlan(g, r.perfil).motivos.includes('tiempo'));
  const g2 = nuevo(r.perfil);
  s.sesiones.forEach(i => assert.ok(g2.plan.sesiones[i].minutos >= g.plan.sesiones[i].minutos));
  // opciones.minutos manda sobre el sugerido
  const r2 = AVISO.aplicarSalida(s, apretado(), g, { minutos: { [s.sesiones[0]]: 99 } });
  assert.equal(r2.perfil.tiempoPorDia[s.sesiones[0]], 99);
});

test('"aceptar" guarda la aceptación de las sesiones afectadas y el aviso deja de pedirse', () => {
  const g = nuevo(apretado());
  const a = AVISO.construirAviso(g.plan);
  const r = AVISO.aplicarSalida(a.salidas[2], apretado(), g, { ahora: '2026-11-09' });
  assert.deepEqual(r.planGuardado.aceptaciones.map(x => x.sesion).sort(), a.sesionesAfectadas);
  assert.equal(AVISO.avisoPendiente(a, apretado(), r.planGuardado).hay, false);
  assert.equal(AVISO.avisoPendiente(a, apretado(), g).hay, true);
  assert.equal(g.aceptaciones.length, 0); // no muta
  // caduca al cambiar los días
  const otro = Object.assign(apretado(), { daysPerWeek: 4 });
  assert.equal(AVISO.avisoPendiente(a, otro, r.planGuardado).hay, true);
});

test('el aviso no se repite por sesión: es uno solo aunque haya muchos músculos sin cubrir', () => {
  const a = AVISO.construirAviso(nuevo(apretado()).plan);
  assert.equal(a.titulo, 'Esta semana no entra todo lo que pide el plan');
  assert.equal(a.salidas.length, 3);
});

test('una salida desconocida falla', () => {
  assert.throws(() => AVISO.aplicarSalida({ id: 'x' }, apretado(), nuevo(apretado())), /desconocida/);
});

test('DEC-038 y DEC-037 paso 2: a 90 min las variantes más caras llenan el día y el cuádriceps falta por tiempo, no por R1: el aviso lo dice y "más tiempo" ayuda', () => {
  const p = { sex: 'M', level: 'advanced', daysPerWeek: 4, division: 'classic_m', goal: 'bulk', tiempoDisponibleMin: 90 };
  const g = nuevo(p);
  const causas = g.plan.avisoUnico.sinCubrir.map(x => x.musculo + ':' + x.causa);
  assert.deepEqual(causas, ['back:R1', 'shoulders:R1', 'quads:tiempo', 'glutes:tiempo']);
  const a = AVISO.construirAviso(g.plan);
  assert.equal(a.soloR1, false);
  assert.equal(a.salidas[0].disponible, true); // más tiempo sí ayuda
});

test('un faltante solo por R1 también se puede aceptar: las sesiones afectadas son las que están en el tope por sesión', () => {
  // 100 min y no 90: con las variantes unilaterales de la abducción (DEC-038, el doble de tiempo por serie) a 90 min el cuádriceps queda corto por tiempo y no solo por R1 (lo fija el test de arriba). A 100 min el aviso es el mismo que a 90 min antes de DEC-038: espalda, hombros y cuádriceps, solo R1.
  const p = { sex: 'M', level: 'advanced', daysPerWeek: 4, division: 'classic_m', goal: 'bulk', tiempoDisponibleMin: 100 };
  const g = nuevo(p);
  assert.deepEqual(g.plan.avisoUnico.sinCubrir.map(x => x.musculo + ':' + x.causa), ['back:R1', 'shoulders:R1', 'quads:R1']); // los mismos tres faltantes que el test original a 90 min, todos solo por R1
  const a = AVISO.construirAviso(g.plan);
  assert.ok(a.sesionesAfectadas.length > 0 && a.soloR1);
  assert.equal(a.salidas[0].disponible, false); // más tiempo no ayuda: sobra tiempo
  const r = AVISO.aplicarSalida(a.salidas[2], p, g, { ahora: '2026-11-09' });
  assert.equal(AVISO.avisoPendiente(a, p, r.planGuardado).hay, false);
});

test('"más días" usa el máximo del reparto, no un número propio; y el texto concuerda en singular', () => {
  const REPARTO = require('../js/core-v2/reparto.js');
  const seis = Object.assign(apretado(), { daysPerWeek: 6 });
  assert.equal(REPARTO.normalizarPerfil({ daysPerWeek: 999 }).dias, 6);
  const a = AVISO.construirAviso(nuevo(seis).plan);
  if (a.hay) assert.equal(a.salidas[1].disponible, false);
  const un = { avisoUnico: { sinCubrir: [{ musculo: 'back', falta: 1, faltaReal: 0, causa: 'R1' }], obligatoriosSinLugar: [], sinDirecto: [], principalReducido: [] }, sesiones: [{ nombre: 'A', minutos: 60, capacidadMin: 60, fraccionado: { back: 11 } }], perfil: { dias: 3 } };
  assert.match(AVISO.construirAviso(un).lineas[0], /faltan 1 serie de la necesidad/);
});
