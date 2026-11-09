/* Tests de las pantallas del núcleo v2, paso 3.6 (perfil y plan): el HTML y la lectura de campos como funciones puras. El recorrido
 * en el navegador está en tests/e2e-pantallas.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const P = require('../js/core-v2/pantallas/perfil.js');
const E = require('../js/core-v2/pantallas/entreno.js');
const PLAN = require('../js/core-v2/plan.js');
const AVISO = require('../js/core-v2/aviso.js');
const CAT = require('../js/core-v2/catalogo.js');

const campos = o => Object.assign({ name: 'Ana', sex: 'F', age: '30', heightCm: '165', weightKg: '60', level: 'intermediate', daysPerWeek: '4', division: 'bikini_w', goal: 'cut', activity: 'moderate' }, o);
const apretado = { sex: 'M', level: 'advanced', daysPerWeek: 3, division: 'classic_m', goal: 'bulk', tiempoDisponibleMin: 45 };
const holgado = { sex: 'F', level: 'novice', daysPerWeek: 3, division: 'bikini_w', goal: 'maintain', tiempoDisponibleMin: 120 };
const guardado = (d, id) => PLAN.crearPlan(d, { id: id || 'p1', ahora: '2026-11-09' });

/* ---------- Perfil ---------- */

test('el formulario trae los campos nuevos: tiempo general y por día, y tres selectores de ejercicios prioritarios sin los funcionales', () => {
  const h = P.htmlPerfil(null);
  assert.match(h, /name="tiempoDisponibleMin"/);
  assert.equal((h.match(/name="tiempoDia_\d"/g) || []).length, 6);
  assert.equal((h.match(/<select name="prioritarios"/g) || []).length, 3);
  assert.ok(!/functional\./.test(h.slice(h.indexOf('name="prioritarios"'), h.indexOf('<legend>Objetivo'))), 'los funcionales no se piden como prioritarios');
  assert.match(h, /name="barbellRow"/); assert.match(h, /name="healthGoal"/);
  assert.match(h, /3 sesiones de 50 min/); // la ayuda de la bandera describe lo que hace
});

test('al editar, el formulario muestra lo guardado y el tiempo por día solo en los días del split', () => {
  const datos = P.leerPerfil(campos({ daysPerWeek: '3', tiempoDisponibleMin: '60', tiempoDia_1: '40', prioritarios: ['quads.squat_back'] })).datos;
  const h = P.htmlPerfil({ data: datos });
  assert.match(h, /name="tiempoDisponibleMin" type="number"[^>]*value="60"/);
  assert.match(h, /name="tiempoDia_1"[^>]*value="40"/);
  assert.match(h, /data-dia="3" hidden/); assert.ok(!/data-dia="2" hidden/.test(h));
  assert.match(h, /<option value="quads.squat_back" selected>/);
});

test('leerPerfil: tiempo, tiempo por día (solo días del split) y prioritarios sin repetidos, sin vacíos y sin funcionales, hasta 3', () => {
  const r = P.leerPerfil(campos({ daysPerWeek: '3', tiempoDisponibleMin: '60', tiempoDia_0: '30', tiempoDia_4: '99', prioritarios: ['quads.squat_back', '', 'quads.squat_back', 'functional.step_up', 'chest.bench_press_barbell', 'back.pullup', 'x'] }));
  assert.deepEqual(r.errores, []);
  assert.equal(r.datos.tiempoDisponibleMin, 60);
  assert.deepEqual(r.datos.tiempoPorDia, { 0: 30 }); // el día 5 no existe en un split de 3 días
  assert.ok(r.datos.prioritarios.length <= 3 && new Set(r.datos.prioritarios).size === r.datos.prioritarios.length);
  assert.ok(r.datos.prioritarios.includes('quads.squat_back') && !r.datos.prioritarios.includes('functional.step_up') && !r.datos.prioritarios.includes('x'));
  assert.equal(P.leerPerfil(campos({ prioritarios: ['quads.squat_back', 'chest.bench_press_barbell', 'quads.leg_press', 'glutes.hip_thrust'] })).datos.prioritarios.length, 3);
});

