/* EN CONSTRUCCIÓN · tests del núcleo v2, paso 3.4: A4, A5 y A6 (B-039, DEC-034). No tocan el motor actual ni la interfaz. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const D = require('../js/core-v2/dolor.js');
const PLAN = require('../js/core-v2/plan.js');
const CAT = require('../js/core-v2/catalogo.js');

const perfil = () => ({ sex: 'M', level: 'advanced', daysPerWeek: 4, division: 'classic_m', goal: 'bulk', tiempoDisponibleMin: 90 });
const plan = p => PLAN.crearPlan(p || perfil(), { id: 'p1', ahora: '2026-11-08' }).plan;
const dia = n => `2026-11-${String(n).padStart(2, '0')}`;

/* ---------- A5 ---------- */

test('A5: un back-off pesa 90 % o menos del top set; el 90 % exacto vale y más pesado pasa a serie de trabajo', () => {
  assert.equal(D.clasificarBackoff(90, 100).valida, true);
  assert.equal(D.clasificarBackoff(90.5, 100).valida, false);
  assert.equal(D.clasificarBackoff(100, 100).tipo, 'normal');
  assert.equal(D.clasificarBackoff(80, 100).tipo, 'backoff');
  assert.equal(D.clasificarBackoff(45, 50).valida, true); // 90 % de 50 = 45
});

test('A5: se corrigen solo los back-offs de más; el top set y los demás se conservan, y no se muta lo recibido', () => {
  const filas = [{ setType: 'top', weight: 100, setNumber: 1 }, { setType: 'backoff', weight: 90, setNumber: 1 }, { setType: 'backoff', weight: 100, setNumber: 2 }, { setType: 'normal', weight: 120, setNumber: 1 }];
  const copia = JSON.parse(JSON.stringify(filas));
  const r = D.corregirBackoffs(filas);
  assert.deepEqual(r.filas.map(f => f.setType), ['top', 'backoff', 'normal', 'normal']);
  assert.equal(r.avisos.length, 1); assert.equal(r.avisos[0].regla, 'A5'); assert.match(r.avisos[0].texto, /90 %/);
  assert.deepEqual(filas, copia);
});

test('A5: sin top set en la sesión no hay con qué comparar y no cambia nada', () => {
  const filas = [{ setType: 'backoff', weight: 100, setNumber: 1 }];
  assert.deepEqual(D.corregirBackoffs(filas), { filas, avisos: [] });
});

/* ---------- A6 ---------- */

test('A6: dolor sobre el umbral marca la zona; igual al umbral no', () => {
  assert.equal(D.aplicarLectura(null, 5, 's1', dia(1)).marcada, false);
  assert.equal(D.aplicarLectura(null, 6, 's1', dia(1)).marcada, true);
});

test('A6: se desmarca con 2 sesiones DISTINTAS seguidas sin pasarse; dos series de la misma sesión cuentan una', () => {
  let r = D.aplicarLectura(null, 8, 's1', dia(1));
  r = D.aplicarLectura(r, 2, 's2', dia(3));
  assert.equal(r.marcada, true);
  r = D.aplicarLectura(r, 1, 's2', dia(3)); // misma sesión
  assert.equal(r.marcada, true);
  r = D.aplicarLectura(r, 0, 's3', dia(5));
  assert.equal(r.marcada, false);
});

test('A6: un dolor nuevo corta la racha de sesiones limpias', () => {
  let r = D.aplicarLectura(null, 8, 's1', dia(1));
  r = D.aplicarLectura(r, 2, 's2', dia(3));
  r = D.aplicarLectura(r, 7, 's3', dia(5));
  r = D.aplicarLectura(r, 2, 's4', dia(7));
  assert.equal(r.marcada, true);
});

test('A6: no muta el registro anterior y las banderas son por zona', () => {
  const antes = D.aplicarLectura(null, 8, 's1', dia(1));
  const copia = JSON.parse(JSON.stringify(antes));
  D.aplicarLectura(antes, 0, 's2', dia(2));
  assert.deepEqual(antes, copia);
  const b = D.registrarDolor({}, { zona: 'hombro', dolor: 7 }, 's1', dia(1));
  assert.deepEqual(D.zonasMarcadas(b), ['hombro']);
  assert.throws(() => D.registrarDolor({}, { zona: 'codo', dolor: 7 }, 's1', dia(1)), /Zona/);
});

test('DEC-011: recomendar un profesional con 2 sesiones distintas con dolor en 28 días; el día 28 cuenta y el 29 no', () => {
  let r = D.aplicarLectura(null, 8, 's1', '2026-10-01');
  r = D.aplicarLectura(r, 8, 's1', '2026-10-01');
  assert.equal(D.recomendarProfesional(r, '2026-10-02').recomendar, false); // una sesión no alcanza
  r = D.aplicarLectura(r, 9, 's2', '2026-10-20');
  assert.equal(D.recomendarProfesional(r, '2026-10-20').recomendar, true);
  assert.equal(D.recomendarProfesional(r, '2026-10-29').recomendar, true); // día 28 desde el 1.º
  assert.equal(D.recomendarProfesional(r, '2026-10-30').recomendar, false); // día 29: la primera sale
});

