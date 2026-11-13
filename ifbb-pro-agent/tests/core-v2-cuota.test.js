/* Cuota por sub-patrón, excedente del tope en dos pasos y orden de decisión del relleno (DEC-037 paso 2; cómo se miden, DEC-039). */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/core-v2/registro.js');
const C = require('../js/core-v2/catalogo.js');
const REP = require('../js/core-v2/reparto.js');
const AVISO = require('../js/core-v2/aviso.js');
const PLAN = require('../js/core-v2/plan.js');
const { profiles } = require('../../scripts/perfiles-barrido.js');

const MIN = () => R.valor('SERIES_MIN_POR_EJERCICIO');
const MAPA = () => R.valor('SUB_PATRONES_POR_MUSCULO');
const barrido = () => profiles.flatMap(p => [3, 4, 5, 6].map(d => ({ p, d, pl: REP.generarPlan(Object.assign({}, p, { daysPerWeek: d })) })));
// ¿El sub-patrón tiene un ejercicio programado en el grupo del músculo con las series mínimas? (cómo se mide la cuota, DEC-039)
const cubierto = (pl, m, patrones) => pl.sesiones.some(s => s.ejercicios.some(e => e.grupo === m && patrones.includes(e.patron) && e.series >= MIN()));

/* ---------- La cuota ---------- */

test('DEC-037 punto 3: con objetivo semanal de 8 o más, cada sub-patrón del mapa (menos `otros`) tiene su ejercicio o el aviso único lo dice (360 planes)', () => {
  let exigidas = 0, avisadas = 0;
  barrido().forEach(({ p, d, pl }) => Object.keys(MAPA()).forEach(m => {
    if (pl.semanal[m].objetivo < R.valor('UMBRAL_CUOTA_SUB_PATRON')) return;
    Object.keys(MAPA()[m]).filter(sp => sp !== 'otros').forEach(sp => {
      exigidas++;
      const avisada = ((pl.avisoUnico || {}).cuotaSinCubrir || []).some(x => x.musculo === m && x.subPatron === sp);
      if (avisada) avisadas++;
      assert.ok(cubierto(pl, m, MAPA()[m][sp]) || avisada, `${p.level}/${p.goal}/${p.division} ${d} días: ${m}/${sp} sin cubrir ni avisar`);
    });
  }));
  assert.ok(exigidas > 1000, `cuotas exigidas: ${exigidas}`);
  assert.ok(avisadas < exigidas * 0.1, `la cuota casi siempre cabe: ${avisadas} avisadas de ${exigidas}`);
});

test('DEC-037 punto 3: la cuota mira el grupo donde se programa el ejercicio: una sentadilla (cuádriceps) no cubre la extensión de cadera del glúteo', () => {
  // Sin hip thrust, patada ni búlgara de glúteo no hay ejercicio de extensión de cadera programado en glúteos: la cuota queda sin cubrir aunque haya sentadilla.
  const cat = Object.assign({}, C, { VARIANTES: C.VARIANTES.filter(v => !['glutes.hip_thrust', 'glutes.kickback_cable', 'glutes.bulgarian_hip'].includes(v.id)) });
  const pl = REP.generarPlan({ sex: 'F', level: 'advanced', daysPerWeek: 4, division: 'bikini_w', goal: 'bulk', laggingMuscles: ['glutes'] }, { catalogo: cat });
  assert.ok(pl.sesiones.some(s => s.ejercicios.some(e => e.patron === 'sentadilla')), 'hay sentadilla en el plan');
  assert.deepEqual(pl.avisos.cuotaSinCubrir.map(x => `${x.musculo}/${x.subPatron}/${x.causa}`), ['glutes/extension_cadera/sin ejercicios disponibles']);
});

test('DEC-037 punto 3: si la cuota no cabe en el tiempo no se incumple en silencio: va al aviso único, con su causa y el texto para el usuario', () => {
  const g = PLAN.crearPlan({ sex: 'F', level: 'advanced', daysPerWeek: 3, division: 'bikini_w', goal: 'bulk', laggingMuscles: ['glutes'], tiempoDisponibleMin: 20 }, { id: 'x', ahora: '2026-11-13' });
  const cuota = g.plan.avisoUnico.cuotaSinCubrir;
  assert.ok(cuota.length > 0 && cuota.every(x => ['tiempo', 'R1', 'sin ejercicios disponibles'].includes(x.causa)));
  const a = AVISO.construirAviso(g.plan);
  assert.equal(a.hay, true);
  cuota.forEach(x => assert.ok(a.lineas.some(l => /falta un ejercicio de/.test(l)), 'el aviso lo dice'));
  assert.ok(a.sesionesAfectadas.length > 0, 'el usuario puede aceptar las sesiones afectadas');
});