test('leerPerfil: un tiempo que no es un número positivo es un error; vacío usa el valor por defecto', () => {
  assert.match(P.leerPerfil(campos({ tiempoDisponibleMin: 'abc' })).errores.join(' '), /tiempo disponible/);
  assert.match(P.leerPerfil(campos({ tiempoDisponibleMin: '-5' })).errores.join(' '), /tiempo disponible/);
  assert.match(P.leerPerfil(campos({ tiempoDia_2: '0x' })).errores.join(' '), /día 3/);
  const ok = P.leerPerfil(campos({ tiempoDisponibleMin: '' }));
  assert.deepEqual(ok.errores, []); assert.equal(ok.datos.tiempoDisponibleMin, undefined);
});

test('leerPerfil conserva las autorizaciones profesionales por zona y descarta la aceptación de sesiones largas (DEC-016: vive en el plan guardado)', () => {
  const primero = P.leerPerfil(campos({ injuryZones: ['knee'] })).datos;
  primero.health.injuries[0].clearanceDate = '2026-10-01';
  const otra = P.leerPerfil(campos({ injuryZones: ['knee'], longSessionAcceptedOn: '2026-10-01' }), primero);
  assert.equal(otra.datos.health.injuries[0].clearanceDate, '2026-10-01');
  assert.ok(!('longSessionAcceptance' in otra.datos) && !('longSessionAcceptedOn' in otra.datos));
});

test('los datos leídos alimentan el plan del núcleo nuevo: el tiempo y los prioritarios llegan al reparto', () => {
  const d = P.leerPerfil(campos({ daysPerWeek: '4', tiempoDisponibleMin: '50', tiempoDia_1: '80', prioritarios: ['quads.squat_back'] })).datos;
  const f = guardado(d);
  assert.deepEqual(f.plan.perfil.minutosPorDia, [50, 80, 50, 50]);
  assert.ok(f.plan.sesiones.some(s => s.ejercicios.some(e => e.varianteId === 'quads.squat_back')));
  assert.deepEqual(f.firma.prioritarios, ['quads.squat_back']);
});

test('los campos nuevos tienen su etiqueta asociada y los errores se anuncian', () => {
  const h = P.htmlPerfil(null);
  assert.match(h, /<label for="tiempoDisponibleMin">/); assert.match(h, /<input id="tiempoDisponibleMin"/);
  for (let i = 0; i < 6; i++) { assert.match(h, new RegExp(`<label for="tiempoDia_${i}">`)); assert.match(h, new RegExp(`id="tiempoDia_${i}"`)); }
  assert.match(h, /id="form-errors" role="alert"/);
});

/* ---------- Plan (Entreno) ---------- */

