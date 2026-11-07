#!/usr/bin/env node
/* DEC-021: simula, sin aplicarlas, cuántas veces se dispararían A1, A2 y A4 de la Fase 3 sobre el barrido
   de 360 planes (90 perfiles × 3, 4, 5 y 6 días), con la tabla vigente de perfil_articular.
   Solo lee: no cambia el plan ni implementa ninguna regla.
   A1: un ejercicio de lumbar alta después de dos o más de lumbar media o alta (orden actual del generador).
   A2: más de un ejercicio de lumbar alta en una sesión. A4: más de dos ejercicios de hombro alta en una sesión. */
'use strict';
const path = require('node:path');
const E = require(path.join(__dirname, '../ifbb-pro-agent/js/engine.js'));
const K = require(path.join(__dirname, '../ifbb-pro-agent/js/knowledge.js'));

const base = { name: 'T', sex: 'M', age: 30, heightCm: 178, weightKg: 85, bodyFatPct: 15, activity: 'moderate' };
const profiles = [];
for (const level of ['novice', 'intermediate', 'advanced']) for (const goal of ['cut', 'bulk', 'maintain'])
  for (const [sex, division] of [['M', 'general_m'], ['M', 'classic_m'], ['M', 'physique_m'], ['F', 'bikini_w'], ['F', 'wellness_w']])
    for (const lag of [[], ['quads', 'hamstrings', 'glutes']]) profiles.push({ ...base, sex, division, level, goal, laggingMuscles: lag });

const lv = (id, j) => K.JOINT_PROFILE[id][j].nivel;
function simulate(days, extra) {
  const c = { planes: 0, A1: 0, A2: 0, A4: 0, alguna: 0, sesiones: 0, sA1: 0, sA2: 0, sA4: 0, hamSets: 0, maxCurl: 0, r1: 0, avisoA2: 0, sobre25: 0, planesSobre25: 0 };
  for (const p of profiles) {
    const t = E.buildPlan({ ...p, ...(extra || {}), daysPerWeek: days }, '2026-11-07').training; c.planes++;
    let a1 = false, a2 = false, a4 = false;
    t.sessions.forEach(s => {
      c.sesiones++;
      const ids = s.exercises.map(e => e.exerciseId), lum = ids.map(i => lv(i, 'lumbar'));
      const f1 = lum.some((x, i) => x === 'alta' && lum.slice(0, i).filter(y => y !== 'baja').length >= 2);
      const f2 = lum.filter(x => x === 'alta').length > 1;
      const f4 = ids.filter(i => lv(i, 'hombro') === 'alta').length > 2;
      if (f1) { a1 = true; c.sA1++; } if (f2) { a2 = true; c.sA2++; } if (f4) { a4 = true; c.sA4++; }
    });
    c.hamSets += t.sessions.reduce((a, s) => a + s.exercises.filter(e => e.bucket === 'hamstrings').reduce((b, e) => b + e.sets, 0), 0);
    t.sessions.forEach(s => s.exercises.filter(e => e.exerciseId === 'hamstrings.leg_curl').forEach(e => { c.maxCurl = Math.max(c.maxCurl, e.sets); }));
    { const n = t.sessions.filter(x => x.totalSets > t.sessionLimit.cap).length; c.sobre25 += n; if (n) c.planesSobre25++; }
    c.r1 += t.warnings.filter(w => w.rule === 'R1').length; if (t.warnings.some(w => w.kind === 'tope_lumbar')) c.avisoA2++;
    if (a1) c.A1++; if (a2) c.A2++; if (a4) c.A4++; if (a1 || a2 || a4) c.alguna++;
  }
  return c;
}
module.exports = { simulate, profiles };

if (require.main === module) {
  const pc = (a, b) => `${a} (${(100 * a / b).toFixed(1)} %)`;
  const extra = process.argv.includes('--barra') ? { barbellRow: true } : {};
  console.log(process.argv.includes('--barra') ? 'Con el remo con barra elegido por el usuario' : 'Plan por defecto (remo con apoyo de pecho)');
  const T = { planes: 0, A1: 0, A2: 0, A4: 0, alguna: 0, sesiones: 0, sA1: 0, sA2: 0, sA4: 0, hamSets: 0, maxCurl: 0, r1: 0, avisoA2: 0, sobre25: 0, planesSobre25: 0 };
  [3, 4, 5, 6].forEach(d => {
    const c = simulate(d, extra); Object.keys(T).forEach(k => { T[k] = k === 'maxCurl' ? Math.max(T[k], c[k]) : T[k] + c[k]; });
    console.log(`${d} días · ${c.planes} planes: A1 ${pc(c.A1, c.planes)} · A2 ${pc(c.A2, c.planes)} · A4 ${pc(c.A4, c.planes)} · series de isquios ${c.hamSets} · máx. series de curl ${c.maxCurl} · avisos R1 ${c.r1} · planes con aviso A2 ${c.avisoA2} · sesiones sobre 25 sin aceptación ${c.sobre25} (en ${c.planesSobre25} planes)`);
  });
  console.log(`TOTAL · ${T.planes} planes: A1 ${pc(T.A1, T.planes)} · A2 ${pc(T.A2, T.planes)} · A4 ${pc(T.A4, T.planes)} · alguna ${pc(T.alguna, T.planes)} · series de isquios ${T.hamSets} · máx. series de curl ${T.maxCurl} · avisos R1 ${T.r1} · planes con aviso A2 ${T.avisoA2} · sesiones sobre 25 sin aceptación ${T.sobre25} (en ${T.planesSobre25} planes)`);
  console.log(`Sesiones (${T.sesiones}): A1 ${pc(T.sA1, T.sesiones)} · A2 ${pc(T.sA2, T.sesiones)} · A4 ${pc(T.sA4, T.sesiones)}`);
}