test('DEC-037 punto 3: el umbral es un parámetro del registro (8): con 100 la cuota no se exige (el plan cambia y nunca la avisa); con 8 se cumple en los 360 planes', () => {
  const regla = R.regla('UMBRAL_CUOTA_SUB_PATRON'), original = regla.valor;
  assert.equal(original, 8);
  const huella = pl => JSON.stringify(pl.sesiones.map(s => s.ejercicios.map(e => e.varianteId + ':' + e.series)));
  const con = barrido();
  try {
    regla.valor = 100;
    const sin = barrido();
    assert.ok(sin.every(({ pl }) => pl.avisos.cuotaSinCubrir.length === 0), 'sin cuota no hay aviso de cuota');
    const distintos = con.filter(({ pl }, i) => huella(pl) !== huella(sin[i].pl)).length;
    assert.ok(distintos > 100, `la cuota decide ejercicios en ${distintos} de 360 planes`);
  } finally { regla.valor = original; }
});

/* ---------- Orden de decisión ---------- */

test('DEC-037 punto 5: el orden de decisión es evidencia > redundancia > tiempo > lumbar (cada criterio solo desempata al anterior)', () => {
  const k = (evidencia, redundancia, tiempo, lumbar) => ({ evidencia, redundancia, tiempo, lumbar });
  const antes = (x, y) => REP.compararDecision(x, y) < 0;
  assert.ok(antes(k(0, 0.1, 999, 2), k(1, 9, 1, 0)), 'la evidencia gana sobre todo lo demás');
  assert.ok(antes(k(1, 0.5, 999, 2), k(1, 0.4, 1, 0)), 'a igual evidencia, más cobertura marginal (menos redundante)');
  assert.ok(antes(k(1, 0.5, 100, 2), k(1, 0.5, 120, 0)), 'a igual redundancia, el más corto');
  assert.ok(antes(k(1, 0.5, 100, 0), k(1, 0.5, 100, 2)), 'a igual duración, la menor demanda lumbar');
  assert.equal(REP.compararDecision(k(1, 0.5, 100, 1), k(1, 0.5, 100, 1)), 0);
  assert.deepEqual(R.valor('ORDEN_EVIDENCIA'), ['verificado', 'verificado (1 estudio)', 'probable', 'a_verificar']);
});

test('DEC-037 punto 5: dentro del glúteo ganan las variantes con mejor evidencia: hip thrust y patada (verificado) llevan más series que la abducción (1 estudio) en todo el barrido', () => {
  let hip = 0, abd = 0;
  barrido().forEach(({ pl }) => pl.sesiones.forEach(s => s.ejercicios.forEach(e => {
    if (e.varianteId === 'glutes.hip_thrust' || e.varianteId === 'glutes.kickback_cable') hip += e.series;
    if (e.patron === 'abduccion_cadera') abd += e.series;
  })));
  assert.ok(hip > abd * 2, `hip thrust y patada ${hip} series, abducción ${abd}`);
  // Y la abducción nunca pasa de 7 series por semana en ningún plan (antes llegaba a 20).
  barrido().forEach(({ p, d, pl }) => {
    const sem = pl.sesiones.flatMap(s => s.ejercicios).filter(e => e.patron === 'abduccion_cadera').reduce((a, e) => a + e.series, 0);
    assert.ok(sem <= 7, `${p.level}/${p.division} ${d} días: ${sem} abducciones por semana`);
  });
});

test('DEC-037 punto 5: la evidencia no mueve pesos ni relaciones: el conteo fraccionado de cada ejercicio es el mismo que antes del paso 2', () => {
  // Directa 1, indirecta 0,5 y a_verificar 0 para los demás músculos, igual que siempre; el grupo donde se programa cuenta 1 (DEC-016).
  assert.deepEqual(REP.pesosDe(C, 'glutes.hip_abduction_machine'), { glutes: 1 });
  assert.deepEqual(REP.pesosDe(C, 'glutes.hip_abduction_band'), { glutes: 1 }, 'a_verificar no baja el peso del grupo: lo marca');
  assert.equal(REP.pesosDe(C, 'quads.squat_back').glutes, 0.5);
});

/* ---------- Excedente del tope en dos pasos ---------- */

test('DEC-037 punto 4: el excedente del tope pasa a otra variante del patrón (a) o a otro ejercicio del mismo músculo (b), nunca de grupo ni de día; el volumen no se recorta', () => {
  let a = 0, b = 0;
  profiles.forEach(p => [3, 4, 5, 6].forEach(d => {
    const q = Object.assign({}, p, { daysPerWeek: d });
    const sin = REP.generarPlan(q, { sinTopePorEjercicio: true }), con = REP.generarPlan(q);
    con.sesiones.forEach((s, i) => {
      assert.equal(s.series, sin.sesiones[i].series, `${p.level} ${d} días ${s.nombre}: el volumen no se recorta ni se mueve de día`);
      const antes = new Set(sin.sesiones[i].ejercicios.map(e => e.varianteId));
      s.ejercicios.filter(e => !antes.has(e.varianteId)).forEach(e => {
        const origen = sin.sesiones[i].ejercicios.find(x => x.series > R.valor('MAX_SERIES_POR_EJERCICIO') && x.grupo === e.grupo);
        assert.ok(origen, `${s.nombre}: ${e.nombre} aparece sin un excedente de su grupo`);
        if (origen.patron === e.patron) a++; else b++;
      });
    });
  }));
  assert.ok(a > 0 && b > 0, `(a) ${a} y (b) ${b}: los dos pasos se usan`);
});

