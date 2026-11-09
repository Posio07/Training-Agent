/* EN CONSTRUCCIÓN · tests de la prueba de aceptación del núcleo v2 (paso 3.10): cada criterio de scripts/aceptacion-nucleo-v2.js tiene que FALLAR cuando se rompe la regla
 * (si no, la prueba de aceptación no vale). El resultado real sobre los 360 planes lo escribe el script en docs/research/aceptacion-nucleo-v2.md. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const A = require('../../scripts/aceptacion-nucleo-v2.js');
const REP = require('../js/core-v2/reparto.js');
const SES = require('../js/core-v2/sesion.js');
const PLAN = require('../js/core-v2/plan.js');
const { profiles } = require('../../scripts/simular-reglas-articulares.js');

const muestra = [profiles[0], profiles[17], profiles[40], profiles[75]];
const fresco = () => JSON.parse(JSON.stringify(A.barrido(muestra).map(f => ({ d: f.d, p: f.p, pl: f.pl, claves: f.claves }))));
const ctxBase = { codigo: { estado: 'cumple', resumen: 'ok', detalle: [] }, minutosCortos: [30] };
const estado = (filas, id, ctx) => A.evaluar(filas, Object.assign({}, ctxBase, ctx)).find(r => r.id === id).estado;

test('con planes sanos y un código limpio, los criterios de la muestra cumplen (y el 7 es un informe con su tabla)', () => {
  const r = A.evaluar(fresco(), ctxBase);
  assert.equal(r.length, 15);
  r.filter(x => ![7, 9].includes(x.id)).forEach(x => assert.notEqual(x.estado, 'no cumple', `${x.id}: ${x.resumen}`));
  const siete = r.find(x => x.id === 7); assert.equal(siete.estado, 'informe'); assert.match(siete.tabla, /\| Pecho \|/); assert.match(siete.tabla, /3 días/);
});

test('cada criterio sobre el plan generado falla si se rompe su regla', () => {
  const rompe = (id, fn, ctx) => { const f = fresco(); fn(f); assert.equal(estado(f, id, ctx), 'no cumple', `criterio ${id}`); };
  rompe(1, f => { f[0].pl.sesiones[0].minutos = f[0].pl.sesiones[0].capacidadMin + 5; });
  rompe(2, f => { const k = f.findIndex(x => x.claves.some(c => /^tiron/.test(c))); const j = f[k].claves.findIndex(c => /^tiron/.test(c)); f[k].pl.sesiones[j].ejercicios = f[k].pl.sesiones[j].ejercicios.filter(e => e.patron !== 'tiron_vertical'); });
  rompe(3, f => { const s = f.flatMap(x => x.pl.sesiones).find(x => x.ejercicios.some(e => e.topSet)); s.ejercicios.find(e => e.topSet).patron = 'bisagra_falsa'; });
  rompe(5, f => { const s = f[0].pl.sesiones[0]; const id = 'quads.squat_back'; s.ejercicios.push({ varianteId: id, patron: 'sentadilla', series: 3 }, { varianteId: 'hamstrings.rdl', patron: 'bisagra', series: 3 }); });
  rompe(6, f => { f[0].pl.sesiones[0].fraccionado.chest = 14; f[0].pl.avisos.r1Excedido = []; });
  rompe(11, f => { const k = f.findIndex(x => x.claves.length); const s = f[k].pl.sesiones[0]; const pr = REP.TIPOS[f[k].claves[0]].principal; s.ejercicios.filter(e => e.patron === pr).forEach(e => { e.series = 1; }); f[k].pl.avisos.principalReducido = []; f[k].pl.avisos.obligatoriosSinLugar = []; });
  rompe(12, f => { f[0].pl.sesiones.forEach(s => s.ejercicios.forEach(e => { if (e.grupo === 'biceps') e.series = 1; })); f[0].pl.avisos.sinDirecto = []; f[0].pl.avisoUnico = null; });
  rompe(15, f => { const s = f[0].pl.sesiones[0]; s.ejercicios.push({ varianteId: 'quads.squat_back', patron: 'sentadilla', series: 3 }, { varianteId: 'hamstrings.rdl', patron: 'bisagra', series: 3 }); });
  rompe(9, f => { f[0].pl.semanal.chest.cubierto = 1; f[0].pl.avisoUnico = null; });
  rompe(14, () => {}, { codigo: { estado: 'no cumple', resumen: 'x', detalle: [] } });
});

test('el criterio 6 distingue entre pasar de 11 con aviso (cumple con aviso) y sin aviso (no cumple)', () => {
  const f = fresco(); f[0].pl.sesiones[0].fraccionado.chest = 13;
  f[0].pl.avisos.r1Excedido = [{ sesion: f[0].pl.sesiones[0].nombre, varianteId: 'x', musculos: [{ musculo: 'chest' }] }];
  assert.equal(estado(f, 6), 'cumple con aviso');
  f[0].pl.avisos.r1Excedido = [];
  assert.equal(estado(f, 6), 'no cumple');
});

test('los criterios que regeneran planes fallan si se rompe la función que prueban (rutina corta, aceptación, prioritarios, tope de series)', () => {
  const guardar = { s: SES.sesionConTiempo, v: PLAN.aceptacionVigente, g: REP.generarPlan, r: PLAN.regenerar };
  try {
    SES.sesionConTiempo = (p, i, m) => Object.assign({}, guardar.s(p, i, m), { minutos: m + 10 });
    assert.equal(estado(fresco(), 4), 'no cumple', 'la rutina corta se pasa del tiempo');
    SES.sesionConTiempo = (p, i, m) => Object.assign({}, guardar.s(p, i, m), { ejercicios: [], faltantes: [], avisos: [] });
    assert.equal(estado(fresco(), 4), 'no cumple', 'faltan patrones obligatorios sin aviso');
    SES.sesionConTiempo = guardar.s;
    PLAN.aceptacionVigente = () => true;
    assert.equal(estado(fresco(), 8), 'no cumple', 'la aceptación no caduca');
    PLAN.aceptacionVigente = guardar.v;
    PLAN.regenerar = (p, o) => Object.assign({}, guardar.r(p, o), { aceptaciones: [{ sesion: 0 }] });
    assert.equal(estado(fresco(), 8), 'no cumple', 'regenerar conserva la aceptación');
    PLAN.regenerar = guardar.r;
    REP.generarPlan = (p, o) => { const x = guardar.g(p, o); if (p.prioritarios) x.sesiones.forEach(s => { s.ejercicios = s.ejercicios.filter(e => !p.prioritarios.includes(e.varianteId)); }); return x; };
    assert.equal(estado(fresco(), 10), 'no cumple', 'un prioritario no aparece');
    REP.generarPlan = (p, o) => { const x = guardar.g(p, o); if (!o) x.sesiones[0].ejercicios.forEach(e => { e.series = 8; }); return x; };
    assert.equal(estado(fresco(), 13), 'no cumple', 'ejercicios de más de 5 series sin aviso');
    REP.generarPlan = (p, o) => { const x = guardar.g(p, o); if (o && o.sinTopePorEjercicio) x.sesiones[0].series += 50; return x; };
    assert.equal(estado(fresco(), 13), 'no cumple', 'el tope baja el volumen total');
  } finally { SES.sesionConTiempo = guardar.s; PLAN.aceptacionVigente = guardar.v; REP.generarPlan = guardar.g; PLAN.regenerar = guardar.r; }
});

test('el informe lista cada criterio con su resultado y no se corrige nada: el criterio de código revisa el código real', () => {
  const c = A.codigo();
  assert.ok(['cumple', 'no cumple'].includes(c.estado) && c.totales.numeros >= 0);
  const md = A.informe(fresco(), A.evaluar(fresco(), { codigo: c, minutosCortos: [30] }));
  for (let i = 1; i <= 15; i++) assert.ok(md.includes(`## ${i}. `), `falta el criterio ${i}`);
  assert.match(md, /Solo lee/);
});

test('el criterio 9 mide tres cosas por separado: la frecuencia mínima, los pisos fraccionados y las series reales; cada una rota lo hace fallar y sin romper nada cumple', () => {
  const sano = () => { const f = fresco(); f.forEach(x => REP.MUSCULOS.forEach(m => { const s = x.pl.semanal[m]; s.sesiones = 2; s.cubierto = Math.max(s.cubierto, s.piso); s.faltaReal = 0; })); return f; };
  assert.equal(estado(sano(), 9), 'cumple');
  const rompe = fn => { const f = sano(); fn(f); f.forEach(x => { x.pl.avisoUnico = null; }); return estado(f, 9); };
  assert.equal(rompe(f => { f[0].pl.semanal.chest.sesiones = 1; }), 'no cumple', 'frecuencia');
  assert.equal(rompe(f => { f[0].pl.semanal.chest.cubierto = f[0].pl.semanal.chest.piso - 3; }), 'no cumple', 'piso fraccionado');
  assert.equal(rompe(f => { f[0].pl.semanal.back.faltaReal = 2; }), 'no cumple', 'series reales');
  // con el aviso único que nombra al músculo, el piso y las series reales cumplen (la frecuencia no tiene aviso)
  const f = sano(); f[0].pl.semanal.chest.cubierto = 0; f[0].pl.semanal.back.faltaReal = 2; f[0].pl.avisoUnico = { sinCubrir: [{ musculo: 'chest' }, { musculo: 'back' }], sinDirecto: [] };
  assert.equal(estado(f, 9), 'cumple');
});

test('el criterio 2 también falla si el top set de un día de tirón no es un tirón (aunque estén los dos tirones)', () => {
  const f = fresco();
  const x = f.find(y => y.claves.some((c, i) => /^tiron/.test(c) && y.pl.sesiones[i].ejercicios.some(e => e.topSet)));
  assert.ok(x, 'la muestra trae un día de tirón con top set');
  const i = x.claves.findIndex((c, k) => /^tiron/.test(c) && x.pl.sesiones[k].ejercicios.some(e => e.topSet));
  const s = x.pl.sesiones[i];
  s.ejercicios.push({ varianteId: 'a', patron: 'tiron_vertical', series: 2 }, { varianteId: 'b', patron: 'tiron_horizontal', series: 2 });
  s.ejercicios.find(e => e.topSet).patron = 'empuje_horizontal';
  const r = A.evaluar(f, ctxBase).find(z => z.id === 2);
  assert.equal(r.estado, 'no cumple'); assert.ok(r.detalle.some(d => /top set en/.test(d)));
});

test('el criterio 8 también falla si la aceptación caduca de más (por un cambio que no es de tiempo, días ni objetivo)', () => {
  const v = PLAN.aceptacionVigente;
  try {
    PLAN.aceptacionVigente = (g, p, i) => v(g, p, i) && p.name !== 'Otro';
    assert.equal(estado(fresco(), 8), 'no cumple');
  } finally { PLAN.aceptacionVigente = v; }
});

test('el criterio 4 falla si los avisos de la rutina corta no coinciden con los patrones que no caben', () => {
  const g = SES.sesionConTiempo;
  try {
    SES.sesionConTiempo = (p, i, m) => { const r = g(p, i, m); return r.faltantes.length ? Object.assign({}, r, { avisos: r.avisos.concat([{ regla: 'x', texto: 'sobra' }]) }) : r; };
    assert.equal(estado(fresco(), 4, { minutosCortos: [20] }), 'no cumple');
  } finally { SES.sesionConTiempo = g; }
});
