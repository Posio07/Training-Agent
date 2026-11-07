#!/usr/bin/env node
/* Diagnóstico (solo lee, no cambia nada): sesiones de más de 25 series sin aceptación del usuario en el barrido de
 * 360 planes (90 perfiles × 3, 4, 5 y 6 días). Reproduce las cifras de docs/research/diagnostico-sesiones-sobre-25.md:
 *   - si cada sesión pasada del tope tiene su aviso propio en el plan;
 *   - distribución por días del split, por sesión, por número de series y por perfil;
 *   - composición (series de multiarticulares y de aislamiento) y duración estimada;
 *   - demanda semanal (series que quedaron + series que recortó el tope) frente a la capacidad (días × tope).
 *   node scripts/diagnostico-sesiones-sobre-25.js */
'use strict';
const path = require('node:path');
const E = require(path.join(__dirname, '../ifbb-pro-agent/js/engine.js'));
const { profiles } = require('./simular-reglas-articulares.js');

const rows = [], sinAviso = [], agg = {};
[3, 4, 5, 6].forEach(d => profiles.forEach((p, k) => {
  const t = E.buildPlan(Object.assign({}, p, { daysPerWeek: d }), '2026-11-07').training;
  const fin = t.sessions.reduce((a, s) => a + s.totalSets, 0), cut = t.sessionLimit.trimmed.reduce((a, x) => a + (x.from - x.to), 0);
  const comp = t.sessions.reduce((a, s) => a + s.exercises.filter(e => e.type === 'compound').reduce((b, e) => b + e.sets, 0), 0);
  const over = t.sessions.some(s => s.totalSets > t.sessionLimit.cap);
  const key = `${d} días ${over ? 'con sesión sobre el tope' : 'sin sesión sobre el tope'}`;
  const a = agg[key] = agg[key] || { n: 0, fin: 0, cut: 0, comp: 0, cap: d * t.sessionLimit.cap };
  a.n++; a.fin += fin; a.cut += cut; a.comp += comp;
  t.sessions.forEach((s, i) => {
    if (s.totalSets <= t.sessionLimit.cap) return;
    const aviso = t.warnings.some(w => w.text && w.text.startsWith(`${s.name}: ${s.totalSets} series, por encima de las`));
    if (!aviso) sinAviso.push([d, k, s.name, s.totalSets]);
    rows.push({ d, k, p, name: s.name.replace(/^Día \d+ · /, ''), n: s.totalSets, cat: E.SPLITS[d].days[i].category,
      compuestas: s.exercises.filter(e => e.type === 'compound').reduce((a, e) => a + e.sets, 0), aisladas: s.exercises.filter(e => e.type === 'isolation').reduce((a, e) => a + e.sets, 0), min: s.durationMin });
  });
}));

const cuenta = f => rows.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const planes = new Set(rows.map(r => `${r.d}-${r.k}`));
console.log(`Sesiones sobre el tope: ${rows.length} en ${planes.size} planes. Con aviso propio en el plan: ${rows.length - sinAviso.length}. Sin aviso: ${sinAviso.length}.`);
console.log('Por días del split:', cuenta(r => `${r.d} días`));
console.log('Por sesión:', cuenta(r => `${r.d} días · ${r.name}`));
console.log('Por número de series:', cuenta(r => (r.n >= 30 ? '30 o más' : String(r.n))), '| de 30 o más, por días:', cuenta(r => (r.n >= 30 ? `${r.d} días` : '-')));
console.log('Por división:', cuenta(r => r.p.division), '| nivel:', cuenta(r => r.p.level), '| objetivo:', cuenta(r => r.p.goal), '| piernas rezagadas:', cuenta(r => (r.p.laggingMuscles.length ? 'sí' : 'no')));
const med = [...rows.map(r => r.compuestas)].sort((a, b) => a - b)[Math.floor(rows.length / 2)];
console.log(`Composición: sin aislamiento ${rows.filter(r => r.aisladas === 0).length}; con 2 o menos ${rows.filter(r => r.aisladas <= 2).length}; mediana de series de multiarticulares ${med}; más de 90 min ${rows.filter(r => r.min > 90).length}; máximo ${Math.max(...rows.map(r => r.min))} min; máximo ${Math.max(...rows.map(r => r.n))} series.`);
console.log('Demanda semanal (series que quedaron + recortadas) frente a la capacidad (días × tope), promedio por plan:');
Object.entries(agg).forEach(([k, a]) => console.log(`  ${k}: ${a.n} planes · demanda ${((a.fin + a.cut) / a.n).toFixed(1)} · capacidad ${a.cap} · series de multiarticulares ${(a.comp / a.n).toFixed(1)}`));
process.exitCode = sinAviso.length ? 1 : 0;