/* ---------- Parámetros reversibles y cuota con 2 series (decisiones de Emanuel, 2026-11-13) ---------- */

// Cambia un parámetro del registro durante `fn` y lo restaura.
const conParametro = (id, valor, fn) => { const r = R.regla(id), antes = r.valor; try { r.valor = valor; return fn(); } finally { r.valor = antes; } };
const semanalAbduccion = pl => pl.sesiones.flatMap(s => s.ejercicios).filter(e => e.patron === 'abduccion_cadera').reduce((a, e) => a + e.series, 0);

test('DEC-039: el orden por evidencia es un parámetro reversible: apagado, el relleno vuelve a apilar la abducción; encendido, no', () => {
  assert.equal(R.valor('EVIDENCIA_ORDENA_RELLENO'), true);
  const maxAbduccion = () => Math.max(...barrido().map(({ pl }) => semanalAbduccion(pl)));
  const conEvidencia = maxAbduccion();
  const sinEvidencia = conParametro('EVIDENCIA_ORDENA_RELLENO', false, maxAbduccion);
  assert.ok(conEvidencia <= 7, `con evidencia: ${conEvidencia}`);
  assert.ok(sinEvidencia > conEvidencia + 5, `sin evidencia vuelve el apilamiento: ${sinEvidencia} series de abducción por semana`);
  assert.equal(maxAbduccion(), conEvidencia, 'al restaurar el parámetro el plan vuelve a ser el mismo');
});

test('DEC-039: la medida de la redundancia (por serie o por segundo) es un parámetro del registro y cambia el reparto', () => {
  assert.equal(R.valor('MEDIDA_REDUNDANCIA'), 'serie');
  const huella = () => JSON.stringify(barrido().map(({ pl }) => pl.sesiones.map(s => s.ejercicios.map(e => e.varianteId + e.series))));
  const porSerie = huella(), porSegundo = conParametro('MEDIDA_REDUNDANCIA', 'segundo', huella);
  assert.notEqual(porSerie, porSegundo);
  // En las dos medidas el caso del glúteo queda corregido: ningún plan sin extensión directa y la abducción acotada.
  ['serie', 'segundo'].forEach(m => conParametro('MEDIDA_REDUNDANCIA', m, () => barrido().forEach(({ p, d, pl }) => {
    assert.ok(semanalAbduccion(pl) <= 7, `${m} ${p.level}/${p.division} ${d} días: ${semanalAbduccion(pl)} abducciones`);
    if (pl.semanal.glutes.objetivo >= R.valor('UMBRAL_CUOTA_SUB_PATRON')) assert.ok(pl.semanal.glutes.porSubPatron.extension_cadera.directas >= 2);
  })));
});

test('DEC-039: la cuota exige SERIES_MIN_CUOTA_SUB_PATRON (2) series o más: un ejercicio con menos no la cubre, y con 3 la cuota se programa con 3', () => {
  assert.equal(R.valor('SERIES_MIN_CUOTA_SUB_PATRON'), 2);
  // Cualquier ejercicio que cubra un sub-patrón en el barrido tiene el mínimo de series; con el mínimo en 3, todo sub-patrón exigido queda cubierto por
  // un ejercicio de 3 series o más (o avisado): si la cuota contara ejercicios de 1 o 2 series, este test fallaría.
  conParametro('SERIES_MIN_CUOTA_SUB_PATRON', 3, () => barrido().forEach(({ p, d, pl }) => Object.keys(MAPA()).forEach(m => {
    if (pl.semanal[m].objetivo < R.valor('UMBRAL_CUOTA_SUB_PATRON')) return;
    Object.keys(MAPA()[m]).filter(sp => sp !== 'otros').forEach(sp => {
      const ok = pl.sesiones.some(s => s.ejercicios.some(e => e.grupo === m && MAPA()[m][sp].includes(e.patron) && e.series >= 3));
      const avisada = ((pl.avisoUnico || {}).cuotaSinCubrir || []).some(x => x.musculo === m && x.subPatron === sp);
      assert.ok(ok || avisada, `${p.level}/${p.division} ${d} días: ${m}/${sp} sin un ejercicio de 3 series`);
    });
  })));
});
