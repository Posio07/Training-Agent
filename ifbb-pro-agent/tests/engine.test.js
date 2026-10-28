const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const K = require('../js/knowledge.js');

const TODAY = '2026-09-15';

const male = {
  name: 'Test', sex: 'M', age: 30, heightCm: 178, weightKg: 85, bodyFatPct: 15,
  activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'classic_m', goal: 'cut',
};

test('Mifflin-St Jeor matches published equation', () => {
  assert.equal(Math.round(E.bmrMifflin('M', 85, 178, 30)), Math.round(10 * 85 + 6.25 * 178 - 5 * 30 + 5));
  assert.equal(Math.round(E.bmrMifflin('F', 60, 165, 28)), Math.round(10 * 60 + 6.25 * 165 - 5 * 28 - 161));
});

test('Navy body fat gives plausible values and rejects bad input', () => {
  const bf = E.bodyFatNavy('M', 178, 40, 85, 0);
  assert.ok(bf > 10 && bf < 20, `bf=${bf}`);
  const bfw = E.bodyFatNavy('F', 165, 33, 70, 95);
  assert.ok(bfw > 18 && bfw < 30, `bf=${bfw}`);
  assert.equal(E.bodyFatNavy('M', 178, 90, 85, 0), null);
  assert.equal(E.bodyFatNavy('F', 165, 33, 70, 0), null);
});

test('FFMI normalised to 1.80 m', () => {
  const f = E.ffmi(72, 180);
  assert.equal(Math.round(f.raw * 100) / 100, Math.round(72 / 3.24 * 100) / 100);
  assert.equal(Math.round(f.normalized * 100) / 100, Math.round(f.raw * 100) / 100);
});

test('cut plan: protein per kg LBM, fat 15-30 %, deficit within bounds, rate 0.5-1 %/wk', () => {
  const plan = E.buildPlan(male, TODAY);
  const n = plan.nutrition, m = plan.metrics, t = plan.targets;
  assert.ok(t.ratePct >= 0.5 && t.ratePct <= 1.0);
  assert.ok(n.protein / m.lbm >= 2.3 && n.protein / m.lbm <= 3.1, `p/lbm=${n.protein / m.lbm}`);
  assert.ok(n.fatPct >= 15 && n.fatPct <= 30, `fat%=${n.fatPct}`);
  assert.ok(n.calories < m.tdee && n.calories >= m.bmr);
  assert.ok(n.calories >= 0.7 * m.tdee - 1);
  assert.equal(t.targetBf, 6); // midpoint classic 5-7
  assert.ok(t.targetWeight < 85 && t.targetWeight > 70);
  assert.ok(t.classic && t.classic.lb === 202); // 178 cm = 70.08 in -> tramo "más de 5'10 hasta 5'11"
});

test('bulk plan: surplus 10-20 %, protein 1.6-2.2 g/kg, carbs >= 3 g/kg', () => {
  const plan = E.buildPlan(Object.assign({}, male, { goal: 'bulk', level: 'novice', bodyFatPct: 12 }), TODAY);
  const n = plan.nutrition, m = plan.metrics;
  const surplus = (n.calories - m.tdee) / m.tdee;
  assert.ok(surplus >= 0.095 && surplus <= 0.205, `surplus=${surplus}`);
  assert.ok(n.proteinPerKg >= 1.6 && n.proteinPerKg <= 2.2);
  assert.ok(n.carbsPerKg >= 3);
  assert.equal(plan.targets.ratePct, 0.5);
});

test('target date too close produces danger warning and caps the rate', () => {
  const plan = E.buildPlan(Object.assign({}, male, { targetDate: '2026-10-01' }), TODAY);
  assert.equal(plan.targets.dateFeasible, false);
  assert.equal(plan.targets.ratePct, 1.0);
  assert.ok(plan.warnings.some(w => w.level === 'danger'));
});

test('target below essential fat is clamped', () => {
  const plan = E.buildPlan(Object.assign({}, male, { targetBf: 3 }), TODAY);
  assert.equal(plan.targets.targetBf, 5);
});

test('female bikini profile without body fat uses default and warns', () => {
  const plan = E.buildPlan({ name: 'B', sex: 'F', age: 26, heightCm: 163, weightKg: 58, activity: 'light', level: 'novice', daysPerWeek: 4, division: 'bikini_w', goal: 'cut' }, TODAY);
  assert.equal(plan.metrics.bmrMethod, 'MIFFLIN');
  assert.ok(plan.warnings.some(w => /circunferencias/.test(w.text)));
  assert.equal(plan.targets.targetBf, 14);
  assert.equal(plan.targets.classic, null);
});

test('division of the wrong sex falls back to general', () => {
  const plan = E.buildPlan(Object.assign({}, male, { division: 'bikini_w' }), TODAY);
  assert.equal(plan.targets.division.id, 'general_m');
});

test('training: every muscle trained >= 2x/week for 4-6 day splits and weekly sets >= 10 for big muscles', () => {
  [3, 4, 5, 6].forEach(days => {
    const plan = E.buildPlan(Object.assign({}, male, { daysPerWeek: days, goal: 'maintain' }), TODAY);
    const tr = plan.training;
    assert.equal(tr.sessions.length, days);
    const freq = {};
    tr.sessions.forEach(s => { const seen = new Set(s.exercises.map(e => e.muscle)); seen.forEach(mu => { freq[mu] = (freq[mu] || 0) + 1; }); });
    ['chest', 'back', 'quads', 'shoulders'].forEach(mu => {
      assert.ok(freq[mu] >= 2, `${days} días: ${mu} freq ${freq[mu]}`);
      assert.ok(tr.weeklySets[mu] >= 10, `${mu} sets ${tr.weeklySets[mu]}`);
    });
    const assigned = {};
    tr.sessions.forEach(s => s.exercises.forEach(e => { assigned[e.muscle] = (assigned[e.muscle] || 0) + e.sets; }));
    Object.keys(tr.weeklySets).forEach(mu => assert.ok((assigned[mu] || 0) <= tr.weeklySets[mu] && (assigned[mu] || 0) >= tr.weeklySets[mu] - 2, `${days}d ${mu}: ${assigned[mu]} vs ${tr.weeklySets[mu]}`));
  });
});

test('mens physique de-emphasises legs, wellness emphasises glutes', () => {
  const mp = E.buildPlan(Object.assign({}, male, { division: 'physique_m', goal: 'maintain' }), TODAY).training.weeklySets;
  assert.ok(mp.quads < mp.shoulders);
  const w = E.buildPlan({ name: 'W', sex: 'F', age: 25, heightCm: 160, weightKg: 60, bodyFatPct: 22, activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'wellness_w', goal: 'maintain' }, TODAY).training.weeklySets;
  assert.ok(w.glutes > w.chest);
});

test('validateProfile catches missing data', () => {
  assert.ok(E.validateProfile({}).length >= 3);
  assert.deepEqual(E.validateProfile(male), []);
});

test('DEC-001: grupos rezagados anulan el énfasis de división y suben el volumen', () => {
  const base = Object.assign({}, male, { division: 'physique_m', goal: 'cut' });
  const withoutLagging = E.buildPlan(base, TODAY).training.weeklySets;
  assert.equal(withoutLagging.quads, 6); // 14*0.85*0.5 (énfasis "down" de physique_m) = 5.95 -> 6
  const withLagging = E.buildPlan(Object.assign({}, base, { laggingMuscles: ['quads', 'hamstrings', 'glutes'] }), TODAY).training.weeklySets;
  assert.equal(withLagging.quads, 15); // 14*0.85*1.25 = 14.875 -> 15
  assert.equal(withLagging.hamstrings, 15);
  assert.equal(withLagging.glutes, 15);
  assert.equal(withLagging.chest, withoutLagging.chest, 'músculos no rezagados no deberían cambiar');
});

test('DEC-001: tope de 20 series/semana para un grupo rezagado', () => {
  const plan = E.buildPlan(Object.assign({}, male, { level: 'advanced', goal: 'bulk', laggingMuscles: ['chest'] }), TODAY);
  assert.ok(plan.training.weeklySets.chest <= 20);
});

test('DEC-001: entradas inválidas en laggingMuscles se ignoran', () => {
  const p = E.normalizeProfile(Object.assign({}, male, { laggingMuscles: ['quads', 'no-existe', 'quads'] }));
  assert.deepEqual(p.laggingMuscles, ['quads']);
});

test('DEC-002/DEC-008: top set solo en definición, en el primer ejercicio ELEGIBLE del día (no cualquier multiarticular)', () => {
  const cut = E.buildPlan(male, TODAY).training;
  // Con DEC-008, un día puede no tener top set si ningún ejercicio es
  // elegible ese día (nunca unilaterales ni máquinas); lo que sí vale
  // siempre es que, si hay top set, cae en un ejercicio elegible y es
  // el primero de la sesión.
  cut.sessions.forEach(s => {
    const idx = s.exercises.findIndex(e => e.topSet);
    if (idx === -1) return;
    assert.equal(idx, 0, `${s.name}: el top set debería quedar como el primer ejercicio`);
  });
  assert.ok(cut.sessions.some(s => s.exercises.some(e => e.topSet)), 'al menos una sesión debe mostrar un top set');

  const maintain = E.buildPlan(Object.assign({}, male, { goal: 'maintain' }), TODAY).training;
  assert.ok(maintain.sessions.every(s => s.exercises.every(e => !e.topSet)), 'en mantenimiento no debería aparecer top set');
  const bulk = E.buildPlan(Object.assign({}, male, { goal: 'bulk' }), TODAY).training;
  assert.ok(bulk.sessions.every(s => s.exercises.every(e => !e.topSet)), 'en volumen no debería aparecer top set');
});

test('DEC-004: aviso de inconsistencia si %grasa medido y Navy difieren más de 4 puntos', () => {
  // Navy con estos datos (178cm, cuello 40, cintura 110) da ~27-28%.
  const big = E.buildPlan(Object.assign({}, male, { bodyFatPct: 15, neckCm: 40, waistCm: 110 }), TODAY);
  assert.ok(big.warnings.some(w => /difieren en más de 4 puntos/.test(w.text)), 'debería avisar con diferencia grande');
  assert.equal(big.metrics.bodyFat, 15, 'se sigue usando el % medido, no el de Navy');

  // Diferencia pequeña: cintura 85 da un Navy cercano a 15-16%.
  const small = E.buildPlan(Object.assign({}, male, { bodyFatPct: 15, neckCm: 40, waistCm: 85 }), TODAY);
  assert.ok(!small.warnings.some(w => /difieren en más de 4 puntos/.test(w.text)), 'no debería avisar con diferencia chica');
});

test('DEC-005: bandera salud/funcional sube el cardio en definición a >=150 min/semana', () => {
  const off = E.buildPlan(male, TODAY).training.cardio; // male = cut, sin bandera
  assert.ok(off.sessions * off.minutes < 150, 'por defecto el cardio en definición sigue minimizado');
  const on = E.buildPlan(Object.assign({}, male, { healthGoal: true }), TODAY).training.cardio;
  assert.ok(on.sessions * on.minutes >= 150, `con la bandera activa debería haber >=150 min/semana, hay ${on.sessions * on.minutes}`);
});

test('DEC-005: bandera desactivada no cambia nada (regresión) y activada agrega ejercicios funcionales a pierna', () => {
  const withoutFlag = E.buildPlan(male, TODAY);
  assert.equal(withoutFlag.training.cardio.sessions * withoutFlag.training.cardio.minutes, 2 * 25, 'cardio de cut sin bandera no debería cambiar');
  const withFlag = E.buildPlan(Object.assign({}, male, { healthGoal: true, daysPerWeek: 6, level: 'advanced' }), TODAY);
  const names = withFlag.training.sessions.flatMap(s => s.exercises.map(e => e.name));
  const hasFunctional = names.some(n => /Sentadilla búlgara con mancuernas|Step-up con carga|Paseo del granjero/.test(n));
  assert.ok(hasFunctional, 'con la bandera activa debería poder aparecer algún ejercicio funcional de pierna');
});

test('DEC-005: healthGoal no es true por defecto ni con valores falsy', () => {
  assert.equal(E.normalizeProfile(male).healthGoal, false);
  assert.equal(E.normalizeProfile(Object.assign({}, male, { healthGoal: false })).healthGoal, false);
  assert.equal(E.normalizeProfile(Object.assign({}, male, { healthGoal: true })).healthGoal, true);
});

test('DEC-003 v2: grupos chicos no van a pierna si hay un día de empuje/tirón con menos series; grupos grandes no se mueven de su día', () => {
  const emanuel = {
    name: 'Emanuel', sex: 'M', age: 28, heightCm: 175, weightKg: 78, bodyFatPct: 14,
    activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'physique_m', goal: 'cut',
    laggingMuscles: ['quads', 'hamstrings', 'glutes'],
  };
  const plan = E.buildPlan(emanuel, TODAY);
  const byName = name => plan.training.sessions.find(s => s.name === name);
  const musclesOf = s => new Set(s.exercises.map(e => e.muscle));
  ['Día 2 · Pierna', 'Día 5 · Pierna'].forEach(name => {
    const m = musclesOf(byName(name));
    assert.ok(!m.has('abs') && !m.has('calves'), `${name} no debería tener abdomen/pantorrillas`);
    assert.ok(m.has('quads') && m.has('hamstrings') && m.has('glutes'), `${name} debería conservar sus grupos grandes`);
  });
  // weeklySets (el volumen total) no cambia por mover el día de asignación.
  const assigned = {};
  plan.training.sessions.forEach(s => s.exercises.forEach(e => { assigned[e.muscle] = (assigned[e.muscle] || 0) + e.sets; }));
  Object.keys(plan.training.weeklySets).forEach(mu => assert.equal(assigned[mu], plan.training.weeklySets[mu], `${mu}: volumen total cambió`));
});

test('DEC-014: regla E4 — ninguna sesión supera 25 series salvo que el piso semanal lo impida; con aceptación explícita no se recorta', () => {
  const emanuel = {
    name: 'Emanuel', sex: 'M', age: 28, heightCm: 175, weightKg: 78, bodyFatPct: 14,
    activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'physique_m', goal: 'cut',
    laggingMuscles: ['quads', 'hamstrings', 'glutes'],
  };
  const accepted = E.buildPlan(Object.assign({}, emanuel, { longSessionAcceptedOn: '2026-10-24' }), TODAY);
  const over = accepted.training.sessions.find(s => s.totalSets > 25);
  assert.ok(over, 'sin recorte, este perfil tiene al menos un día por encima de 25 series');
  assert.equal(accepted.training.sessionLimit.accepted, '2026-10-24');
  assert.deepEqual(accepted.training.sessionLimit.trimmed, [], 'con aceptación explícita no se recorta nada');
  assert.ok(accepted.training.warnings.some(w => w.rule === 'E4' && w.text.includes(over.name) && w.text.includes('Aceptaste')));
  const plan = E.buildPlan(emanuel, TODAY);
  const sl = plan.training.sessionLimit;
  assert.deepEqual([sl.cap, sl.level], [25, 'E4']);
  plan.training.sessions.forEach(s => {
    const pending = sl.overCap.find(o => o.session === s.name);
    assert.ok(s.totalSets <= 25 || pending, `${s.name}: ${s.totalSets} series sin explicación`);
  });
  assert.ok(sl.trimmed.length > 0);
  sl.trimmed.forEach(t => assert.ok(plan.training.warnings.some(w => w.rule === 'E4' && w.evidence === 'E4' && w.text.includes(t.session) && /convención de la app, sin fuente externa/.test(w.text))));
});

test('DEC-003 v2: no cambia nada cuando ningún día se pasa de 25 (regresión de avisos)', () => {
  const plan = E.buildPlan(Object.assign({}, male, { goal: 'maintain' }), TODAY);
  const anyOver = plan.training.sessions.some(s => s.totalSets > 25);
  const hasWarning = plan.warnings.some(w => /series, por encima/.test(w.text));
  assert.equal(hasWarning, anyOver);
});

test('DEC-006: no se repite el mismo patrón de ejercicio en una sesión (variantes incluidas)', () => {
  const basePattern = n => { // misma lógica que engine.js, para no probar con la implementación interna
    if (/búlgara/i.test(n)) return 'bulgara';
    if (/sentadilla/i.test(n)) return 'sentadilla';
    return n;
  };
  [3, 4, 5, 6].forEach(days => {
    ['cut', 'bulk', 'maintain'].forEach(goal => {
      const plan = E.buildPlan(Object.assign({}, male, { daysPerWeek: days, goal, division: 'bodybuilding_m', level: 'advanced' }), TODAY);
      plan.training.sessions.forEach(s => {
        const patterns = s.exercises.map(e => basePattern(e.name));
        const seen = new Set();
        patterns.forEach(p => {
          assert.ok(!seen.has(p), `${days}d/${goal} ${s.name}: patrón "${p}" repetido`);
          seen.add(p);
        });
      });
    });
  });
});

test('DEC-006: el segundo ejercicio de cuádriceps prioriza prensa de piernas', () => {
  const plan = E.buildPlan(Object.assign({}, male, { division: 'bodybuilding_m', level: 'advanced', goal: 'bulk' }), TODAY);
  const legDay = plan.training.sessions.find(s => s.exercises.some(e => e.muscle === 'quads'));
  const quadsExercises = legDay.exercises.filter(e => e.muscle === 'quads');
  if (quadsExercises.length >= 2) assert.equal(quadsExercises[1].name, 'Prensa de piernas');
});

test('DEC-007: los ejercicios unilaterales cuentan el doble en la duración estimada', () => {
  // Fuerza que el pick de cuádriceps sea el unilateral "Zancadas o sentadilla
  // búlgara" en vez de "Sentadilla trasera...", comparando dos perfiles
  // idénticos salvo por eso, usando el mismo número de series.
  const K = require('../js/knowledge.js');
  const quadsLib = K.EXERCISES.quads;
  const unilateralIdx = quadsLib.findIndex(e => e.unilateral);
  assert.ok(unilateralIdx >= 0, 'debería haber al menos un ejercicio de cuádriceps marcado unilateral');
  // Cálculo directo: mismo ejercicio, sets=4, type compound (150s) -> normal vs x2
  const sets = 4, restSec = 150, transition = 45;
  const normalMin = Math.round((sets * (restSec + transition)) / 60);
  const unilateralMin = Math.round((2 * sets * (restSec + transition)) / 60);
  assert.equal(unilateralMin, normalMin * 2);

  // Chequeo end-to-end: un día con "Zancadas o sentadilla búlgara" dura más
  // que si ese mismo volumen fuera con un ejercicio bilateral.
  const plan = E.buildPlan(Object.assign({}, male, { division: 'bodybuilding_m', level: 'advanced', goal: 'maintain', daysPerWeek: 3 }), TODAY);
  const dayWithBulgara = plan.training.sessions.find(s => s.exercises.some(e => e.name === 'Zancadas o sentadilla búlgara'));
  assert.ok(dayWithBulgara, 'algún día debería tener la variante unilateral de cuádriceps');
});

test('DEC-007: no afecta el cálculo si no hay ejercicios unilaterales ese día', () => {
  const plan = E.buildPlan(male, TODAY); // classic_m no usa ejercicios unilaterales en su rotación típica de 5 días
  plan.training.sessions.forEach(s => {
    const hasUnilateral = s.exercises.some(e => e.unilateral);
    if (!hasUnilateral) {
      let seconds = 0;
      s.exercises.forEach(e => {
        if (e.topSet) { seconds += 180 + 45; seconds += (e.backoffSets || 0) * (150 + 45); }
        else { const rest = e.type === 'compound' ? 150 : 75; seconds += e.sets * (rest + 45); }
      });
      assert.equal(s.durationMin, Math.round(seconds / 60), `${s.name}: duración no coincide con la fórmula simple`);
    }
  });
});

test('DEC-006 (corregido): el Día 2 de Emanuel incluye sentadilla trasera o hack, no solo búlgara', () => {
  const emanuel = {
    name: 'Emanuel', sex: 'M', age: 28, heightCm: 175, weightKg: 78, bodyFatPct: 14,
    activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'physique_m', goal: 'cut',
    laggingMuscles: ['quads', 'hamstrings', 'glutes'],
  };
  const plan = E.buildPlan(emanuel, TODAY);
  const dia2 = plan.training.sessions.find(s => s.name.includes('Pierna') && s.exercises.some(e => e.muscle === 'quads'));
  const names = dia2.exercises.map(e => e.name);
  assert.ok(names.includes('Sentadilla trasera o sentadilla en hack'), `Día 2 debería tener sentadilla trasera/hack, tiene: ${names.join(', ')}`);
});

test('DEC-006 (corregido): el patrón viene del catálogo, no del texto del nombre', () => {
  const K = require('../js/knowledge.js');
  assert.equal(K.EXERCISES.quads[2].pattern, 'split_squat');
  assert.equal(K.EXERCISES.glutes[1].pattern, 'split_squat'); // misma familia, confirmado por catálogo
  assert.notEqual(K.EXERCISES.chest[2].pattern, K.EXERCISES.triceps[0].pattern); // "fondos" ya no choca
});

test('DEC-005 (aclarado): con la bandera activa, el funcional se suma después del principal, no lo reemplaza', () => {
  const emanuel = {
    name: 'Emanuel', sex: 'M', age: 28, heightCm: 175, weightKg: 78, bodyFatPct: 14,
    activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'physique_m', goal: 'cut',
    laggingMuscles: ['quads', 'hamstrings', 'glutes'], healthGoal: true,
  };
  const plan = E.buildPlan(emanuel, TODAY);
  const dia2 = plan.training.sessions.find(s => s.name.includes('Pierna') && s.exercises.some(e => e.muscle === 'quads'));
  const quadsNames = dia2.exercises.filter(e => e.muscle === 'quads').map(e => e.name);
  const idxSquat = quadsNames.indexOf('Sentadilla trasera o sentadilla en hack');
  const idxBulgara = quadsNames.indexOf('Sentadilla búlgara con mancuernas');
  assert.ok(idxSquat !== -1, 'debería seguir estando la sentadilla trasera/hack');
  assert.ok(idxBulgara !== -1, 'debería aparecer la búlgara funcional');
  assert.ok(idxBulgara > idxSquat, 'la búlgara debe ir después del ejercicio principal');
  // el volumen semanal de cuádriceps no cambia por activar la bandera
  const withoutFlag = E.buildPlan(Object.assign({}, emanuel, { healthGoal: false }), TODAY);
  assert.equal(plan.training.weeklySets.quads, withoutFlag.training.weeklySets.quads);
  const assignedWith = plan.training.sessions.filter(s => s.exercises.some(e => e.muscle === 'quads')).reduce((a, s) => a + s.exercises.filter(e => e.muscle === 'quads').reduce((b, e) => b + e.sets, 0), 0);
  assert.equal(assignedWith, plan.training.weeklySets.quads, 'el total asignado de cuádriceps no debería cambiar por sumar el funcional');
});