test('Entreno: una tarjeta por sesión con su botón de empezar, el cardio y las tablas; sin textos rotos', () => {
  const d = P.leerPerfil(campos({})).datos;
  const h = E.htmlEntreno({ datos: d, guardado: guardado(d) });
  assert.equal((h.match(/data-start-session="/g) || []).length, 4);
  assert.match(h, /Cardio/); assert.match(h, /Series semanales por grupo/); assert.match(h, /data-regenerar/);
  assert.ok(!/undefined|NaN|\[object/.test(h));
});

test('Entreno: el día que sigue viene abierto y marcado "Siguiente"; los demás, cerrados', () => {
  const d = P.leerPerfil(campos({})).datos;
  const h = E.htmlEntreno({ datos: d, guardado: guardado(d), siguiente: 2 });
  assert.match(h, /data-toggle-day="2" aria-expanded="true"/);
  assert.match(h, /data-toggle-day="0" aria-expanded="false"/);
  assert.equal((h.match(/Siguiente/g) || []).length, 1);
});

test('Entreno: el aviso único aparece solo si algo no entra, con sus salidas disponibles; más días no se ofrece con 6 días', () => {
  assert.ok(!/data-salida/.test(E.htmlEntreno({ datos: holgado, guardado: guardado(holgado) })));
  const h = E.htmlEntreno({ datos: apretado, guardado: guardado(apretado) });
  assert.match(h, /Esta semana no entra todo lo que pide el plan/);
  ['mas-tiempo', 'mas-dias', 'aceptar'].forEach(s => assert.match(h, new RegExp(`data-salida="${s}"`)));
  const seis = Object.assign({}, apretado, { daysPerWeek: 6 });
  assert.ok(!/data-salida="mas-dias"/.test(E.htmlEntreno({ datos: seis, guardado: guardado(seis) })));
});

test('Entreno: aceptar una sesión la marca y quita el aviso; cambiar los días hace caducar la aceptación', () => {
  const a = guardado(apretado), av = AVISO.construirAviso(a.plan);
  const aceptado = AVISO.aplicarSalida(av.salidas[2], apretado, a, { ahora: '2026-11-09' });
  const h = E.htmlEntreno({ datos: apretado, guardado: aceptado.planGuardado });
  assert.ok(!/data-salida/.test(h)); assert.match(h, /Aceptada con lo que falta/);
  const otros = Object.assign({}, apretado, { daysPerWeek: 4 });
  assert.ok(!/Aceptada con lo que falta/.test(E.htmlEntreno({ datos: otros, guardado: aceptado.planGuardado })));
});

test('Entreno: una versión nueva del motor avisa y ofrece aplicarla, sin regenerar sola', () => {
  const g = guardado(holgado);
  assert.ok(!/data-aplicar-version/.test(E.htmlEntreno({ datos: holgado, guardado: g })));
  const viejo = Object.assign({}, g, { versionMotor: 'core-v1' });
  assert.match(E.htmlEntreno({ datos: holgado, guardado: viejo }), /data-aplicar-version/);
});

test('Entreno: el top set y su back-off solo en definición; el nombre de las variantes se escapa', () => {
  const cut = Object.assign({}, holgado, { goal: 'cut' });
  assert.match(E.htmlEntreno({ datos: cut, guardado: guardado(cut) }), /Top set/);
  assert.ok(!/Top set/.test(E.htmlEntreno({ datos: holgado, guardado: guardado(holgado) })));
  const sucio = JSON.parse(JSON.stringify(guardado(holgado))); sucio.plan.sesiones[0].ejercicios[0].nombre = '<img src=x onerror=alert(1)>';
  const h = E.htmlEntreno({ datos: holgado, guardado: sucio });
  assert.ok(!h.includes('<img src=x') && h.includes('&lt;img src=x'));
});

test('Entreno: con la bandera de salud el cardio muestra 3 × 50 min y los funcionales aparecen; avisos del plan en lenguaje simple', () => {
  const d = Object.assign({}, holgado, { goal: 'cut', healthGoal: true });
  const h = E.htmlEntreno({ datos: d, guardado: guardado(d) });
  assert.match(h, /3 sesiones × 50 min/); assert.match(h, /búlgara/i);
  const conAviso = E.avisosDelPlan({ avisos: { seguridad: [{ varianteId: 'quads.squat_back' }], prioritariosSinLugar: ['quads.leg_press'], funcionalesSinLugar: [{ sesion: 'Día 2', varianteId: 'functional.step_up', motivo: 'no cabe en el tiempo de la sesión' }], a2: [], topeExcedido: [] } });
  assert.equal(conAviso.length, 3); conAviso.forEach(x => assert.ok(!/undefined|\[object/.test(x)));
});

/* ---------- Sin duplicar ---------- */

test('las pantallas nuevas no copian lo que se queda en app.js: resumen, dieta, medidas y suplementos', () => {
  const dir = path.join(__dirname, '..', 'js', 'core-v2', 'pantallas');
  fs.readdirSync(dir).forEach(f => {
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    ['htmlSummary', 'htmlNutrition', 'htmlTargets', 'htmlSupps', 'mealTable'].forEach(n => assert.ok(!s.includes(n), `${f} copia ${n}`));
  });
  assert.ok(CAT.VARIANTES.length > 0);
});
