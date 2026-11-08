#!/usr/bin/env node
/* EN CONSTRUCCIÓN · núcleo v2, paso 2 (B-039). Vista previa del reparto nuevo frente al motor actual (solo lee, no
 * cambia nada). Para cada perfil muestra tres planes y separa de dónde viene cada diferencia:
 *   A · motor actual (reparto viejo + catálogo viejo)
 *   B · reparto nuevo con el catálogo viejo emulado (cada ejercicio con "o" como una sola entrada)
 *   C · reparto nuevo con el catálogo nuevo (patrones y variantes)
 * Diferencia A→B = efecto del REPARTO. Diferencia B→C = efecto del CATÁLOGO.
 *
 *   node scripts/vista-previa-reparto.js [--md] [--minutos 60,75,90] [perfil.json ...]
 *
 * Sin archivos usa dos perfiles de referencia del repo (el de Emanuel de engine.test.js y uno de bikini); los datos
 * reales de los perfiles viven en el dispositivo y no están en el repo: para verlos, exportar el perfil de la app a
 * JSON y pasarlo como argumento. Con --md imprime el informe en Markdown. Además corre el barrido de 360 planes
 * (90 perfiles × 3, 4, 5 y 6 días) y reporta el porcentaje de planes en que R1 deja necesidad semanal sin cubrir. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const REG = require(path.join(__dirname, '../ifbb-pro-agent/js/core-v2/registro.js'));
const E = require(path.join(__dirname, '../ifbb-pro-agent/js/engine.js'));
const K = require(path.join(__dirname, '../ifbb-pro-agent/js/knowledge.js'));
const CAT = require(path.join(__dirname, '../ifbb-pro-agent/js/core-v2/catalogo.js'));
const REP = require(path.join(__dirname, '../ifbb-pro-agent/js/core-v2/reparto.js'));
const { profiles } = require('./simular-reglas-articulares.js');

const args = process.argv.slice(2);
const md = args.includes('--md');
const minArg = args.indexOf('--minutos');
const minutosSens = minArg >= 0 ? args[minArg + 1].split(',').map(Number) : [60, 75, 90];
const archivos = args.filter((a, i) => !a.startsWith('--') && !(minArg >= 0 && i === minArg + 1));
const HOY = '2026-11-07';
const CAT_VIEJO = CAT.catalogoViejoEmulado(K);
const ETQ = Object.assign({}, K.MUSCLE_LABELS);

const emanuel = { name: 'Emanuel (referencia: perfil de engine.test.js)', sex: 'M', age: 28, heightCm: 175, weightKg: 78, bodyFatPct: 14, activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'physique_m', goal: 'cut', laggingMuscles: ['quads', 'hamstrings', 'glutes'] };
const pareja = { name: 'Pareja (referencia: bikini intermedia en definición)', sex: 'F', age: 28, heightCm: 165, weightKg: 60, bodyFatPct: 24, activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'bikini_w', goal: 'cut', laggingMuscles: ['glutes'] };
const lista = archivos.length ? archivos.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))).map(j => j.data || j) : [emanuel, pareja];

const r1 = x => Math.round(x * 10) / 10;
const semanalViejo = t => { const w = {}; t.sessions.forEach(s => Object.entries(s.fractionalSets || {}).forEach(([m, v]) => { w[m] = (w[m] || 0) + v; })); return w; };
const linea = (s, n) => `${s}`.padEnd(n);

function viejo(p) {
  const t = E.buildPlan(p, HOY).training;
  return {
    sesiones: t.sessions.map(s => ({ nombre: s.name, series: s.totalSets, minutos: s.durationMin, ej: s.exercises.map(e => `${e.topSet ? '★' : ''}${e.name} ×${e.sets}`) })),
    semanal: semanalViejo(t), directas: t.weeklySets,
  };
}
function nuevo(p, cat, extra) {
  const pl = REP.generarPlan(Object.assign({}, p, extra || {}), { catalogo: cat });
  return {
    sesiones: pl.sesiones.map(s => ({ nombre: s.nombre, series: s.series, minutos: s.minutos, ej: s.ejercicios.map(e => `${e.topSet ? '★' : ''}${e.nombre} ×${e.series}`) })),
    semanal: Object.fromEntries(Object.entries(pl.semanal).map(([m, x]) => [m, x.cubierto])), directas: Object.fromEntries(Object.entries(pl.semanal).map(([m, x]) => [m, x.directas])), plan: pl,
  };
}

const out = [];
const P = s => out.push(s);
P(md ? '# Vista previa del reparto nuevo (paso 2)' : 'VISTA PREVIA DEL REPARTO NUEVO (paso 2)');
P('');
P('Generada con `node scripts/vista-previa-reparto.js --md`. A = motor actual · B = reparto nuevo con el catálogo viejo emulado · C = reparto nuevo con el catálogo nuevo. **A→B es el efecto del reparto; B→C es el efecto del catálogo.** Las series de "cubierto" son fraccionadas (directa 1, indirecta 0,5). Los perfiles de referencia no son los datos reales de Emanuel ni de su pareja (viven en el dispositivo); para verlos, exportar el perfil a JSON y pasarlo como argumento.');
P('');

lista.forEach(p => {
  const A = viejo(p), B = nuevo(p, CAT_VIEJO), C = nuevo(p, CAT);
  const pl = C.plan, dem = pl.semanal;
  P(`${md ? '## ' : '== '}${p.name || 'Perfil'} · ${p.daysPerWeek} días · ${p.division} · ${p.goal} · ${p.level}${(p.laggingMuscles || []).length ? ' · rezagados: ' + p.laggingMuscles.map(m => ETQ[m]).join(', ') : ''}`);
  P('');
  P(md ? '### Sesiones (series y minutos)' : '-- Sesiones');
  P(md ? '| Sesión | A series | A min | B series | B min | C series | C min usados | C min disponibles | C usado |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |' : '');
  A.sesiones.forEach((sa, i) => {
    const sb = B.sesiones[i], sc = C.sesiones[i];
    const cap = pl.sesiones[i].capacidadMin;
    P(md ? `| ${sa.nombre} → ${sc.nombre} | ${sa.series} | ${sa.minutos} | ${sb.series} | ${sb.minutos} | ${sc.series} | ${sc.minutos} | ${cap} | ${Math.round(sc.minutos / cap * 100)} % |` : `${linea(sa.nombre, 28)} A ${sa.series}s/${sa.minutos}m · B ${sb.series}s/${sb.minutos}m · C ${sc.series}s/${sc.minutos}m`);
  });
  const sum = (arr, k) => arr.reduce((a, s) => a + s[k], 0);
  const capTotal = pl.sesiones.reduce((a, x) => a + x.capacidadMin, 0);
  P(md ? `| **Total semana** | ${sum(A.sesiones, 'series')} | ${sum(A.sesiones, 'minutos')} | ${sum(B.sesiones, 'series')} | ${sum(B.sesiones, 'minutos')} | ${sum(C.sesiones, 'series')} | ${sum(C.sesiones, 'minutos')} | ${capTotal} | ${Math.round(sum(C.sesiones, 'minutos') / capTotal * 100)} % |` : '');
  P('');
  P(`**Cómo leer los totales:** A es el motor actual (${sum(A.sesiones, 'series')} series y ${sum(A.sesiones, 'minutos')} min por semana); B y C son el reparto nuevo (${sum(C.sesiones, 'series')} series y ${sum(C.sesiones, 'minutos')} min por semana). Los minutos de A son los que estima el motor actual con sus descansos; los de B y C, con los descansos del registro.`);
  P('');
  P(md ? '### Series fraccionadas por semana y músculo' : '-- Series fraccionadas por semana');
  P(md ? '| Músculo | Necesidad | Piso | A | B | C | A→B (reparto) | B→C (catálogo) | Falta en C |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |' : '');
  REP.MUSCULOS.forEach(m => {
    const a = A.semanal[m] || 0, b = B.semanal[m] || 0, c = C.semanal[m] || 0, d = dem[m];
    const fila = [ETQ[m], d.necesidad, d.piso, r1(a), r1(b), r1(c), (b - a >= 0 ? '+' : '') + r1(b - a), (c - b >= 0 ? '+' : '') + r1(c - b), d.falta > 0 ? `${r1(d.falta)} (${d.causa})` : '—'];
    P(md ? `| ${fila.join(' | ')} |` : fila.join(' · '));
  });
  P('');
  P(md ? '### Series directas (garantía de series reales de los grupos mayores, DEC-014)' : '-- Series directas');
  P(md ? '| Músculo | Piso | A | B | C |\n| --- | --- | --- | --- | --- |' : '');
  REP.GRUPOS_MAYORES.forEach(m => { const fila = [ETQ[m], dem[m].piso, A.directas[m], B.directas[m], C.directas[m]]; P(md ? `| ${fila.join(' | ')} |` : fila.join(' · ')); });
  P('');
  P(md ? '### Ejercicios por sesión' : '-- Ejercicios');
  A.sesiones.forEach((sa, i) => {
    P(md ? `**${sa.nombre}**` : sa.nombre);
    P(`${md ? '- ' : '  '}A: ${sa.ej.join(' · ')}`);
    P(`${md ? '- ' : '  '}B: ${B.sesiones[i].nombre}: ${B.sesiones[i].ej.join(' · ')}`);
    P(`${md ? '- ' : '  '}C: ${C.sesiones[i].nombre}: ${C.sesiones[i].ej.join(' · ')}`);
    P('');
  });
  if (pl.avisoUnico) P(`Aviso único (C): ${JSON.stringify(pl.avisoUnico.sinCubrir)} ${pl.avisoUnico.obligatoriosSinLugar.length ? JSON.stringify(pl.avisoUnico.obligatoriosSinLugar) : ''}\n`);
  P(md ? '### Sensibilidad al tiempo disponible (C)' : '-- Sensibilidad al tiempo');
  minutosSens.forEach(min => {
    const c = nuevo(p, CAT, { tiempoDisponibleMin: min });
    P(`${md ? '- ' : '  '}${min} min por sesión: ${c.sesiones.map(s => `${s.series}s/${s.minutos}m`).join(' · ')} · sin cubrir: ${Object.entries(c.plan.semanal).filter(([, x]) => x.falta > 0).map(([m, x]) => `${ETQ[m]} ${r1(x.falta)} (${x.causa})`).join(', ') || 'nada'}`);
  });
  P('');
});

/* ---------- Barrido de 360 planes: R1 y capacidad ---------- */
const filas = [];
[3, 4, 5, 6].forEach(d => profiles.forEach(p => filas.push({ d, p, pl: REP.generarPlan(Object.assign({}, p, { daysPerWeek: d })) })));
const pct = (n, t) => `${Math.round(n / t * 1000) / 10} %`;
P(md ? '## Barrido de 360 planes (90 perfiles × 3, 4, 5 y 6 días) con el reparto nuevo y el catálogo nuevo' : '== Barrido de 360 planes');
P('');
const conR1 = filas.filter(f => Object.values(f.pl.semanal).some(x => x.causa === 'R1'));
const conFalta = filas.filter(f => f.pl.avisoUnico);
P(`- Planes en que **R1 deja necesidad semanal sin cubrir**: ${conR1.length} de ${filas.length} (${pct(conR1.length, filas.length)}).`);
P(`- Planes con algún aviso único (cualquier causa): ${conFalta.length} de ${filas.length} (${pct(conFalta.length, filas.length)}).`);
P(`- Sesiones por encima de su capacidad: ${filas.reduce((a, f) => a + f.pl.sesiones.filter(s => s.minutos > s.capacidadMin).length, 0)} (la restricción de capacidad no se rompe).`);
P(`- Sesiones por encima de 11 series fraccionadas de un músculo: ${filas.reduce((a, f) => a + f.pl.sesiones.filter(s => Object.values(s.fraccionado).some(v => v > 11 + 1e-9)).length, 0)}, todas por una demanda mínima que gana sobre R1 (DEC-025, punto 4); eventos registrados: ${filas.reduce((a, f) => a + f.pl.avisos.r1Excedido.length, 0)}.`);
P(`- Minutos por sesión (promedio / máximo): ${r1(filas.reduce((a, f) => a + f.pl.sesiones.reduce((b, s) => b + s.minutos, 0), 0) / filas.reduce((a, f) => a + f.pl.sesiones.length, 0))} / ${Math.max(...filas.flatMap(f => f.pl.sesiones.map(s => s.minutos)))}.`);
P('');
P(md ? '| Músculo | Planes con necesidad sin cubrir por R1 | 3 días | 4 días | 5 días | 6 días |\n| --- | --- | --- | --- | --- | --- |' : 'Por músculo y por número de días (planes con la necesidad sin cubrir por R1):');
REP.MUSCULOS.forEach(m => {
  const por = d => filas.filter(f => f.d === d && f.pl.semanal[m].causa === 'R1').length;
  const tot = filas.filter(f => f.pl.semanal[m].causa === 'R1').length;
  const fila = [ETQ[m], `${tot} (${pct(tot, filas.length)})`, ...[3, 4, 5, 6].map(d => `${por(d)} de 90`)];
  P(md ? `| ${fila.join(' | ')} |` : fila.join(' · '));
});
P('');
const causas = {};
filas.forEach(f => Object.entries(f.pl.semanal).forEach(([m, x]) => { if (x.causa) causas[x.causa] = (causas[x.causa] || 0) + 1; }));
P(`Músculos sin cubrir por causa (en grupo-planes): ${JSON.stringify(causas)}.`);

