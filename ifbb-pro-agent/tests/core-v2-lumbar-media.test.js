/* Tope de series de lumbar media por sesión (DEC-040), análogo a A2 (DEC-022) pero en series. Restricción dura del relleno, de la cuota, del traspaso del
 * tope por ejercicio y del ejercicio directo semanal; un patrón obligatorio entra aunque pase el tope y el aviso único lo dice. */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/core-v2/registro.js');
const C = require('../js/core-v2/catalogo.js');
const REP = require('../js/core-v2/reparto.js');
const AVISO = require('../js/core-v2/aviso.js');
const PLAN = require('../js/core-v2/plan.js');
const { profiles } = require('../../scripts/perfiles-barrido.js');

const ID = 'MAX_SERIES_LUMBAR_MEDIA_POR_SESION';
const TOPE = () => R.valor(ID);
const conTope = (n, fn) => { const r = R.regla(ID), antes = r.valor; try { r.valor = n; return fn(); } finally { r.valor = antes; } };
const media = s => s.ejercicios.filter(e => (C.perfilArticularDe(e.varianteId).lumbar || {}).nivel === 'media').reduce((a, e) => a + e.series, 0);
// Los 360 planes son deterministas: se calculan una vez por valor del tope (el barrido es lo que más tarda).
const memo = {};
const barrido = () => memo[TOPE()] || (memo[TOPE()] = profiles.flatMap(p => [3, 4, 5, 6].map(d => ({ p, d, pl: REP.generarPlan(Object.assign({}, p, { daysPerWeek: d })) }))));
const sesiones = () => barrido().flatMap(({ p, d, pl }) => pl.sesiones.map(s => ({ p, d, pl, s })));

test('DEC-040: el tope es un parámetro del registro análogo a A2: 8 series, implementada, E4, con revisión pendiente del investigador', () => {
  const r = R.regla(ID);
  assert.equal(r.valor, 8);
  assert.equal(r.unidad, 'series');
  assert.equal(r.estado, 'implementada');
  assert.equal(r.nivel, 'E4');
  assert.equal(r.dec, 'DEC-040');
  assert.equal(r.reviewRequired, true);
  assert.match(r.nota, /a_verificar/, 'la nota dice que el nivel del hip thrust es criterio de diseño a verificar');
});

test('DEC-040: en los 360 planes ninguna sesión pasa de 8 series de lumbar media (con el catálogo por defecto no hace falta ningún aviso)', () => {
  const pasan = sesiones().filter(({ s }) => media(s) > TOPE());
  assert.equal(pasan.length, 0, `${pasan.length} sesiones sobre el tope`);
  barrido().forEach(({ pl }) => assert.deepEqual(pl.avisos.lumbarMediaExcedida, []));
});

test('DEC-040: el tope se lee del registro y decide ejercicios: sin tope (100) hay sesiones sobre 8 series de media y el plan cambia', () => {
  const huella = () => JSON.stringify(barrido().map(({ pl }) => pl.sesiones.map(s => s.ejercicios.map(e => e.varianteId + e.series))));
  const con = huella();
  const sinTope = conTope(100, () => ({ h: huella(), sobre: sesiones().filter(({ s }) => media(s) > 8).length }));
  assert.notEqual(con, sinTope.h);
  assert.ok(sinTope.sobre > 10, `sin tope hay ${sinTope.sobre} sesiones sobre 8`);
  assert.equal(huella(), con, 'al restaurar el parámetro el plan vuelve a ser el mismo');
});

test('DEC-040: con cualquier tope, toda sesión lo respeta o el aviso único la nombra: nunca se ignora en silencio (360 planes)', () => {
  [2, 4, 6, 8].forEach(n => conTope(n, () => barrido().forEach(({ p, d, pl }) => pl.sesiones.forEach(s => {
    const avisada = ((pl.avisoUnico || {}).lumbarMediaExcedida || []).some(x => x.sesion === s.nombre && x.series === media(s) && x.tope === n);
    assert.ok(media(s) <= n || avisada, `tope ${n} ${p.level}/${p.division} ${d} días ${s.nombre}: ${media(s)} series sin aviso`);
  }))));
});