test('A6: con la zona marcada, los ejercicios de demanda ALTA en ella pierden top set y progresión y se propone una variante más suave, con confirmación', () => {
  const p = perfil(), pl = plan(p);
  const b = D.registrarDolor({}, { zona: 'lumbar', dolor: 7 }, 's1', dia(1));
  const todas = pl.sesiones.flatMap(s => D.restriccionesPorDolor(s, b, pl.perfil).map(r => Object.assign({ sesion: s }, r)));
  assert.ok(todas.length > 0);
  todas.forEach(r => {
    assert.equal((CAT.perfilArticularDe(r.varianteId).lumbar || {}).nivel, 'alta');
    assert.equal(r.sinTopSet, true); assert.equal(r.sinProgresion, true); assert.equal(r.requiereConfirmacion, true);
    r.sustituciones.forEach(s => { assert.notEqual((CAT.perfilArticularDe(s.varianteId).lumbar || {}).nivel, 'alta'); assert.equal(CAT.variantePorId(s.varianteId).patron, CAT.variantePorId(r.varianteId).patron); });
    assert.match(r.texto, /lumbar/);
  });
  assert.ok(todas.some(r => r.sustituciones.length > 0));
});

test('A6: sin bandera no hay restricciones, y una bandera de otra zona no afecta a los ejercicios de esta', () => {
  const pl = plan();
  pl.sesiones.forEach(s => assert.deepEqual(D.restriccionesPorDolor(s, {}, pl.perfil), []));
  const b = D.registrarDolor({}, { zona: 'rodilla', dolor: 9 }, 's1', dia(1));
  pl.sesiones.forEach(s => D.restriccionesPorDolor(s, b, pl.perfil).forEach(r => assert.equal(r.zona, 'rodilla')));
});

test('A6: las variantes propuestas no están ya en la sesión y respetan las casillas del perfil', () => {
  const pl = plan();
  const b = D.registrarDolor({}, { zona: 'lumbar', dolor: 7 }, 's1', dia(1));
  pl.sesiones.forEach(s => D.restriccionesPorDolor(s, b, pl.perfil).forEach(r => {
    const ids = s.ejercicios.map(e => e.varianteId);
    r.sustituciones.forEach(x => assert.ok(!ids.includes(x.varianteId) && !/barbell_row/.test(x.varianteId)));
  }));
});

test('A6: nunca propone una variante que también es de demanda alta en la zona, ni una que ya está en la sesión', () => {
  const ej = id => ({ varianteId: id, patron: CAT.variantePorId(id).patron, nombre: CAT.variantePorId(id).nombre });
  const hombro = D.registrarDolor({}, { zona: 'hombro', dolor: 8 }, 's1', dia(1));
  const press = { ejercicios: [ej('chest.bench_press_barbell')] };
  const r = D.restriccionesPorDolor(press, hombro, perfil());
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].sustituciones, []); // las demás del patrón también exigen mucho al hombro
  assert.match(r[0].texto, /No hay una variante más suave/);
  const lumbar = D.registrarDolor({}, { zona: 'lumbar', dolor: 8 }, 's1', dia(1));
  const conBarra = Object.assign(perfil(), { barbellRow: true });
  const solo = D.restriccionesPorDolor({ ejercicios: [ej('back.row_barbell')] }, lumbar, conBarra)[0].sustituciones.map(x => x.varianteId);
  assert.ok(solo.includes('back.row_chest_supported_bench') && !solo.includes('back.row_pendlay'));
  const yaEsta = D.restriccionesPorDolor({ ejercicios: [ej('back.row_barbell'), ej('back.row_chest_supported_bench')] }, lumbar, conBarra)[0].sustituciones.map(x => x.varianteId);
  assert.ok(!yaEsta.includes('back.row_chest_supported_bench') && yaEsta.length > 0);
});

/* ---------- A4 ---------- */

test('A4: solo con la bandera de hombro; más de 2 ejercicios de demanda alta de hombro avisan', () => {
  const marcado = D.registrarDolor({}, { zona: 'hombro', dolor: 7 }, 's1', dia(1));
  const altos = CAT.VARIANTES.filter(v => (CAT.perfilArticularDe(v.id).hombro || {}).nivel === 'alta').slice(0, 3);
  assert.equal(altos.length, 3);
  const tres = { ejercicios: altos.map(v => ({ varianteId: v.id })) };
  assert.equal(D.avisoTopeHombro(tres, {}), null); // sin bandera, nunca
  assert.equal(D.avisoTopeHombro(tres, D.registrarDolor({}, { zona: 'lumbar', dolor: 9 }, 's1', dia(1))), null);
  assert.equal(D.avisoTopeHombro(tres, marcado).cantidad, 3);
  assert.equal(D.avisoTopeHombro({ ejercicios: tres.ejercicios.slice(0, 2) }, marcado), null);
});

/* ---------- registro ---------- */

test('las reglas nuevas de A4 y A6 están en el registro con nivel, DEC existente y estado implementada', () => {
  const REG = require('../js/core-v2/registro.js');
  ['DOLOR_SESIONES_LIMPIAS_DESMARCAR', 'MAX_HOMBRO_ALTO_POR_SESION', 'UMBRAL_DOLOR_BANDERA', 'DOLOR_SESIONES_MINIMAS', 'DOLOR_VENTANA_DIAS', 'BACKOFF_REDUCCION_PORCENTAJE'].forEach(id => {
    const r = REG.regla(id); assert.equal(r.estado, 'implementada', id); assert.equal(r.nivel, 'E4', id);
  });
  assert.equal(REG.regla('MAX_HOMBRO_ALTO_POR_SESION').tipo, 'aviso');
  assert.ok(fs.existsSync(path.join(__dirname, '..', '..', 'docs', 'decisions', 'DEC-034.md')));
});
