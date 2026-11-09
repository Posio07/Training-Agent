/* Tests de la pantalla de progreso por variante del núcleo v2, paso 3.8: las funciones puras. El recorrido en el navegador está en tests/e2e-progreso.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/core-v2/pantallas/progreso.js');

const f = (sessionId, date, exerciseId, exercise, setType, weight, reps, extra) => Object.assign({ sessionId, date, exerciseId, exercise, setType, setNumber: 1, weight, reps, savedAt: 1, setKey: `${sessionId}|${exerciseId}|${setType}|1` }, extra);
const filas = [
  f('s1', '2026-11-01', 'quads.squat_back', 'Sentadilla trasera', 'top', 100, 5), f('s1', '2026-11-01', 'chest.bench_press_barbell', 'Press', 'normal', 60, 8),
  f('s2', '2026-11-05', 'quads.squat_back', 'Sentadilla trasera', 'top', 105, 5, { short: true }), f('s2', '2026-11-05', 'quads.squat_back', 'Sentadilla trasera', 'backoff', 95, 8),
  f('s3', '2026-11-08', 'quads.squat_hack', 'Sentadilla en hack', 'normal', 120, 10),
];

test('las variantes registradas salen de las filas por id de variante, la más reciente primero, con el nombre del catálogo', () => {
  const v = P.variantesRegistradas(filas);
  assert.deepEqual(v.map(x => x.id), ['quads.squat_hack', 'quads.squat_back', 'chest.bench_press_barbell']);
  assert.equal(v[1].nombre, 'Sentadilla trasera');
  assert.deepEqual(P.variantesRegistradas([{ exerciseId: 'viejo.x', exercise: 'Ejercicio viejo', date: '2026-01-01' }, { exercise: 'sin id', date: '2026-01-02' }]).map(x => x.nombre), ['Ejercicio viejo']);
});

test('los puntos de fuerza son de UNA variante, uno por día: el top set (o la serie más pesada), marcando la sesión de X min', () => {
  const p = P.puntosDeFuerza(filas, 'quads.squat_back');
  assert.deepEqual(p.map(x => [x.date, x.weight, x.short]), [['2026-11-01', 100, false], ['2026-11-05', 105, true]]);
  assert.deepEqual(P.puntosDeFuerza(filas, 'quads.squat_hack').map(x => x.weight), [120]); // no mezcla con la sentadilla trasera
  assert.deepEqual(P.puntosDeFuerza(filas, 'no.existe'), []);
  // el top set manda aunque otra serie del mismo día pese más
  const conTop = [f('a', '2026-11-01', 'x.y', 'X', 'top', 100, 5), f('a', '2026-11-01', 'x.y', 'X', 'normal', 120, 8)];
  assert.equal(P.puntosDeFuerza(conTop, 'x.y')[0].weight, 100);
  const sinTop = [f('a', '2026-11-01', 'x.y', 'X', 'normal', 50, 10), f('a', '2026-11-01', 'x.y', 'X', 'normal', 70, 6)];
  assert.equal(P.puntosDeFuerza(sinTop, 'x.y')[0].weight, 70);
});

test('la sección de fuerza: sin series, con una sola sesión y con dos o más', () => {
  assert.match(P.htmlFuerza([], null), /Completa dos sesiones/);
  const una = P.htmlFuerza(filas, 'quads.squat_hack');
  assert.match(una, /<option value="quads.squat_hack" selected>/); assert.ok(!/<svg/.test(una)); assert.match(una, /con esta variante/);
  const dos = P.htmlFuerza(filas, 'quads.squat_back');
  assert.match(dos, /Marca hueca = sesión de X min/); assert.match(dos, /\(sesión de X min\)/);
  assert.match(dos, /<svg class="chart"/); assert.equal((dos.match(/<circle/g) || []).length, 2); assert.match(dos, /dot-short/);
  assert.match(P.htmlFuerza(filas, 'no.existe'), /<option value="quads.squat_hack" selected>/); // una variante que no existe cae en la más reciente
});

test('el historial lista las sesiones, abre la elegida y pone el editor solo en la serie en edición; el nombre se escapa', () => {
  const perfil = { data: { plateUnit: 'kg' }, workouts: filas, sessions: [{ sessionId: 's1', dayName: 'Día 2', date: '2026-11-01' }, { sessionId: 's2', dayName: 'Día <b>2</b>', date: '2026-11-05' }, { sessionId: 's3', dayName: 'Día 2', date: '2026-11-08' }] };
  const h = P.htmlHistorial(perfil, {});
  assert.equal((h.match(/<details class="hist-session"/g) || []).length, 3); assert.ok(!/<b>2<\/b>/.test(h) && h.includes('&lt;b&gt;2'));
  assert.equal((h.match(/class="set-editor"/g) || []).length, 0);
  const id = 's2|quads.squat_back|top|1';
  const e = P.htmlHistorial(perfil, { editandoId: id, abiertaId: 's1' });
  assert.equal((e.match(/class="set-editor"/g) || []).length, 1); assert.match(e, /data-sid="s2" open/); assert.match(e, /data-sid="s1" open/);
  assert.ok(!/data-sid="s3" open/.test(e));
});

test('la sesión en curso no se lista en el historial, y sin sesiones el mensaje es claro', () => {
  const perfil = { data: {}, workouts: filas, sessions: [] };
  assert.ok(!/data-sid="s3"/.test(P.htmlHistorial(perfil, { sesionActivaId: 's3' })));
  assert.match(P.htmlHistorial({ data: {}, workouts: [], sessions: [] }, {}), /Todavía no registraste ninguna sesión/);
});

test('la pantalla de progreso no copia lo que se queda en app.js: peso, medidas y gráfico de peso', () => {
  const s = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'core-v2', 'pantallas', 'progreso.js'), 'utf8');
  ['htmlProgressHeader', 'weightChart', 'rateLabel', 'log-form', 'btn-apply'].forEach(n => assert.ok(!s.includes(n), n));
});

test('el historial marca "(editada)" en las series corregidas y en ninguna otra', () => {
  const perfil = { data: { plateUnit: 'kg' }, workouts: [Object.assign({}, filas[0], { editedAt: 5 }), filas[1]], sessions: [{ sessionId: 's1', dayName: 'Día 2', date: '2026-11-01' }] };
  const h = P.htmlHistorial(perfil, {});
  assert.equal((h.match(/\(editada\)/g) || []).length, 1);
  assert.match(h, /Sentadilla trasera<\/b> · Top set · 100 kg × 5 <span class="muted">\(editada\)/);
});