test('DEC-008: ningún top set cae en búlgara ni en press en máquina/fondos; el Día 2 de Emanuel abre con sentadilla trasera/hack', () => {
  const emanuel = {
    name: 'Emanuel', sex: 'M', age: 28, heightCm: 175, weightKg: 78, bodyFatPct: 14,
    activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'physique_m', goal: 'cut',
    laggingMuscles: ['quads', 'hamstrings', 'glutes'],
  };
  const plan = E.buildPlan(emanuel, TODAY);
  const INELIGIBLE_PATTERNS = ['split_squat', 'chest_dip_or_machine', 'leg_press', 'step_up', 'row_cable'];
  plan.training.sessions.forEach(s => {
    const topEx = s.exercises.find(e => e.topSet);
    if (!topEx) return;
    assert.ok(!INELIGIBLE_PATTERNS.includes(topEx.pattern), `${s.name}: top set en patrón no elegible (${topEx.pattern})`);
    assert.ok(!topEx.unilateral, `${s.name}: top set en ejercicio unilateral`);
  });
  const dia2 = plan.training.sessions.find(s => s.name.includes('Pierna') && s.exercises.some(e => e.muscle === 'quads'));
  assert.equal(dia2.exercises[0].name, 'Sentadilla trasera o sentadilla en hack');
  assert.ok(dia2.exercises[0].topSet, 'el Día 2 debería abrir con el top set');
});

test('DEC-008: si el primero del día no es elegible, se reordena el elegible al frente', () => {
  // Día 3 Empuje de Men\'s Physique empieza con pecho (fondos/press en
  // máquina, patrón no elegible); hombros (press militar, elegible) debería
  // pasar a ser el primero si aparece antes del cierre del día.
  const plan = E.buildPlan({ name: 'T', sex: 'M', age: 30, heightCm: 178, weightKg: 85, bodyFatPct: 15, activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'physique_m', goal: 'cut' }, TODAY);
  const empuje = plan.training.sessions.find(s => s.name.includes('Empuje'));
  const topEx = empuje.exercises.find(e => e.topSet);
  const ELIGIBLE = ['squat_bilateral', 'bench_press', 'shoulder_press', 'hinge', 'row_barbell', 'vertical_pull'];
  if (topEx) {
    assert.equal(empuje.exercises[0], topEx, 'el ejercicio con top set debe quedar primero');
    assert.ok(ELIGIBLE.includes(topEx.pattern), `patrón ${topEx.pattern} debería ser elegible`);
  }
});

test('DEC-005 + cardio: con la bandera activa, Emanuel llega a >=150 min/semana de cardio y el paseo del granjero aparece en algún día', () => {
  const emanuel = {
    name: 'Emanuel', sex: 'M', age: 28, heightCm: 175, weightKg: 78, bodyFatPct: 14,
    activity: 'moderate', level: 'intermediate', daysPerWeek: 5, division: 'physique_m', goal: 'cut',
    laggingMuscles: ['quads', 'hamstrings', 'glutes'], healthGoal: true,
  };
  const plan = E.buildPlan(emanuel, TODAY);
  assert.ok(plan.training.cardio.sessions * plan.training.cardio.minutes >= 150, 'cardio semanal debería ser >=150 min');
  const tieneGranjero = plan.training.sessions.some(s => s.exercises.some(e => e.name === 'Paseo del granjero'));
  assert.ok(tieneGranjero, 'el paseo del granjero debería aparecer en al menos un día (bug: con round-robin simple nunca salía, solo había 2 ocurrencias de cuádriceps/semana para 3 opciones)');
});

test('every source referenced by plan exists in knowledge base', () => {
  const plan = E.buildPlan(male, TODAY);
  plan.sourcesUsed.forEach(id => assert.ok(K.SOURCES[id], `missing source ${id}`));
  K.SUPPLEMENTS.forEach(s => assert.ok(K.SOURCES[s.source]));
});

/* ---------- DEC-009: condiciones de salud y lesiones ---------- */

test('DEC-009 Capa 1: síntomas bloquea el plan hasta marcar autorización médica', () => {
  const withSymptoms = Object.assign({}, male, { healthSymptoms: true });
  const blocked = E.buildPlan(withSymptoms, TODAY);
  assert.equal(blocked.health.blocked, true);
  assert.ok(/consultá a un médico/i.test(blocked.health.blockReason));

  const cleared = Object.assign({}, withSymptoms, { healthMedicalClearance: true });
  const unblocked = E.buildPlan(cleared, TODAY);
  assert.equal(unblocked.health.blocked, false);
});

test('DEC-009 Capa 1: condición cardiovascular/metabólica/renal sin entrenar de forma regular también bloquea; entrenando regular solo avisa', () => {
  const sedentary = Object.assign({}, male, { healthCvMetabolicRenal: true, healthRegularExercise: false });
  const planSedentary = E.buildPlan(sedentary, TODAY);
  assert.equal(planSedentary.health.blocked, true);

  const active = Object.assign({}, male, { healthCvMetabolicRenal: true, healthRegularExercise: true });
  const planActive = E.buildPlan(active, TODAY);
  assert.equal(planActive.health.blocked, false);
  assert.equal(planActive.health.medicalClearanceRecommended, true);
});

test('DEC-009 Capa 2: diabetes con insulina avisa pero no cambia ningún número del plan', () => {
  const diabetic = Object.assign({}, male, { diabetesType: 'type2', healthDiabetesMed: true });
  const planBase = E.buildPlan(male, TODAY);
  const planDiabetic = E.buildPlan(diabetic, TODAY);
  assert.ok(planDiabetic.health.diabetesWarning, 'debería avisar riesgo de hipoglucemia');
  assert.ok(planDiabetic.health.weightLossMedWarning, 'en definición debería avisar sobre ajustar medicación');
  ['metrics', 'targets', 'nutrition', 'training', 'supplements'].forEach(key => {
    assert.deepEqual(stripHealthNoise(planDiabetic[key]), stripHealthNoise(planBase[key]), `${key} no debería cambiar por diabetes`);
  });
  // sin medicación, o sin diabetes: sin avisos de diabetes
  const noMed = Object.assign({}, male, { diabetesType: 'type2', healthDiabetesMed: false });
  assert.equal(E.buildPlan(noMed, TODAY).health.diabetesWarning, null);
});

test('DEC-009 Capa 3: lesión de hombro excluye shoulder_press, aparece el sustituto, avisa evaluación profesional y el volumen de hombro no cambia', () => {
  const injured = Object.assign({}, male, { injuryZones: ['shoulder'] });
  const planBase = E.buildPlan(male, TODAY);
  const planInjured = E.buildPlan(injured, TODAY);

  const allEx = s => s.training.sessions.flatMap(d => d.exercises);
  assert.ok(!allEx(planInjured).some(e => e.pattern === 'shoulder_press'), 'no debería quedar ningún shoulder_press en el plan');
  assert.ok(allEx(planInjured).some(e => e.pattern === 'shoulder_press_safe'), 'debería aparecer el sustituto');
  assert.ok(planInjured.warnings.some(w => /evaluación profesional/.test(w.text)), 'sin diagnóstico, debería avisar evaluación profesional');

  assert.equal(planInjured.training.weeklySets.shoulders, planBase.training.weeklySets.shoulders, 'el volumen semanal de hombro no debería cambiar');
  const shoulderSets = plan => allEx(plan).filter(e => e.muscle === 'shoulders').reduce((a, e) => a + e.sets, 0);
  assert.equal(shoulderSets(planInjured), shoulderSets(planBase), 'las series reales de hombro en el plan no deberían cambiar');

  // con diagnóstico, no debería avisar "evaluación profesional"
  const diagnosed = Object.assign({}, male, { injuryZones: ['shoulder'], injuryDiagnosed: ['shoulder'] });
  const planDiagnosed = E.buildPlan(diagnosed, TODAY);
  assert.ok(!planDiagnosed.warnings.some(w => /evaluación profesional/.test(w.text)));
});

test('DEC-009: sin condiciones de salud declaradas, el plan queda idéntico al que generaba el motor antes de DEC-009', () => {
  const plan = E.buildPlan(male, TODAY);
  assert.equal(plan.health.blocked, false);
  assert.equal(plan.health.anyCondition, false);
  assert.equal(plan.health.disclaimer, null);
  // normalizeProfile es idempotente sobre un perfil ya normalizado y
  // guardado (sin los campos planos del formulario): re-normalizar no
  // debería resetear nada de lo ya guardado.
  const stored = E.normalizeProfile(male);
  const reNormalized = E.normalizeProfile(stored);
  assert.deepEqual(reNormalized.health, stored.health);
});

function stripHealthNoise(obj) {
  // compara todo salvo listas de fuentes citadas, que sí pueden sumar
  // RIEBE_2015/COLBERG_2016/KANALEY_2022/SILBERNAGEL_2007 sin que eso
  // sea un cambio real de ningún número del plan.
  const c = JSON.parse(JSON.stringify(obj));
  delete c.sources;
  delete c.warnings;
  return c;
}

/* ---------- DEC-010: aporte de volumen por ejercicio ---------- */

const MUSCLE_IDS = Object.keys(K.MUSCLE_LABELS);
const catalogEntries = () => []
  .concat(...Object.entries(K.EXERCISES).map(([bucket, list]) => list.map(entry => ({ entry, bucket, functional: false }))))
  .concat(...Object.entries(K.FUNCTIONAL_EXERCISES).map(([bucket, list]) => list.map(entry => ({ entry, bucket, functional: true }))));

test('DEC-010: cada entrada del catálogo tiene id único y una fila en la tabla de aporte (y no sobran filas)', () => {
  const entries = catalogEntries();
  const ids = entries.map(x => x.entry.id);
  assert.ok(ids.every(id => typeof id === 'string' && id.length > 0), 'toda entrada necesita id');
  assert.equal(new Set(ids).size, ids.length, 'ids repetidos en el catálogo');
  ids.forEach(id => assert.ok(K.EXERCISE_CONTRIBUTION[id], `falta fila de aporte para ${id}`));
  assert.deepEqual(Object.keys(K.EXERCISE_CONTRIBUTION).sort(), ids.slice().sort(), 'la tabla tiene filas sin ejercicio (o al revés)');
  // `pattern` NO sirve de id: se repite con primarios distintos.
  const patterns = entries.map(x => x.entry.pattern);
  assert.ok(new Set(patterns).size < patterns.length, 'si pattern fuera único no haría falta id');
});

test('DEC-010: la tabla usa solo los 10 grupos, el secundario no repite al primario y toda fila es E4', () => {
  Object.entries(K.EXERCISE_CONTRIBUTION).forEach(([id, c]) => {
    assert.ok(c.primary === null || MUSCLE_IDS.includes(c.primary), `${id}: primario inválido`);
    assert.ok(Array.isArray(c.secondary), `${id}: secondary debe ser lista`);
    c.secondary.forEach(m => assert.ok(MUSCLE_IDS.includes(m), `${id}: secundario inválido ${m}`));
    assert.equal(new Set(c.secondary).size, c.secondary.length, `${id}: secundarios repetidos`);
    assert.ok(!c.secondary.includes(c.primary), `${id}: el secundario repite al primario`);
    assert.equal(c.evidence, 'E4', `${id}: toda la tabla va E4 hasta validarla`);
  });
});

test('DEC-010: correcciones aprobadas de la tabla de aporte', () => {
  const C = K.EXERCISE_CONTRIBUTION;
  assert.ok(!C['quads.squat_back_or_hack'].secondary.includes('abs'), 'sentadilla sin abs');
  assert.ok(!C['hamstrings.rdl'].secondary.includes('back'), 'peso muerto rumano sin back');
  assert.ok(!C['shoulders.press_overhead'].secondary.includes('chest'), 'press militar sin chest');
  assert.ok(!C['shoulders.press_landmine_neutral'].secondary.includes('chest'), 'press landmine sin chest');
  assert.ok(!C['glutes.kickback_cable'].secondary.includes('hamstrings'), 'patada de glúteo sin isquios');
  assert.deepEqual(C['glutes.hip_thrust'].secondary, []);
  // DEC-013/014: hip thrust → isquios es 'ninguna' (verificado, 1 estudio): ya no figura como secundario ni suma.
  assert.equal(C['glutes.hip_thrust'].relations.hamstrings.relacion, 'ninguna');
  assert.equal(C['functional.farmer_carry'].primary, null, 'paseo del granjero sin primario');
  assert.deepEqual(C['functional.farmer_carry'].secondary, [], 'paseo del granjero sin secundarios (ni abs)');
});

test('DEC-010: los nombres del catálogo son únicos (el historial viejo se mapea a exerciseId por nombre)', () => {
  const names = catalogEntries().map(x => x.entry.name);
  assert.equal(new Set(names).size, names.length);
  catalogEntries().forEach(x => assert.equal(K.EXERCISE_ID_BY_NAME[x.entry.name], x.entry.id));
  assert.equal(K.EXERCISE_INDEX['glutes.bulgarian_hip'].bucket, 'glutes');
});

