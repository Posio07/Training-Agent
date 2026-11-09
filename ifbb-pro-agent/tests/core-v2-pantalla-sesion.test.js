/* EN CONSTRUCCIÓN · tests de la pantalla de sesión del núcleo v2, paso 3.7: la preparación de la sesión y el HTML como funciones puras. El recorrido en el
 * navegador está en tests/e2e-sesion.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/core-v2/pantallas/sesion.js');
const PLAN = require('../js/core-v2/plan.js');
const DOLOR = require('../js/core-v2/dolor.js');
const SS = require('../js/sessionStore.js');

const datos = { sex: 'F', level: 'intermediate', daysPerWeek: 4, division: 'bikini_w', goal: 'cut', tiempoDisponibleMin: 90 };
const perfil = (o) => Object.assign({ id: 'p1', data: datos, planGuardado: PLAN.crearPlan(datos, { id: 'a', ahora: '2026-11-09' }), workouts: [], painFlags: {} }, o);
const hoy = '2026-11-09';
const DIA_SENTADILLA = 1;

test('la sesión sale del plan guardado con el id de la variante en cada ejercicio y la zona de dolor por defecto', () => {
  const r = S.prepararSesion(perfil(), DIA_SENTADILLA, { hoy });
  assert.equal(r.ejercicios[0].exerciseId, 'quads.squat_back');
  assert.deepEqual(r.ejercicios[0].sets.map(x => x.setType), ['top', 'backoff', 'backoff', 'backoff']);
  assert.equal(r.ejercicios[0].zonaDolor, 'lumbar');
  r.ejercicios.forEach(e => assert.ok(e.muscleLabel && e.sets.length > 0));
});

test('por defecto entra la última variante que usó el usuario, si sigue habilitada', () => {
  const filas = [{ exerciseId: 'quads.squat_hack', date: '2026-11-01', savedAt: 1, sessionId: 's0', setType: 'normal', weight: 100, reps: 8, setNumber: 1 }];
  const r = S.prepararSesion(perfil({ workouts: filas }), DIA_SENTADILLA, { hoy });
  assert.ok(r.ejercicios.some(e => e.exerciseId === 'quads.squat_hack'));
});

test('"hoy tengo X min": menos ejercicios, dentro del tiempo, y no toca el plan guardado', () => {
  const p = perfil(), antes = JSON.stringify(p.planGuardado);
  const larga = S.prepararSesion(p, DIA_SENTADILLA, { hoy }), corta = S.prepararSesion(p, DIA_SENTADILLA, { hoy, minutos: 20 });
  assert.ok(corta.ejercicios.length < larga.ejercicios.length);
  assert.ok(corta.planSesion.minutos <= 20 + 1e-9 && corta.planSesion.rutinaCorta);
  assert.equal(JSON.stringify(p.planGuardado), antes);
  assert.throws(() => S.prepararSesion(p, 9, { hoy }), /inexistente/);
});

test('A6: con la zona lumbar marcada, la sentadilla trasera pierde el top set y trae variantes más suaves; el aviso de profesional con 2 sesiones', () => {
  let b = DOLOR.registrarDolor({}, { zona: 'lumbar', dolor: 8 }, 's1', '2026-11-01');
  const r = S.prepararSesion(perfil({ painFlags: b }), DIA_SENTADILLA, { hoy });
  const e = r.ejercicios[0];
  assert.ok(e.sets.every(x => x.setType !== 'top'));
  assert.equal(e.restriccion.zona, 'lumbar'); assert.match(e.restriccion.texto, /zona lumbar/);
  assert.deepEqual(e.restriccion.sustituciones, [], 'la variante más suave (hack) ya está en la sesión: no se propone dos veces');
  assert.equal(e.painAdvice, null);
  b = DOLOR.registrarDolor(b, { zona: 'lumbar', dolor: 7 }, 's2', '2026-11-05');
  assert.equal(S.prepararSesion(perfil({ painFlags: b }), DIA_SENTADILLA, { hoy }).ejercicios[0].painAdvice.sesiones, 2);
  // sin marca, con top set
  assert.ok(S.prepararSesion(perfil(), DIA_SENTADILLA, { hoy }).ejercicios[0].sets.some(x => x.setType === 'top'));
});

test('A5: un back-off que pesa más del 90 % del top set ya registrado pasa a serie de trabajo; sin top registrado no hay con qué comparar', () => {
  const ex = { sets: [{ setType: 'top', setNumber: 1 }, { setType: 'backoff', setNumber: 1 }, { setType: 'backoff', setNumber: 2 }] };
  const vals = [{ done: true, weight: '100' }, { done: false }, { done: false }];
  assert.equal(S.tipoDeSerie(ex, vals, 1, 95).tipo, 'normal');
  assert.match(S.tipoDeSerie(ex, vals, 1, 95).aviso, /90 %/);
  assert.equal(S.tipoDeSerie(ex, vals, 2, 90).tipo, 'backoff');
  assert.equal(S.tipoDeSerie(ex, [{ done: false, weight: '' }, { done: false }, { done: false }], 1, 200).tipo, 'backoff');
  assert.equal(S.tipoDeSerie({ sets: [{ setType: 'normal', setNumber: 1 }] }, [{ done: false }], 0, 50).tipo, 'normal');
});

test('el HTML de una serie escapa los valores y la barra cargada reparte los discos', () => {
  const h = S.htmlSerie({ setType: 'normal', setNumber: 1, repsLabel: '8-12' }, 0, { weight: '"><img src=x onerror=alert(1)>', reps: '', done: false, pain: '' }, 'kg', null);
  assert.ok(!h.includes('<img src=x') && h.includes('&lt;img'));
  assert.match(h, /data-sm-pain="0"/);
  assert.deepEqual(S.platesForWeight(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]).plates, [25, 15]);
  assert.equal(S.parseRestSeconds('2,5 min'), 150); assert.equal(S.parseRestSeconds('90 s'), 90);
});

test('el resumen compara el top set con el de la última vez de la misma variante', () => {
  const p = perfil();
  const prep = S.prepararSesion(p, DIA_SENTADILLA, { hoy });
  const sm = SS.newSession({ profileId: 'p1', sessionId: 'nueva', dayIndex: 1, dayName: 'Día 2', short: false, exercises: prep.ejercicios, now: 0 });
  sm.values[0][0] = { weight: '110', reps: '5', done: true };
  p.workouts = [{ exerciseId: 'quads.squat_back', setType: 'top', weight: 100, reps: 5, sessionId: 'vieja', date: '2026-11-01', savedAt: 1, setNumber: 1 }];
  const h = S.htmlResumen(sm, p, 60000);
  assert.match(h, /Top sets del día/); assert.match(h, /cmp-up/); assert.match(h, /1\/\d+/);
});

test('los descansos de la sesión se leen con los segundos del registro (también los decimales: 2,5 min = 150 s)', () => {
  const R = require('../js/core-v2/registro.js');
  const r = S.prepararSesion(perfil(), DIA_SENTADILLA, { hoy });
  const esperado = { top: R.valor('DESCANSO_TOP_SET_S'), backoff: R.valor('DESCANSO_BACKOFF_S') };
  const e = r.ejercicios[0];
  assert.equal(S.parseRestSeconds(e.sets[0].restLabel), esperado.top);
  assert.equal(S.parseRestSeconds(e.sets[1].restLabel), esperado.backoff);
  r.ejercicios.slice(1).forEach(x => assert.equal(S.parseRestSeconds(x.sets[0].restLabel), R.valor(x.type === 'compound' ? 'DESCANSO_MULTIARTICULAR_S' : 'DESCANSO_AISLAMIENTO_S')));
});

test('el selector de variante: sin series registradas ofrece las opciones; con series hechas ya no deja cambiar; con una sola opción no aparece', () => {
  const op = [{ varianteId: 'a', nombre: 'A', planificada: true, ultimaUsada: false }, { varianteId: 'b', nombre: 'B', planificada: false, ultimaUsada: true }];
  const libre = S.htmlVariantes(op, false);
  assert.match(libre, /data-sm-variante="a"/); assert.match(libre, /data-sm-variante="b"/); assert.match(libre, /la última vez/);
  assert.ok(!/data-sm-variante/.test(S.htmlVariantes(op, true)));
  assert.equal(S.htmlVariantes([op[0]], false), '');
});
