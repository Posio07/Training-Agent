const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const K = require('../js/knowledge.js');
const REGISTRO = require('../js/core-v2/registro.js');
const PLAN_V2 = require('../js/core-v2/plan.js');

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

test('validateProfile catches missing data', () => {
  assert.ok(E.validateProfile({}).length >= 3);
  assert.deepEqual(E.validateProfile(male), []);
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
  ['metrics', 'targets', 'nutrition', 'supplements'].forEach(key => {
    assert.deepEqual(stripHealthNoise(planDiabetic[key]), stripHealthNoise(planBase[key]), `${key} no debería cambiar por diabetes`);
  });
  // sin medicación, o sin diabetes: sin avisos de diabetes
  const noMed = Object.assign({}, male, { diabetesType: 'type2', healthDiabetesMed: false });
  assert.equal(E.buildPlan(noMed, TODAY).health.diabetesWarning, null);
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
  assert.deepEqual(planBoth.nutrition, E.buildPlan(withInjury(['shoulder', 'knee']), TODAY).nutrition);
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

/* ---------- DEC-009 (Privacidad): export e import sin datos de salud ---------- */

const HEALTH_KEYS = /"(health|painFlags|painNow|painSessions|pain|clearanceDate|injuries|screening|diabetes|healthSymptoms|diabetesType|injuryZones)":/;
function storedProfileWithHealth() {
  const data = E.normalizeProfile(withInjury(['shoulder', 'knee'], { healthSymptoms: 'on', healthMedicalClearance: 'on', diabetesType: 'type1', healthDiabetesMed: 'on' }));
  data.health = cleared(cleared(data.health, 'shoulder', '2026-09-10'), 'knee', '2026-09-11');
  return {
    id: 'prof-1', createdAt: '2026-09-01', updatedAt: '2026-09-12', data,
    log: [{ date: '2026-09-01', weightKg: 85, notes: 'Datos iniciales' }],
    workouts: [
      { setKey: 's1:0:0', sessionId: 's1', date: '2026-09-10', exercise: 'Press banca con barra', exerciseId: 'chest.bench_press_barbell', muscle: 'chest', setType: 'normal', setNumber: 1, weight: 80, reps: 8, pain: null },
      { setKey: 's1:1:0', sessionId: 's1', date: '2026-09-10', exercise: 'Sentadilla con barra', exerciseId: 'quads.squat_back', muscle: 'quads', setType: 'normal', setNumber: 1, weight: 100, reps: 6, pain: 7 },
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
  assert.deepEqual(exported.workouts.map(w => [w.exerciseId, w.weight, w.reps]), [['chest.bench_press_barbell', 80, 8], ['quads.squat_back', 100, 6]]);
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

test('DEC-011: la marca de re-autorización no altera el plan (solo la pantalla la usa) y no sale en el export', () => {
  const stored = authorizedProfile(['shoulder']);
  const worsened = editAndReconcile(stored, ['shoulder'], { pain: ['shoulder'] });
  const plain = E.buildPlan(E.normalizeProfile(withInjury(['shoulder'], { injuryPainNow: ['shoulder'] })), TODAY);
  assert.deepEqual(Object.keys(worsened.plan.health).sort(), Object.keys(plain.health).sort(), 'no hay claves nuevas en plan.health');
  assert.equal(worsened.plan.health.injuryBlockReason, plain.health.injuryBlockReason, 'el texto de la pausa del motor es el mismo');
  // Tampoco altera el plan de entrenamiento: el reparto mira las zonas declaradas, no la marca.
  const conMarca = Object.assign({}, E.normalizeProfile(withInjury(['shoulder'], { injuryPainNow: ['shoulder'] })), { health: worsened.health });
  const sinMarca = Object.assign({}, conMarca, { health: JSON.parse(JSON.stringify(conMarca.health)) });
  sinMarca.health.injuries.forEach(i => { delete i.clearanceInvalidated; });
  assert.ok(conMarca.health.injuries.some(i => i.clearanceInvalidated), 'el perfil de prueba tiene la marca');
  assert.deepEqual(PLAN_V2.crearPlan(conMarca, { id: 'a', ahora: TODAY }).plan, PLAN_V2.crearPlan(sinMarca, { id: 'a', ahora: TODAY }).plan);
  // Y no sale en el export (DEC-009).
  const exported = E.exportProfile({ id: 'x', data: Object.assign({}, E.normalizeProfile(withInjury(['shoulder'])), { health: worsened.health }) });
  assert.doesNotMatch(JSON.stringify(exported), /clearanceInvalidated/);
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

test('DEC-015: editar y borrar en el historial de sesiones completadas', () => {
  const workouts = [
    { setKey: 'h1:0:0', sessionId: 'h1', date: '2026-10-20', exercise: 'Press banca', setType: 'normal', setNumber: 1, weight: 60, reps: 10, savedAt: 100, dayName: 'Día 1' },
    { setKey: 'h1:0:1', sessionId: 'h1', date: '2026-10-20', exercise: 'Press banca', setType: 'normal', setNumber: 2, weight: 60, reps: 9, savedAt: 200, dayName: 'Día 1' },
    { setKey: 'h0:0:0', sessionId: 'h0', date: '2026-09-01', exercise: 'Jalón', setType: 'top', setNumber: 1, weight: 50, reps: 6, savedAt: 50, dayName: 'Día 2' },
    { setKey: 'a1:0:0', sessionId: 'a1', date: '2026-10-24', exercise: 'Press banca', setType: 'normal', setNumber: 1, weight: 70, reps: 5, savedAt: 300 },
  ];
  const sessions = [{ sessionId: 'h1', status: 'completada', date: '2026-10-20', dayName: 'Día 1', startedAt: 90, finishedAt: 300, setsDone: 2, setsTotal: 5 }];
  const list = SS.listSessions(workouts, sessions, 'a1');
  assert.deepEqual(list.map(x => [x.sessionId, x.status, x.rows.length]), [['h1', 'completada', 2], ['h0', 'sin_estado', 1]], 'la sesión en curso no se lista; una sesión sin cierre escrito queda sin estado');
  // Cada fila se identifica por su setKey (DEC-023: no hay filas sin setKey que identificar por sus datos).
  assert.equal(SS.rowId(workouts[2]), 'h0:0:0');
  // Una fila sin setKey (anterior a DEC-015) ya no tiene identificador derivado, así que no se puede editar ni borrar.
  const vieja = { sessionId: 'viejo', exercise: 'Jalón', setType: 'top', setNumber: 1, weight: 50, reps: 6, savedAt: 50 };
  assert.equal(SS.rowId(vieja), undefined);
  const conVieja = workouts.concat([vieja]);
  assert.equal(SS.editRow(conVieja, SS.rowId(vieja), { weight: 52.5, reps: 5 }, 999).ok, false, 'sin setKey no hay nada que editar');
  assert.equal(SS.deleteRow(conVieja, sessions, SS.rowId(vieja), 999).ok, false, 'sin setKey no hay nada que borrar');
  assert.equal(conVieja.length, workouts.length + 1, 'y no se toca ninguna otra fila');
  assert.equal(SS.editRow(workouts, 'h0:0:0', { weight: 52.5, reps: 5 }, 999).ok, true);
  assert.deepEqual([workouts[2].weight, workouts[2].reps, workouts[2].editedAt], [52.5, 5, 999]);
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

/* ---------- B-013 · fuentes verificadas contra PubMed ---------- */

test('B-013: las fuentes corregidas apuntan a los registros verificados y ninguna fuente usada falta en SOURCES', () => {
  assert.equal(K.SOURCES.SPIERING_2021, undefined, 'la cita SPIERING_2021 no se pudo verificar y se reemplazó');
  assert.equal(K.SOURCES.SPIERING_MANT_2021.url, 'https://pubmed.ncbi.nlm.nih.gov/33629972/');
  assert.match(K.SOURCES.SPIERING_MANT_2021.title, /J Strength Cond Res 2021;35\(5\):1449-58/);
  assert.match(K.SOURCES.SPIERING_MANT_2021.title, /solo se leyó el resumen/);
  assert.equal(K.SOURCES.SILBERNAGEL_2007.url, 'https://pubmed.ncbi.nlm.nih.gov/17307888/');
  assert.match(K.SOURCES.SILBERNAGEL_2007.title, /Am J Sports Med 2007;35\(6\):897-906/);
  assert.match(K.SOURCES.SILBERNAGEL_2007.title, /de pago y no se leyó/);
  // El umbral de dolor vive en el registro del núcleo nuevo, con la misma fuente y nivel.
  const r = REGISTRO.REGLAS.find(x => x.id === 'UMBRAL_DOLOR_BANDERA');
  assert.deepEqual(r.fuentes, ['SILBERNAGEL_2007']);
  assert.equal(r.nivel, 'E4');
  assert.match(r.fuente, /Silbernagel/);
  assert.match(r.fuente, /Sprague et al\. 2021/);
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
      { setKey: 's1:1:0', sessionId: 's1', date: '2026-10-01', dayIndex: 0, dayName: 'Día 1', exercise: 'Jalón al pecho', exerciseId: 'back.pulldown', muscle: 'back', setType: 'normal', setNumber: 1, weight: 55, reps: 10, pain: null, short: false, savedAt: 1790000300000 },
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
  const onlyRowPain = E.prepareImportedProfile({ data: male, workouts: [{ setKey: 's:0:0', sessionId: 's', exercise: 'X', weight: 1, reps: 1, pain: 7 }] }, TODAY, 'n');
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
  const dirty = E.prepareImportedProfile({ data: male, workouts: [null, 'x', 5, [], {}, { sessionId: '' }, { sessionId: 's', exercise: 'sin setKey', weight: 1, reps: 1 }, { setKey: 's:0:0', sessionId: 's', exercise: 'ok', weight: 1, reps: 1 }], sessions: [null, { status: 'x' }, { sessionId: 's' }] }, TODAY, 'n');
  assert.equal(dirty.workouts.length, 1, 'solo entra la fila con setKey (DEC-023: una fila sin setKey no se podría editar ni borrar)');
  assert.equal(dirty.workouts[0].exercise, 'ok');
  assert.equal(dirty.sessions.length, 1);
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

/* ---------- Indicador "Siguiente" (orden del split, no la fecha; T5b de la spec del núcleo v2) ---------- */
const dayNamesOf = days => PLAN_V2.crearPlan(E.normalizeProfile(Object.assign({}, male, { daysPerWeek: days })), { id: 'p' + days, ahora: TODAY }).plan.sesiones.map(x => x.nombre);
// Registra una sesión del día `dayIndex` con `nSets` series hechas; `cerrar` la completa (entrada en `sessions`).
const registrarDia = (p, names, dayIndex, date, nSets, cerrar, id, t) => {
  const rec = SS.newSession({ profileId: 'p', sessionId: id, dayIndex, dayName: names[dayIndex], short: false, exercises: smExercises(), now: t });
  for (let i = 0; i < nSets; i++) {
    SS.markDone(rec, 0, i, { weight: 50, reps: 8, pain: null }, t + i);
    SS.upsertWorkout(p.workouts, SS.workoutRow(rec, 0, i, date));
  }
  if (cerrar) SS.complete(rec, p.sessions, p.workouts, t + 99, date);
  return rec;
};
const perfilVacio = () => ({ workouts: [], sessions: [] });

test('Siguiente: sin sesiones registradas marca el Día 1', () => {
  assert.equal(SS.siguienteDia([], [], dayNamesOf(5)), 0);
  assert.equal(SS.siguienteDia(undefined, undefined, dayNamesOf(5)), 0);
});

test('Siguiente: marca el día que sigue a la última sesión registrada, sin mirar la fecha de hoy', () => {
  const names = dayNamesOf(5), p = perfilVacio();
  registrarDia(p, names, 0, '2025-01-10', 2, true, 's1', 1000);
  assert.equal(SS.siguienteDia(p.workouts, p.sessions, names), 1);
  registrarDia(p, names, 1, '2025-01-12', 2, true, 's2', 2000);
  assert.equal(SS.siguienteDia(p.workouts, p.sessions, names), 2);
});

test('Siguiente: después del último día del split vuelve al Día 1', () => {
  const names = dayNamesOf(4), p = perfilVacio();
  registrarDia(p, names, 3, '2026-11-01', 2, true, 's1', 1000);
  assert.equal(SS.siguienteDia(p.workouts, p.sessions, names), 0);
});

test('Siguiente: una sesión registrada aunque esté incompleta cuenta como hecha', () => {
  const names = dayNamesOf(5), p = perfilVacio();
  registrarDia(p, names, 2, '2026-11-01', 1, false, 's1', 1000); // una sola serie, sin cerrar la sesión
  assert.equal(p.sessions.length, 0);
  assert.equal(SS.siguienteDia(p.workouts, p.sessions, names), 3);
  // También si solo existe su entrada en `sessions` (por ejemplo, con las series borradas después).
  const q = perfilVacio();
  registrarDia(q, names, 1, '2026-11-01', 2, true, 's2', 1000);
  q.workouts.length = 0;
  assert.equal(SS.siguienteDia(q.workouts, q.sessions, names), 2);
});

test('Siguiente: si el usuario elige otro día a mano, el siguiente se calcula desde el último registrado', () => {
  const names = dayNamesOf(5), p = perfilVacio();
  registrarDia(p, names, 0, '2026-11-01', 2, true, 's1', 1000);
  assert.equal(SS.siguienteDia(p.workouts, p.sessions, names), 1);
  registrarDia(p, names, 3, '2026-11-02', 2, true, 's2', 2000); // salta al Día 4
  assert.equal(SS.siguienteDia(p.workouts, p.sessions, names), 4);
  registrarDia(p, names, 1, '2026-11-03', 2, true, 's3', 3000); // vuelve a uno anterior
  assert.equal(SS.siguienteDia(p.workouts, p.sessions, names), 2);
});

test('Siguiente: la última se decide por fecha y hora, no por el orden en que están guardadas', () => {
  const names = dayNamesOf(6), p = perfilVacio();
  registrarDia(p, names, 4, '2026-11-05', 2, true, 'nueva', 5000);
  registrarDia(p, names, 1, '2026-11-01', 2, true, 'vieja', 9000); // se registró después en el array, pero es de una fecha anterior
  assert.equal(SS.siguienteDia(p.workouts, p.sessions, names), 5);
  // Mismo día: gana la de hora posterior.
  const q = perfilVacio();
  registrarDia(q, names, 2, '2026-11-05', 2, true, 'b', 8000);
  registrarDia(q, names, 0, '2026-11-05', 2, true, 'a', 1000); // guardada después, pero de una hora anterior
  assert.equal(SS.siguienteDia(q.workouts, q.sessions, names), 3);
  // El mismo caso con el orden de guardado invertido: el resultado no depende de cuál se guardó primero.
  const r = perfilVacio();
  registrarDia(r, names, 0, '2026-11-05', 2, true, 'a', 1000);
  registrarDia(r, names, 2, '2026-11-05', 2, true, 'b', 8000);
  assert.equal(SS.siguienteDia(r.workouts, r.sessions, names), 3);
});

test('Siguiente: es por perfil (cada uno usa sus propias sesiones)', () => {
  const names = dayNamesOf(5), a = perfilVacio(), b = perfilVacio();
  registrarDia(a, names, 3, '2026-11-01', 2, true, 'sa', 1000);
  registrarDia(b, names, 0, '2026-11-01', 2, true, 'sb', 1000);
  assert.equal(SS.siguienteDia(a.workouts, a.sessions, names), 4);
  assert.equal(SS.siguienteDia(b.workouts, b.sessions, names), 1);
  assert.equal(SS.siguienteDia(perfilVacio().workouts, perfilVacio().sessions, names), 0);
});

test('Siguiente: si cambia el split vuelve al Día 1', () => {
  const p = perfilVacio(), cinco = dayNamesOf(5);
  registrarDia(p, cinco, 2, '2026-11-01', 2, true, 's1', 1000);
  assert.equal(SS.siguienteDia(p.workouts, p.sessions, cinco), 3);
  [3, 4, 6].forEach(d => assert.equal(SS.siguienteDia(p.workouts, p.sessions, dayNamesOf(d)), 0, `${d} días`));
  // Si el split vuelve al original, la sesión registrada vuelve a valer.
  assert.equal(SS.siguienteDia(p.workouts, p.sessions, dayNamesOf(5)), 3);
});

test('Siguiente: los nombres de día de cada split son distintos entre splits (de eso depende detectar el cambio)', () => {
  const todos = [3, 4, 5, 6].map(dayNamesOf);
  todos.forEach((a, i) => todos.forEach((b, j) => { if (i !== j) a.forEach(n => assert.ok(!b.includes(n), `"${n}" se repite entre splits`)); }));
});