test('DEC-040: un patrón obligatorio que superaría el tope ENTRA igual (la estructura no se descarta) y el aviso único lo dice, con texto para el usuario', () => {
  // Con un tope de 1 serie, el patrón obligatorio de lumbar media de una sesión (por ejemplo el press militar de pie o el hack: 2 series como mínimo) pasa el tope por sí solo.
  conTope(1, () => {
    const caso = barrido().find(({ pl }) => pl.avisos.lumbarMediaExcedida.length > 0);
    assert.ok(caso, 'con tope 1 hay sesiones cuyo patrón obligatorio pasa el tope');
    const { pl } = caso, x = pl.avisos.lumbarMediaExcedida[0];
    const ses = pl.sesiones.find(s => s.nombre === x.sesion);
    assert.equal(x.series, media(ses));
    assert.ok(x.series > x.tope && x.tope === 1);
    // El patrón obligatorio no se perdió: la sesión sigue llevando todos los patrones que pide su tipo, sin aviso de "obligatorio sin lugar" por el tope.
    const tipo = REP.TIPOS[Object.keys(REP.TIPOS).find(k => REP.TIPOS[k].etiqueta === ses.tipo && REP.TIPOS[k].principal === ses.principal)];
    tipo.obligatorios.forEach(pat => assert.ok(ses.ejercicios.some(e => e.patron === pat), `${ses.nombre}: falta el patrón obligatorio ${pat}`));
    assert.ok(!pl.avisos.obligatoriosSinLugar.some(o => o.sesion === ses.nombre), 'no hay "obligatorio sin lugar" por el tope');
    // El aviso único lo trae y el aviso para el usuario lo cuenta, con la sesión como afectada (se puede aceptar).
    assert.deepEqual(pl.avisoUnico.lumbarMediaExcedida, pl.avisos.lumbarMediaExcedida);
    const a = AVISO.construirAviso(pl);
    assert.equal(a.hay, true);
    assert.ok(a.lineas.some(l => l.includes(x.sesion) && /lumbar media/.test(l) && l.includes(String(x.series))), a.lineas.join(' | '));
    assert.ok(a.sesionesAfectadas.includes(pl.sesiones.findIndex(s => s.nombre === x.sesion)));
    assert.equal(a.soloR1, false);
    // Lo que NO es estructura sí respeta el tope: en las demás sesiones, y en esta, el relleno no suma lumbar media más allá del aviso.
    pl.sesiones.filter(s => s.nombre !== x.sesion).forEach(s => assert.ok(media(s) <= 1 || pl.avisos.lumbarMediaExcedida.some(y => y.sesion === s.nombre)));
  });
});

test('DEC-040: el relleno no suma series de lumbar media por encima del tope: con tope 1, lo que lleva de media una sesión sobre el tope es solo de la estructura', () => {
  // La estructura puede dejar una sesión sobre el tope (aviso); el relleno, la cuota y el traspaso jamás agregan lumbar media a una sesión que ya está en el tope.
  let revisadas = 0;
  conTope(1, () => barrido().forEach(({ pl }) => pl.sesiones.forEach(s => {
    const x = pl.avisos.lumbarMediaExcedida.find(y => y.sesion === s.nombre);
    if (!x) return;
    revisadas++;
    // lo que lleva de media son solo ejercicios de la estructura: los fijos de cada patrón obligatorio, los prioritarios y los funcionales
    const tipo = REP.TIPOS[Object.keys(REP.TIPOS).find(k => REP.TIPOS[k].etiqueta === s.tipo && REP.TIPOS[k].principal === s.principal)];
    s.ejercicios.filter(e => (C.perfilArticularDe(e.varianteId).lumbar || {}).nivel === 'media').forEach(e => assert.ok(tipo.obligatorios.includes(e.patron) || e.varianteId.startsWith('functional.'), `${s.nombre}: ${e.nombre} de lumbar media fuera de la estructura sobre el tope`));
  })));
  assert.ok(revisadas > 0, 'con tope 1 hay sesiones sobre el tope por la estructura');
});

