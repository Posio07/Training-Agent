#!/usr/bin/env node
/* DEC-022: verifica, plan por plan, por qué aparecen avisos R1 nuevos entre el motor de `main` (antes del Paso 2) y el motor actual.
 *
 *   node scripts/verificar-avisos-r1.js [carpeta-con-ifbb-pro-agent-del-motor-anterior]
 *
 * Sin argumento extrae `origin/main` (git archive) en una carpeta temporal. Solo lee: no cambia nada del repo.
 * Para cada aviso R1 (sesión y músculo) que está en el motor actual y no en el anterior, comprueba:
 *  (1) antes del paso del mínimo de grupos chicos (DEC-020), el motor anterior ya tenía esa sesión sobre el umbral de R1 para ese músculo;
 *  (2) ese paso, en el motor anterior, le sacó series a ese músculo en esa sesión (por eso no había aviso);
 *  (3) en el motor actual, antes de ese paso la sesión también estaba sobre el umbral y ese paso le sacó MENOS series a ese músculo en esa sesión
 *      (nada, o menos que antes), de modo que la sesión queda sobre el umbral.
 * Para medir "antes del paso" se inyecta una línea en una COPIA temporal de engine.js (nunca en el repo). */
'use strict';
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r1-'));
let prevDir = process.argv[2];
if (!prevDir) {
  prevDir = path.join(tmp, 'antes');
  fs.mkdirSync(prevDir);
  cp.execSync(`git -C "${ROOT}" archive origin/main ifbb-pro-agent/js | tar -x -C "${prevDir}"`);
}
// Copia instrumentada de un motor: guarda las series por ejercicio justo antes del paso del mínimo de grupos chicos.
function instrumented(dirWithAgent, label) {
  const dest = path.join(tmp, label);
  fs.mkdirSync(path.join(dest, 'ifbb-pro-agent', 'js'), { recursive: true });
  for (const f of fs.readdirSync(path.join(dirWithAgent, 'ifbb-pro-agent', 'js'))) fs.copyFileSync(path.join(dirWithAgent, 'ifbb-pro-agent', 'js', f), path.join(dest, 'ifbb-pro-agent', 'js', f));
  const file = path.join(dest, 'ifbb-pro-agent', 'js', 'engine.js');
  const src = fs.readFileSync(file, 'utf8');
  const marker = '    const minResult = ensureGroupMinimum(';
  if (!src.includes(marker)) throw new Error('no se encontró el paso del mínimo en ' + file);
  fs.writeFileSync(file, src.replace(marker, "    global.__pre = sessions.map(s => s.exercises.map(e => ({ id: e.exerciseId, sets: e.sets, w: e.setWeights })));\n" + marker));
  return require(file);
}
const Eold = instrumented(prevDir, 'a'), Enew = instrumented(ROOT, 'n');
const { profiles } = require('./simular-reglas-articulares.js');
const frac = (list, mu) => list.reduce((a, e) => a + e.sets * ((e.w && e.w[mu]) || 0), 0);
const r1 = 11;
let nuevos = 0, ok = 0, nada = 0, menos = 0; const fallan = [];
[3, 4, 5, 6].forEach(d => profiles.forEach((p, k) => {
  const q = Object.assign({}, p, { daysPerWeek: d });
  const to = Eold.buildPlan(q, '2026-11-07').training, preOld = global.__pre;
  const tn = Enew.buildPlan(q, '2026-11-07').training, preNew = global.__pre;
  const set = t => new Set(t.warnings.filter(w => w.rule === 'R1').map(w => t.sessions.findIndex(s => s.name === w.session) + '|' + w.muscle));
  const so = set(to);
  [...set(tn)].filter(x => !so.has(x)).forEach(x => {
    nuevos++;
    const [si, mu] = [Number(x.split('|')[0]), x.split('|')[1]];
    const setsOf = (pre, t) => { // series de ese músculo (ponderadas) antes y después del paso del mínimo en esa sesión
      const post = t.sessions[si].exercises.map(e => ({ id: e.exerciseId, sets: e.sets, w: e.setWeights }));
      return { antes: frac(pre[si], mu), despues: frac(post, mu) };
    };
    const o = setsOf(preOld, to), n = setsOf(preNew, tn);
    const c1 = o.antes > r1, c2 = o.despues < o.antes - 1e-9 && o.despues <= r1;
    const ninguna = n.despues >= n.antes - 1e-9, c3 = n.antes > r1 && n.despues > r1 && n.despues > o.despues + 1e-9;
    if (c1 && c2 && c3) { ok++; if (ninguna) nada++; else menos++; } else fallan.push({ dias: d, perfil: k, sesion: si, musculo: mu, anterior: o, actual: n });
  });
}));
console.log(`Avisos R1 nuevos: ${nuevos}. Con el mecanismo comprobado en los tres puntos: ${ok} (el paso del mínimo no le sacó nada a ese músculo en esa sesión: ${nada}; le sacó menos que antes: ${menos}). Que no lo cumplen: ${fallan.length}.`);
fallan.slice(0, 5).forEach(f => console.log(JSON.stringify(f)));
process.exitCode = fallan.length ? 1 : 0;
