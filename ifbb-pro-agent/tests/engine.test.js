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
    assert.equal(r.verifiedAgainstPrimarySource, false, `${key}: nada está verificado contra la fuente primaria todavía`);
  });
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
    'plan.training.sessionLimit': 'DEC-014: regla E4 (tope, recortes, sesiones por encima)',
    'plan.training.sessions.#.exercises.#.setWeights': 'DEC-014: aporte de una serie por músculo (fraccionado)',
    'plan.training.sessions.#.fractionalSets': 'DEC-014: series fraccionadas por músculo y sesión',
    'plan.training.warnings.#.evidence': 'DEC-014: etiqueta de evidencia de los avisos E4 y R1',
    'plan.training.warnings.#.rule': 'DEC-014: regla que originó el aviso',
    'plan.training.warnings.#.text': 'DEC-014: textos de los avisos E4 y R1',
    'plan.training.warnings.length': 'DEC-014: avisos nuevos (E4, R1)',
    'plan.warnings.#.evidence': 'DEC-014: ídem, en la lista combinada',
    'plan.warnings.#.rule': 'DEC-014: ídem, en la lista combinada',
    'plan.warnings.#.text': 'DEC-014: ídem, en la lista combinada',
    'plan.warnings.length': 'DEC-014: ídem, en la lista combinada',
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
  assert.ok(!('painFlags' in prepared) && !('workouts' in prepared), 'no se guardan painFlags ni workouts del archivo');
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
  // a_verificar cuenta 0: el pectoral del press inclinado está a_verificar y no suma.
  assert.equal(K.EXERCISE_CONTRIBUTION['chest.incline_press_db'].relations.chest.evidencia, 'a_verificar');
  assert.equal(E.fractionalByMuscle([entry('chest.incline_press_db', 4)]).chest, undefined);
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