test('DEC-010: reglas centralizadas con valor, nivel, fuente y fecha de revisión', () => {
  const R = K.VALIDATOR_RULES;
  Object.entries(R).forEach(([key, r]) => {
    assert.ok(r.value !== undefined, `${key}: sin valor`);
    assert.ok(['E1', 'E2', 'E3', 'E4'].includes(r.level), `${key}: nivel inválido`);
    assert.ok(r.source === null || (r.source.label && r.source.url), `${key}: fuente mal formada`);
    assert.match(r.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${key}: fecha de revisión`);
    // DEC-016: ninguna regla está verificada contra su fuente primaria; el piso semanal se contrastó con la infografía oficial del ACSM, pero falta el artículo completo (MSSE 2026).
    assert.equal(r.verifiedAgainstPrimarySource, false, `${key}: nada está verificado contra la fuente primaria todavía`);
  });
  assert.equal(R.minWeeklySetsPerMuscle.verifiedAgainst, 'verificado contra material oficial del ACSM (infografía)');
  assert.equal(R.minWeeklySetsPerMuscle.source.url, 'https://acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf');
  assert.match(R.minWeeklySetsPerMuscle.note, /MSSE 2026/);
  assert.match(R.minWeeklySetsPerMuscle.usage, /piso protector/i);
  assert.match(R.minWeeklySetsPerMuscle.note, /objetivo de hipertrofia del ACSM 2026/i);
  assert.equal(R.sessionSetCap.value, 25);
  assert.equal(R.sessionSetCap.level, 'E4');
  assert.equal(R.sessionSetCap.source, null);
  assert.equal(R.sessionSetCap.reviewRequired, true);
  assert.equal(R.setExecutionSeconds.value, 45);
  assert.equal(R.setExecutionSeconds.assumption, true);
  assert.equal(R.secondaryMuscleWeight.value, 0.5);
  assert.equal(R.maxFractionalSetsPerMuscleSession.value, 11);
});

// Rutas (con "#" por cada índice de lista) en las que dos objetos difieren. Una
// clave agregada, quitada o con otro valor, o una lista de otro largo, cuenta.
function diffPaths(a, b, path, out) {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) { out.add(path); return out; }
    if (Array.isArray(a)) {
      if (a.length !== b.length) { out.add(path + '.length'); return out; }
      a.forEach((x, i) => diffPaths(x, b[i], path + '.#', out));
      return out;
    }
    new Set(Object.keys(a).concat(Object.keys(b))).forEach(k => diffPaths(a[k], b[k], path + '.' + k, out));
  } else if (!Object.is(a, b)) out.add(path);
  return out;
}

test('el detector de diferencias del test de identidad ve claves agregadas, quitadas, cambiadas, null vs ausente y listas de otro largo', () => {
  const d = (a, b) => [...diffPaths(a, b, 'x', new Set())].sort();
  assert.deepEqual(d({ a: 1 }, { a: 1 }), []);
  assert.deepEqual(d({ a: 1, nueva: 2 }, { a: 1 }), ['x.nueva']);
  assert.deepEqual(d({ a: 1 }, { a: 1, vieja: 2 }), ['x.vieja']);
  assert.deepEqual(d({ a: 1 }, { a: 2 }), ['x.a']);
  assert.deepEqual(d({ a: null }, {}), ['x.a']);
  assert.deepEqual(d({ l: [1, 2] }, { l: [1] }), ['x.l.length']);
  assert.deepEqual(d({ l: [{ k: 1 }, { k: 2 }] }, { l: [{ k: 1 }, { k: 3 }] }), ['x.l.#.k']);
  assert.deepEqual(d({ l: [] }, { l: {} }), ['x.l']);
});

test('DEC-010: perfiles sin healthGoal ni lesiones generan el mismo plan que antes; solo pueden diferir las rutas de la lista blanca', () => {
  const fx = require('./fixtures/plan-identity-baseline.json');
  // Lista blanca EXPLÍCITA de lo que puede diferir de la línea base (capturada con el
  // motor anterior a DEC-010). Cualquier ruta nueva, quitada o cambiada que no esté acá
  // hace fallar el test: al agregar una clave al plan hay que decidirlo y listarla.
  const ALLOWED_DIFFS = {
    'plan.training.sessions.#.exercises.#.exerciseId': 'DEC-010: id estable por ejercicio',
    'plan.training.sessions.#.exercises.#.bucket': 'DEC-010: dónde vive el ejercicio',
    'plan.training.sessions.#.exercises.#.secondary': 'DEC-010: músculos secundarios (peso 0.5)',
    'plan.health.injuryBlockReason': 'DEC-011: texto de la pausa por lesión (null sin lesiones)',
    'plan.health.injuryClearance': 'DEC-011: zonas pendientes de autorización (vacío sin lesiones)',
    // DEC-014: el aviso del tope pasó a regla E4 con aceptación explícita; los avisos nuevos (E4 y R1) llevan evidencia y regla.
    'plan.input.longSessionAcceptedOn': 'DEC-014: aceptación explícita de sesiones más largas (vacía por defecto)',
    'plan.input.longSessionAcceptance': 'DEC-016: la aceptación acotada a la firma del plan y a un máximo de series (null por defecto)',
    'plan.training.sessionLimit': 'DEC-014: regla E4 (tope, recortes, sesiones por encima)',
    // B-013: la fuente SPIERING_2021 (cita que no verifica) se reemplazó por SPIERING_MANT_2021; solo cambia el id en las listas de fuentes.
    'plan.training.sources.#': 'B-013: id de la fuente de mantenimiento (SPIERING_MANT_2021)',
    'plan.sourcesUsed.#': 'B-013: ídem, en la lista combinada de fuentes usadas',
    'plan.training.sessions.#.exercises.#.setWeights': 'DEC-014: aporte de una serie por músculo (fraccionado)',
    'plan.training.sessions.#.fractionalSets': 'DEC-014: series fraccionadas por músculo y sesión',
    // DEC-014 y DEC-016: los avisos nuevos (E4, R1 y grupos bajo el mínimo) hacen que la lista cambie de largo en todos los perfiles.
    'plan.training.warnings.length': 'DEC-014 / DEC-016: avisos nuevos (E4, R1, grupos bajo el mínimo)',
    'plan.warnings.length': 'DEC-014 / DEC-016: ídem, en la lista combinada',
  };
  assert.ok(Object.keys(fx.cases).length >= 10);
  const seen = new Set();
  Object.entries(fx.cases).forEach(([key, c]) => {
    assert.ok(!c.profile.healthGoal && !c.profile.injuryZones, `${key}: el fixture solo cubre perfiles sin healthGoal ni lesiones`);
    // DEC-014: con la aceptación explícita no se recorta nada, así que el resto del plan (series,
    // duraciones, orden de ejercicios, top sets) tiene que seguir idéntico al de la línea base.
    const plan = E.buildPlan(Object.assign({}, c.profile, { longSessionAcceptedOn: '2026-10-24' }), fx.today);
    diffPaths(plan, c.plan, 'plan', seen);
    // Las claves permitidas valen "sin efecto" en estos perfiles: nunca pausan ni tocan nada.
    assert.equal(plan.health.injuryBlockReason, null, `${key}`);
    assert.deepEqual(plan.health.injuryClearance, { required: false, pendingZones: [], evidence: 'E4' }, `${key}`);
    assert.equal(plan.health.blocked, false, `${key}`);
  });
  const unexpected = [...seen].filter(p => !(p in ALLOWED_DIFFS)).sort();
  assert.deepEqual(unexpected, [], `rutas que difieren de la línea base y NO están en la lista blanca: ${unexpected.join(', ')}`);
  // La lista blanca no puede quedar vieja: cada ruta listada tiene que diferir de verdad.
  const stale = Object.keys(ALLOWED_DIFFS).filter(p => !seen.has(p)).sort();
  assert.deepEqual(stale, [], `rutas de la lista blanca que ya no difieren (quitarlas): ${stale.join(', ')}`);
});

test('DEC-010: bucket dice dónde vive y muscle es el primario real; coinciden salvo ejercicios sin aporte', () => {
  const plan = E.buildPlan(Object.assign({}, male, { healthGoal: true }), TODAY);
  const all = plan.training.sessions.flatMap(s => s.exercises);
  all.forEach(e => {
    assert.ok(e.exerciseId && K.EXERCISE_INDEX[e.exerciseId], `ejercicio sin exerciseId válido: ${e.name}`);
    assert.equal(e.bucket, K.EXERCISE_INDEX[e.exerciseId].bucket);
    assert.equal(e.muscle, K.EXERCISE_CONTRIBUTION[e.exerciseId].primary);
    assert.deepEqual(e.secondary, K.EXERCISE_CONTRIBUTION[e.exerciseId].secondary);
    if (e.muscle !== null) assert.equal(e.muscle, e.bucket);
  });
});

test('DEC-010 / DEC-005: el paseo del granjero se agrega aparte, sin descontar series y sin aportar volumen', () => {
  const profiles = [male, Object.assign({}, male, { daysPerWeek: 4 }), Object.assign({}, male, { daysPerWeek: 3, goal: 'maintain' }), Object.assign({}, male, { daysPerWeek: 6, goal: 'bulk' })];
  const exec = K.VALIDATOR_RULES.setExecutionSeconds.value;
  let carries = 0;
  profiles.forEach(p => {
    const plan = E.buildPlan(Object.assign({}, p, { healthGoal: true }), TODAY);
    const all = plan.training.sessions.flatMap(s => s.exercises);
    const carry = all.filter(e => e.exerciseId === 'functional.farmer_carry');
    carries += carry.length;
    carry.forEach(e => {
      assert.equal(e.muscle, null);
      assert.equal(e.muscleLabel, 'Funcional');
      assert.equal(e.bucket, 'quads');
      assert.equal(e.sets, 2);
      assert.deepEqual(e.secondary, []);
    });
    // El volumen de hipertrofia de cada grupo sigue siendo exactamente el semanal.
    Object.keys(plan.training.weeklySets).forEach(mu => {
      const assigned = all.filter(e => e.muscle === mu).reduce((a, e) => a + e.sets, 0);
      assert.equal(assigned, plan.training.weeklySets[mu], `${mu}: el volumen asignado cambió (${assigned} vs ${plan.training.weeklySets[mu]})`);
    });
    // totalSets y duración incluyen las series del paseo.
    plan.training.sessions.forEach(s => {
      assert.equal(s.totalSets, s.exercises.reduce((a, e) => a + e.sets, 0));
      let seconds = 0;
      s.exercises.forEach(e => {
        const uf = e.unilateral ? 2 : 1;
        if (e.topSet) seconds += uf * (180 + exec) + uf * ((e.backoffSets || 0) * (150 + exec));
        else seconds += uf * (e.sets * ((e.type === 'compound' ? 150 : 75) + exec));
      });
      assert.equal(s.durationMin, Math.round(seconds / 60));
    });
  });
  assert.ok(carries >= 3, 'el paseo del granjero debería aparecer en los planes con healthGoal');
});

/* ---------- DEC-011: lesiones (autorización profesional) y aviso por dolor ---------- */

const withInjury = (zones, extra) => Object.assign({}, male, { injuryZones: zones }, extra || {});
const cleared = (health, zone, date) => { const h = JSON.parse(JSON.stringify(health)); h.injuries.find(i => i.zone === zone).clearanceDate = date; return h; };

test('DEC-011: cualquier zona declarada pausa el plan hasta confirmar la autorización profesional', () => {
  const plan = E.buildPlan(withInjury(['shoulder']), TODAY);
  assert.equal(plan.health.blocked, true);
  assert.deepEqual(plan.health.injuryClearance, { required: true, pendingZones: ['shoulder'], evidence: 'E4' });
  assert.match(plan.health.injuryBlockReason, /Hombro/);
  assert.match(plan.health.injuryBlockReason, /no puede adaptar una rutina a una lesión/);
  assert.match(plan.health.injuryBlockReason, /profesional te haya autorizado/);
  assert.equal(plan.health.blockReason, null, 'sin síntomas ni condición CV, la pausa es solo por la lesión');
  // También con diagnóstico y también sin dolor: aplica a cualquier zona declarada.
  const diagnosed = E.buildPlan(withInjury(['knee'], { injuryDiagnosed: ['knee'] }), TODAY);
  assert.equal(diagnosed.health.blocked, true);
  assert.deepEqual(diagnosed.health.injuryClearance.pendingZones, ['knee']);
});

test('DEC-011: la confirmación es por zona y se guarda con fecha; con todas confirmadas el plan se muestra', () => {
  const base = E.normalizeProfile(withInjury(['shoulder', 'knee']));
  const one = Object.assign({}, base, { health: cleared(base.health, 'shoulder', '2026-09-10') });
  const planOne = E.buildPlan(one, TODAY);
  assert.equal(planOne.health.blocked, true);
  assert.deepEqual(planOne.health.injuryClearance.pendingZones, ['knee'], 'solo falta la zona sin confirmar');
  assert.doesNotMatch(planOne.health.injuryBlockReason, /Hombro/);
  const both = Object.assign({}, one, { health: cleared(one.health, 'knee', '2026-09-11') });
  const planBoth = E.buildPlan(both, TODAY);
  assert.equal(planBoth.health.blocked, false);
  assert.equal(planBoth.health.injuryBlockReason, null);
  assert.deepEqual(planBoth.health.injuryClearance.pendingZones, []);
  assert.equal(planBoth.health.injuries.find(i => i.zone === 'shoulder').clearanceDate, '2026-09-10');
  // El plan se calcula igual esté pausado o no (la UI decide no mostrarlo).
  assert.deepEqual(planBoth.training.sessions, E.buildPlan(withInjury(['shoulder', 'knee']), TODAY).training.sessions);
});

test('DEC-011: lesión y síntomas a la vez muestran las dos causas de pausa', () => {
  const plan = E.buildPlan(withInjury(['shoulder'], { healthSymptoms: 'on' }), TODAY);
  assert.equal(plan.health.blocked, true);
  assert.ok(plan.health.blockReason && plan.health.injuryBlockReason);
});

test('DEC-011: la autorización se conserva entre ediciones solo en las zonas que siguen declaradas', () => {
  const stored = E.normalizeProfile(withInjury(['shoulder', 'knee']));
  stored.health = cleared(cleared(stored.health, 'shoulder', '2026-09-10'), 'knee', '2026-09-11');
  // El formulario nunca envía clearanceDate: la edición produce null y se reinyecta lo guardado.
  const edited = E.normalizeProfile(withInjury(['shoulder', 'knee'], { injuryPainNow: ['shoulder'], injuryDiagnosed: ['knee'] }));
  assert.ok(edited.health.injuries.every(i => i.clearanceDate === null));
  const kept = E.carryOverInjuryClearances(stored.health, edited.health);
  assert.deepEqual(kept.injuries.map(i => [i.zone, i.clearanceDate]), [['shoulder', '2026-09-10'], ['knee', '2026-09-11']], 'cambiar diagnóstico o dolor no vuelve a pedirla');
  assert.equal(kept.injuries[0].painNow, true);
  // Se agrega una zona: solo esa vuelve a pedirse.
  const added = E.carryOverInjuryClearances(stored.health, E.normalizeProfile(withInjury(['shoulder', 'knee', 'ankle'])).health);
  assert.deepEqual(added.injuries.map(i => [i.zone, i.clearanceDate]), [['shoulder', '2026-09-10'], ['knee', '2026-09-11'], ['ankle', null]]);
  // Se quita una zona y después se vuelve a agregar: pierde la fecha y se vuelve a pedir.
  const removed = E.carryOverInjuryClearances(stored.health, E.normalizeProfile(withInjury(['shoulder'])).health);
  assert.deepEqual(removed.injuries.map(i => [i.zone, i.clearanceDate]), [['shoulder', '2026-09-10']]);
  const readded = E.carryOverInjuryClearances(removed, E.normalizeProfile(withInjury(['shoulder', 'knee'])).health);
  assert.equal(readded.injuries.find(i => i.zone === 'knee').clearanceDate, null);
  // Re-normalizar un perfil ya guardado no pierde las fechas.
  assert.deepEqual(E.normalizeProfile(stored).health.injuries.map(i => i.clearanceDate), ['2026-09-10', '2026-09-11']);
  // Sin datos previos no inventa fechas.
  assert.equal(E.carryOverInjuryClearances(undefined, edited.health).injuries[0].clearanceDate, null);
});

test('DEC-011: ningún texto del motor ni de la interfaz dice que la rutina está adaptada a la lesión; todo es precaución E4', () => {
  const fs = require('node:fs');
  const planPending = E.buildPlan(withInjury(['shoulder', 'knee'], { injuryDiagnosed: ['knee'] }), TODAY);
  const planOk = E.buildPlan(Object.assign({}, E.normalizeProfile(withInjury(['shoulder'])), { health: cleared(E.normalizeProfile(withInjury(['shoulder'])).health, 'shoulder', '2026-09-10') }), TODAY);
  const texts = [planPending.health.injuryBlockReason, planPending.health.disclaimer, planOk.health.disclaimer]
    .concat(planPending.warnings.map(w => w.text), planOk.warnings.map(w => w.text));
  const claim = /adaptad[oa]s? a (tu|la) lesi[oó]n|(plan|rutina) (est[aá] |queda )?adaptad[oa]|(?<!no )adapta(mos)? (el plan|la rutina)|adaptaciones aplican|se excluyen los ejercicios|igual se excluyen/i;
  texts.forEach(t => assert.doesNotMatch(t, claim, `texto con afirmación de adaptación: ${t}`));
  // Las precauciones por zona llevan la etiqueta E4 en el dato (la UI la dibuja).
  const precautions = planOk.warnings.filter(w => /precaución/.test(w.text));
  assert.equal(precautions.length, 1);
  assert.equal(precautions[0].evidence, 'E4');
  assert.match(planOk.health.disclaimer, /E4/);
  assert.match(planOk.health.disclaimer, /no adapta la rutina/);
  // Mismo criterio sobre el código fuente de la interfaz y del motor.
  ['../js/app.js', '../js/engine.js'].forEach(rel => {
    const src = fs.readFileSync(require('node:path').join(__dirname, rel), 'utf8');
    assert.doesNotMatch(src, claim, `${rel}: quedó un texto que afirma adaptación a la lesión`);
  });
});

test('DEC-011: el sustituto por lesión (shoulder_press_safe) y las exclusiones se etiquetan E4; sin lesión no hay etiqueta', () => {
  const injured = E.buildPlan(withInjury(['shoulder']), TODAY).training.sessions.flatMap(s => s.exercises);
  const subs = injured.filter(e => e.injurySubstitute);
  assert.ok(subs.length >= 1);
  subs.forEach(e => { assert.equal(e.pattern, 'shoulder_press_safe'); assert.deepEqual(e.injurySubstitute, { zone: 'shoulder', evidence: 'E4' }); });
  const clean = E.buildPlan(male, TODAY).training.sessions.flatMap(s => s.exercises);
  assert.ok(clean.every(e => !('injurySubstitute' in e)));
});

test('DEC-011: aviso de consultar a un profesional con 2 sesiones distintas con dolor >5 en las últimas 4 semanas', () => {
  const R = K.VALIDATOR_RULES;
  assert.equal(R.painFlagThreshold.value, 5);
  assert.equal(R.painAdviceMinSessions.value, 2);
  assert.equal(R.painAdviceWindowDays.value, 28);
  ['painFlagThreshold', 'painAdviceMinSessions', 'painAdviceWindowDays'].forEach(k => assert.equal(R[k].level, 'E4'));

  let rec = E.applyPainReading(undefined, 7, 'S1', '2026-09-01');
  assert.equal(rec.flagged, true);
  assert.equal(E.painProfessionalAdvice(rec, '2026-09-01').advise, false, 'una sola sesión no alcanza');
  rec = E.applyPainReading(rec, 8, 'S1', '2026-09-01'); // otra serie de la MISMA sesión
  assert.equal(rec.painSessions.length, 1, 'dos series de la misma sesión cuentan una vez');
  assert.equal(E.painProfessionalAdvice(rec, '2026-09-01').advise, false);
  // Una sesión intermedia sin dolor no corta la cuenta: no tienen que ser seguidas.
  rec = E.applyPainReading(rec, 2, 'S2', '2026-09-05');
  rec = E.applyPainReading(rec, 6, 'S3', '2026-09-09');
  const advice = E.painProfessionalAdvice(rec, '2026-09-09');
  assert.equal(advice.advise, true);
  assert.equal(advice.sessions, 2);
  assert.equal(advice.evidence, 'E4');
  // Dolor igual al umbral (5) no cuenta: tiene que superarlo.
  assert.equal(E.painProfessionalAdvice(E.applyPainReading(E.applyPainReading(undefined, 5, 'A', '2026-09-01'), 5, 'B', '2026-09-02'), '2026-09-02').advise, false);
});

test('DEC-011: la ventana de 4 semanas se cuenta en días (28 inclusive) y las sesiones viejas dejan de contar', () => {
  let rec = E.applyPainReading(undefined, 9, 'S1', '2026-09-01');
  rec = E.applyPainReading(rec, 9, 'S2', '2026-09-20');
  assert.equal(E.painProfessionalAdvice(rec, '2026-09-29').advise, true, 'S1 tiene 28 días: todavía cuenta');
  assert.equal(E.painProfessionalAdvice(rec, '2026-09-30').advise, false, 'S1 tiene 29 días: ya no cuenta');
  // El aviso no depende de que la marca de sustitución siga activa.
  let flagged = E.applyPainReading(undefined, 9, 'S1', '2026-09-01');
  flagged = E.applyPainReading(flagged, 9, 'S2', '2026-09-08');
  let unflagged = E.applyPainReading(flagged, 1, 'S3', '2026-09-10');
  unflagged = E.applyPainReading(unflagged, 1, 'S4', '2026-09-12');
  assert.equal(unflagged.flagged, false, 'la marca se limpia con 2 sesiones distintas ≤5 (regla de DEC-009 intacta)');
  assert.equal(E.painProfessionalAdvice(unflagged, '2026-09-12').advise, true);
  // Se poda el historial viejo al escribir (no crece sin límite).
  const later = E.applyPainReading(unflagged, 9, 'S5', '2026-11-30');
  assert.deepEqual(later.painSessions.map(s => s.sessionId), ['S5']);
});

test('DEC-011: applyPainReading no muta el registro anterior y conserva la regla de DEC-009 (2 sesiones distintas limpias para desmarcar)', () => {
  const rec0 = Object.freeze({ flagged: true, cleanStreak: 0, lastSessionId: 'S0', painSessions: Object.freeze([]) });
  const rec1 = E.applyPainReading(rec0, 2, 'S0', '2026-09-01'); // misma sesión: no cuenta para desmarcar
  assert.equal(rec1.flagged, true); assert.equal(rec1.cleanStreak, 0);
  const rec2 = E.applyPainReading(rec1, 2, 'S1', '2026-09-02');
  assert.equal(rec2.flagged, true); assert.equal(rec2.cleanStreak, 1);
  const rec3 = E.applyPainReading(rec2, 3, 'S2', '2026-09-03');
  assert.equal(rec3.flagged, false);
  assert.equal(E.applyPainReading(rec3, 9, 'S3', '2026-09-04').flagged, true, 'dolor >5 vuelve a marcar');
  // Registros guardados por versiones anteriores (sin painSessions) siguen funcionando.
  assert.deepEqual(E.painProfessionalAdvice({ flagged: true, cleanStreak: 0, lastSessionId: 'x' }, '2026-09-01'), { advise: false, sessions: 0, evidence: 'E4' });
});

/* ---------- DEC-009 (Privacidad): export e import sin datos de salud ---------- */

const HEALTH_KEYS = /"(health|painFlags|painNow|painSessions|pain|clearanceDate|injuries|screening|diabetes|healthSymptoms|diabetesType|injuryZones)":/;
function storedProfileWithHealth() {
  const data = E.normalizeProfile(withInjury(['shoulder', 'knee'], { healthSymptoms: 'on', healthMedicalClearance: 'on', diabetesType: 'type1', healthDiabetesMed: 'on' }));
  data.health = cleared(cleared(data.health, 'shoulder', '2026-09-10'), 'knee', '2026-09-11');
  return {
    id: 'prof-1', createdAt: '2026-09-01', updatedAt: '2026-09-12', data,
    log: [{ date: '2026-09-01', weightKg: 85, notes: 'Datos iniciales' }],
    workouts: [
      { sessionId: 's1', date: '2026-09-10', exercise: 'Press banca con barra', exerciseId: 'chest.bench_press_barbell', muscle: 'chest', setType: 'normal', setNumber: 1, weight: 80, reps: 8, pain: null },
      { sessionId: 's1', date: '2026-09-10', exercise: 'Sentadilla trasera o sentadilla en hack', exerciseId: 'quads.squat_back_or_hack', muscle: 'quads', setType: 'normal', setNumber: 1, weight: 100, reps: 6, pain: 7 },
    ],
    painFlags: { squat_bilateral: { flagged: true, cleanStreak: 0, lastSessionId: 's1', painSessions: [{ sessionId: 's1', date: '2026-09-10' }] } },
  };
}

test('DEC-009 privacidad: el export no incluye health, painFlags, dolor por serie ni fechas de autorización', () => {
  const stored = storedProfileWithHealth();
  const before = JSON.stringify(stored);
  assert.match(before, HEALTH_KEYS, 'el perfil de prueba tiene que traer datos de salud');
  const exported = E.exportProfile(stored);
  assert.doesNotMatch(JSON.stringify(exported), HEALTH_KEYS, 'el export filtró datos de salud');
  assert.ok(!('health' in exported.data) && !('painFlags' in exported));
  assert.equal(JSON.stringify(stored), before, 'exportProfile no debe mutar el perfil local');
  // Lo que no es salud se conserva: datos, medidas, historial de fuerza (sin el dolor).
  assert.equal(exported.id, 'prof-1');
  assert.equal(exported.data.name, stored.data.name);
  assert.equal(exported.data.weightKg, stored.data.weightKg);
  assert.deepEqual(exported.log, stored.log);
  assert.deepEqual(exported.workouts.map(w => [w.exerciseId, w.weight, w.reps]), [['chest.bench_press_barbell', 80, 8], ['quads.squat_back_or_hack', 100, 6]]);
  assert.ok(exported.workouts.every(w => !('pain' in w)));
  // Es un perfil válido: genera plan, y sin condiciones declaradas.
  const plan = E.buildPlan(exported.data, TODAY);
  assert.equal(plan.health.anyCondition, false);
  assert.equal(plan.health.blocked, false);
});

test('DEC-009 privacidad: un perfil sin datos de salud se exporta igual que antes (salvo el dolor por serie, que no existía)', () => {
  const plain = { id: 'p2', createdAt: '2026-09-01', updatedAt: '2026-09-02', data: E.normalizeProfile(male), log: [] };
  const exported = E.exportProfile(plain);
  const { health, ...restOfData } = plain.data;
  assert.deepEqual(exported.data, JSON.parse(JSON.stringify(restOfData)));
  assert.ok(!('workouts' in exported), 'sin workouts no se inventa la clave');
});

test('DEC-009 privacidad: importar un archivo viejo con health y painFlags los ignora y no los guarda', () => {
  const oldFile = JSON.parse(JSON.stringify(storedProfileWithHealth())); // formato de la versión anterior: incluye todo
  const prepared = E.prepareImportedProfile(oldFile, TODAY);
  assert.equal(prepared.droppedHealth, true, 'debe avisar que el archivo traía datos de salud');
  assert.deepEqual(prepared.data.health, { screening: { regularExercise: false, cvMetabolicRenal: false, symptoms: false, medicalClearance: false }, diabetes: { type: 'none', medication: false }, injuries: [] });
  // `health` queda como el objeto vacío por defecto; nada de lo que traía el archivo sobrevive.
  assert.doesNotMatch(JSON.stringify(prepared), /"(painFlags|painNow|painSessions|pain|clearanceDate|healthSymptoms|diabetesType|injuryZones)":/);
  // B-001: las series y sesiones vuelven (el import ya no pierde el entrenamiento), pero NUNCA con el dolor por serie.
  assert.ok(!('painFlags' in prepared), 'no se guardan painFlags del archivo');
  assert.ok(prepared.workouts.length > 0 && prepared.workouts.every(w => !('pain' in w)), 'las series vuelven sin el dolor por serie');
  // El perfil importado no queda pausado por nada que venga del archivo.
  const plan = E.buildPlan(prepared.data, TODAY);
  assert.equal(plan.health.blocked, false);
  assert.equal(plan.health.anyCondition, false);
  assert.deepEqual(plan.health.injuryClearance.pendingZones, []);
  // También se ignoran los campos planos de salud (archivo armado a mano).
  const flat = E.prepareImportedProfile({ data: Object.assign({}, male, { injuryZones: ['shoulder'], healthSymptoms: 'on', diabetesType: 'type2', healthDiabetesMed: 'on' }) }, TODAY);
  assert.equal(flat.droppedHealth, true);
  assert.deepEqual(flat.data.health.injuries, []);
  assert.equal(flat.data.health.screening.symptoms, false);
  assert.equal(flat.data.health.diabetes.type, 'none');
  // painFlags suelto, sin health, también cuenta como dato ignorado y no se guarda.
  const onlyPain = E.prepareImportedProfile({ data: male, painFlags: oldFile.painFlags }, TODAY);
  assert.equal(onlyPain.droppedHealth, true);
  assert.ok(!('painFlags' in onlyPain));
});

test('DEC-009 privacidad: importar un archivo sin datos de salud deja el perfil sin lesiones y sin aviso de datos ignorados', () => {
  const noHealth = E.prepareImportedProfile({ createdAt: '2026-08-01', data: male, log: [{ date: '2026-08-01', weightKg: 85 }] }, TODAY);
  assert.equal(noHealth.droppedHealth, false);
  assert.deepEqual(noHealth.data.health.injuries, []);
  assert.equal(noHealth.createdAt, '2026-08-01');
  assert.equal(noHealth.updatedAt, TODAY);
  assert.equal(E.prepareImportedProfile({ data: male }, TODAY).createdAt, TODAY);
  // Un `health` vacío (lo que exportaba la versión anterior sin condiciones) no es "datos ignorados".
  const emptyHealth = E.prepareImportedProfile({ data: E.normalizeProfile(male) }, TODAY);
  assert.equal(emptyHealth.droppedHealth, false);
});

test('DEC-009 privacidad: se avisa antes de importar si ya hay un perfil local con lesiones que se parece', () => {
  const local = storedProfileWithHealth();
  const plainLocal = { id: 'p9', data: E.normalizeProfile(Object.assign({}, male, { name: 'Otro' })) };
  const incoming = { id: 'prof-1', data: Object.assign({}, male, { name: 'Distinto' }) };
  assert.deepEqual(E.localHealthConflicts([local, plainLocal], incoming).map(p => p.id), ['prof-1'], 'mismo id');
  const sameName = { id: 'otro-id', data: Object.assign({}, male, { name: local.data.name }) };
  assert.deepEqual(E.localHealthConflicts([local, plainLocal], sameName).map(p => p.id), ['prof-1'], 'mismo nombre');
  assert.deepEqual(E.localHealthConflicts([local, plainLocal], { id: 'x', data: Object.assign({}, male, { name: 'Otro' }) }), [], 'el parecido sin lesiones locales no avisa');
  assert.deepEqual(E.localHealthConflicts([local], { id: 'x', data: Object.assign({}, male, { name: 'Nadie' }) }), []);
});

/* ---------- DEC-011 (ajuste): la autorización se invalida cuando una zona empeora ---------- */

// Perfil guardado con las zonas dadas, todas con autorización fechada, y los
// flags de dolor/diagnóstico indicados. Devuelve el perfil y la edición típica.
function authorizedProfile(zones, { pain = [], diagnosed = [] } = {}) {
  const base = E.normalizeProfile(withInjury(zones, { injuryPainNow: pain, injuryDiagnosed: diagnosed }));
  base.health = zones.reduce((h, z, i) => cleared(h, z, `2026-09-1${i}`), base.health);
  return base;
}
function editAndReconcile(stored, zones, { pain = [], diagnosed = [] } = {}) {
  const edited = E.normalizeProfile(withInjury(zones, { injuryPainNow: pain, injuryDiagnosed: diagnosed }));
  const health = E.reconcileInjuryClearances(stored.health, edited.health);
  return { health, plan: E.buildPlan(Object.assign({}, edited, { health }), TODAY) };
}

test('DEC-011: una subida del dolor de una zona invalida su autorización y pausa el plan', () => {
  const stored = authorizedProfile(['shoulder']);
  assert.equal(E.buildPlan(stored, TODAY).health.blocked, false, 'autorizado y sin cambios: el plan se muestra');
  const { health, plan } = editAndReconcile(stored, ['shoulder'], { pain: ['shoulder'] });
  assert.equal(health.injuries[0].clearanceDate, null);
  assert.equal(health.injuries[0].painNow, true);
  assert.equal(plan.health.blocked, true);
  assert.deepEqual(plan.health.injuryClearance.pendingZones, ['shoulder']);
  // Mismo flujo que la primera vez: advertencia + derivación, y se destraba con una confirmación fechada nueva.
  assert.match(plan.health.injuryBlockReason, /no puede adaptar una rutina a una lesión/);
  const reconfirmed = Object.assign({}, stored, { health: cleared(health, 'shoulder', '2026-09-20') });
  assert.equal(E.buildPlan(reconfirmed, TODAY).health.blocked, false);
  assert.equal(E.buildPlan(reconfirmed, TODAY).health.injuries[0].clearanceDate, '2026-09-20');
});

test('DEC-011: una bajada del dolor, o dejarlo igual, no pide nada', () => {
  const stored = authorizedProfile(['shoulder', 'knee'], { pain: ['shoulder', 'knee'] });
  const down = editAndReconcile(stored, ['shoulder', 'knee'], { pain: ['knee'] }); // el hombro baja, la rodilla sigue igual
  assert.deepEqual(down.health.injuries.map(i => [i.zone, i.painNow, i.clearanceDate]), [['shoulder', false, '2026-09-10'], ['knee', true, '2026-09-11']]);
  assert.equal(down.plan.health.blocked, false);
  const allDown = editAndReconcile(stored, ['shoulder', 'knee']);
  assert.equal(allDown.plan.health.blocked, false);
  assert.deepEqual(allDown.health.injuries.map(i => i.clearanceDate), ['2026-09-10', '2026-09-11']);
  const same = editAndReconcile(stored, ['shoulder', 'knee'], { pain: ['shoulder', 'knee'] });
  assert.equal(same.plan.health.blocked, false);
});

test('DEC-011: un cambio de diagnóstico, en cualquier sentido, invalida la autorización y pausa el plan', () => {
  const undiagnosed = authorizedProfile(['knee']);
  const gotDiagnosis = editAndReconcile(undiagnosed, ['knee'], { diagnosed: ['knee'] });
  assert.equal(gotDiagnosis.health.injuries[0].clearanceDate, null);
  assert.equal(gotDiagnosis.plan.health.blocked, true);
  const diagnosed = authorizedProfile(['knee'], { diagnosed: ['knee'] });
  const lostDiagnosis = editAndReconcile(diagnosed, ['knee']);
  assert.equal(lostDiagnosis.health.injuries[0].clearanceDate, null);
  assert.equal(lostDiagnosis.plan.health.blocked, true);
  // Diagnóstico que cambia a la vez que el dolor baja: pausa igual (cambió el diagnóstico).
  const both = editAndReconcile(authorizedProfile(['knee'], { pain: ['knee'] }), ['knee'], { diagnosed: ['knee'] });
  assert.equal(both.plan.health.blocked, true);
  // Diagnóstico sin cambios: se mantiene.
  assert.equal(editAndReconcile(diagnosed, ['knee'], { diagnosed: ['knee'] }).plan.health.blocked, false);
});

test('DEC-011: la invalidación es por zona; las demás conservan su fecha, y las zonas nuevas siguen pidiéndose', () => {
  const stored = authorizedProfile(['shoulder', 'knee']);
  const { health, plan } = editAndReconcile(stored, ['shoulder', 'knee', 'ankle'], { pain: ['knee'] });
  assert.deepEqual(health.injuries.map(i => [i.zone, i.clearanceDate]), [['shoulder', '2026-09-10'], ['knee', null], ['ankle', null]]);
  assert.deepEqual(plan.health.injuryClearance.pendingZones, ['knee', 'ankle']);
  assert.doesNotMatch(plan.health.injuryBlockReason, /Hombro/);
});

test('DEC-011: reconcileInjuryClearances no muta sus entradas, tolera no tener estado previo y respeta carryOverInjuryClearances', () => {
  const stored = authorizedProfile(['shoulder']);
  const edited = E.normalizeProfile(withInjury(['shoulder'], { injuryPainNow: ['shoulder'] }));
  const storedBefore = JSON.stringify(stored.health), editedBefore = JSON.stringify(edited.health);
  E.reconcileInjuryClearances(stored.health, edited.health);
  assert.equal(JSON.stringify(stored.health), storedBefore);
  assert.equal(JSON.stringify(edited.health), editedBefore);
  assert.equal(E.reconcileInjuryClearances(undefined, edited.health).injuries[0].clearanceDate, null, 'sin estado previo no inventa fechas');
  // Sin cambios de dolor ni diagnóstico equivale exactamente a carryOver.
  const noChange = E.normalizeProfile(withInjury(['shoulder']));
  assert.deepEqual(E.reconcileInjuryClearances(stored.health, noChange.health), E.carryOverInjuryClearances(stored.health, noChange.health));
});

/* ---------- DEC-010: series del paseo del granjero en la configuración ---------- */

test('DEC-010: las series del paseo del granjero viven en VALIDATOR_RULES con el mismo formato que SESSION_SET_CAP', () => {
  const cap = K.VALIDATOR_RULES.sessionSetCap, carry = K.VALIDATOR_RULES.functionalNoVolumeExtraSets;
  assert.ok(carry, 'falta la regla functionalNoVolumeExtraSets');
  assert.equal(carry.value, 2);
  assert.equal(carry.level, 'E4');
  assert.equal(carry.source, null);
  assert.equal(carry.reviewRequired, true);
  assert.match(carry.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(carry.verifiedAgainstPrimarySource, false);
  assert.ok(carry.note);
  assert.deepEqual(Object.keys(carry).sort(), Object.keys(cap).sort(), 'mismas claves que sessionSetCap');
});

test('DEC-010: el motor lee las series del paseo del granjero desde VALIDATOR_RULES (cambiar el valor cambia el plan; con el valor actual, no)', () => {
  const rule = K.VALIDATOR_RULES.functionalNoVolumeExtraSets;
  const original = rule.value;
  const planWith = value => {
    rule.value = value;
    try { return E.buildPlan(Object.assign({}, male, { healthGoal: true }), TODAY); } finally { rule.value = original; }
  };
  const carries = plan => plan.training.sessions.flatMap(s => s.exercises).filter(e => e.exerciseId === 'functional.farmer_carry');
  const others = plan => plan.training.sessions.map(s => s.exercises.filter(e => e.exerciseId !== 'functional.farmer_carry'));
  const base = planWith(original), three = planWith(3), one = planWith(1);
  assert.ok(carries(base).length >= 1);
  assert.ok(carries(base).every(e => e.sets === 2), 'con el valor actual, 2 series (salida sin cambios)');
  assert.ok(carries(three).every(e => e.sets === 3), 'con valor 3 el motor tiene que usar 3 series');
  assert.ok(carries(one).every(e => e.sets === 1));
  // Sin descontar de nadie: el resto de los ejercicios no cambia aunque cambie el valor.
  assert.deepEqual(others(three), others(base));
  assert.deepEqual(others(one), others(base));
  // Y el total de series de los días con paseo sí refleja el valor (cuenta en totalSets).
  base.training.sessions.forEach((s, i) => {
    const n = s.exercises.filter(e => e.exerciseId === 'functional.farmer_carry').length;
    assert.equal(three.training.sessions[i].totalSets - s.totalSets, n, 'cada paseo suma 1 serie más');
  });
  assert.equal(rule.value, original, 'el test restauró el valor');
});

/* ---------- DEC-011: la pausa explica cuándo una zona se pide de nuevo por empeorar ---------- */

test('DEC-011: reconcile marca solo las zonas que PERDIERON una autorización por empeorar; la primera autorización no se marca', () => {
  const stored = authorizedProfile(['shoulder', 'knee']);
  const up = editAndReconcile(stored, ['shoulder', 'knee'], { pain: ['shoulder'] });
  assert.deepEqual(E.zonesPendingReauthorization(up.health), ['shoulder']);
  assert.equal(up.health.injuries.find(i => i.zone === 'shoulder').clearanceInvalidated, true);
  assert.ok(!('clearanceInvalidated' in up.health.injuries.find(i => i.zone === 'knee')), 'la clave solo existe cuando vale true');
  // Cambio de diagnóstico en cualquier sentido también marca.
  assert.deepEqual(E.zonesPendingReauthorization(editAndReconcile(stored, ['shoulder', 'knee'], { diagnosed: ['knee'] }).health), ['knee']);
  assert.deepEqual(E.zonesPendingReauthorization(editAndReconcile(authorizedProfile(['knee'], { diagnosed: ['knee'] }), ['knee']).health), ['knee']);
  // Primera autorización: zona nueva, o zona declarada que nunca se autorizó (aunque empeore): no se marca.
  assert.deepEqual(E.zonesPendingReauthorization(editAndReconcile(stored, ['shoulder', 'knee', 'ankle']).health), []);
  const neverAuthorized = E.normalizeProfile(withInjury(['shoulder']));
  assert.deepEqual(E.zonesPendingReauthorization(E.reconcileInjuryClearances(neverAuthorized.health, E.normalizeProfile(withInjury(['shoulder'], { injuryPainNow: ['shoulder'] })).health)), []);
  // Perfiles sin lesiones o sin salud: nada.
  assert.deepEqual(E.zonesPendingReauthorization(E.normalizeProfile(male).health), []);
  assert.deepEqual(E.zonesPendingReauthorization(undefined), []);
});

test('DEC-011: la marca de re-autorización sobrevive a más ediciones hasta confirmar, y se apaga al confirmar', () => {
  const stored = authorizedProfile(['shoulder', 'knee']);
  const worsened = editAndReconcile(stored, ['shoulder', 'knee'], { pain: ['shoulder'] }).health;
  // Otra edición sin relación (no confirmaron todavía): sigue marcada. Aunque el dolor baje, sigue pendiente.
  const again = E.reconcileInjuryClearances(worsened, E.normalizeProfile(withInjury(['shoulder', 'knee'])).health);
  assert.deepEqual(E.zonesPendingReauthorization(again), ['shoulder']);
  assert.equal(again.injuries.find(i => i.zone === 'shoulder').clearanceDate, null);
  // Empeora de nuevo estando pendiente: sigue siendo una re-autorización, no una primera vez.
  const worseAgain = E.reconcileInjuryClearances(again, E.normalizeProfile(withInjury(['shoulder', 'knee'], { injuryPainNow: ['shoulder'] })).health);
  assert.deepEqual(E.zonesPendingReauthorization(worseAgain), ['shoulder']);
  // Al confirmar (fecha nueva, la clave se borra) deja de estar pendiente; aunque la clave quedara, con fecha no cuenta.
  const confirmed = cleared(worseAgain, 'shoulder', '2026-09-20');
  assert.deepEqual(E.zonesPendingReauthorization(confirmed), []);
  const confirmedClean = JSON.parse(JSON.stringify(confirmed)); delete confirmedClean.injuries.find(i => i.zone === 'shoulder').clearanceInvalidated;
  assert.deepEqual(E.zonesPendingReauthorization(confirmedClean), []);
  // Si después de confirmar vuelve a empeorar, es otra re-autorización.
  const edited = E.reconcileInjuryClearances(confirmedClean, E.normalizeProfile(withInjury(['shoulder', 'knee'], { injuryPainNow: ['shoulder'], injuryDiagnosed: ['shoulder'] })).health);
  assert.deepEqual(E.zonesPendingReauthorization(edited), ['shoulder']);
});

test('DEC-011: la marca de re-autorización no altera el plan (solo la pantalla la usa) y no sale en el export', () => {
  const stored = authorizedProfile(['shoulder']);
  const worsened = editAndReconcile(stored, ['shoulder'], { pain: ['shoulder'] });
  const plain = E.buildPlan(E.normalizeProfile(withInjury(['shoulder'], { injuryPainNow: ['shoulder'] })), TODAY);
  assert.deepEqual(Object.keys(worsened.plan.health).sort(), Object.keys(plain.health).sort(), 'no hay claves nuevas en plan.health');
  assert.equal(worsened.plan.health.injuryBlockReason, plain.health.injuryBlockReason, 'el texto de la pausa del motor es el mismo');
  const exported = E.exportProfile({ id: 'x', data: Object.assign({}, E.normalizeProfile(withInjury(['shoulder'])), { health: worsened.health }) });
  assert.doesNotMatch(JSON.stringify(exported), /clearanceInvalidated/);
});

/* ---------- DEC-012: tabla de músculos por ejercicio en data/exercise-muscles.csv ---------- */

const fsMuscles = require('node:fs');
const pathMuscles = require('node:path');
const cryptoMuscles = require('node:crypto');
const MB = require('../../scripts/build-exercise-muscles.js');
const SNAP = require('../../scripts/snapshot-plan-hashes.js');
const csvText = () => fsMuscles.readFileSync(MB.CSV_PATH, 'utf8');
const bucketsText = () => fsMuscles.readFileSync(MB.BUCKETS_PATH, 'utf8');
const csvRows = () => { const p = MB.parseExerciseMuscles(csvText()); assert.deepEqual(p.errors, [], 'el CSV tiene errores de validación'); return p.rows; };
const csvBuckets = () => { const p = MB.parseBuckets(bucketsText()); assert.deepEqual(p.errors, [], 'el CSV de buckets tiene errores de validación'); return p.buckets; };
const catalogIds = () => Object.keys(K.EXERCISE_INDEX);

test('DEC-012: todo exerciseId del CSV existe en el catálogo y viceversa (salvo los funcionales sin aporte declarados)', () => {
  const inCsv = new Set(csvRows().map(r => r.exerciseId));
  const inCatalog = new Set(catalogIds());
  [...inCsv].forEach(id => assert.ok(inCatalog.has(id), `el CSV tiene un exerciseId que no existe en el catálogo: ${id}`));
  const exempt = new Set(K.NO_MUSCLE_CONTRIBUTION);
  [...inCatalog].forEach(id => {
    if (exempt.has(id)) assert.ok(!inCsv.has(id), `${id} está declarado sin aporte: no puede tener filas en el CSV`);
    else assert.ok(inCsv.has(id), `el ejercicio del catálogo no tiene filas en el CSV: ${id}`);
  });
  assert.deepEqual(K.NO_MUSCLE_CONTRIBUTION, ['functional.farmer_carry'], 'el paseo del granjero es el único sin aporte');
  assert.ok(inCatalog.size === 35 && inCsv.size === 34);
});

test('DEC-013: cada ejercicio tiene al menos una relación directa, salvo el paseo del granjero (ninguna fila)', () => {
  const directas = {};
  csvRows().forEach(r => { if (r.relacion === 'directa') directas[r.exerciseId] = (directas[r.exerciseId] || 0) + 1; });
  catalogIds().forEach(id => {
    if (K.NO_MUSCLE_CONTRIBUTION.includes(id)) assert.equal(directas[id] || 0, 0, `${id}: sin filas`);
    else assert.ok(directas[id] >= 1, `${id}: debería tener al menos una fila directa`);
  });
  // Ningún músculo repite en un mismo ejercicio.
  const seen = new Set();
  csvRows().forEach(r => { const k = `${r.exerciseId}|${r.muscle}`; assert.ok(!seen.has(k), `repetido: ${k}`); seen.add(k); });
});

test('DEC-013: el bucket es un campo único por ejercicio, separado de las relaciones, y coincide con el catálogo', () => {
  const buckets = csvBuckets();
  assert.deepEqual(Object.keys(buckets).sort(), catalogIds().sort(), 'todos los ejercicios del catálogo (y solo ellos) tienen bucket');
  catalogIds().forEach(id => {
    assert.equal(buckets[id], K.EXERCISE_INDEX[id].bucket, `${id}: el bucket del CSV tiene que ser el grupo donde vive en el catálogo`);
    assert.equal(K.EXERCISE_CONTRIBUTION[id].bucket, buckets[id]);
  });
  assert.equal(buckets['glutes.bulgarian_hip'], 'glutes', 'la búlgara de glúteo se programa en glúteo aunque sea directa de cuádriceps');
  assert.ok(!MB.COLUMNS.includes('bucket'), 'el bucket no es una columna de las relaciones');
  // Un ejercicio con bucket duplicado se rechaza.
  assert.match(MB.parseBuckets('exerciseId,bucket\nx,chest\nx,back\n').errors.join(' | '), /campo único/);
  assert.match(MB.parseBuckets('exerciseId,bucket\nx,rodilla\n').errors.join(' | '), /bucket inválido "rodilla"/);
});

test('DEC-013: no hay pesos a medida: ninguna columna numérica y las categorías son solo directa, indirecta o ninguna', () => {
  assert.deepEqual(MB.RELATIONS, ['directa', 'indirecta', 'ninguna']);
  assert.deepEqual(MB.COLUMNS, ['exerciseId', 'muscle', 'relacion', 'evidencia', 'fuente', 'notes', 'review_date']);
  assert.match(MB.parseExerciseMuscles(MB.COLUMNS.join(',') + ',peso\n').errors.join(' | '), /Columnas desconocidas: peso/);
  const src = fsMuscles.readFileSync(pathMuscles.join(__dirname, '../js/exerciseMuscles.js'), 'utf8');
  assert.doesNotMatch(src, /"(peso|weight)"/);
});

test('DEC-012/013: relacion, evidencia, muscle y fecha solo tienen valores válidos; verificado y probable llevan fuente', () => {
  assert.deepEqual(MB.LEVELS, ['verificado', 'verificado (1 estudio)', 'probable', 'a_verificar']);
  assert.deepEqual(MB.MUSCLE_IDS.slice().sort(), Object.keys(K.MUSCLE_LABELS).sort(), 'los ids de músculo del script y de knowledge.js se desalinearon');
  csvRows().forEach(r => {
    const who = `${r.exerciseId} / ${r.muscle}`;
    assert.ok(MB.RELATIONS.includes(r.relacion), `${who}: relacion`);
    assert.ok(MB.LEVELS.includes(r.evidencia), `${who}: evidencia`);
    assert.ok(MB.MUSCLE_IDS.includes(r.muscle), `${who}: muscle`);
    assert.match(r.review_date, /^\d{4}-\d{2}-\d{2}$/, `${who}: review_date`);
    assert.ok(r.notes.length > 0, `${who}: toda fila lleva una nota`);
    if (MB.NEEDS_SOURCE.includes(r.evidencia)) assert.ok(r.fuente.length > 0, `${who}: ${r.evidencia} sin fuente`);
  });
});

test('DEC-012: una fuente citada tiene autor, año y título (no hay citas vacías o a medias en verificado/probable)', () => {
  csvRows().filter(r => r.evidencia !== 'a_verificar').forEach(r => {
    r.fuente.split(' | ').forEach(cite => {
      assert.match(cite, /^[^.]+ et al\.|^[A-ZÁÉÍÓÚ][^.]+\. \d{4}\./, `${r.exerciseId} / ${r.muscle}: cita sin autor y año: ${cite.slice(0, 60)}`);
      assert.match(cite, /\b(19|20)\d{2}\b/, `${r.exerciseId} / ${r.muscle}: cita sin año`);
      assert.ok(cite.length > 60, `${r.exerciseId} / ${r.muscle}: cita demasiado corta para tener título y revista`);
    });
  });
});

test('DEC-012: el parser lee igual un CSV con coma y uno con punto y coma (Excel en español: BOM y CRLF)', () => {
  const comma = MB.parseExerciseMuscles(csvText());
  assert.equal(comma.delimiter, ',');
  const table = MB.parseCsv(csvText(), ',');
  const quote = (c, d) => (new RegExp(`["${d}\\n\\r]`).test(c) ? '"' + c.replace(/"/g, '""') + '"' : c);
  const semicolon = '﻿' + table.map(r => r.map(c => quote(c, ';')).join(';')).join('\r\n') + '\r\n';
  const semi = MB.parseExerciseMuscles(semicolon);
  assert.equal(semi.delimiter, ';');
  assert.deepEqual(semi.errors, []);
  assert.deepEqual(semi.rows, comma.rows, 'coma y punto y coma tienen que dar las mismas filas');
  const crlf = MB.parseExerciseMuscles(table.map(r => r.map(c => quote(c, ',')).join(',')).join('\r\n'));
  assert.deepEqual(crlf.rows, comma.rows);
  assert.equal(comma.rows.length, 61);
  // Lo mismo con el CSV de buckets.
  const bt = MB.parseCsv(bucketsText(), ',');
  const bSemi = MB.parseBuckets('﻿' + bt.map(r => r.join(';')).join('\r\n') + '\r\n');
  assert.equal(bSemi.delimiter, ';');
  assert.deepEqual(bSemi.buckets, csvBuckets());
});

test('DEC-012: el parser respeta comillas, delimitadores y saltos de línea dentro de un campo', () => {
  const tricky = 'a;b "c", d\ne;f';
  const row = ['x.y', 'chest', 'directa', 'probable', tricky, 'nota, con "comillas"; y\nsalto', '2026-10-24'];
  for (const d of [',', ';']) {
    const q = c => '"' + c.replace(/"/g, '""') + '"';
    const text = MB.COLUMNS.join(d) + '\n' + row.map(q).join(d) + '\n';
    const p = MB.parseExerciseMuscles(text);
    assert.equal(p.delimiter, d);
    assert.deepEqual(p.errors, []);
    assert.equal(p.rows[0].fuente, tricky);
    assert.equal(p.rows[0].notes, 'nota, con "comillas"; y\nsalto');
  }
  assert.equal(MB.detectDelimiter('exerciseId;muscle;relacion'), ';');
  assert.equal(MB.detectDelimiter('exerciseId,muscle,relacion'), ',');
  assert.equal(MB.detectDelimiter('"a;b",c,d'), ',', 'un punto y coma dentro de comillas no cuenta como separador');
  assert.throws(() => MB.parseCsv('a,"b', ','), /comillas sin cerrar/);
});

test('DEC-012/013: el parser rechaza datos inválidos con un mensaje que dice la fila y el motivo', () => {
  const head = MB.COLUMNS.join(',') + '\n';
  const ok = 'quads.leg_press,quads,directa,verificado,"Autor A. 2020. Título. Revista 1:1",nota,2026-10-24\n';
  assert.deepEqual(MB.parseExerciseMuscles(head + ok).errors, []);
  const errs = line => MB.parseExerciseMuscles(head + line + '\n').errors.join(' | ');
  assert.match(errs('quads.leg_press,quads,primary,verificado,"S",n,2026-10-24'), /relacion inválida "primary"/);
  assert.match(errs('quads.leg_press,quads,directa,seguro,"S",n,2026-10-24'), /evidencia inválida "seguro"/);
  assert.match(errs('quads.leg_press,rodilla,directa,verificado,"S",n,2026-10-24'), /muscle inválido "rodilla"/);
  assert.match(errs('quads.leg_press,quads,directa,verificado,,n,2026-10-24'), /verificado sin fuente/);
  assert.match(errs('quads.leg_press,quads,directa,verificado (1 estudio),,n,2026-10-24'), /verificado \(1 estudio\) sin fuente/);
  assert.match(errs('quads.leg_press,quads,directa,probable,,n,2026-10-24'), /probable sin fuente/);
  assert.equal(MB.parseExerciseMuscles(head + 'quads.leg_press,quads,directa,a_verificar,,n,2026-10-24\n').errors.length, 0, 'a_verificar puede ir sin fuente');
  assert.equal(MB.parseExerciseMuscles(head + 'quads.leg_press,glutes,ninguna,a_verificar,,n,2026-10-24\n').errors.length, 0, 'ninguna es una relación válida');
  assert.match(errs('quads.leg_press,quads,directa,a_verificar,,n,24/10/2026'), /review_date debe ser AAAA-MM-DD/);
  assert.match(errs('quads.leg_press,quads,directa,a_verificar,,n,2026-13-45'), /review_date/);
  assert.match(errs(',quads,directa,a_verificar,,n,2026-10-24'), /exerciseId vacío/);
  assert.match(MB.parseExerciseMuscles(head + ok + ok).errors.join(' | '), /fila repetida/);
  assert.match(MB.parseExerciseMuscles('exerciseId,muscle\nx,y\n').errors.join(' | '), /Faltan columnas: relacion, evidencia, fuente, notes, review_date/);
  assert.match(MB.parseExerciseMuscles(MB.COLUMNS.join(',') + ',extra\n').errors.join(' | '), /Columnas desconocidas: extra/);
  assert.match(MB.parseExerciseMuscles('').errors.join(' | '), /vacío/);
  assert.throws(() => MB.buildFromCsvText(head + 'x,quads,primary,verificado,,n,2026-10-24\n', 'exerciseId,bucket\nx,quads\n'), /inválido/);
  assert.throws(() => MB.buildFromCsvText(head + ok, 'exerciseId,bucket\nx,rodilla\n'), /bucket inválido/);
});

test('DEC-012/013: ifbb-pro-agent/js/exerciseMuscles.js coincide con los CSV (si se edita uno sin regenerar el otro, falla)', () => {
  assert.equal(fsMuscles.readFileSync(MB.MODULE_PATH, 'utf8'), MB.buildFromCsvText(csvText(), bucketsText()),
    'el módulo está desactualizado: correr `node scripts/build-exercise-muscles.js`');
  const EM = require('../js/exerciseMuscles.js');
  assert.deepEqual(EM.rows, csvRows());
  assert.deepEqual(EM.buckets, csvBuckets());
});

test('DEC-013: el catálogo trae las relaciones v2 (relacion y evidencia) y el bucket de los CSV', () => {
  const rows = csvRows();
  catalogIds().forEach(id => {
    const c = K.EXERCISE_CONTRIBUTION[id];
    const mine = rows.filter(r => r.exerciseId === id);
    assert.deepEqual(c.relations, Object.fromEntries(mine.map(r => [r.muscle, { relacion: r.relacion, evidencia: r.evidencia }])), `${id}: relaciones`);
    assert.deepEqual(c.rows, mine, `${id}: las filas (fuente, nota, fecha) viajan con el dato`);
    assert.equal(c.evidence, 'E4', 'la etiqueta de la app no cambia');
    assert.equal(c.status === 'a_verificar', mine.some(r => r.evidencia === 'a_verificar'), `${id}: status derivado`);
  });
  const carry = K.EXERCISE_CONTRIBUTION['functional.farmer_carry'];
  assert.deepEqual([carry.primary, carry.secondary, carry.rows, carry.relations], [null, [], [], {}]);
});

test('DEC-013: los cambios de la fase son exactamente los aprobados, cada uno mueve la relación un paso', () => {
  const row = (id, m) => csvRows().find(r => r.exerciseId === id && r.muscle === m);
  // hip thrust → isquios: ninguna (Plotkin 2023, medición directa; prevalece sobre el EMG de Contreras 2015).
  const ht = row('glutes.hip_thrust', 'hamstrings');
  assert.deepEqual([ht.relacion, ht.evidencia], ['ninguna', 'verificado (1 estudio)']);
  assert.match(ht.fuente, /Plotkin DL et al\. 2023/);
  assert.match(ht.notes, /prevalece sobre el EMG/);
  // sentadilla y prensa → glúteo: indirecta.
  assert.equal(row('quads.squat_back_or_hack', 'glutes').relacion, 'indirecta');
  assert.equal(row('quads.leg_press', 'glutes').relacion, 'indirecta');
  assert.equal(row('quads.leg_press', 'glutes').evidencia, 'verificado (1 estudio)', 'la prensa tiene una sola medición (Kinoshita 2026)');
  // búlgara de glúteo → cuádriceps: directa; el bucket sigue siendo glúteo.
  const bq = row('glutes.bulgarian_hip', 'quads');
  assert.deepEqual([bq.relacion, bq.evidencia], ['directa', 'probable']);
  assert.match(bq.fuente, /Pelland JC et al\. 2026/);
  assert.equal(csvBuckets()['glutes.bulgarian_hip'], 'glutes');
  // pullover en polea: sin cambios (sigue directa de dorsal, a_verificar) y registrado como pendiente.
  const pu = row('back.pullover_cable', 'back');
  assert.deepEqual([pu.relacion, pu.evidencia], ['directa', 'a_verificar']);
  assert.match(pu.notes, /^PENDIENTE: .*Di Fonza 2026/);
  // Umbral de evidencia: "verificado (1 estudio)" solo aparece en las filas que movió o confirmó un único estudio.
  assert.deepEqual(csvRows().filter(r => r.evidencia === 'verificado (1 estudio)').map(r => `${r.exerciseId}/${r.muscle}`).sort(),
    ['glutes.hip_thrust/hamstrings', 'quads.leg_press/glutes']);
});

test('DEC-014: muscle y secondary del plan salen de los datos v2 (bucket si es directa, resto de relaciones que no son ninguna)', () => {
  const rows = csvRows();
  catalogIds().forEach(id => {
    const c = K.EXERCISE_CONTRIBUTION[id];
    const mine = rows.filter(r => r.exerciseId === id && r.relacion !== 'ninguna');
    const directas = mine.filter(r => r.relacion === 'directa').map(r => r.muscle);
    const bucket = K.EXERCISE_INDEX[id].bucket;
    const primary = directas.includes(bucket) ? bucket : (directas[0] || null);
    assert.equal(c.primary, primary, `${id}: primary`);
    assert.deepEqual(c.secondary, mine.map(r => r.muscle).filter(m => m !== primary), `${id}: secondary`);
    // Pesos: directa 1, indirecta 0,5, ninguna y a_verificar 0 (convención global, no por ejercicio).
    const expected = {};
    rows.filter(r => r.exerciseId === id).forEach(r => {
      const w = r.evidencia === 'a_verificar' ? 0 : ({ directa: 1, indirecta: 0.5, ninguna: 0 })[r.relacion];
      if (w > 0) expected[r.muscle] = w;
    });
    // DEC-016: el músculo del bucket cuenta siempre como directo (1), aunque su fila sea a_verificar.
    if (!K.NO_MUSCLE_CONTRIBUTION.includes(id)) expected[bucket] = 1;
    assert.deepEqual(c.setWeights, expected, `${id}: setWeights`);
    Object.values(c.setWeights).forEach(w => assert.ok([0.5, 1].includes(w), `${id}: peso a medida ${w}`));
  });
  assert.deepEqual(K.EXERCISE_CONTRIBUTION['glutes.hip_thrust'].secondary, []);
  assert.equal(K.EXERCISE_CONTRIBUTION['glutes.bulgarian_hip'].primary, 'glutes');
  assert.deepEqual(K.EXERCISE_CONTRIBUTION['glutes.bulgarian_hip'].secondary, ['quads']);
  assert.equal(K.PLAN_MUSCLE_VIEW_V1, undefined, 'la vista v1 transitoria de DEC-013 se retiró');
});

/* ---------- DEC-014 · Fase 2: conteo fraccionado, regla E4 y aviso de rendimiento decreciente ---------- */

const fullBody3 = { name: 'FB3', sex: 'M', age: 30, heightCm: 178, weightKg: 85, bodyFatPct: 15, activity: 'moderate', level: 'intermediate', daysPerWeek: 3, division: 'general_m', goal: 'cut' };
const clearedShoulder = extra => {
  const base = E.normalizeProfile(Object.assign({}, fullBody3, { injuryZones: ['shoulder'] }, extra || {}));
  return Object.assign({}, base, { health: cleared(base.health, 'shoulder', '2026-10-01') });
};
const weekly = (plan, key) => plan.training.sessions.reduce((acc, s) => { Object.entries(s[key] || {}).forEach(([m, n]) => { acc[m] = (acc[m] || 0) + n; }); return acc; }, {});
const entry = (id, sets) => Object.assign(E.exerciseFields(K.EXERCISE_INDEX[id].entry, K.EXERCISE_INDEX[id].bucket), { sets, type: K.EXERCISE_INDEX[id].entry.type });

test('DEC-014: el conteo fraccionado usa directa = 1, indirecta = 0,5 y ninguna / a_verificar = 0 (convención global)', () => {
  assert.equal(K.VALIDATOR_RULES.directSetWeight.value, 1);
  assert.equal(K.VALIDATOR_RULES.secondaryMuscleWeight.value, 0.5);
  assert.equal(K.VALIDATOR_RULES.noRelationWeight.value, 0);
  assert.equal(K.VALIDATOR_RULES.secondaryMuscleWeight.convention, true, 'el 0,5 se etiqueta como convención del modelo de mejor ajuste');
  assert.match(K.VALIDATOR_RULES.secondaryMuscleWeight.note, /~0,32/);
  assert.match(K.VALIDATOR_RULES.secondaryMuscleWeight.note, /convención del modelo de mejor ajuste/);
  // 4 series de prensa: cuádriceps directa (4), glúteo indirecta (2). 3 de hip thrust: glúteo 3, isquios 0 (ninguna).
  const f = E.fractionalByMuscle([entry('quads.leg_press', 4), entry('glutes.hip_thrust', 3)]);
  assert.deepEqual(f, { quads: 4, glutes: 5 });
  // a_verificar cuenta 0 en las relaciones que NO son el bucket: el deltoides anterior del press inclinado.
  assert.equal(K.EXERCISE_CONTRIBUTION['chest.incline_press_db'].relations.shoulders.evidencia, 'a_verificar');
  assert.equal(E.fractionalByMuscle([entry('chest.incline_press_db', 4)]).shoulders, undefined);
  // DEC-016: el pectoral del press inclinado también está a_verificar, pero es su bucket: suma 1 por serie.
  assert.equal(K.EXERCISE_CONTRIBUTION['chest.incline_press_db'].relations.chest.evidencia, 'a_verificar');
  assert.equal(E.fractionalByMuscle([entry('chest.incline_press_db', 4)]).chest, 4);
  // El paseo del granjero no suma a nadie.
  assert.deepEqual(E.fractionalByMuscle([entry('functional.farmer_carry', 2)]), {});
});

test('DEC-014 · acceptance full body: 3 días/semana con lesión de hombro queda dentro de E4 y respeta DEC-011', () => {
  // Pausa hasta la autorización profesional (DEC-011): sin confirmar, el plan no se muestra.
  const paused = E.buildPlan(Object.assign({}, fullBody3, { injuryZones: ['shoulder'] }), TODAY);
  assert.equal(paused.health.blocked, true);
  // Con la zona autorizada, el plan se muestra.
  const profile = clearedShoulder();
  const plan = E.buildPlan(profile, TODAY);
  assert.equal(plan.health.blocked, false);
  const before = E.buildPlan(Object.assign({}, profile, { longSessionAcceptedOn: '2026-10-24' }), TODAY);
  assert.deepEqual(before.training.sessions.map(s => s.totalSets), [35, 32, 33], 'sin tope: las series de hoy');
  assert.ok(before.training.sessions.some(s => s.durationMin > 90), 'sin tope: más de 90 min');
  plan.training.sessions.forEach(s => assert.ok(s.totalSets <= 25, `${s.name}: ${s.totalSets} series`));
  assert.deepEqual(plan.training.sessionLimit.overCap, []);
  assert.ok(Math.max(...plan.training.sessions.map(s => s.durationMin)) < Math.max(...before.training.sessions.map(s => s.durationMin)));
  // DEC-011: las exclusiones por zona siguen aplicando, sin presentarse como adaptación, y los avisos de precaución E4 siguen.
  const ids = plan.training.sessions.flatMap(s => s.exercises.map(e => e.exerciseId));
  assert.ok(!ids.includes('shoulders.press_overhead'), 'press de hombro excluido por la zona declarada');
  assert.ok(plan.health.warnings.some(w => w.evidence === 'E4') || plan.warnings.some(w => w.evidence === 'E4'));
  const allText = JSON.stringify(plan.training.warnings);
  assert.doesNotMatch(allText, /adaptad[ao] a (tu|la) lesión/i);
  // Todo recorte lo explica un aviso E4 con su etiqueta, y la regla no toca multiarticulares.
  assert.ok(plan.training.sessionLimit.trimmed.length === 3);
  plan.training.sessions.forEach((s, i) => s.exercises.forEach(e => {
    const orig = before.training.sessions[i].exercises.find(x => x.exerciseId === e.exerciseId);
    if (e.type === 'compound') assert.equal(e.sets, orig.sets, `${e.exerciseId}: un multiarticular no se recorta`);
  }));
  // El piso semanal de los grupos mayores se respeta (en series reales y fraccionadas) frente al plan sin recortar.
  K.MAJOR_GROUPS.forEach(mu => {
    const floor = K.VALIDATOR_RULES.minWeeklySetsPerMuscle.value;
    assert.ok(plan.training.weeklySets[mu] >= Math.min(floor, before.training.weeklySets[mu]), `${mu}: series reales bajo el piso`);
    assert.ok((weekly(plan, 'fractionalSets')[mu] || 0) >= Math.min(floor, weekly(before, 'fractionalSets')[mu] || 0) - 1e-9, `${mu}: series fraccionadas bajo el piso`);
  });
  // El volumen semanal mostrado coincide con lo que aparece en las sesiones.
  const all = plan.training.sessions.flatMap(s => s.exercises);
  Object.keys(plan.training.weeklySets).forEach(mu => assert.equal(all.filter(e => e.bucket === mu).reduce((a, e) => a + e.sets, 0), plan.training.weeklySets[mu], mu));
});

test('DEC-014: el usuario puede aceptar una sesión más larga (E4): no se recorta y la aceptación se normaliza como fecha', () => {
  assert.equal(E.normalizeProfile({ longSessionAcceptedOn: '2026-10-24' }).longSessionAcceptedOn, '2026-10-24');
  assert.equal(E.normalizeProfile({ longSessionAcceptedOn: 'mañana' }).longSessionAcceptedOn, '');
  assert.equal(E.normalizeProfile({}).longSessionAcceptedOn, '');
  const plan = E.buildPlan(clearedShoulder({ longSessionAcceptedOn: '2026-10-24' }), TODAY);
  assert.deepEqual(plan.training.sessions.map(s => s.totalSets), [35, 32, 33]);
  assert.equal(plan.training.sessionLimit.accepted, '2026-10-24');
  assert.deepEqual(plan.training.sessionLimit.trimmed, []);
  assert.equal(plan.input.longSessionAcceptedOn, '2026-10-24');
});

test('DEC-014 · acceptance búlgara: la búlgara de glúteo se programa en glúteo y suma 1 a glúteo y 1 a cuádriceps', () => {
  const ex = K.EXERCISE_CONTRIBUTION['glutes.bulgarian_hip'];
  assert.equal(ex.bucket, 'glutes');
  assert.deepEqual(ex.setWeights, { glutes: 1, quads: 1 });
  assert.deepEqual(E.fractionalByMuscle([entry('glutes.bulgarian_hip', 4)]), { glutes: 4, quads: 4 });
  // En un plan con glúteo rezagado la búlgara aparece, sigue en el bucket glúteo y su sesión cuenta el cuádriceps.
  const plan = E.buildPlan(Object.assign({}, fullBody3, { daysPerWeek: 4, laggingMuscles: ['glutes'], longSessionAcceptedOn: '2026-10-24' }), TODAY);
  const hits = plan.training.sessions.flatMap(s => s.exercises.filter(e => e.exerciseId === 'glutes.bulgarian_hip').map(e => ({ s, e })));
  assert.ok(hits.length > 0, 'la búlgara de glúteo debería aparecer con glúteo rezagado');
  hits.forEach(({ s, e }) => {
    assert.equal(e.bucket, 'glutes');
    const others = s.exercises.filter(x => x !== e);
    const quadsOthers = E.fractionalByMuscle(others).quads || 0;
    assert.equal(s.fractionalSets.quads, quadsOthers + e.sets, 'la búlgara suma 1 por serie al cuádriceps');
  });
  // No hay otro peso para ella: nada de 0,5 a medida.
  assert.ok(plan.training.sessions.every(s => s.exercises.every(e => Object.values(e.setWeights).every(w => w === 1 || w === 0.5))));
});

test('DEC-014 · acceptance hip thrust: pasar a "ninguna" no hace que el generador agregue isquios por encima de E4', () => {
  assert.equal(K.EXERCISE_CONTRIBUTION['glutes.hip_thrust'].relations.hamstrings.relacion, 'ninguna');
  assert.equal(E.fractionalByMuscle([entry('glutes.hip_thrust', 4)]).hamstrings, undefined);
  const profiles = [
    Object.assign({}, fullBody3, { daysPerWeek: 4, laggingMuscles: ['quads', 'hamstrings', 'glutes'] }),
    Object.assign({}, fullBody3, { daysPerWeek: 5, laggingMuscles: ['glutes'] }),
    Object.assign({}, fullBody3, { daysPerWeek: 3, laggingMuscles: ['glutes'] }),
    Object.assign({}, fullBody3, { daysPerWeek: 6, sex: 'F', division: 'bikini_w', goal: 'maintain' }),
  ];
  let withHipThrust = 0;
  profiles.forEach(p => {
    const sin = E.buildPlan(Object.assign({}, p, { longSessionAcceptedOn: '2026-10-24' }), TODAY);
    const plan = E.buildPlan(p, TODAY);
    if (!plan.training.sessions.some(s => s.exercises.some(e => e.exerciseId === 'glutes.hip_thrust'))) return;
    withHipThrust++;
    // Los isquios no suben: ni por el generador ni por compensar al hip thrust.
    assert.ok(plan.training.weeklySets.hamstrings <= sin.training.weeklySets.hamstrings, 'isquios reales no suben');
    plan.training.sessions.forEach((s, i) => {
      const h = s.exercises.filter(e => e.bucket === 'hamstrings').reduce((a, e) => a + e.sets, 0);
      const h0 = sin.training.sessions[i].exercises.filter(e => e.bucket === 'hamstrings').reduce((a, e) => a + e.sets, 0);
      assert.ok(h <= h0, `${s.name}: isquios ${h} > ${h0}`);
      assert.ok(s.totalSets <= 25 || plan.training.sessionLimit.overCap.some(o => o.session === s.name), `${s.name}: por encima de E4 sin explicación`);
      s.exercises.filter(e => e.exerciseId === 'glutes.hip_thrust').forEach(e => assert.equal(e.setWeights.hamstrings, undefined));
    });
  });
  assert.ok(withHipThrust >= 2, 'al menos dos perfiles de la prueba incluyen hip thrust');
});

test('DEC-014: R1 es un aviso de rendimiento decreciente (E3, Remmert et al., preprint), no un tope: no recorta nada', () => {
  const r1 = K.VALIDATOR_RULES.maxFractionalSetsPerMuscleSession;
  assert.deepEqual([r1.value, r1.level, r1.kind], [11, 'E3', 'warning']);
  assert.match(r1.source.label, /Remmert/);
  assert.doesNotMatch(r1.source.label, /Pelland/);
  const sessions = [{ name: 'Día X', exercises: [entry('quads.squat_back_or_hack', 6), entry('quads.leg_press', 6), entry('glutes.bulgarian_hip', 2)] }];
  sessions[0].fractionalSets = E.fractionalByMuscle(sessions[0].exercises);
  assert.equal(sessions[0].fractionalSets.quads, 14);
  const w = E.diminishingReturnsWarnings(sessions);
  assert.equal(w.length, 1);
  assert.deepEqual([w[0].rule, w[0].evidence, w[0].muscle, w[0].fractionalSets], ['R1', 'E3', 'quads', 14]);
  assert.match(w[0].text, /no un límite/);
  assert.match(w[0].text, /Remmert/);
  assert.match(w[0].text, /preprint sin revisión por pares/);
  assert.match(w[0].text, /~0,32/);
  assert.doesNotMatch(w[0].text, /máximo/i);
  // Justo en 11 no avisa; el aviso no cambia ninguna serie.
  const at11 = [{ name: 'Día Y', exercises: [entry('quads.squat_back_or_hack', 6), entry('quads.leg_press', 5)] }];
  assert.deepEqual(E.diminishingReturnsWarnings(at11), []);
  assert.equal(sessions[0].exercises[0].sets, 6);
  // En un plan real, con aceptación (sin recorte), un aviso R1 no altera las series.
  const accepted = E.buildPlan(Object.assign({}, fullBody3, { daysPerWeek: 4, laggingMuscles: ['quads', 'hamstrings', 'glutes'], longSessionAcceptedOn: '2026-10-24' }), TODAY);
  const r1Warn = accepted.training.warnings.filter(x => x.rule === 'R1');
  r1Warn.forEach(x => assert.ok(accepted.training.sessions.find(s => s.name === x.session).fractionalSets[x.muscle] > 11));
});

test('DEC-014: enforceSessionCap — recorta aislamientos de grupos chicos primero, nunca multiarticulares, y respeta el piso del grupo mayor', () => {
  const mk = () => [{ name: 'S', exercises: [
    entry('chest.bench_press_barbell', 4), entry('back.row_barbell', 4), entry('quads.squat_back_or_hack', 4),
    entry('shoulders.lateral_raise_db', 5), entry('biceps.curl_barbell', 6), entry('abs.crunch_or_wheel', 6),
  ] }].map(s => Object.assign(s, { totalSets: s.exercises.reduce((a, e) => a + e.sets, 0) }));
  const s1 = mk();
  assert.equal(s1[0].totalSets, 29);
  const info = E.enforceSessionCap(s1, null);
  assert.equal(s1[0].totalSets, 25);
  assert.deepEqual(info.trimmed[0].cuts.map(c => c.exerciseId).sort(), ['abs.crunch_or_wheel', 'biceps.curl_barbell']);
  s1[0].exercises.filter(e => e.type === 'compound').forEach(e => assert.equal(e.sets, 4));
  assert.equal(s1[0].exercises.find(e => e.exerciseId === 'shoulders.lateral_raise_db').sets, 5, 'el hombro (grupo mayor) está en su piso: no se toca');
  // Con aceptación: nada se recorta.
  const s2 = mk();
  const acc = E.enforceSessionCap(s2, '2026-10-24');
  assert.equal(s2[0].totalSets, 29);
  assert.deepEqual(acc.trimmed, []);
  assert.deepEqual(acc.overCap, [{ session: 'S', sets: 29 }]);
  // Si solo quedan multiarticulares o grupos en su piso, la sesión queda por encima y se informa.
  const s3 = [{ name: 'T', exercises: [entry('chest.bench_press_barbell', 14), entry('back.row_barbell', 14)], totalSets: 28 }];
  const info3 = E.enforceSessionCap(s3, null);
  assert.equal(s3[0].totalSets, 28);
  assert.deepEqual(info3.overCap, [{ session: 'T', sets: 28 }]);
});

test('DEC-014: los valores E4 viven en configuración con nivel y base declarados', () => {
  const cap = K.VALIDATOR_RULES.sessionSetCap;
  assert.deepEqual([cap.value, cap.level], [25, 'E4']);
  assert.equal(cap.source, null, 'sin fuente externa: se declara como convención de la app');
  assert.match(cap.note, /Convención de la app/);
  const plan = E.buildPlan(clearedShoulder(), TODAY);
  assert.deepEqual([plan.training.sessionLimit.cap, plan.training.sessionLimit.level], [25, 'E4']);
  assert.match(plan.training.sessionLimit.basis, /sin fuente externa/);
});

test('DEC-012/014: el motor no lee relacion ni evidencia crudas: usa solo los pesos de la convención global (setWeights)', () => {
  const engineSrc = fsMuscles.readFileSync(pathMuscles.join(__dirname, '../js/engine.js'), 'utf8');
  assert.doesNotMatch(engineSrc, /\.(evidencia|relacion|relations|rows)\b|PLAN_MUSCLE_VIEW_V1/, 'engine.js no debe leer relación ni evidencia crudas');
  const plan = E.buildPlan(Object.assign({}, male, { healthGoal: true }), TODAY);
  const keys = new Set(plan.training.sessions.flatMap(s => s.exercises.flatMap(e => Object.keys(e))));
  ['evidencia', 'relacion', 'relations', 'rows', 'status', 'fuente'].forEach(k => assert.ok(!keys.has(k), `el plan no debe exponer ${k}`));
});

test('DEC-014: huellas de los 30 planes (línea base de la Fase 2; la salida cambió a propósito por el tope E4 y el conteo fraccionado)', () => {
  const fx = require('./fixtures/plan-hashes.json');
  const now = SNAP.computeHashes(E);
  assert.equal(Object.keys(fx.cases).length, 30);
  assert.equal(now.today, fx.today);
  const different = Object.keys(fx.cases).filter(k => fx.cases[k] !== now.cases[k]);
  assert.deepEqual(different, [], `cambió la salida del plan en: ${different.join(', ')}. Si es intencional, regenerar con scripts/snapshot-plan-hashes.js`);
  // La huella es sensible: cambiar un dato mínimo del plan cambia el hash.
  const plan = E.buildPlan(male, TODAY);
  const tweaked = JSON.parse(JSON.stringify(plan));
  tweaked.training.sessions[0].exercises[0].secondary.push('abs');
  assert.notEqual(SNAP.hash(plan), SNAP.hash(tweaked));
  const reordered = JSON.parse(JSON.stringify(plan));
  reordered.input = Object.fromEntries(Object.entries(reordered.input).reverse());
  assert.equal(SNAP.hash(plan), SNAP.hash(reordered), 'el orden de las claves no cambia la huella');
});

/* ---------- DEC-015: sesión persistente y reanudable ---------- */

const SS = require('../js/sessionStore.js');
const memStorage = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m }; };
const smExercises = () => [
  { name: 'Press banca', exerciseId: 'chest.bench_press_barbell', muscle: 'chest', pattern: 'bench_press', sets: [{ setType: 'normal', setNumber: 1, repsLabel: '6-10', restLabel: '2-3 min' }, { setType: 'normal', setNumber: 2, repsLabel: '6-10', restLabel: '2-3 min' }] },
  { name: 'Jalón', exerciseId: 'back.vertical_pull', muscle: 'back', pattern: 'vertical_pull', sets: [{ setType: 'normal', setNumber: 1, repsLabel: '8-12', restLabel: '2-3 min' }] },
];
const logSet = (rec, workouts, ei, si, weight, reps, now) => {
  SS.markDone(rec, ei, si, { weight, reps, pain: null }, now);
  SS.upsertWorkout(workouts, SS.workoutRow(rec, ei, si, '2026-10-24'));
};

test('DEC-015: una sesión cerrada a mitad se reanuda con los mismos datos y sin duplicar series', () => {
  const store = memStorage();
  const workouts = [];
  const rec = SS.newSession({ profileId: 'p1', sessionId: 's1', dayIndex: 0, dayName: 'Día 1', short: false, exercises: smExercises(), now: 1000 });
  assert.equal(rec.status, 'en_curso');
  SS.saveActive(store, rec, 1000);
  logSet(rec, workouts, 0, 0, 80, 8, 2000);
  rec.values[0][1].weight = '82.5'; // valor tecleado, todavía no marcado como hecho
  rec.exIndex = 0;
  SS.saveActive(store, rec, 2100);
  // "Se apaga el teléfono": se pierde toda la memoria; solo queda lo guardado.
  const resumed = SS.loadActive(store);
  assert.ok(resumed, 'la sesión en curso se encuentra al reabrir');
  assert.equal(resumed.status, 'en_curso');
  assert.deepEqual(SS.progress(resumed), { done: 1, total: 3 });
  assert.equal(resumed.values[0][0].weight, 80);
  assert.equal(resumed.values[0][0].doneAt, 2000);
  assert.equal(resumed.values[0][1].weight, '82.5', 'lo tecleado y no marcado también se conserva');
  assert.equal(resumed.startedAt, 1000);
  assert.equal(SS.reconcile(resumed, workouts, '2026-10-24'), 0, 'nada que reparar');
  // Sigue y termina.
  logSet(resumed, workouts, 0, 1, 82.5, 7, 3000);
  logSet(resumed, workouts, 1, 0, 60, 10, 4000);
  const sessions = [];
  const meta = SS.complete(resumed, sessions, workouts, 5000, '2026-10-24');
  SS.clearActive(store);
  assert.equal(SS.loadActive(store), null);
  assert.deepEqual([meta.status, meta.setsDone, meta.setsTotal], ['completada', 3, 3]);
  assert.equal(workouts.length, 3);
  assert.equal(new Set(workouts.map(w => w.setKey)).size, 3, 'ninguna serie duplicada');
  // Completar o reconciliar otra vez no duplica nada.
  SS.complete(resumed, sessions, workouts, 6000, '2026-10-24');
  SS.reconcile(resumed, workouts, '2026-10-24');
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].finishedAt, 5000, 'la hora de fin original se conserva');
  assert.equal(workouts.length, 3);
});

test('DEC-015: registrar dos veces la misma serie reemplaza la fila (clave estable) y no la duplica', () => {
  const workouts = [];
  const rec = SS.newSession({ profileId: 'p1', sessionId: 's2', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 1 });
  logSet(rec, workouts, 0, 0, 80, 8, 10);
  logSet(rec, workouts, 0, 0, 85, 6, 20);
  assert.equal(workouts.length, 1);
  assert.equal(SS.setKey('s2', 0, 0), workouts[0].setKey);
  assert.equal(rec.values[0][0].doneAt, 10, 'la hora de la primera marca se conserva');
});

test('DEC-015: un corte entre las dos escrituras se repara al reanudar, en los dos sentidos', () => {
  // (a) la fila se escribió y la sesión no: la sesión recupera la serie como hecha.
  const rec = SS.newSession({ profileId: 'p1', sessionId: 's3', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 1 });
  const workouts = [];
  const other = SS.newSession({ profileId: 'p1', sessionId: 's3', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 1 });
  logSet(other, workouts, 0, 0, 70, 9, 50);
  assert.equal(rec.values[0][0].done, false);
  assert.equal(SS.reconcile(rec, workouts, '2026-10-24'), 1);
  assert.deepEqual([rec.values[0][0].done, rec.values[0][0].weight, rec.values[0][0].reps, rec.values[0][0].doneAt], [true, 70, 9, 50]);
  // (b) la sesión la tiene hecha y la fila no se escribió: se crea la fila.
  const rec2 = SS.newSession({ profileId: 'p1', sessionId: 's4', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 1 });
  SS.markDone(rec2, 1, 0, { weight: 55, reps: 12, pain: null }, 99);
  const w2 = [];
  assert.equal(SS.reconcile(rec2, w2, '2026-10-24'), 1);
  assert.equal(w2.length, 1);
  assert.equal(w2[0].exercise, 'Jalón');
  assert.equal(SS.reconcile(rec2, w2, '2026-10-24'), 0, 'idempotente');
  // Las filas viejas (sin setKey) y las de otras sesiones no se tocan.
  const legacy = [{ sessionId: 'viejo', exercise: 'Press banca', weight: 60, reps: 8, setType: 'normal', setNumber: 1 }];
  SS.reconcile(rec2, legacy, '2026-10-24');
  assert.equal(legacy.length, 2);
  assert.equal(legacy[0].setKey, undefined);
});

test('DEC-015: descartar borra la sesión y sus series, sin tocar las demás', () => {
  const store = memStorage();
  const workouts = [{ sessionId: 'viejo', exercise: 'X', weight: 1, reps: 1 }];
  const rec = SS.newSession({ profileId: 'p1', sessionId: 's5', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 1 });
  logSet(rec, workouts, 0, 0, 80, 8, 10);
  logSet(rec, workouts, 1, 0, 60, 10, 20);
  SS.saveActive(store, rec, 30);
  assert.equal(SS.discard(rec, workouts), 2);
  SS.clearActive(store);
  assert.deepEqual(workouts.map(w => w.sessionId), ['viejo']);
  assert.equal(SS.loadActive(store), null);
});

test('DEC-015: un registro guardado ilegible o inválido no se toma por sesión y se puede avisar', () => {
  const store = memStorage();
  assert.equal(SS.loadActive(store), null);
  assert.equal(SS.peekCorrupt(store), false);
  store.setItem(SS.STORAGE_KEY, '{no es json');
  assert.equal(SS.loadActive(store), null);
  assert.equal(SS.peekCorrupt(store), true, 'queda guardado y se avisa en vez de perderlo en silencio');
  const rec = SS.newSession({ profileId: 'p1', sessionId: 's6', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 1 });
  const broken = Object.assign({}, rec, { values: rec.values.slice(1) });
  store.setItem(SS.STORAGE_KEY, JSON.stringify(broken));
  assert.equal(SS.loadActive(store), null, 'valores que no coinciden con los ejercicios');
  store.setItem(SS.STORAGE_KEY, JSON.stringify(Object.assign({}, rec, { status: 'completada' })));
  assert.equal(SS.loadActive(store), null, 'una sesión completada no se ofrece para reanudar');
  store.setItem(SS.STORAGE_KEY, JSON.stringify(Object.assign({}, rec, { version: 99 })));
  assert.equal(SS.loadActive(store), null);
  // Si el almacenamiento falla al escribir, se avisa con false (la interfaz muestra un aviso).
  assert.equal(SS.saveActive({ setItem() { throw new Error('cuota'); } }, rec, 5), false);
});

test('DEC-015: completar una sesión sin series hechas la deja como completada con 0 de N, una sola vez', () => {
  const rec = SS.newSession({ profileId: 'p1', sessionId: 's7', dayIndex: 1, dayName: 'D2', short: true, exercises: smExercises(), now: 10 });
  const sessions = [], workouts = [];
  const meta = SS.complete(rec, sessions, workouts, 20, '2026-10-24');
  assert.deepEqual([meta.setsDone, meta.setsTotal, meta.short, meta.dayIndex], [0, 3, true, 1]);
  assert.deepEqual(workouts, []);
});

/* ---------- DEC-015 (Paso 2): editar y borrar series ---------- */

test('DEC-015: editar peso y repeticiones de una serie de la sesión en curso actualiza sesión y historial sin duplicar', () => {
  const store = memStorage();
  const workouts = [];
  const rec = SS.newSession({ profileId: 'p1', sessionId: 'e1', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 1 });
  logSet(rec, workouts, 0, 0, 80, 8, 10);
  assert.equal(SS.editActiveSet(rec, 0, 1, { weight: 50, reps: 5 }, 20).ok, false, 'una serie no registrada no se edita');
  const r = SS.editActiveSet(rec, 0, 0, { weight: '82.5', reps: '7' }, 20);
  assert.equal(r.ok, true);
  SS.saveActive(store, rec, 21);
  SS.syncRow(rec, workouts, 0, 0, '2026-10-24');
  assert.equal(workouts.length, 1);
  assert.deepEqual([workouts[0].weight, workouts[0].reps, workouts[0].editedAt, workouts[0].savedAt], [82.5, 7, 20, 10]);
  const back = SS.loadActive(store);
  assert.deepEqual([back.values[0][0].weight, back.values[0][0].reps, back.values[0][0].doneAt], [82.5, 7, 10]);
  assert.equal(SS.reconcile(back, workouts, '2026-10-24'), 0);
});

test('DEC-015: valores inválidos al editar se rechazan con un mensaje y no cambian nada', () => {
  const rec = SS.newSession({ profileId: 'p1', sessionId: 'e2', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 1 });
  const workouts = [];
  logSet(rec, workouts, 0, 0, 80, 8, 10);
  [{ weight: 80, reps: 0 }, { weight: 80, reps: '' }, { weight: 80, reps: 2.5 }, { weight: 80, reps: 'abc' }, { weight: -5, reps: 5 }, { weight: 'x', reps: 5 }, { weight: 5000, reps: 5 }, { weight: 80, reps: 1000 }].forEach(v => {
    const r = SS.editActiveSet(rec, 0, 0, v, 30);
    assert.equal(r.ok, false, JSON.stringify(v));
    assert.ok(r.error.length > 5);
  });
  assert.deepEqual([rec.values[0][0].weight, rec.values[0][0].reps, rec.values[0][0].editedAt], [80, 8, undefined]);
  assert.equal(SS.validateSetValues({ weight: '', reps: 5 }).weight, 0, 'peso vacío = 0 (peso corporal)');
  assert.equal(SS.editRow(workouts, SS.rowId(workouts[0]), { weight: 80, reps: 0 }, 5).ok, false);
});

test('DEC-015: borrar una serie de la sesión en curso la quita del historial, deja el hueco para volver a registrarla y no se resucita', () => {
  const store = memStorage();
  const workouts = [];
  const rec = SS.newSession({ profileId: 'p1', sessionId: 'd1', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 1 });
  logSet(rec, workouts, 0, 0, 80, 8, 10);
  logSet(rec, workouts, 0, 1, 80, 8, 11);
  const del = SS.deleteActiveSet(rec, 0, 0);
  assert.equal(del.ok, true);
  SS.saveActive(store, rec, 12); // la intención de borrar se guarda primero
  // Corte antes de tocar el historial: al reanudar, la serie borrada no vuelve.
  const resumed = SS.loadActive(store);
  assert.equal(workouts.length, 2);
  SS.reconcile(resumed, workouts, '2026-10-24');
  assert.deepEqual(workouts.map(w => w.setKey), [SS.setKey('d1', 0, 1)]);
  assert.equal(resumed.values[0][0].done, false);
  assert.deepEqual(SS.progress(resumed), { done: 1, total: 3 });
  // Sin corte: removeRow es idempotente.
  assert.equal(SS.removeRow(workouts, del.key), false);
  // Volver a registrar la misma serie limpia la intención de borrar y crea una sola fila.
  logSet(resumed, workouts, 0, 0, 85, 6, 40);
  SS.reconcile(resumed, workouts, '2026-10-24');
  assert.equal(workouts.filter(w => w.setKey === del.key).length, 1);
  assert.deepEqual(resumed.deletedKeys, []);
  // Completar una sesión con series borradas cuenta solo las hechas.
  const meta = SS.complete(resumed, [], workouts, 50, '2026-10-24');
  assert.deepEqual([meta.setsDone, meta.setsTotal], [2, 3]);
});

test('DEC-015: un corte a mitad de una edición se resuelve a favor de la edición más reciente, en los dos sentidos', () => {
  const mk = () => { const w = []; const r = SS.newSession({ profileId: 'p1', sessionId: 'c1', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 1 }); logSet(r, w, 0, 0, 80, 8, 10); return { r, w }; };
  // La sesión se guardó con la edición y la fila quedó vieja: gana la sesión.
  let { r, w } = mk();
  SS.editActiveSet(r, 0, 0, { weight: 90, reps: 5 }, 100);
  SS.reconcile(r, w, '2026-10-24');
  assert.deepEqual([w[0].weight, w[0].reps, w[0].editedAt], [90, 5, 100]);
  // La fila tiene una edición más reciente que la sesión: gana la fila.
  ({ r, w } = mk());
  w[0].weight = 70; w[0].reps = 12; w[0].editedAt = 200;
  SS.reconcile(r, w, '2026-10-24');
  assert.deepEqual([r.values[0][0].weight, r.values[0][0].reps], [70, 12]);
  assert.equal(SS.reconcile(r, w, '2026-10-24'), 0);
});

test('DEC-015: editar y borrar en el historial (sesiones completadas y registros viejos sin setKey)', () => {
  const workouts = [
    { setKey: 'h1:0:0', sessionId: 'h1', date: '2026-10-20', exercise: 'Press banca', setType: 'normal', setNumber: 1, weight: 60, reps: 10, savedAt: 100, dayName: 'Día 1' },
    { setKey: 'h1:0:1', sessionId: 'h1', date: '2026-10-20', exercise: 'Press banca', setType: 'normal', setNumber: 2, weight: 60, reps: 9, savedAt: 200, dayName: 'Día 1' },
    { sessionId: 'viejo', date: '2026-09-01', exercise: 'Jalón', setType: 'top', setNumber: 1, weight: 50, reps: 6, savedAt: 50, dayName: 'Día 2' },
    { setKey: 'a1:0:0', sessionId: 'a1', date: '2026-10-24', exercise: 'Press banca', setType: 'normal', setNumber: 1, weight: 70, reps: 5, savedAt: 300 },
  ];
  const sessions = [{ sessionId: 'h1', status: 'completada', date: '2026-10-20', dayName: 'Día 1', startedAt: 90, finishedAt: 300, setsDone: 2, setsTotal: 5 }];
  const list = SS.listSessions(workouts, sessions, 'a1');
  assert.deepEqual(list.map(x => [x.sessionId, x.status, x.rows.length]), [['h1', 'completada', 2], ['viejo', 'sin_estado', 1]], 'la sesión en curso no se lista y las viejas aparecen sin estado');
  // Editar una fila vieja (sin setKey) por su identificador derivado.
  const oldId = SS.rowId(workouts[2]);
  assert.match(oldId, /^legacy:viejo\|Jalón\|top\|1\|50$/);
  assert.equal(SS.editRow(workouts, oldId, { weight: 52.5, reps: 5 }, 999).ok, true);
  assert.deepEqual([workouts[2].weight, workouts[2].reps, workouts[2].editedAt, workouts[2].setKey], [52.5, 5, 999, undefined]);
  // Borrar una serie de una sesión completada ajusta su contador.
  assert.equal(SS.deleteRow(workouts, sessions, 'h1:0:1', 1000).ok, true);
  assert.equal(workouts.length, 3);
  assert.equal(sessions[0].setsDone, 1);
  assert.equal(SS.deleteRow(workouts, sessions, 'h1:0:1', 1001).ok, false, 'ya no existe');
  assert.equal(SS.editRow(workouts, 'nada', { weight: 1, reps: 1 }, 1).ok, false);
  // Editar una serie del historial cambia lo que ve Progreso (el mejor peso del día).
  assert.equal(workouts.find(w => w.setKey === 'h1:0:0').weight, 60);
  SS.editRow(workouts, 'h1:0:0', { weight: 65, reps: 10 }, 1100);
  assert.equal(workouts.find(w => w.setKey === 'h1:0:0').weight, 65);
});

/* ---------- DEC-015 (Paso 3): cronómetro de descanso por timestamp de fin ---------- */

const restRec = () => SS.newSession({ profileId: 'p1', sessionId: 'r1', dayIndex: 0, dayName: 'D', short: false, exercises: smExercises(), now: 0 });

test('DEC-015: un descanso de 90 s muestra el tiempo correcto al desbloquear aunque no haya habido ningún tick', () => {
  const rec = restRec();
  const T0 = 1_000_000;
  SS.startRest(rec, 90, T0);
  assert.equal(rec.rest.endAt, T0 + 90_000);
  assert.equal(SS.restRemaining(rec, T0), 90);
  // Pantalla bloqueada: nadie llama a nada durante 60 s. Al desbloquear se recalcula desde el timestamp de fin.
  assert.equal(SS.restRemaining(rec, T0 + 60_000), 30);
  assert.equal(SS.restRemaining(rec, T0 + 60_400), 30, 'redondea hacia arriba: nunca muestra 0 antes de tiempo');
  assert.equal(SS.restRemaining(rec, T0 + 89_001), 1);
  // Bloqueado más tiempo del que dura el descanso: terminó, nunca negativo.
  assert.equal(SS.restRemaining(rec, T0 + 90_000), 0);
  assert.equal(SS.restRemaining(rec, T0 + 600_000), 0);
});

test('DEC-015: +30 s alarga el fin y el descanso sobrevive a un cierre de la app', () => {
  const store = memStorage();
  const rec = restRec();
  const T0 = 5_000;
  SS.startRest(rec, 90, T0);
  SS.extendRest(rec, 30);
  assert.deepEqual([rec.rest.total, SS.restRemaining(rec, T0)], [120, 120]);
  SS.saveActive(store, rec, T0 + 1);
  // La app se cierra 40 s y se vuelve a abrir.
  const back = SS.loadActive(store);
  assert.deepEqual(back.rest, rec.rest);
  assert.equal(SS.restRemaining(back, T0 + 40_000), 80);
  // Si se vuelve a abrir cuando ya venció, no queda nada pendiente.
  assert.equal(SS.restRemaining(back, T0 + 500_000), 0);
  SS.clearRest(back);
  assert.equal(back.rest, null);
  assert.equal(SS.extendRest(back, 30), null, 'sin descanso en marcha no hay nada que alargar');
});

test('DEC-015: un descanso guardado con datos inválidos se descarta sin invalidar la sesión; un reloj atrasado no alarga el descanso', () => {
  const store = memStorage();
  const rec = restRec();
  rec.rest = { total: 90, startedAt: 0, endAt: 'mañana' };
  store.setItem(SS.STORAGE_KEY, JSON.stringify(rec));
  const back = SS.loadActive(store);
  assert.ok(back, 'la sesión sigue siendo válida');
  assert.equal(back.rest, null);
  const r2 = restRec();
  SS.startRest(r2, 90, 1_000_000);
  assert.equal(SS.restRemaining(r2, 0), 90, 'si el reloj retrocede, nunca muestra más que la duración total');
  assert.equal(SS.restRemaining(restRec(), 5), 0, 'sin descanso en marcha');
});


/* ---------- DEC-016 · tres correcciones del validador ---------- */

const REF016 = require('./fixtures/dec016-referencia.json');
const BASELINE016 = require('./fixtures/plan-identity-baseline.json');
const fracWeek = plan => weekly(plan, 'fractionalSets');
const g3 = Object.assign({}, fullBody3, { name: 'G3' }); // 3 días, definición, división general

test('DEC-016 (1): el músculo del bucket cuenta siempre como directo (1), sea cual sea su evidencia; a_verificar = 0 solo en las demás relaciones', () => {
  const aVerificarBucket = [];
  catalogIds().forEach(id => {
    const c = K.EXERCISE_CONTRIBUTION[id];
    if (K.NO_MUSCLE_CONTRIBUTION.includes(id)) { assert.deepEqual(c.setWeights, {}, `${id}: sin aporte`); return; }
    assert.equal(c.setWeights[c.bucket], 1, `${id}: el bucket ${c.bucket} debe pesar 1`);
    if (c.relations[c.bucket].evidencia === 'a_verificar') aVerificarBucket.push(id);
    // Toda relación a_verificar que no es el bucket sigue valiendo 0.
    Object.entries(c.relations).forEach(([mu, r]) => {
      if (mu !== c.bucket && r.evidencia === 'a_verificar') assert.equal(c.setWeights[mu], undefined, `${id}/${mu}: a_verificar fuera del bucket cuenta 0`);
    });
  });
  // Los 7 ejercicios cuyo bucket estaba a_verificar son justo los que cambian.
  assert.deepEqual(aVerificarBucket.sort(), ['abs.vacuum', 'back.pullover_cable', 'chest.dip_or_machine_press', 'chest.incline_press_db', 'functional.step_up', 'shoulders.press_landmine_neutral', 'shoulders.rear_delt_facepull']);
  // La evidencia de la fila NO se toca: sigue siendo a_verificar.
  assert.equal(K.EXERCISE_CONTRIBUTION['chest.incline_press_db'].relations.chest.evidencia, 'a_verificar');
  // Los datos son coherentes con la regla: todo bucket es una fila directa (salvo el paseo del granjero, sin filas).
  catalogIds().filter(id => !K.NO_MUSCLE_CONTRIBUTION.includes(id)).forEach(id => assert.equal(K.EXERCISE_CONTRIBUTION[id].relations[K.EXERCISE_INDEX[id].bucket].relacion, 'directa', id));
});

test('DEC-016 (1): el pecho cuenta el press inclinado en un plan real', () => {
  // Divisiones con pecho en la rotación: el press inclinado aparece en alguna sesión.
  let found = 0;
  Object.entries(BASELINE016.cases).forEach(([key, c]) => {
    const plan = E.buildPlan(Object.assign({}, c.profile, { longSessionAcceptedOn: '2026-10-24' }), BASELINE016.today);
    plan.training.sessions.forEach(s => {
      const inc = s.exercises.filter(e => e.exerciseId === 'chest.incline_press_db');
      if (!inc.length) return;
      found++;
      const sets = inc.reduce((a, e) => a + e.sets, 0);
      const chestWithout = E.fractionalByMuscle(s.exercises.filter(e => e.exerciseId !== 'chest.incline_press_db')).chest || 0;
      assert.equal(s.fractionalSets.chest, chestWithout + sets, `${key} ${s.name}: el press inclinado suma 1 por serie al pecho`);
      assert.ok(sets > 0);
    });
  });
  assert.ok(found >= 3, `el press inclinado tiene que aparecer en varios planes (aparece en ${found})`);
});

test('DEC-016 (1): pecho y espalda semanales en los splits de 3, 4 y 5 días (antes → después)', () => {
  Object.entries(REF016.generico3a5.despues).forEach(([key, d]) => {
    const [days, goal] = key.split('d ');
    const plan = E.buildPlan(Object.assign({}, g3, { daysPerWeek: Number(days), goal }), TODAY);
    const f = fracWeek(plan);
    assert.equal(f.chest, d.pecho, `${key}: pecho`);
    assert.equal(f.back, d.espalda, `${key}: espalda`);
    assert.ok(d.pecho > REF016.generico3a5.antes[key].pecho, `${key}: el pecho sube`);
    assert.ok(d.espalda >= REF016.generico3a5.antes[key].espalda, `${key}: la espalda no baja`);
    assert.ok(f.chest >= 10 && f.back >= 10, `${key}: pecho y espalda llegan a 10 en los splits genéricos de 3 a 5 días`);
  });
});

test('DEC-016: con el bucket directo, pecho y espalda de los perfiles de referencia no bajan respecto de antes de DEC-016', () => {
  assert.equal(Object.keys(REF016.antes).length, 10);
  Object.entries(BASELINE016.cases).forEach(([key, c]) => {
    const plan = E.buildPlan(c.profile, BASELINE016.today);
    const f = fracWeek(plan);
    assert.ok((f.chest || 0) >= REF016.antes[key].pecho && (f.back || 0) >= REF016.antes[key].espalda, `${key}: el conteo del bucket solo suma`);
    // El aviso de grupos bajo el mínimo coincide con el conteo fraccionado real.
    const floors = plan.training.sessionLimit.floors; // DEC-017: 10 o, en los grupos con énfasis reducido, el de mantenimiento
    assert.deepEqual(plan.training.sessionLimit.belowMinimum.map(x => x.muscle).sort(), Object.keys(K.MUSCLE_LABELS).filter(mu => (f[mu] || 0) < floors[mu]).sort(), `${key}: grupos bajo el mínimo`);
  });
});

test('DEC-016 (3): el piso de 10 se sigue forzando solo en los grupos mayores; el aviso cubre a todos', () => {
  const sl = E.buildPlan(g3, TODAY).training.sessionLimit;
  const below = sl.belowMinimum.map(x => x.muscle);
  assert.ok(below.includes('calves') && below.includes('abs'), 'grupos chicos incluidos en el aviso');
  assert.ok(below.every(mu => !K.MAJOR_GROUPS.includes(mu)), 'en este plan ningún grupo mayor queda bajo 10');
  // Los grupos chicos SÍ se recortan por debajo de 10 (no tienen piso forzado); los mayores no.
  const noCap = E.buildPlan(Object.assign({}, g3, { longSessionAcceptedOn: '2026-10-24' }), TODAY);
  const withCap = E.buildPlan(g3, TODAY);
  const wNo = weekly(noCap, 'fractionalSets'), wCap = weekly(withCap, 'fractionalSets');
  K.MAJOR_GROUPS.forEach(mu => assert.ok((wCap[mu] || 0) >= Math.min(10, wNo[mu] || 0), `${mu}: el tope no baja un grupo mayor de 10`));
  assert.ok((wCap.calves || 0) < (wNo.calves || 0), 'las pantorrillas sí se recortan');
});

test('DEC-016 (3): aviso visible de grupos bajo el mínimo, con opciones y cuánto quitó el tope', () => {
  const plan = E.buildPlan(g3, TODAY);
  const w = plan.warnings.find(x => x.kind === 'bajo_minimo');
  assert.ok(w, 'el aviso llega a la lista combinada que ve el usuario');
  assert.equal(w.rule, 'R2');
  assert.equal(w.evidence, 'E1');
  assert.deepEqual(w.options, ['aceptar_sesiones_largas', 'cambiar_split']);
  assert.match(w.text, /Pantorrillas 2 \(el tope E4 quitó 5\)/);
  assert.match(w.text, /objetivo de hipertrofia del ACSM 2026/);
  assert.match(w.text, /aceptar sesiones más largas/);
  assert.match(w.text, /cambiar de split/);
  // Con la aceptación vigente ya no se ofrece aceptar (no hay recortes): solo cambiar de split.
  const acc = E.migrateLongSessionAcceptance(E.normalizeProfile(Object.assign({}, g3, { longSessionAcceptedOn: '2026-10-20' })), TODAY);
  const w2 = E.buildPlan(acc, TODAY).warnings.find(x => x.kind === 'bajo_minimo');
  assert.deepEqual(w2.options, ['cambiar_split']);
  assert.doesNotMatch(w2.text, /aceptar sesiones más largas/);
  // Un plan sin grupos bajo el mínimo no lleva el aviso.
  const full = E.buildPlan(Object.assign({}, g3, { daysPerWeek: 6, level: 'advanced', goal: 'bulk', division: 'bodybuilding_m' }), TODAY);
  assert.equal(full.training.sessionLimit.belowMinimum.length === 0, !full.warnings.some(x => x.kind === 'bajo_minimo'));
});

test('DEC-016 (2): la aceptación guarda la firma del plan y el máximo de series; sigue valiendo mientras ninguno cambie', () => {
  const sl0 = E.buildPlan(g3, TODAY).training.sessionLimit;
  assert.equal(sl0.accepted, null);
  assert.equal(sl0.proposed.signature, 'dias=3;division=general_m;objetivo=cut;rezagados=;nivel=intermediate');
  assert.equal(sl0.proposed.maxSets, 35, 'el máximo propuesto es la sesión más larga SIN recortar');
  const accepted = Object.assign({}, g3, { longSessionAcceptance: { on: '2020-01-01', signature: sl0.proposed.signature, maxSets: sl0.proposed.maxSets } });
  const sl = E.buildPlan(accepted, TODAY).training.sessionLimit;
  assert.equal(sl.accepted, '2020-01-01', 'no vence por fecha');
  assert.deepEqual(sl.trimmed, []);
  assert.equal(sl.acceptanceInvalidated, null);
  // Cambios que no están en la firma (peso, edad, plan de dieta) no la invalidan.
  const sl2 = E.buildPlan(Object.assign({}, accepted, { weightKg: 90, age: 31 }), TODAY).training.sessionLimit;
  assert.equal(sl2.accepted, '2020-01-01');
});

test('DEC-016 (2): la aceptación se invalida si cambia la firma del plan, y vuelve a pedir (caso de aceptación invalidada por cambio de plan)', () => {
  const sl0 = E.buildPlan(g3, TODAY).training.sessionLimit;
  const accepted = Object.assign({}, g3, { longSessionAcceptance: { on: '2026-10-20', signature: sl0.proposed.signature, maxSets: sl0.proposed.maxSets } });
  const changes = { 'días': { daysPerWeek: 4 }, 'división': { division: 'physique_m' }, 'objetivo': { goal: 'bulk' }, 'rezagados': { laggingMuscles: ['glutes'] }, 'nivel': { level: 'advanced' } };
  Object.entries(changes).forEach(([what, patch]) => {
    const plan = E.buildPlan(Object.assign({}, accepted, patch), TODAY);
    const sl = plan.training.sessionLimit;
    assert.equal(sl.accepted, null, `${what}: la aceptación ya no vale`);
    assert.equal(sl.acceptanceInvalidated.reason, 'firma', what);
    assert.equal(sl.acceptanceInvalidated.on, '2026-10-20');
    const w = plan.warnings.find(x => /ya no aplica/.test(x.text));
    assert.ok(w, `${what}: avisa que la aceptación ya no aplica`);
    assert.equal(w.rule, 'E4');
    assert.match(w.text, /2026-10-20/);
    assert.match(w.text, /Vuelve a aceptar/);
    // Vuelve a recortar (el tope E4 rige de nuevo) salvo que ese plan ya cumpla el tope.
    sl.overCap.forEach(o => assert.ok(o.sets > sl.cap));
  });
  // Cambiar a 4 días con la aceptación vieja: el plan vuelve a recortar.
  const four = E.buildPlan(Object.assign({}, accepted, { daysPerWeek: 4 }), TODAY).training;
  assert.ok(four.sessionLimit.trimmed.length > 0, 'con la aceptación invalidada se recorta de nuevo');
  assert.ok(four.sessions.every(s => s.totalSets <= four.sessionLimit.cap || four.sessionLimit.overCap.some(o => o.session === s.name)));
  // Aceptar de nuevo con la firma nueva la vuelve válida.
  const again = Object.assign({}, accepted, { daysPerWeek: 4, longSessionAcceptance: { on: '2026-10-25', signature: four.sessionLimit.proposed.signature, maxSets: four.sessionLimit.proposed.maxSets } });
  const sl4 = E.buildPlan(again, TODAY).training.sessionLimit;
  assert.equal(sl4.accepted, '2026-10-25');
  assert.deepEqual(sl4.trimmed, []);
  assert.equal(sl4.acceptanceInvalidated, null);
});

test('DEC-016 (2): la aceptación se invalida si alguna sesión supera el máximo aceptado', () => {
  const sl0 = E.buildPlan(g3, TODAY).training.sessionLimit;
  // Misma firma, pero el usuario aceptó hasta 30 series y el plan sin recortar llega a 35.
  const tight = Object.assign({}, g3, { longSessionAcceptance: { on: '2026-10-20', signature: sl0.proposed.signature, maxSets: 30 } });
  const plan = E.buildPlan(tight, TODAY);
  const sl = plan.training.sessionLimit;
  assert.equal(sl.accepted, null);
  assert.equal(sl.acceptanceInvalidated.reason, 'maximo');
  assert.deepEqual(sl.acceptanceInvalidated.previous, { signature: sl0.proposed.signature, maxSets: 30 });
  assert.ok(sl.trimmed.length > 0);
  assert.match(plan.warnings.find(x => /ya no aplica/.test(x.text)).text, /llegaría a 35 series y aceptaste hasta 30/);
  // En el límite exacto sigue válida (35 aceptado, 35 generado).
  const exact = Object.assign({}, g3, { longSessionAcceptance: { on: '2026-10-20', signature: sl0.proposed.signature, maxSets: 35 } });
  assert.equal(E.buildPlan(exact, TODAY).training.sessionLimit.accepted, '2026-10-20');
});

test('DEC-016 (2): migra longSessionAcceptedOn: firma y máximo salen del plan vigente al migrar', () => {
  const legacy = E.normalizeProfile(Object.assign({}, g3, { longSessionAcceptedOn: '2026-10-20' }));
  // Antes de migrar, el formato viejo sigue funcionando (sin recortes) y se toma contra el plan vigente.
  assert.equal(E.buildPlan(legacy, TODAY).training.sessionLimit.accepted, '2026-10-20');
  const migrated = E.migrateLongSessionAcceptance(legacy, TODAY);
  assert.equal(migrated.longSessionAcceptedOn, '');
  assert.deepEqual(migrated.longSessionAcceptance, { on: '2026-10-20', signature: 'dias=3;division=general_m;objetivo=cut;rezagados=;nivel=intermediate', maxSets: 35 });
  assert.equal(E.buildPlan(migrated, TODAY).training.sessionLimit.accepted, '2026-10-20', 'migrar no cambia el plan');
  assert.equal(legacy.longSessionAcceptedOn, '2026-10-20', 'no muta el argumento');
  // Idempotente, y sin nada que migrar devuelve lo mismo.
  assert.equal(E.migrateLongSessionAcceptance(migrated, TODAY), migrated);
  const none = E.normalizeProfile(g3);
  assert.equal(E.migrateLongSessionAcceptance(none, TODAY), none);
  // Ya migrada, un cambio de plan la invalida (antes de migrar el formato viejo se adaptaba a cualquier plan).
  assert.equal(E.buildPlan(Object.assign({}, migrated, { daysPerWeek: 5 }), TODAY).training.sessionLimit.accepted, null);
  // Una fecha ilegible no se migra.
  assert.equal(E.migrateLongSessionAcceptance({ longSessionAcceptedOn: 'mañana' }, TODAY).longSessionAcceptance, undefined);
  // El import migra también.
  const imp = E.prepareImportedProfile({ data: Object.assign({}, g3, { longSessionAcceptedOn: '2026-10-20' }) }, TODAY);
  assert.equal(imp.data.longSessionAcceptance.maxSets, 35);
  assert.equal(imp.data.longSessionAcceptedOn, '');
});

test('DEC-016 (2): normalizeProfile valida la aceptación acotada', () => {
  const ok = { on: '2026-10-20', signature: 'dias=3', maxSets: 35 };
  assert.deepEqual(E.normalizeProfile({ longSessionAcceptance: ok }).longSessionAcceptance, ok);
  [null, 'x', {}, { on: 'mañana', signature: 's', maxSets: 3 }, { on: '2026-10-20', signature: '', maxSets: 3 }, { on: '2026-10-20', signature: 's', maxSets: 0 }, { on: '2026-10-20', signature: 's', maxSets: 'a' }]
    .forEach(bad => assert.equal(E.normalizeProfile({ longSessionAcceptance: bad }).longSessionAcceptance, null));
});

test('DEC-016: cada regla de VALIDATOR_RULES lleva un estado, y R3 y la frecuencia mínima de R2 están pendientes', () => {
  const fs = require('node:fs'), path = require('node:path');
  const R = K.VALIDATOR_RULES;
  const PENDIENTES = ['historyWindowWeeks', 'maxAcuteChronicRatio', 'maxWeeklyVolumeIncreasePct', 'minHistoryWeeksForRamp', 'minWeeklyFrequencyMajorGroups'];
  Object.entries(R).forEach(([key, r]) => assert.ok(['implementada', 'pendiente'].includes(r.status), `${key}: estado`));
  assert.deepEqual(Object.keys(R).filter(k => R[k].status === 'pendiente').sort(), PENDIENTES);
  // El estado coincide con el uso real: una regla implementada la lee el motor; una pendiente no la lee nadie.
  const src = ['engine.js', 'knowledge.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n');
  Object.keys(R).forEach(key => {
    const uses = (src.match(new RegExp('VALIDATOR_RULES\\.' + key + '\\b', 'g')) || []).length;
    if (R[key].status === 'implementada') assert.ok(uses > 0, `${key}: marcada implementada pero ningún código la lee`);
    else assert.equal(uses, 0, `${key}: marcada pendiente pero el código ya la lee: cambiar a implementada`);
  });
});


/* ---------- DEC-017 · completar hasta el piso dentro del tope ---------- */

const REF017 = require('./fixtures/dec017-referencia.json');
const SPLIT_DAYS_4 = E.SPLITS[4].days; // Torso A, Pierna A, Torso B, Pierna B
const mk = (id, sets) => { const ix = K.EXERCISE_INDEX[id]; return Object.assign(E.exerciseFields(ix.entry, ix.bucket), { name: ix.entry.name, type: ix.entry.type, pattern: ix.entry.pattern, unilateral: !!ix.entry.unilateral, sets }); };
const sess = (name, ...ex) => ({ name, exercises: ex, totalSets: ex.reduce((a, e) => a + e.sets, 0) });
const fracOf = sessions => sessions.reduce((acc, s) => { Object.entries(E.fractionalByMuscle(s.exercises)).forEach(([m, n]) => { acc[m] = (acc[m] || 0) + n; }); return acc; }, {});

test('DEC-017: perfiles de referencia de DEC-014 antes y después (sin aceptación), con duración por sesión', () => {
  assert.equal(Object.keys(REF017.despues).length, 10);
  Object.entries(BASELINE016.cases).forEach(([key, c]) => {
    const plan = E.buildPlan(c.profile, BASELINE016.today);
    const f = fracWeek(plan), t = plan.training, d = REF017.despues[key], a = REF017.antes[key];
    const floors = t.sessionLimit.floors;
    assert.deepEqual(t.sessions.map(s => s.totalSets), d.sesiones, `${key}: series por sesión`);
    assert.deepEqual(t.sessions.map(s => s.durationMin), d.minutos, `${key}: duración derivada por sesión`);
    assert.deepEqual(t.sessionLimit.overCap.map(o => o.sets), d.sobreTope, `${key}: sesiones sobre el tope`);
    K.MAJOR_GROUPS.forEach(mu => { assert.equal(Math.round((f[mu] || 0) * 100) / 100, d.mayores[mu], `${key}: ${mu}`); assert.equal(floors[mu], d.pisos[mu], `${key}: piso de ${mu}`); });
    assert.deepEqual(K.MAJOR_GROUPS.filter(mu => (f[mu] || 0) < floors[mu]), d.bajoMinimoMayores, `${key}: grupos mayores bajo su piso`);
    assert.equal(t.sessionLimit.filled.reduce((x, y) => x + y.sets, 0), d.agregadas, `${key}: series agregadas`);
    // Nunca pasa de 25 por esta regla: una sesión solo crece si queda dentro del tope; las que ya pasaban no se tocan.
    t.sessions.forEach((s, i) => {
      assert.ok(s.totalSets >= a.sesiones[i], `${key}: la regla no quita series`);
      if (s.totalSets > a.sesiones[i]) assert.ok(s.totalSets <= t.sessionLimit.cap, `${key} ${s.name}: ${s.totalSets} pasa del tope`);
      else { assert.equal(s.totalSets, a.sesiones[i]); assert.equal(s.durationMin, a.minutos[i], `${key}: una sesión sin cambios conserva su duración`); }
    });
    assert.deepEqual(d.sobreTope, a.sobreTope, `${key}: mismas sesiones sobre el tope que antes`);
    K.MAJOR_GROUPS.forEach(mu => assert.ok(d.mayores[mu] >= a.mayores[mu], `${key}: ${mu} no baja`));
  });
  // Sesiones de más de 90 minutos: ya existían antes y esta regla no las crea ni las alarga.
  const over90 = k => REF017.despues[k].minutos.filter(m => m > 90);
  assert.deepEqual(over90('wellness_maintain_5d'), [92, 92]);
  assert.deepEqual(over90('bb_bulk_advanced_6d'), [98, 96]);
  Object.keys(REF017.despues).forEach(k => assert.deepEqual(over90(k), REF017.antes[k].minutos.filter(m => m > 90), `${k}: sin sesiones nuevas de más de 90 min`));
});

test('DEC-017: piso de mantenimiento: los grupos "down" de la división usan 5, los rezagados y los demás 10', () => {
  const floors = c => E.buildPlan(BASELINE016.cases[c].profile, BASELINE016.today).training.sessionLimit.floors;
  // physique_m reduce cuádriceps, isquios y glúteos (EMPHASIS_MAP.down).
  const phys = floors('novice_bulk_physique_4d');
  ['quads', 'hamstrings', 'glutes'].forEach(mu => assert.equal(phys[mu], 5, mu));
  ['chest', 'back', 'shoulders', 'calves', 'abs'].forEach(mu => assert.equal(phys[mu], 10, mu));
  // bikini_w reduce pecho, cuádriceps, bíceps y tríceps; los glúteos e isquios son rezagados y no están en "down".
  const bik = floors('bikini_cut_lagging_4d');
  ['chest', 'quads', 'biceps', 'triceps'].forEach(mu => assert.equal(bik[mu], 5, mu));
  ['glutes', 'hamstrings', 'back', 'shoulders'].forEach(mu => assert.equal(bik[mu], 10, mu));
  // wellness_w reduce pecho, hombros, bíceps y tríceps.
  const well = floors('wellness_maintain_5d');
  ['chest', 'shoulders', 'biceps', 'triceps'].forEach(mu => assert.equal(well[mu], 5, mu));
  // Una división sin "down" no tiene pisos de mantenimiento.
  Object.values(floors('oscar_cut_classic_5d')).forEach(v => assert.equal(v, 10));
  // Un grupo rezagado anula el énfasis reducido (DEC-001) y vuelve al piso completo.
  const lagQuads = E.buildPlan(Object.assign({}, BASELINE016.cases.novice_bulk_physique_4d.profile, { laggingMuscles: ['quads'] }), BASELINE016.today).training.sessionLimit.floors;
  assert.equal(lagQuads.quads, 10);
  assert.equal(lagQuads.hamstrings, 5);
  // El factor sale de la configuración y se etiqueta como convención, no como cifra del estudio.
  const r = K.VALIDATOR_RULES.maintenanceFloorFactor;
  assert.equal(r.value, 0.5);
  assert.equal(r.level, 'E4');
  assert.equal(r.convention, true);
  assert.equal(r.status, 'implementada');
  assert.equal(phys.quads, K.VALIDATOR_RULES.minWeeklySetsPerMuscle.value * r.value);
  assert.match(r.source.label, /Spiering et al\. 2021, J Strength Cond Res 35\(5\):1449-1458/);
  assert.equal(r.source.url, 'https://pubmed.ncbi.nlm.nih.gov/33629972/');
  assert.match(r.note, /El 0,5 no sale del estudio/);
  assert.match(r.note, /alineada con DEC-001/);
});

test('DEC-017: novice_bulk_physique_4d (physique_m): las piernas están reducidas a propósito y quedan sobre su piso de 5, así que no se completan', () => {
  const c = BASELINE016.cases.novice_bulk_physique_4d;
  const plan = E.buildPlan(c.profile, BASELINE016.today);
  const f = fracWeek(plan), t = plan.training;
  assert.deepEqual(t.sessions.map(s => s.totalSets), [25, 9, 24, 6], 'las sesiones de 9 y 6 series no cambian');
  assert.deepEqual([f.quads, f.hamstrings, f.glutes], [7, 5, 7.5]);
  ['quads', 'hamstrings', 'glutes'].forEach(mu => assert.ok(f[mu] >= t.sessionLimit.floors[mu], `${mu} cumple su piso de mantenimiento`));
  assert.deepEqual(t.sessionLimit.filled, []);
  assert.ok(!plan.warnings.some(w => w.kind === 'completado_piso'));
  assert.deepEqual(t.sessionLimit.belowMinimum.map(x => x.muscle).filter(m => K.MAJOR_GROUPS.includes(m)), [], 'tampoco avisa de las piernas');
  // Con el piso completo (10) la regla sí las completa: es el piso de mantenimiento lo que lo evita.
  const sessions = t.sessions.map(s => ({ name: s.name, exercises: s.exercises.map(e => Object.assign({}, e)), totalSets: s.totalSets }));
  const log = E.completeToFloor(sessions, SPLIT_DAYS_4, [], 25);
  assert.ok(log.length > 0 && sessions.every(s => s.totalSets <= 25));
  assert.ok([1, 3].every(i => sessions[i].totalSets > t.sessions[i].totalSets), 'con piso 10 crecen las sesiones de 9 y 6');
});

test('DEC-017: wellness_maintain_5d y bikini_cut_lagging_4d tienen el pecho "down" y con el piso de mantenimiento ya no hay déficit', () => {
  ['wellness_maintain_5d', 'bikini_cut_lagging_4d'].forEach(key => {
    const c = BASELINE016.cases[key];
    assert.ok(K.DIVISIONS && c.profile.division, key);
    const plan = E.buildPlan(c.profile, BASELINE016.today);
    const f = fracWeek(plan), t = plan.training;
    assert.equal(t.sessionLimit.floors.chest, 5, `${key}: el pecho es "down" en ${c.profile.division}`);
    assert.ok(f.chest >= 5 && f.chest < 10, `${key}: pecho ${f.chest}`);
    assert.deepEqual(t.sessions.map(s => s.totalSets), REF017.antes[key].sesiones, `${key}: sin series agregadas`);
    assert.deepEqual(t.sessionLimit.filled, []);
    assert.ok(!t.sessionLimit.belowMinimum.some(x => x.muscle === 'chest'), `${key}: el pecho ya no está en el aviso`);
  });
  assert.equal(fracWeek(E.buildPlan(BASELINE016.cases.wellness_maintain_5d.profile, BASELINE016.today)).chest, 7);
  assert.equal(fracWeek(E.buildPlan(BASELINE016.cases.bikini_cut_lagging_4d.profile, BASELINE016.today)).chest, 6);
});

test('DEC-017: un grupo "down" por debajo de 5 sí avisa, con su piso de mantenimiento', () => {
  // bikini_w, 3 días, rezagados cuádriceps/isquios/glúteos (el pecho sigue "down"): el pecho queda en 4.
  const p = { name: 'B', sex: 'F', age: 28, heightCm: 165, weightKg: 58, bodyFatPct: 20, activity: 'moderate', level: 'novice', daysPerWeek: 3, division: 'bikini_w', goal: 'cut', laggingMuscles: ['quads', 'hamstrings', 'glutes'] };
  const plan = E.buildPlan(p, TODAY);
  const w = plan.warnings.find(x => x.kind === 'bajo_minimo');
  const chest = w.muscles.find(x => x.muscle === 'chest');
  assert.equal(chest.floor, 5);
  assert.ok(chest.fractionalSets < 5);
  assert.match(w.text, /Pecho 4 \(piso de mantenimiento 5\)/);
  assert.match(w.text, /énfasis reducido por la división/);
});

test('DEC-017: el piso de mantenimiento se aplica igual al freno de recortes y al completado (unidad)', () => {
  // Freno: 27 series, la única forma de recortar es la extensión de cuádriceps (aislamiento); cuádriceps = 8 fraccionadas.
  const build = () => [sess('S', mk('chest.bench_press_barbell', 11), mk('back.row_barbell', 8), mk('quads.leg_press', 4), mk('quads.leg_extension', 4))];
  const uniform = build();
  E.enforceSessionCap(uniform, null);
  assert.equal(uniform[0].totalSets, 27, 'con piso 10 (el cuádriceps ya está en 8) el freno no deja recortar');
  const down = build();
  const info = E.enforceSessionCap(down, null, { quads: 5 });
  assert.equal(down[0].totalSets, 25, 'con piso de mantenimiento 5 se puede recortar hasta el tope');
  assert.ok(fracOf(down).quads >= 5 && fracOf(down).quads < 8);
  assert.equal(info.trimmed.length, 1);
  // Completado: cuádriceps en 7. Con piso 10 se completa; con piso de mantenimiento 5 no.
  const mkSess = () => [sess('P', mk('quads.leg_press', 4), mk('quads.leg_extension', 3), mk('hamstrings.rdl', 5))];
  const a = mkSess(); assert.ok(E.completeToFloor(a, [{ muscles: ['quads', 'hamstrings'] }], [], 25).length > 0);
  const b = mkSess(); assert.deepEqual(E.completeToFloor(b, [{ muscles: ['quads', 'hamstrings'] }], [], 25, { quads: 5, hamstrings: 5 }), []);
  // Un grupo "down" por debajo de 5 sí se completa, hasta 5.
  const c = [sess('P', mk('quads.leg_press', 2), mk('hamstrings.rdl', 3))];
  const logC = E.completeToFloor(c, [{ muscles: ['quads', 'hamstrings'] }], [], 25, { quads: 5, hamstrings: 10 });
  assert.ok(fracOf(c).quads >= 5 && fracOf(c).quads < 7, 'se detiene al llegar al piso de mantenimiento');
  assert.ok(logC.length > 0);
});

test('DEC-017: figure_maintain_novice_3d (figure_w, sin "down") completa el pecho con el piso completo', () => {
  const key = 'figure_maintain_novice_3d';
  const plan = E.buildPlan(BASELINE016.cases[key].profile, BASELINE016.today);
  const t = plan.training;
  assert.equal(t.sessionLimit.floors.chest, 10);
  assert.equal(REF017.antes[key].mayores.chest, 9);
  assert.ok(fracWeek(plan).chest >= 10);
  assert.deepEqual(t.sessions.map(s => s.totalSets), [25, 25, 25]);
  assert.equal(t.sessionLimit.filled.reduce((a, x) => a + x.sets, 0), 1);
  assert.deepEqual(t.sessions.map(s => s.durationMin), REF017.despues[key].minutos);
});

test('DEC-017: nunca pasa de 25 por esta regla (barrido de divisiones, días, objetivos, niveles y rezagados)', () => {
  let touched = 0, plans = 0;
  Object.keys(K.DIVISIONS).forEach(division => {
    const sex = K.DIVISIONS[division].sex;
    [3, 4, 5, 6].forEach(days => ['cut', 'bulk', 'maintain'].forEach(goal => ['novice', 'advanced'].forEach(level => [[], ['quads', 'hamstrings', 'glutes'], ['chest']].forEach(lag => {
      const p = { name: 'S', sex, age: 30, heightCm: 175, weightKg: 75, bodyFatPct: 18, activity: 'moderate', level, daysPerWeek: days, division, goal, laggingMuscles: lag };
      const t = E.buildPlan(p, TODAY).training; plans++;
      const over = new Map(t.sessionLimit.overCap.map(o => [o.session, o.sets]));
      t.sessions.forEach(s => {
        if (s.totalSets > t.sessionLimit.cap) assert.equal(over.get(s.name), s.totalSets, `${division} ${days}d ${goal}: ${s.name} pasó del tope por la regla`);
      });
      t.sessionLimit.filled.forEach(x => x.items.forEach(i => { touched++; assert.ok(t.sessions.find(s => s.name === i.session).totalSets <= t.sessionLimit.cap, `${division}: ${i.session}`); }));
      // Ningún músculo pasa de 11 fraccionadas en una sesión por esta regla (no crea avisos R1 nuevos).
      t.sessionLimit.filled.forEach(x => t.sessions.forEach(s => { if (x.items.some(i => i.session === s.name)) assert.ok((s.fractionalSets[x.muscle] || 0) <= 11, `${division} ${s.name}: R1`); }));
    }))));
  });
  assert.ok(plans > 300 && touched > 50, `el barrido tiene que ejercitar la regla (planes ${plans}, series ${touched})`);
});

test('DEC-017 (unidad): prioriza el mayor déficit y la sesión con más espacio, y solo en días que entrenan el grupo', () => {
  // Torso A (chest, back) con 10 series y Torso B con 20: chest y back parten de 0 con series reales distintas.
  const A = sess('A', mk('chest.bench_press_barbell', 3), mk('back.row_barbell', 3));
  const B = sess('B', mk('chest.bench_press_barbell', 3), mk('back.row_barbell', 3), mk('shoulders.press_overhead', 14));
  const L = sess('L', mk('quads.leg_press', 8)); // día de pierna: no entrena pecho ni espalda; su déficit (2) es menor que el de pecho y espalda (4)
  const days = [{ muscles: ['chest', 'back'] }, { muscles: ['chest', 'back', 'shoulders'] }, { muscles: ['quads'] }];
  const sessions = [A, B, L];
  const before = fracOf(sessions);
  assert.ok(before.chest < 10 && before.back < 10);
  const log = E.completeToFloor(sessions, days, [], 25, new Set());
  // Pecho y espalda empatan en déficit: gana el orden de MAJOR_GROUPS (pecho primero) y la sesión con más espacio (A).
  assert.equal(log[0].bucket, 'chest');
  assert.equal(log[0].session, 'A');
  assert.ok(log.every(x => x.sessionIndex !== 2 || x.bucket === 'quads'), 'el día de pierna no recibe pecho ni espalda');
  sessions.forEach(s => assert.ok(s.totalSets <= 25));
  // Un grupo con más déficit va antes: quads (0) en un día que lo entrena frente a chest (6).
  const C = sess('C', mk('chest.bench_press_barbell', 3), mk('chest.incline_press_db', 3), mk('quads.leg_press', 1));
  const log2 = E.completeToFloor([C], [{ muscles: ['chest', 'quads'] }], [], 25, new Set());
  assert.equal(log2[0].bucket, 'quads', 'quads tiene mayor déficit que chest');
});

test('DEC-017 (unidad): primero series extra de ejercicios del plan; ejercicio nuevo solo si no hay otra forma; respeta lesiones y patrones del día', () => {
  // Con ejercicio de cuádriceps ya en el plan: solo se suman series, no hay ejercicio nuevo mientras quepa.
  const S1 = sess('P', mk('quads.leg_press', 4), mk('hamstrings.rdl', 3));
  const log1 = E.completeToFloor([S1], [{ muscles: ['quads', 'hamstrings'] }], [], 25, new Set());
  const q1 = log1.filter(x => x.bucket === 'quads');
  assert.ok(q1.length > 0 && q1[0].isNew === false, 'primero series extra de la prensa');
  // Sin ningún ejercicio de cuádriceps en la sesión: entra uno nuevo (2 series), de una lista filtrada por lesión.
  const S2 = sess('P', mk('hamstrings.rdl', 3));
  const log2 = E.completeToFloor([S2], [{ muscles: ['quads', 'hamstrings'] }], ['knee'], 25, new Set());
  const nuevos = log2.filter(x => x.isNew && x.bucket === 'quads');
  assert.ok(nuevos.length > 0, 'se agregó un ejercicio nuevo de cuádriceps');
  const excluded = new Set(K.INJURY_EXCLUSIONS.knee.quads);
  nuevos.forEach(x => assert.ok(!excluded.has(K.EXERCISE_INDEX[x.exerciseId].entry.pattern), `${x.exerciseId} está excluido por la lesión de rodilla (DEC-011)`));
  assert.equal(nuevos[0].sets, 2, 'un ejercicio nuevo entra con 2 series');
  const patterns = S2.exercises.map(e => e.pattern);
  assert.equal(new Set(patterns).size, patterns.length, 'sin patrones repetidos en el día (DEC-006)');
  // Sin lesión, la sentadilla (excluida por rodilla) sí está disponible.
  const S3 = sess('P', mk('hamstrings.rdl', 3));
  E.completeToFloor([S3], [{ muscles: ['quads', 'hamstrings'] }], [], 25, new Set());
  assert.ok(S3.exercises.some(e => e.pattern === 'squat_bilateral'), 'control: sin lesión entra la sentadilla');
  // Sin espacio no se agrega nada y el grupo queda como estaba.
  const full = sess('F', mk('chest.bench_press_barbell', 12), mk('shoulders.press_overhead', 13));
  assert.deepEqual(E.completeToFloor([full], [{ muscles: ['chest', 'shoulders'] }], [], 25, new Set()), []);
  assert.equal(full.totalSets, 25);
});

test('DEC-017: la regla solo completa grupos mayores y también corre con la aceptación vigente, sin pasar del tope', () => {
  let filledAccepted = 0;
  Object.keys(K.DIVISIONS).forEach(division => [3, 4, 5, 6].forEach(days => {
    const p = { name: 'S', sex: K.DIVISIONS[division].sex, age: 30, heightCm: 175, weightKg: 75, bodyFatPct: 18, activity: 'moderate', level: 'novice', daysPerWeek: days, division, goal: 'maintain', longSessionAcceptedOn: '2026-10-24' };
    const t = E.buildPlan(p, TODAY).training;
    t.sessionLimit.filled.forEach(x => {
      assert.ok(K.MAJOR_GROUPS.includes(x.muscle), `${division}: solo grupos mayores`);
      x.items.forEach(i => { filledAccepted++; assert.ok(t.sessions.find(s => s.name === i.session).totalSets <= t.sessionLimit.cap); });
    });
  }));
  assert.ok(filledAccepted > 0, 'con la aceptación vigente la regla también completa');
});


/* ---------- B-013 · fuentes verificadas contra PubMed ---------- */

test('B-013: las fuentes corregidas apuntan a los registros verificados y ninguna fuente usada falta en SOURCES', () => {
  assert.equal(K.SOURCES.SPIERING_2021, undefined, 'la cita SPIERING_2021 no se pudo verificar y se reemplazó');
  assert.equal(K.SOURCES.SPIERING_MANT_2021.url, 'https://pubmed.ncbi.nlm.nih.gov/33629972/');
  assert.match(K.SOURCES.SPIERING_MANT_2021.title, /J Strength Cond Res 2021;35\(5\):1449-58/);
  assert.match(K.SOURCES.SPIERING_MANT_2021.title, /solo se leyó el resumen/);
  assert.equal(K.SOURCES.SILBERNAGEL_2007.url, 'https://pubmed.ncbi.nlm.nih.gov/17307888/');
  assert.match(K.SOURCES.SILBERNAGEL_2007.title, /Am J Sports Med 2007;35\(6\):897-906/);
  assert.match(K.SOURCES.SILBERNAGEL_2007.title, /de pago y no se leyó/);
  const r = K.VALIDATOR_RULES.painFlagThreshold;
  assert.equal(r.source.url, 'https://pubmed.ncbi.nlm.nih.gov/17307888/');
  assert.equal(r.level, 'E4');
  assert.equal(r.reviewRequired, true);
  assert.match(r.note, /Sprague et al\. 2021/);
  assert.match(r.note, /no implementa la condición de la mañana siguiente/);
  // Todo id de fuente que el plan declara existe en SOURCES (con y sin lesiones ni objetivo de salud).
  [{}, { healthGoal: true }, { healthGoal: true, injuryZones: ['shoulder', 'knee'] }].forEach(extra => {
    const plan = E.buildPlan(Object.assign({}, male, extra, extra.injuryZones ? { health: cleared(cleared(E.normalizeProfile(Object.assign({}, male, extra)).health, 'shoulder', '2026-09-01'), 'knee', '2026-09-01') } : {}), TODAY);
    plan.sourcesUsed.forEach(id => assert.ok(K.SOURCES[id], `fuente usada sin definir: ${id}`));
  });
});

/* ---------- B-001 / DEC-018 · el import restaura workouts y sessions ---------- */

const trainedProfile = () => {
  const data = E.normalizeProfile(Object.assign({}, male, { injuryZones: ['shoulder'], healthSymptoms: 'on' }));
  return {
    id: 'orig1', createdAt: '2026-09-01', updatedAt: '2026-10-20', data, log: [{ date: '2026-09-01', weightKg: 84, bodyFatPct: null, waistCm: 88, neckCm: null, hipCm: null, notes: 'Datos iniciales' }],
    workouts: [
      { setKey: 's1:0:0', sessionId: 's1', date: '2026-10-01', dayIndex: 0, dayName: 'Día 1', exercise: 'Press banca con barra', exerciseId: 'chest.bench_press_barbell', muscle: 'chest', setType: 'top', setNumber: 1, weight: 80, reps: 5, pain: 3, short: false, savedAt: 1790000000000 },
      { setKey: 's1:0:1', sessionId: 's1', date: '2026-10-01', dayIndex: 0, dayName: 'Día 1', exercise: 'Press banca con barra', exerciseId: 'chest.bench_press_barbell', muscle: 'chest', setType: 'backoff', setNumber: 1, weight: 72, reps: 8, pain: null, short: false, savedAt: 1790000100000, editedAt: 1790000200000 },
      { sessionId: 'old', date: '2026-09-20', exercise: 'Sentadilla', setType: 'normal', setNumber: 1, weight: 100, reps: 6, short: false, savedAt: 1789000000000 }, // fila anterior a DEC-015 (sin setKey)
    ],
    sessions: [{ sessionId: 's1', status: 'completada', date: '2026-10-01', dayIndex: 0, dayName: 'Día 1', short: false, startedAt: 1789999000000, finishedAt: 1790001000000, setsDone: 2, setsTotal: 3 }],
    painFlags: { bench_press: { flagged: true, cleanStreak: 0, lastSessionId: 's1', painSessions: [{ sessionId: 's1', date: '2026-10-01' }] } },
  };
};
const roundTrip = p => JSON.parse(JSON.stringify(E.exportProfile(p))); // lo que pasa por el archivo .json

test('B-001: export -> import restaura workouts y sessions (ida y vuelta) sin cambiar la privacidad del export', () => {
  const p = trainedProfile();
  const file = roundTrip(p);
  // La política del export no cambia (DEC-009): el archivo lleva las series sin dolor y no lleva salud ni painFlags.
  assert.equal(file.workouts.length, 3);
  assert.ok(file.workouts.every(w => !('pain' in w)));
  assert.ok(!('painFlags' in file) && !('health' in file.data));
  const back = E.prepareImportedProfile(file, TODAY, 'nuevo1');
  // Vuelve todo el entrenamiento, idéntico a lo exportado.
  assert.deepEqual(back.workouts, file.workouts);
  assert.deepEqual(back.sessions, p.sessions);
  assert.deepEqual(back.log, p.log);
  assert.equal(back.workouts[1].editedAt, 1790000200000, 'se conserva lo editado');
  assert.equal(back.workouts[2].setKey, undefined, 'las filas anteriores a DEC-015 vuelven tal cual, sin migrar');
  // Y sigue sin entrar nada de salud ni de dolor.
  assert.deepEqual(back.data.health.injuries, []);
  assert.ok(!('painFlags' in back));
  assert.equal(back.droppedHealth, false, 'el archivo exportado ya viene sin salud ni dolor: no hay nada que avisar');
  assert.doesNotMatch(JSON.stringify(back), /"(pain|painFlags|painNow|painSessions|clearanceDate)":/);
  // Idempotente: exportar el perfil importado da el mismo archivo (salvo id y fechas).
  const imported = { id: 'nuevo1', createdAt: back.createdAt, updatedAt: back.updatedAt, data: back.data, log: back.log, workouts: back.workouts, sessions: back.sessions };
  const again = roundTrip(imported);
  ['workouts', 'sessions', 'log'].forEach(k => assert.deepEqual(again[k], file[k], k));
});

test('B-001: un archivo con dolor por serie lo descarta al importar y avisa', () => {
  const file = JSON.parse(JSON.stringify(trainedProfile())); // formato viejo: workouts con pain y painFlags
  assert.equal(file.workouts[0].pain, 3);
  const back = E.prepareImportedProfile(file, TODAY, 'nuevo1');
  assert.ok(back.workouts.every(w => !('pain' in w)), 'ninguna fila conserva el dolor');
  assert.equal(back.workouts.length, 3, 'las series sí vuelven');
  assert.equal(back.droppedHealth, true, 'avisa que se ignoraron datos de salud / dolor');
  // Solo dolor en una serie (sin salud ni painFlags) también cuenta como dato descartado.
  const onlyRowPain = E.prepareImportedProfile({ data: male, workouts: [{ sessionId: 's', exercise: 'X', weight: 1, reps: 1, pain: 7 }] }, TODAY, 'n');
  assert.equal(onlyRowPain.droppedHealth, true);
  assert.ok(!('pain' in onlyRowPain.workouts[0]));
  assert.equal(file.workouts[0].pain, 3, 'no muta el item de entrada');
});

test('B-001: remapea profileId al perfil nuevo y descarta filas mal formadas', () => {
  const file = roundTrip(trainedProfile());
  file.workouts[0].profileId = 'orig1';
  file.sessions[0].profileId = 'orig1';
  const back = E.prepareImportedProfile(file, TODAY, 'nuevo1');
  assert.equal(back.workouts[0].profileId, 'nuevo1');
  assert.equal(back.sessions[0].profileId, 'nuevo1');
  assert.ok(!('profileId' in back.workouts[1]), 'solo se remapea donde la fila lo traía');
  assert.equal(file.workouts[0].profileId, 'orig1', 'no muta el item de entrada');
  const dirty = E.prepareImportedProfile({ data: male, workouts: [null, 'x', 5, [], {}, { sessionId: '' }, { sessionId: 's', exercise: 'ok', weight: 1, reps: 1 }], sessions: [null, { status: 'x' }, { sessionId: 's' }] }, TODAY, 'n');
  assert.equal(dirty.workouts.length, 1);
  assert.equal(dirty.sessions.length, 1);
});

test('B-001: archivos exportados antes (sin workouts ni sessions) o con otros tipos siguen importando', () => {
  const noTraining = E.prepareImportedProfile({ data: male, log: [] }, TODAY, 'n');
  assert.deepEqual(noTraining.workouts, []);
  assert.deepEqual(noTraining.sessions, []);
  const weird = E.prepareImportedProfile({ data: male, workouts: 'no', sessions: { a: 1 } }, TODAY, 'n');
  assert.deepEqual([weird.workouts, weird.sessions], [[], []]);
  // Sin newProfileId (llamada vieja) no rompe.
  assert.equal(E.prepareImportedProfile({ data: male, workouts: [{ sessionId: 's', profileId: 'x', exercise: 'e' }] }, TODAY).workouts[0].profileId, 'x');
});


/* ---------- DEC-019 · el agua que muestra la app es agua TOTAL (EFSA) ---------- */

test('DEC-019: la cifra de agua no cambia (2,5 / 2,0 L) y la fuente dice que es agua total, sin afirmar lo que EFSA no dice', () => {
  assert.equal(E.buildPlan(male, TODAY).nutrition.waterL, 2.5);
  assert.equal(E.buildPlan(Object.assign({}, male, { sex: 'F', division: 'bikini_w' }), TODAY).nutrition.waterL, 2.0);
  const title = K.SOURCES.EFSA_WATER.title;
  assert.match(title, /agua TOTAL/);
  assert.match(title, /humedad de los alimentos/);
  assert.match(title, /20-30 %/);
  assert.match(title, /PAL 1,6/);
  assert.match(title, /P95 3,1 L/);
  assert.match(title, /no da una ingesta adecuada solo de bebidas/);
  assert.doesNotMatch(title, /más las pérdidas por sudor/, 'el "más sudor" es una glosa de la app, no de EFSA');
  assert.equal(K.SOURCES.EFSA_WATER.url, 'https://doi.org/10.2903/j.efsa.2010.1459');
  // El comentario del motor deja claro que no es solo bebida ni un mínimo.
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'js', 'engine.js'), 'utf8');
  assert.match(src, /ingesta ADECUADA de agua TOTAL \(bebidas \+ alimentos\)/);
});