test('DEC-040: la causa "lumbar media" aparece como causa de un músculo sin cubrir y el aviso la explica (no se confunde con falta de tiempo)', () => {
  conTope(4, () => {
    const caso = barrido().find(({ pl }) => ((pl.avisoUnico || {}).sinCubrir || []).some(x => x.causa === 'lumbar media'));
    assert.ok(caso, 'con tope 4 algún músculo queda sin cubrir por el tope de lumbar media');
    const a = AVISO.construirAviso(caso.pl);
    assert.ok(a.lineas.some(l => /tope de series de lumbar media/.test(l)), a.lineas.join(' | '));
  });
});

test('DEC-040: A2 sigue igual: una sola variante de lumbar alta por sesión; el tope de media no toca los ejercicios de lumbar alta', () => {
  assert.equal(R.valor('MAX_LUMBAR_ALTA_POR_SESION'), 1);
  sesiones().forEach(({ s }) => assert.ok(s.lumbarAltaEnSesion <= 1));
});

test('DEC-040: el plan guardado lleva el aviso (crearPlan con el tope forzado)', () => {
  conTope(1, () => {
    const g = PLAN.crearPlan({ sex: 'M', level: 'advanced', daysPerWeek: 5, division: 'physique_m', goal: 'bulk' }, { id: 'p', ahora: '2026-11-13' });
    assert.ok(Array.isArray(g.plan.avisoUnico.lumbarMediaExcedida));
    assert.ok(g.plan.avisoUnico.lumbarMediaExcedida.length > 0);
  });
});

test('DEC-040: el tope es inclusivo: una sesión puede llegar a exactamente 8 series de lumbar media (el tope limita lo que está por encima, no lo que lo alcanza)', () => {
  const exactas = sesiones().filter(({ s }) => media(s) === TOPE());
  assert.ok(exactas.length > 0, 'ninguna sesión llega a 8: el tope sería de 7');
  // Y con el tope en 7 esas sesiones ya no existen: el límite se mueve con el parámetro.
  conTope(7, () => assert.equal(sesiones().filter(({ s }) => media(s) > 7).length, 0));
});

test('DEC-040: si el tope impide cubrir un sub-patrón de la cuota, el aviso lo dice con la causa "lumbar media" (no con falta de tiempo)', () => {
  // La patada pasa a lumbar media en un catálogo de prueba: con el tope en 1 ningún ejercicio de extensión de cadera de glúteo cabe (hip thrust, búlgara y patada son de lumbar media).
  const perfilArticularDe = id => (id === 'glutes.kickback_cable' ? Object.assign({}, C.perfilArticularDe(id), { lumbar: { nivel: 'media' } }) : C.perfilArticularDe(id));
  const cat = Object.assign({}, C, { perfilArticularDe });
  conTope(1, () => {
    const pl = REP.generarPlan({ sex: 'F', level: 'advanced', daysPerWeek: 4, division: 'bikini_w', goal: 'bulk', laggingMuscles: ['glutes'], tiempoDisponibleMin: 120 }, { catalogo: cat });
    const c = pl.avisos.cuotaSinCubrir.find(x => x.musculo === 'glutes' && x.subPatron === 'extension_cadera');
    assert.ok(c, 'la cuota de extensión de cadera queda sin cubrir');
    assert.equal(c.causa, 'lumbar media');
    const a = AVISO.construirAviso(pl);
    assert.ok(a.lineas.some(l => /extensión de cadera/.test(l) && /tope de series de lumbar media/.test(l)), a.lineas.join(' | '));
  });
});

test('DEC-040: un aviso con una sesión sobre el tope de lumbar media nunca se presenta como "solo R1" aunque lo demás sea R1', () => {
  const plan = ex => ({ avisoUnico: { sinCubrir: [{ musculo: 'back', falta: 1, faltaReal: 0, causa: 'R1' }], obligatoriosSinLugar: [], sinDirecto: [], principalReducido: [], lumbarMediaExcedida: ex },
    sesiones: [{ nombre: 'A', minutos: 60, capacidadMin: 90, fraccionado: { back: 11 } }], perfil: { dias: 3 } });
  assert.equal(AVISO.construirAviso(plan([])).soloR1, true, 'sin sesión sobre el tope, R1 solo');
  const a = AVISO.construirAviso(plan([{ sesion: 'A', series: 9, tope: 8 }]));
  assert.equal(a.soloR1, false);
  assert.ok(a.sesionesAfectadas.includes(0));
});