/* ---------- Indicadores del paso 2b ---------- */
P('');
P(md ? '## Indicadores del paso 2b (patrón principal, ejercicio directo, hip thrust, R1 por días, minutos)' : '== Indicadores del paso 2b');
P('');
const sesAll = filas.flatMap(f => f.pl.sesiones.map(x => ({ d: f.d, p: f.p, s: x })));
const principalDe = x => (x.s.ejercicios.find(e => e.patron === x.s.principal) || { series: 0 }).series;
const dist = {};
sesAll.forEach(x => { const n = principalDe(x); dist[n] = (dist[n] || 0) + 1; });
P(`- **Series del patrón principal** (1620 sesiones): ${Object.keys(dist).sort((a, b) => a - b).map(k => `${k} series: ${dist[k]} (${pct(dist[k], sesAll.length)})`).join(' · ')}. Con la mínima en 4, las sesiones que no llegan son las que no caben en el tiempo.`);
const prom = ms => r1(ms.reduce((a, b) => a + b, 0) / (ms.length || 1));
['biceps', 'triceps', 'calves', 'abs'].forEach(m => {
  const conDirecto = filas.filter(f => f.pl.sesiones.some(x => x.ejercicios.some(e => e.grupo === m && e.series >= 2))).length;
  P(`- **Cobertura directa de ${ETQ[m]}**: ${conDirecto} de ${filas.length} planes (${pct(conDirecto, filas.length)}) con al menos un ejercicio directo de 2 series o más; series directas por semana (promedio / mínimo / máximo): ${prom(filas.map(f => f.pl.semanal[m].directas))} / ${Math.min(...filas.map(f => f.pl.semanal[m].directas))} / ${Math.max(...filas.map(f => f.pl.semanal[m].directas))}; fraccionadas (promedio): ${prom(filas.map(f => f.pl.semanal[m].cubierto))}.`);
});
const hip = f => f.pl.sesiones.reduce((a, x) => a + x.ejercicios.filter(e => e.varianteId === 'glutes.hip_thrust').length, 0);
const enfGlu = p => ['bikini_w', 'wellness_w', 'figure_w'].includes(p.division) || (p.laggingMuscles || []).includes('glutes');
P(`- **Hip thrust**: aparece en ${filas.reduce((a, f) => a + hip(f), 0)} de ${sesAll.length} sesiones; en los ${filas.filter(f => f.p.division === 'bikini_w').length} planes de bikini: ${filas.filter(f => f.p.division === 'bikini_w').reduce((a, f) => a + hip(f), 0)}; en los ${filas.filter(f => enfGlu(f.p)).length} planes con énfasis en glúteos (bikini, wellness, figure o glúteos rezagados): ${filas.filter(f => enfGlu(f.p)).reduce((a, f) => a + hip(f), 0)}. En los dos perfiles de referencia: ${lista.map(p => `${(p.name || 'Perfil').split(' (')[0]}: ${REP.generarPlan(p).sesiones.reduce((a, x) => a + x.ejercicios.filter(e => e.varianteId === 'glutes.hip_thrust').length, 0)}`).join(' · ')}.`);
P('');
P(md ? '| Días | Planes | R1 deja necesidad sin cubrir | Con algún aviso único | Minutos usados por sesión (promedio / máximo) | Capacidad usada (promedio) | Sesiones al 90 % o más del tiempo |\n| --- | --- | --- | --- | --- | --- | --- |' : 'Por número de días:');
[3, 4, 5, 6].forEach(d => {
  const fd = filas.filter(f => f.d === d), sd = sesAll.filter(x => x.d === d);
  const fila = [d, fd.length, `${fd.filter(f => Object.values(f.pl.semanal).some(x => x.causa === 'R1')).length} (${pct(fd.filter(f => Object.values(f.pl.semanal).some(x => x.causa === 'R1')).length, fd.length)})`, `${fd.filter(f => f.pl.avisoUnico).length} (${pct(fd.filter(f => f.pl.avisoUnico).length, fd.length)})`, `${prom(sd.map(x => x.s.minutos))} / ${Math.max(...sd.map(x => x.s.minutos))}`, pct(sd.reduce((a, x) => a + x.s.minutos, 0), sd.reduce((a, x) => a + x.s.capacidadMin, 0)), sd.filter(x => x.s.minutos >= 0.9 * x.s.capacidadMin).length];
  P(md ? `| ${fila.join(' | ')} |` : fila.join(' · '));
});
P('');
/* Espalda sin cubrir por R1 a 5 y 6 días: dónde aparece la espalda y qué pasaría si el split la alojara en más sesiones. */
P(md ? '### Espalda y R1 a 5 y 6 días' : '-- Espalda y R1');
P('');
[3, 4, 5, 6].forEach(d => {
  const tipos = REP.SPLITS[d].map(([n, k]) => ({ n, k, back: REP.TIPOS[k].grupos.includes('back') }));
  P(`- ${d} días: la espalda puede entrar en ${tipos.filter(t => t.back).length} de ${d} sesiones (${tipos.filter(t => t.back).map(t => t.n).join('; ')}). Con R1 en 11 series fraccionadas por sesión, el techo semanal de la espalda es ${tipos.filter(t => t.back).length * 11}.`);
});
const espaldaR1 = filas.filter(f => f.pl.semanal.back.causa === 'R1');
P('');
P(`Planes con la espalda sin cubrir por R1: ${espaldaR1.length}. Necesidad de espalda de esos planes: ${[...new Set(espaldaR1.map(f => f.pl.semanal.back.necesidad))].join(', ')} series; cubierto: ${[...new Set(espaldaR1.map(f => f.pl.semanal.back.cubierto))].join(', ')}. Perfiles: ${[...new Set(espaldaR1.map(f => `${f.p.level}/${f.p.division}/${f.p.goal}${(f.p.laggingMuscles || []).includes('back') ? '/espalda rezagada' : ''}`))].join(', ')}.`);
const quien = {}; espaldaR1.forEach(f => { quien[f.d] = (quien[f.d] || 0) + 1; });
P(`Por días: ${JSON.stringify(quien)}.`);
const empuje = REP.TIPOS.empuje, torsoA = REP.TIPOS.torsoA;
empuje.grupos.push('back');
const conBack = [];
[3, 4, 5, 6].forEach(d => profiles.forEach(p => conBack.push({ d, pl: REP.generarPlan(Object.assign({}, p, { daysPerWeek: d })) })));
empuje.grupos.pop();
P(`- **Hipótesis (no está en el código)**: si el día de empuje de los splits de 5 y 6 días también pudiera alojar espalda, la espalda quedaría sin cubrir por R1 en ${conBack.filter(f => f.pl.semanal.back.causa === 'R1').length} planes (hoy ${espaldaR1.length}).`);
P('');
P(md ? '### Series por ejercicio aislado en una sesión (para decidir el tope por ejercicio)' : '-- Series por ejercicio aislado');
P('');
const aisl = sesAll.flatMap(x => x.s.ejercicios.filter(e => e.tipo === 'aislamiento').map(e => ({ e, x })));
const distA = {}; aisl.forEach(({ e }) => { distA[e.series] = (distA[e.series] || 0) + 1; });
const ge6 = aisl.filter(({ e }) => e.series >= 6);
const maxA = aisl.reduce((m, o) => (o.e.series > m.e.series ? o : m), aisl[0]);
P(`- Ejercicios aislados en las ${sesAll.length} sesiones: ${aisl.length}. Distribución por número de series: ${Object.keys(distA).sort((a, b) => a - b).map(k => `${k}: ${distA[k]}`).join(' · ')}.`);
P(`- **Máximo:** ${maxA.e.series} series (${maxA.e.nombre}, plan de ${maxA.x.d} días). **Sesiones con algún aislado de 6 series o más:** ${new Set(ge6.map(({ x }) => x)).size} de ${sesAll.length} (${pct(new Set(ge6.map(({ x }) => x)).size, sesAll.length)}); ejercicios aislados con 6 o más series: ${ge6.length} de ${aisl.length} (${pct(ge6.length, aisl.length)}).`);
const porNombre = {}; ge6.forEach(({ e }) => { porNombre[e.nombre] = (porNombre[e.nombre] || 0) + 1; });
P(`- Los que más aparecen con 6 o más: ${Object.entries(porNombre).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, c]) => `${n} ${c}`).join(' · ')}.`);
P('');
P(md ? '### Hip thrust: por qué no se elige' : '-- Hip thrust');
P('');
const wHip = REP.pesosDe(CAT, 'glutes.hip_thrust'), wAbd = REP.pesosDe(CAT, 'glutes.hip_abduction_machine'), wSq = REP.pesosDe(CAT, 'quads.squat_back');
P(`- Aporte por serie a glúteos: hip thrust ${wHip.glutes} · abducción de cadera en máquina ${wAbd.glutes} · patada de glúteo en polea 1 · sentadilla trasera ${wSq.glutes} (indirecta, verificada). Segundos por serie (descanso + 45 s): hip thrust ${CAT.segundosPorSerie('glutes.hip_thrust')} · abducción ${CAT.segundosPorSerie('glutes.hip_abduction_machine')} · patada ${CAT.segundosPorSerie('glutes.kickback_cable')}.`);
P(`- Con "necesidad por minuto", la abducción rinde ${r1(wAbd.glutes / CAT.segundosPorSerie('glutes.hip_abduction_machine') * 1000)} contra ${r1(wHip.glutes / CAT.segundosPorSerie('glutes.hip_thrust') * 1000)} del hip thrust (por cada 1000 s): siempre gana la abducción, en todos los perfiles. Para que el hip thrust empatara tendría que durar ${CAT.segundosPorSerie('glutes.hip_abduction_machine')} s por serie. Subir el aporte de la sentadilla a glúteos (indirecta → directa) no ayuda: el hip thrust compite con la abducción, no con la sentadilla. Acortar el descanso del hip thrust sin respaldo por ejercicio sería un peso a medida (E4).`);
P('- **Descartado por Emanuel (2026-11-08):** la regla del multiarticular directo por grupo mayor (sería forzar el resultado).');
P('- **Propuesta (nivel 3, arquitectura, sin implementar): separar glúteo mayor y glúteo medio/menor en el modelo.** A favor: las resonancias ya los distinguen y responden distinto a cada ejercicio (extensión: mayor +9 % y medio/menor +2 %; abducción: +5 % y +4 %; hip thrust y sentadilla: casi nada en medio/menor), y con un solo grupo un plan sin abducción parece cubrir "glúteos" sin estimular el medio. En contra: la evidencia mide medio y menor juntos y casi todas las filas nuevas quedarían a verificar; hay que repartir los 36 ejercicios, cambiar buckets, mínimos y pisos por grupo y la interfaz; y no hay recomendaciones de volumen por separado para el glúteo medio (los umbrales serían E4). **Expectativa, no probada:** como la abducción seguiría aportando a los dos subgrupos con 120 s por serie, separar los grupos por sí solo probablemente no haría aparecer el hip thrust; lo haría el cambio de aporte de la hipótesis anterior, que la evidencia no respalda.');
const abd = 'glutes.hip_abduction_machine';
const parcial = Object.assign({}, CAT, {
  aportesDe: id => CAT.aportesDe(id).map(r => (id === abd && r.muscle === 'glutes' ? Object.assign({}, r, { relacion: 'indirecta' }) : r)),
  variantePorId: id => (id === abd ? Object.assign({}, CAT.variantePorId(id), { sinAporte: true }) : CAT.variantePorId(id)),
});
const resP = { bik: 0, bikHip: 0, enf: 0, enfHip: 0, r1: 0 };
filas.forEach(f => {
  const pl = REP.generarPlan(Object.assign({}, f.p, { daysPerWeek: f.d }), { catalogo: parcial });
  const n = pl.sesiones.reduce((a, x) => a + x.ejercicios.filter(e => e.varianteId === 'glutes.hip_thrust').length, 0);
  if (f.p.division === 'bikini_w') { resP.bik++; if (n) resP.bikHip++; }
  if (enfGlu(f.p)) { resP.enf++; if (n) resP.enfHip++; }
  if (pl.semanal.glutes.causa === 'R1') resP.r1++;
});
P(`- **Hipótesis (no está en el código; la evidencia no la respalda, ver B-042):** si la abducción de cadera aportara solo 0,5 a glúteos, el hip thrust aparece en ${resP.bikHip} de ${resP.bik} planes de bikini y en ${resP.enfHip} de ${resP.enf} planes con énfasis en glúteos, y los glúteos sin cubrir por R1 bajan de ${filas.filter(f => f.pl.semanal.glutes.causa === 'R1').length} a ${resP.r1} planes. **Ojo:** hoy el grupo en el que se programa un ejercicio cuenta siempre como directo (DEC-016, regla del bucket), así que cambiar la relación en el CSV no bastaría: haría falta una excepción a esa regla de un DEC aceptado (nivel 3). La hipótesis se calcula saltando esa regla solo para la abducción.`);
P('- **Qué dice la evidencia (investigador, 2026-11-08; solo resúmenes):** una resonancia de 10 semanas con abducción de cadera en polea unilateral midió glúteo mayor +5 % y medio/menor +4 %, es decir, crecimiento similar de los dos; el EMG de la máquina favorece al glúteo medio frente al tensor de la fascia lata, pero no frente a otros ejercicios de glúteo medio. Con eso la abducción cuenta como directa para el grupo "glúteos" (que junta mayor, medio y menor). En el hip thrust, el glúteo medio y menor casi no crece. Mantener la relación como directa es lo que respalda la evidencia; la etiqueta correcta sería "verificado (1 estudio)" (un solo estudio, de ejercicio equivalente, no de la máquina).');
P('');
P(md ? '### Espalda sin cubrir por R1 a 5 y 6 días: cómo corregirlo sin aflojar R1' : '-- Corrección propuesta');
P('');
P(`- La espalda entra en solo 2 sesiones de los splits de 5 y 6 días, así que con R1 en ${REG.valor('MAX_SERIES_FRACCIONADAS_MUSCULO_SESION')} su techo semanal es ${2 * REG.valor('MAX_SERIES_FRACCIONADAS_MUSCULO_SESION')} series fraccionadas. Los ${espaldaR1.length} planes afectados (${[...new Set(espaldaR1.map(f => `${f.p.level}/${f.p.division}/${f.p.goal}`))].join(', ')}) necesitan ${[...new Set(espaldaR1.map(f => f.pl.semanal.back.necesidad))].join(', ')} y quedan en ${[...new Set(espaldaR1.map(f => f.pl.semanal.back.cubierto))].join(', ')}. Es un problema de cómo se arma el split, no de R1.`);
P(`- **Opción A (recomendada):** regla de exposición. Si la necesidad de un grupo supera lo que caben sus sesiones bajo R1 (sesiones × ${REG.valor('MAX_SERIES_FRACCIONADAS_MUSCULO_SESION')}), el día de empuje de los splits de 5 y 6 días aloja también ese grupo (un tirón horizontal de apoyo). Solo afecta a esos ${espaldaR1.length} planes y la hipótesis de arriba los deja en ${conBack.filter(f => f.pl.semanal.back.causa === 'R1').length} sin cubrir. Costo: un criterio de diseño más (E4) y un día de empuje con un tirón en esos casos.`);
P('- **Opción B:** cambiar el split de 5 días a torso, pierna, torso, tirón, pierna (más espalda para todos). Costo: cambia el plan de todos los perfiles de 5 días y se pierde el día de empuje dedicado.');
P(`- **Opción C:** dejarlo como aviso y que el usuario decida. Costo: ${espaldaR1.length} planes con aviso por ${[...new Set(espaldaR1.map(f => r1(f.pl.semanal.back.falta)))].join(', ')} serie(s) de diferencia.`);
console.log(out.join('\n'));
