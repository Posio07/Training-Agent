/* Motor de cálculo de NUTRICIÓN, MÉTRICAS, MEDIDAS OBJETIVO y TAMIZAJE DE SALUD.
 * Funciones puras: entrada = datos del perfil, salida = plan. Cada número que se
 * muestra al usuario lleva la clave de la fuente (KNOWLEDGE.SOURCES) que lo
 * respalda. Las reglas de seguridad propias de la app se marcan como "guardrail"
 * y se explican como tales en la interfaz.
 *
 * El entrenamiento NO vive acá: lo genera el núcleo nuevo (`js/core-v2/`), que el
 * corte conectó (DEC-023, B-039). Reorganizar este archivo es B-047.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./knowledge.js'));
  else root.ENGINE = factory(root.KNOWLEDGE);
})(typeof self !== 'undefined' ? self : this, function (K) {
  'use strict';

  const KCAL_PER_KG_FAT = 7700; // aproximación clásica (Wishnofsky 1958) usada en HELMS_NUT e IRAKI
  const LB_PER_KG = 2.20462;
  const CM_PER_IN = 2.54;

  const round = (v, d = 0) => { const m = Math.pow(10, d); return Math.round(v * m) / m; };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---------- Composición corporal ---------- */

  function bmrMifflin(sex, weightKg, heightCm, age) {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return sex === 'M' ? base + 5 : base - 161;
  }

  function bmrKatch(lbmKg) {
    return 370 + 21.6 * lbmKg;
  }

  /* Navy method, ecuaciones de densidad (unidades en cm) + Siri. */
  function bodyFatNavy(sex, heightCm, neckCm, waistCm, hipCm) {
    if (!(heightCm > 0) || !(neckCm > 0) || !(waistCm > 0)) return null;
    let density;
    if (sex === 'M') {
      if (waistCm - neckCm <= 0) return null;
      density = 1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm);
    } else {
      if (!(hipCm > 0) || waistCm + hipCm - neckCm <= 0) return null;
      density = 1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.22100 * Math.log10(heightCm);
    }
    const bf = 495 / density - 450;
    if (!isFinite(bf) || bf < 2 || bf > 60) return null;
    return bf;
  }

  function ffmi(lbmKg, heightCm) {
    const h = heightCm / 100;
    const raw = lbmKg / (h * h);
    return { raw, normalized: raw + 6.1 * (1.8 - h) };
  }

  function essentialFat(sex) { return sex === 'M' ? 5 : 13; } // ACE_BF, límite superior de "grasa esencial"

  function classicLimit(heightCm, overrideLb) {
    if (overrideLb > 0) return { lb: overrideLb, kg: overrideLb / LB_PER_KG, source: 'usuario' };
    const inches = heightCm / CM_PER_IN;
    const row = K.CLASSIC_WEIGHT_TABLE.find(r => inches <= r.maxHeightIn + 1e-9);
    if (!row) return null;
    return { lb: row.maxLb, kg: row.maxLb / LB_PER_KG, source: 'tabla orientativa 2023' };
  }

  /* ---------- Plan ---------- */

  function computeMetrics(p) {
    const warnings = [];
    const h = p.heightCm / 100;
    const bmi = p.weightKg / (h * h);

    let bodyFat = null, bfMethod = null;
    if (p.bodyFatPct > 0) {
      bodyFat = p.bodyFatPct; bfMethod = 'medido (DXA, plicometría, BIA…)';
      // DEC-004: si además hay circunferencias, se contrasta con el método
      // Navy (error típico ±3-4 %, Hodgdon & Beckett 1984). Una diferencia
      // grande (umbral de criterio de la app) sugiere un dato mal tomado.
      const navyCheck = bodyFatNavy(p.sex, p.heightCm, p.neckCm, p.waistCm, p.hipCm);
      if (navyCheck != null && Math.abs(navyCheck - bodyFat) > 4) {
        warnings.push({ level: 'warn', text: `El % de grasa indicado (${round(bodyFat, 1)} %) y el estimado por circunferencias (${round(navyCheck, 1)} %) difieren en más de 4 puntos. Revisa las medidas: se usa el valor indicado (${round(bodyFat, 1)} %) para el resto del plan.` });
      }
    } else {
      const navy = bodyFatNavy(p.sex, p.heightCm, p.neckCm, p.waistCm, p.hipCm);
      if (navy != null) { bodyFat = navy; bfMethod = 'estimado por circunferencias (Navy ±3-4 %)'; }
    }
    if (bodyFat == null) {
      bodyFat = p.sex === 'M' ? 18 : 26;
      bfMethod = 'supuesto por defecto (sin datos)';
      warnings.push({ level: 'warn', text: 'No indicaste % de grasa ni circunferencias de cuello/cintura(/cadera). Se usa un valor supuesto y el plan será menos preciso. Añade esas medidas para mejorar el cálculo.' });
    }

    const lbm = p.weightKg * (1 - bodyFat / 100);
    const fatMass = p.weightKg - lbm;
    const mifflin = bmrMifflin(p.sex, p.weightKg, p.heightCm, p.age);
    const katch = bmrKatch(lbm);
    const useKatch = bfMethod !== 'supuesto por defecto (sin datos)';
    const bmr = useKatch ? katch : mifflin;
    const act = K.ACTIVITY.find(a => a.id === p.activity) || K.ACTIVITY[2];
    const tdee = bmr * act.factor;
    const f = ffmi(lbm, p.heightCm);
    const whtr = p.waistCm > 0 ? p.waistCm / p.heightCm : null;

    if (p.age < 18) warnings.push({ level: 'danger', text: 'Menor de 18 años: las recomendaciones de preparación competitiva no están validadas en menores. Consulta a un médico deportivo.' });
    if (bmi < 17) warnings.push({ level: 'danger', text: 'IMC muy bajo. No se debe iniciar un déficit calórico sin supervisión médica.' });
    if (f.normalized > 25 && useKatch) warnings.push({ level: 'info', text: `FFMI normalizado ${round(f.normalized, 1)}: por encima del techo observado en atletas naturales (25,0). Revisa la medición de grasa; si es correcta, tu masa magra es excepcional.` });

    return {
      bmi, bodyFat, bfMethod, lbm, fatMass, bmrMifflin: mifflin, bmrKatch: katch, bmr,
      bmrMethod: useKatch ? 'KATCH' : 'MIFFLIN', activityFactor: act.factor, activityLabel: act.label,
      tdee, ffmi: f.raw, ffmiNormalized: f.normalized, whtr, warnings,
    };
  }

  function weeksBetween(fromIso, toIso) {
    const a = new Date(fromIso), b = new Date(toIso);
    if (isNaN(a) || isNaN(b)) return null;
    return (b - a) / (7 * 24 * 3600 * 1000);
  }

  function computeTargets(p, m, today) {
    const warnings = [];
    const div = K.DIVISIONS[p.division] || (p.sex === 'M' ? K.DIVISIONS.general_m : K.DIVISIONS.general_w);
    const essential = essentialFat(p.sex);

    let targetBf;
    if (p.targetBf > 0) targetBf = p.targetBf;
    else if (p.goal === 'cut') targetBf = (div.stageBf[0] + div.stageBf[1]) / 2;
    else if (p.goal === 'bulk') targetBf = Math.min(m.bodyFat + 3, p.sex === 'M' ? 15 : 25);
    else targetBf = m.bodyFat;

    if (targetBf < essential) {
      warnings.push({ level: 'danger', text: `Objetivo de ${targetBf} % de grasa está por debajo de la grasa esencial (${essential} %). Se ajusta al mínimo seguro.` });
      targetBf = essential;
    }

    // Peso objetivo asumiendo masa magra constante (en un cut real se pierde algo de masa magra; en bulk se gana).
    let targetWeight;
    if (p.goal === 'cut') targetWeight = m.lbm / (1 - targetBf / 100);
    else if (p.goal === 'bulk') targetWeight = m.lbm / (1 - targetBf / 100); // ganancia mixta hasta el techo de grasa off-season
    else targetWeight = p.weightKg;

    const delta = targetWeight - p.weightKg;

    // Ritmo semanal recomendado (% del peso corporal)
    let ratePct;
    if (p.goal === 'cut') {
      const lean = p.sex === 'M' ? m.bodyFat <= 10 : m.bodyFat <= 18;
      ratePct = p.level === 'advanced' || lean ? 0.5 : p.level === 'intermediate' ? 0.7 : 1.0;
    } else if (p.goal === 'bulk') {
      ratePct = p.level === 'advanced' ? 0.25 : p.level === 'intermediate' ? 0.35 : 0.5;
    } else ratePct = 0;

    let rateKg = p.weightKg * ratePct / 100;
    let weeksNeeded = rateKg > 0 ? Math.abs(delta) / rateKg : 0;
    let dateFeasible = null;

    if (p.targetDate && p.goal !== 'maintain') {
      const wk = weeksBetween(today, p.targetDate);
      if (wk != null && wk > 0) {
        const requiredPct = Math.abs(delta) / wk / p.weightKg * 100;
        const maxPct = p.goal === 'cut' ? 1.0 : 0.5;
        if (requiredPct > maxPct) {
          dateFeasible = false;
          warnings.push({ level: 'danger', text: `Para llegar en ${round(wk, 1)} semanas harían falta ${round(requiredPct, 2)} %/semana, por encima del máximo respaldado (${maxPct} %/semana). La fecha no es alcanzable de forma segura; se mantiene el ritmo máximo y se indica la fecha realista.` });
          ratePct = maxPct;
        } else {
          dateFeasible = true;
          ratePct = Math.max(requiredPct, p.goal === 'cut' ? 0.3 : 0.2);
          if (requiredPct < 0.3 && p.goal === 'cut') warnings.push({ level: 'info', text: 'Tienes tiempo de sobra: se usa un ritmo suave (0,3 %/semana) para conservar masa muscular. Puedes retrasar el inicio del déficit.' });
        }
        rateKg = p.weightKg * ratePct / 100;
        weeksNeeded = rateKg > 0 ? Math.abs(delta) / rateKg : 0;
      }
    }

    const est = new Date(today);
    est.setDate(est.getDate() + Math.ceil(weeksNeeded * 7));

    let classic = null;
    if (div.weightLimit === 'classic') {
      classic = classicLimit(p.heightCm, p.classicLimitLb);
      if (classic) {
        classic.status = targetWeight <= classic.kg ? 'ok' : 'over';
        classic.marginKg = classic.kg - targetWeight;
        if (classic.status === 'over') warnings.push({ level: 'warn', text: `Tu peso objetivo (${round(targetWeight, 1)} kg) supera el límite orientativo de Classic Physique para tu estatura (${round(classic.kg, 1)} kg / ${classic.lb} lb). Verifica el reglamento vigente; si sigue siendo superior, tendrías que bajar más grasa o considerar Bodybuilding.` });
      }
    }

    const waistMaxHealth = 0.5 * p.heightCm; // ASHWELL

    return {
      division: div, targetBf, targetWeight, delta, ratePct, rateKg, weeksNeeded,
      estimatedDate: est.toISOString().slice(0, 10), dateFeasible, classic, waistMaxHealth,
      targetLbm: m.lbm, targetFatMass: targetWeight - m.lbm, warnings,
    };
  }

  function computeNutrition(p, m, t) {
    const warnings = [];
    const sources = ['ISSN_DIET'];
    let calories, delta = 0, deltaLabel = 'mantenimiento';

    if (p.goal === 'cut') {
      delta = -(t.rateKg * KCAL_PER_KG_FAT / 7);
      sources.push('HELMS_NUT', 'ISSN_PROT');
      const maxDeficit = 0.30 * m.tdee; // guardrail de la app: no superar el 30 % del gasto
      if (-delta > maxDeficit) { delta = -maxDeficit; warnings.push({ level: 'warn', text: 'El déficit se limita al 30 % del gasto diario (regla de seguridad de la app). El ritmo de pérdida real será algo menor que el objetivo.' }); }
      deltaLabel = 'déficit';
    } else if (p.goal === 'bulk') {
      const pct = p.level === 'advanced' ? 0.10 : p.level === 'intermediate' ? 0.15 : 0.20;
      delta = m.tdee * pct;
      deltaLabel = `superávit ${Math.round(pct * 100)} %`;
      sources.push('IRAKI');
    } else {
      sources.push('IRAKI', 'ISSN_PROT');
    }
    calories = m.tdee + delta;

    if (calories < m.bmr) {
      warnings.push({ level: 'warn', text: `Las calorías se elevan a tu gasto en reposo (${Math.round(m.bmr)} kcal) como regla de seguridad de la app. Por debajo de ese nivel aumenta la pérdida de masa muscular y el riesgo de RED-S.` });
      calories = m.bmr;
      delta = calories - m.tdee;
    }

    // Proteína
    let proteinG, proteinRule;
    if (p.goal === 'cut') {
      proteinG = Math.max(2.7 * m.lbm, 1.8 * p.weightKg);
      proteinRule = '2,3-3,1 g por kg de masa magra (se usa 2,7)';
    } else {
      proteinG = 2.0 * p.weightKg;
      proteinRule = '1,6-2,2 g por kg de peso (se usa 2,0)';
    }

    // Grasa: 25 % de las kcal, dentro de 15-30 % (HELMS_NUT) y ≥0,5 g/kg (IRAKI)
    let fatG = 0.25 * calories / 9;
    let carbsG = (calories - proteinG * 4 - fatG * 9) / 4;
    if (carbsG < 1.0 * p.weightKg && p.goal === 'cut') {
      fatG = Math.max(0.20 * calories / 9, 0.5 * p.weightKg);
      carbsG = (calories - proteinG * 4 - fatG * 9) / 4;
    }
    if (fatG < 0.5 * p.weightKg) warnings.push({ level: 'info', text: 'La grasa queda por debajo de 0,5 g/kg; vigila la función hormonal y considera acortar la fase.' });
    if (carbsG < 0) { carbsG = 0; warnings.push({ level: 'danger', text: 'Las calorías no permiten cubrir proteína y grasa mínimas. Revisa los datos introducidos.' }); }
    if (p.goal === 'bulk' && carbsG < 3 * p.weightKg) warnings.push({ level: 'info', text: 'Carbohidratos por debajo de 3 g/kg en volumen: el rendimiento en el entrenamiento puede resentirse.' });

    const fiberG = 14 * calories / 1000; // FIBER
    const waterL = (p.sex === 'M' ? 2.5 : 2.0); // EFSA_WATER (DEC-019): ingesta ADECUADA de agua TOTAL (bebidas + alimentos), clima moderado y PAL 1,6; no es solo bebida ni un mínimo, y EFSA no cuantifica ningún ajuste por sudor
    const meals = p.goal === 'cut' ? 4 : 4;
    const proteinPerMeal = proteinG / meals;
    const perMealPerKg = proteinPerMeal / p.weightKg;

    return {
      calories: Math.round(calories), delta: Math.round(delta), deltaLabel, tdee: Math.round(m.tdee),
      protein: Math.round(proteinG), proteinRule, proteinPerKg: round(proteinG / p.weightKg, 2),
      fat: Math.round(fatG), fatPct: Math.round(fatG * 9 / calories * 100),
      carbs: Math.round(carbsG), carbsPerKg: round(carbsG / p.weightKg, 1),
      fiber: Math.round(fiberG), waterL,
      meals, proteinPerMeal: Math.round(proteinPerMeal), perMealPerKg: round(perMealPerKg, 2),
      timing: [
        `${meals} comidas al día con ~${Math.round(proteinPerMeal)} g de proteína cada una (0,40-0,55 g/kg por comida).`,
        'Una comida con proteína y carbohidrato 1-2 h antes de entrenar y otra en las 1-2 h posteriores.',
        p.goal === 'cut' ? 'Concentra la mayor parte de los carbohidratos alrededor del entrenamiento; en días de descanso puedes bajarlos 20-30 % y subir verduras.' : 'Reparte los carbohidratos de forma uniforme; sube un poco la ración pre y post entreno.',
        p.goal === 'cut' ? 'Cada 7-14 días una comida o día de "refeed" a mantenimiento con más carbohidrato ayuda a la adherencia (evidencia moderada, HELMS_NUT).' : 'Pésate 3-4 veces por semana en ayunas y ajusta ±100-150 kcal si el promedio semanal se sale del ritmo objetivo.',
      ],
      foodGuide: buildFoodGuide(p, Math.round(proteinG), Math.round(carbsG), Math.round(fatG)),
      sources: sources.concat(['FIBER', 'EFSA_WATER', 'SCHOENFELD_MEAL']), warnings,
    };
  }

  function buildFoodGuide(p, protein, carbs, fat) {
    // Equivalencias prácticas (valores promedio de tablas de composición de alimentos).
    return {
      protein: [
        `Pechuga de pollo o pavo: ~23 g proteína / 100 g cocido → ${Math.round(protein * 0.4 / 23 * 100)} g cubren el 40 %.`,
        'Pescado blanco, atún, clara de huevo, ternera magra, yogur griego 0 %, queso batido, tofu/tempeh, legumbres.',
        'Suero de leche solo para completar lo que falte.',
      ],
      carbs: [
        `Arroz, patata, boniato, avena, pasta, pan integral, fruta. Ejemplo: ${Math.round(carbs / 0.28)} g de arroz cocido aportarían todos los carbohidratos del día.`,
        '≥400 g/día de verduras y hortalizas para la fibra y la saciedad.',
      ],
      fat: [
        `Aceite de oliva virgen (10 g = 1 cucharada), frutos secos, aguacate, pescado azul, yema de huevo. ${fat} g/día ≈ ${round(fat / 10, 1)} cucharadas de aceite si toda la grasa viniera del aceite.`,
        'Incluye pescado azul 2 veces/semana o 1-2 g/día de EPA+DHA (recomendación general de salud).',
      ],
    };
  }

  /* ---------- DEC-009: tamizaje de salud ---------- */

  // PRINCIPIO RECTOR: esta función solo informa/bloquea según reglas con
  // respaldo cargado (ver DECISIONS.md). No inventa ajustes para
  // condiciones sin regla: esas quedan solo registradas, sin efecto.
  function computeHealthScreen(p) {
    const h = p.health;
    const warnings = [];
    const sources = [];

    // Capa 1 (ACSM / Riebe et al. 2015): el plan de la app se trata como
    // ejercicio de intensidad vigorosa a estos efectos.
    let blocked = false, blockReason = null, medicalClearanceRecommended = false;
    if (h.screening.symptoms || h.screening.cvMetabolicRenal) sources.push('RIEBE_2015');
    if (h.screening.symptoms) {
      blockReason = 'Indicaste tener síntomas de alarma (dolor en el pecho, falta de aire en reposo, mareo, palpitaciones u otros). Suspendé el ejercicio y consultá a un médico antes de continuar.';
      blocked = !h.screening.medicalClearance;
    } else if (h.screening.cvMetabolicRenal && !h.screening.regularExercise) {
      blockReason = 'Indicaste una condición cardiovascular, metabólica o renal y no entrenás de forma regular en los últimos 3 meses. Se recomienda autorización médica antes de empezar.';
      blocked = !h.screening.medicalClearance;
    } else if (h.screening.cvMetabolicRenal && h.screening.regularExercise) {
      medicalClearanceRecommended = true;
      warnings.push({ level: 'warn', text: 'Autorización médica recomendada antes de entrenar a intensidad vigorosa (vigente en los últimos 12 meses), por la condición cardiovascular, metabólica o renal indicada.' });
    }

    // Capa 2 (ADA/Colberg 2016, ACSM/Kanaley 2022): solo informa, nunca
    // cambia volumen, calorías ni ejercicios.
    let diabetesWarning = null, weightLossMedWarning = null;
    if (h.diabetes.type !== 'none' && h.diabetes.medication) {
      sources.push('COLBERG_2016', 'KANALEY_2022');
      diabetesWarning = 'Usás insulina u otro fármaco que baja la glucosa: hay riesgo de hipoglucemia asociada al ejercicio. Controlá tu glucosa antes y después de entrenar, llevá contigo un carbohidrato de acción rápida y reconocé los síntomas de hipoglucemia.';
      warnings.push({ level: 'warn', text: diabetesWarning });
      if (p.goal === 'cut') {
        weightLossMedWarning = 'La pérdida de peso en esta fase puede requerir ajustar tu medicación para la diabetes: consultalo con tu médico antes de empezar.';
        warnings.push({ level: 'warn', text: weightLossMedWarning });
      }
    }

    // Capa 3 (lesiones, DEC-011): no existe un marco validado para adaptar
    // una rutina a una lesión desde una app. Con CUALQUIER zona declarada
    // el plan queda en pausa hasta que el usuario confirme, zona por zona,
    // que un profesional lo autorizó a entrenar (se guarda con fecha en
    // `clearanceDate`). Recién entonces se muestra el plan, y la exclusión de
    // ejercicios (que aplica el núcleo nuevo al repartir) es solo una
    // precaución heurística E4, nunca una adaptación a la lesión.
    const injuries = h.injuries || [];
    if (injuries.length) sources.push('SILBERNAGEL_2007');
    const injuryLabel = zone => (K.INJURY_LABELS && K.INJURY_LABELS[zone]) || zone;
    const pendingZones = injuries.filter(i => !i.clearanceDate).map(i => i.zone);
    let injuryBlockReason = null;
    if (pendingZones.length) {
      blocked = true;
      injuryBlockReason = `Declaraste una lesión (${pendingZones.map(injuryLabel).join(', ')}). La app no puede adaptar una rutina a una lesión: no existe un marco validado para hacerlo desde una app. Consultá a un médico o fisioterapeuta antes de entrenar y, cuando un profesional te haya autorizado a entrenar con esa lesión, confirmalo para ver el plan.`;
    }
    injuries.forEach(inj => {
      const label = injuryLabel(inj.zone);
      warnings.push({ level: 'info', evidence: 'E4', text: `${label}: como precaución (E4, heurística), el plan evita algunos ejercicios que suelen cargar esta zona. No es una adaptación de la rutina a tu lesión ni reemplaza la indicación de tu profesional.` });
      if (!inj.diagnosed) warnings.push({ level: 'info', text: `${label}: te recomendamos una evaluación profesional.` });
    });
    const injuryClearance = { required: injuries.length > 0, pendingZones, evidence: 'E4' };

    const anyCondition = h.screening.cvMetabolicRenal || h.screening.symptoms || h.diabetes.type !== 'none' || injuries.length > 0;
    return {
      blocked, blockReason, injuryBlockReason, injuryClearance, medicalClearanceRecommended, diabetesWarning, weightLossMedWarning,
      injuries, anyCondition,
      disclaimer: anyCondition
        ? 'Estos avisos aplican posicionamientos científicos oficiales cuando existen y no reemplazan la valoración de un médico, fisioterapeuta o entrenador certificado.' +
          (injuries.length ? ' Para lesiones la app no adapta la rutina: solo evita algunos ejercicios de la zona como precaución (E4) una vez que un profesional te autorizó a entrenar.' : '')
        : null,
      warnings, sources: unique(sources),
    };
  }

  /* ---------- Plan completo ---------- */

  function buildPlan(profile, todayIso) {
    const today = todayIso || new Date().toISOString().slice(0, 10);
    const p = normalizeProfile(profile);
    const metrics = computeMetrics(p);
    const targets = computeTargets(p, metrics, today);
    const nutrition = computeNutrition(p, metrics, targets);
    const health = computeHealthScreen(p); // DEC-009: no cambia metrics/targets/nutrition.
    const supplements = K.SUPPLEMENTS.filter(s => p.goal !== 'bulk' || s.source !== 'HELMS_NUT');
    const warnings = [].concat(metrics.warnings, targets.warnings, nutrition.warnings, health.warnings);
    const sourcesUsed = unique([metrics.bmrMethod, 'NAVY', 'KOURI', 'ACE_BF', 'ASHWELL', 'ROSSOW', 'IFBB_RULES'].concat(nutrition.sources, supplements.map(s => s.source), health.sources));
    return {
      generatedAt: today, input: p, metrics, targets, nutrition, health, supplements, warnings, sourcesUsed,
      disclaimer: 'Esta app aplica recomendaciones publicadas en revisiones por pares y posicionamientos oficiales de sociedades científicas. No sustituye la valoración de un médico, un dietista-nutricionista colegiado ni un entrenador certificado. Ante enfermedad, embarazo, trastornos alimentarios o uso de fármacos, consulta antes de aplicar cualquier plan.',
    };
  }

  // DEC-009: reconstruye los datos de salud desde los campos planos del
  // formulario (mismo patrón que laggingMuscles/availablePlates: grupos de
  // checkboxes que comparten `name`, reunidos acá en listas/objetos).
  function normalizeHealth(src) {
    src = src || {};
    // normalizeProfile se llama tanto sobre datos frescos del formulario
    // (campos planos: healthSymptoms, diabetesType, injuryZones...) como
    // sobre un perfil YA normalizado y guardado (donde esos campos planos
    // no existen más: solo existe `health`, ya anidado). `diabetesType`
    // es un <select>, siempre viaja en el envío del formulario exista o
    // no cada checkbox marcado, así que sirve para distinguir ambos casos
    // sin depender de que algún checkbox en particular esté tildado.
    if (!('diabetesType' in src) && src.health) return src.health;
    const toList = v => Array.isArray(v) ? v : (v ? [v] : []);
    const validZones = (K.INJURY_ZONES || []);
    const zones = unique(toList(src.injuryZones).filter(z => validZones.indexOf(z) !== -1));
    const diagnosedSet = new Set(toList(src.injuryDiagnosed));
    const painSet = new Set(toList(src.injuryPainNow));
    // clearanceDate: el formulario nunca la envía; la fija la pantalla de
    // pausa al confirmar la autorización profesional y se conserva entre
    // ediciones con carryOverInjuryClearances (DEC-011).
    const injuries = zones.map(zone => ({ zone, diagnosed: diagnosedSet.has(zone), painNow: painSet.has(zone), clearanceDate: null }));
    const diabetesType = ['type1', 'type2'].indexOf(src.diabetesType) !== -1 ? src.diabetesType : 'none';
    return {
      screening: {
        regularExercise: !!src.healthRegularExercise,
        cvMetabolicRenal: !!src.healthCvMetabolicRenal,
        symptoms: !!src.healthSymptoms,
        medicalClearance: !!src.healthMedicalClearance,
      },
      diabetes: { type: diabetesType, medication: !!src.healthDiabetesMed },
      injuries,
    };
  }

  // DEC-011: al guardar el formulario se reconstruyen las lesiones desde los
  // campos planos y la autorización de cada zona se perdería. Se conserva la
  // fecha de las zonas que siguen declaradas; una zona nueva, o una que se
  // quitó y se volvió a agregar, vuelve a pedirla.
  function carryOverInjuryClearances(prevHealth, nextHealth) {
    const prev = {};
    ((prevHealth && prevHealth.injuries) || []).forEach(i => { if (i.clearanceDate) prev[i.zone] = i.clearanceDate; });
    return Object.assign({}, nextHealth, {
      injuries: (nextHealth.injuries || []).map(i => Object.assign({}, i, { clearanceDate: prev[i.zone] || i.clearanceDate || null })),
    });
  }

  // DEC-011 (re-autorización): conserva la fecha de autorización de las zonas
  // que siguen declaradas (carryOverInjuryClearances) y la INVALIDA en las que
  // empeoraron respecto de lo guardado antes de editar: el dolor actual subió
  // (de "sin dolor" a "con dolor") o el diagnóstico cambió (en cualquier
  // sentido). Si el dolor baja o no cambia nada, la autorización se mantiene.
  // Una zona invalidada vuelve a pasar por advertencia → derivación →
  // confirmación fechada, el mismo flujo de la primera vez.
  function reconcileInjuryClearances(prevHealth, nextHealth) {
    const carried = carryOverInjuryClearances(prevHealth, nextHealth);
    const was = {};
    ((prevHealth && prevHealth.injuries) || []).forEach(i => { was[i.zone] = i; });
    return Object.assign({}, carried, {
      injuries: carried.injuries.map(i => {
        const before = was[i.zone];
        const worsened = !!before && ((!!i.painNow && !before.painNow) || !!i.diagnosed !== !!before.diagnosed);
        // `clearanceInvalidated` marca las zonas que PERDIERON una autorización ya
        // dada porque empeoraron (la pantalla de pausa lo explica, a diferencia de
        // la primera autorización). Se mantiene mientras la zona siga sin confirmar.
        // Solo existe la clave cuando vale true.
        const reauth = worsened ? (!!before.clearanceDate || !!before.clearanceInvalidated) : (!!before && !!before.clearanceInvalidated && !i.clearanceDate);
        const next = worsened ? Object.assign({}, i, { clearanceDate: null }) : i;
        return reauth ? Object.assign({}, next, { clearanceInvalidated: true }) : next;
      }),
    });
  }

  // Zonas que hoy esperan una confirmación NUEVA porque empeoraron después de
  // haber sido autorizadas (no las que nunca se autorizaron).
  function zonesPendingReauthorization(health) {
    return ((health && health.injuries) || []).filter(i => i.clearanceInvalidated && !i.clearanceDate).map(i => i.zone);
  }

  /* ---------- DEC-009 (Privacidad): export e import sin datos de salud ---------- */

  // Campos planos del formulario que normalizeHealth sabe leer: un archivo
  // armado a mano o por otra versión podría traerlos en vez de `health`.
  const HEALTH_FORM_FIELDS = ['healthRegularExercise', 'healthCvMetabolicRenal', 'healthSymptoms', 'healthMedicalClearance', 'healthDiabetesMed', 'diabetesType', 'injuryZones', 'injuryDiagnosed', 'injuryPainNow'];

  function stripHealthFields(data) {
    const copy = Object.assign({}, data);
    delete copy.health;
    HEALTH_FORM_FIELDS.forEach(k => { delete copy[k]; });
    return copy;
  }

  function healthHasContent(h) {
    const s = (h && h.screening) || {}, d = (h && h.diabetes) || {};
    return !!(s.regularExercise || s.cvMetabolicRenal || s.symptoms || s.medicalClearance || (d.type && d.type !== 'none') || d.medication || ((h && h.injuries) || []).length);
  }

  // Copia del perfil lista para exportar: sin `health` (tamizaje, diabetes,
  // lesiones y fechas de autorización por zona), sin `painFlags` y sin el
  // dolor registrado en cada serie (`workouts[].pain`). Tampoco lleva `planGuardado` (core-v2): el plan trae las lesiones declaradas
  // (`perfil.zonas`), que son salud; al importar se regenera. No muta el original.
  function exportProfile(profile) {
    const out = {};
    Object.keys(profile).forEach(k => { if (k !== 'painFlags' && k !== 'planGuardado') out[k] = profile[k]; });
    out.data = stripHealthFields(profile.data || {});
    if (Array.isArray(profile.workouts)) out.workouts = profile.workouts.map(w => { const c = Object.assign({}, w); delete c.pain; return c; });
    return JSON.parse(JSON.stringify(out));
  }

  // B-001 / DEC-018: restaura el entrenamiento registrado de un item importado. El export lleva `workouts` y
  // `sessions` (sin el dolor por serie, DEC-009) y el import los descartaba: un ciclo export -> import perdía todo el
  // entrenamiento. Se descartan las filas mal formadas y SIEMPRE se quita `pain` (un archivo de otra versión podría
  // traerlo; DEC-009: el dolor no entra al perfil por el import). Si una fila trae `profileId`, se remapea al perfil
  // nuevo (el import siempre crea un perfil nuevo con id nuevo). `droppedPain` avisa si se descartó algún dolor.
  function importedTraining(item, newProfileId) {
    const isRow = x => !!x && typeof x === 'object' && !Array.isArray(x) && typeof x.sessionId === 'string' && x.sessionId !== '';
    // DEC-023: una serie sin `setKey` (anterior a DEC-015) ya no se puede editar ni borrar, así que no se importa.
    const esSerie = x => isRow(x) && typeof x.setKey === 'string' && x.setKey !== '';
    const remap = row => { const c = Object.assign({}, row); if ('profileId' in c && newProfileId) c.profileId = newProfileId; return c; };
    let droppedPain = false;
    const workouts = (Array.isArray(item.workouts) ? item.workouts : []).filter(esSerie).map(w => {
      const c = remap(w);
      if (c.pain != null) droppedPain = true;
      delete c.pain;
      return c;
    });
    const sessions = (Array.isArray(item.sessions) ? item.sessions : []).filter(isRow).map(remap);
    return { workouts, sessions, droppedPain };
  }

  // Arma el perfil a guardar desde un item importado. Ignora (y no guarda)
  // `health`, los campos planos de salud y `painFlags`, también en archivos
  // exportados por la versión anterior que sí los incluían. `droppedHealth`
  // avisa si el archivo traía algo de salud con contenido (o dolor por serie).
  // B-001: también restaura `workouts` y `sessions` (sin dolor), con `profileId` remapeado a `newProfileId`.
  function prepareImportedProfile(item, today, newProfileId) {
    const training = importedTraining(item, newProfileId);
    const droppedHealth = healthHasContent(normalizeHealth(item.data)) || !!(item.painFlags && Object.keys(item.painFlags).length) || training.droppedPain;
    return {
      createdAt: item.createdAt || today, updatedAt: today,
      data: normalizeProfile(stripHealthFields(item.data)),
      log: Array.isArray(item.log) ? item.log : [],
      workouts: training.workouts, sessions: training.sessions,
      droppedHealth,
    };
  }

  // Perfiles locales con lesiones declaradas que se parecen al que se va a
  // importar (mismo id de exportación o mismo nombre). El import siempre crea
  // un perfil NUEVO, así que no pisa nada, pero el nuevo queda sin lesiones y
  // conviene avisarlo antes.
  function localHealthConflicts(localProfiles, item) {
    const name = ((item.data && item.data.name) || '').toString().trim();
    return localProfiles.filter(p => (p.id === item.id || p.data.name === name) && ((p.data.health && p.data.health.injuries) || []).length > 0);
  }

  function normalizeProfile(src) {
    const n = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
    const sex = src.sex === 'F' ? 'F' : 'M';
    let division = src.division;
    if (!K.DIVISIONS[division] || K.DIVISIONS[division].sex !== sex) division = sex === 'M' ? 'general_m' : 'general_w';
    const validMuscles = Object.keys(K.MUSCLE_LABELS);
    const laggingRaw = Array.isArray(src.laggingMuscles) ? src.laggingMuscles : (src.laggingMuscles ? [src.laggingMuscles] : []);
    const laggingMuscles = unique(laggingRaw.filter(m => validMuscles.includes(m)));
    return {
      name: (src.name || 'Perfil').toString().trim(),
      sex, age: n(src.age), heightCm: n(src.heightCm), weightKg: n(src.weightKg),
      bodyFatPct: n(src.bodyFatPct), neckCm: n(src.neckCm), waistCm: n(src.waistCm), hipCm: n(src.hipCm),
      activity: src.activity || 'moderate',
      level: ['novice', 'intermediate', 'advanced'].includes(src.level) ? src.level : 'intermediate',
      daysPerWeek: n(src.daysPerWeek) || 4,
      division, goal: ['cut', 'bulk', 'maintain'].includes(src.goal) ? src.goal : 'cut',
      targetDate: src.targetDate || '', targetBf: n(src.targetBf), classicLimitLb: n(src.classicLimitLb),
      laggingMuscles, healthGoal: !!src.healthGoal,
      barbellRow: !!src.barbellRow, // DEC-022: el remo con barra solo entra si el usuario lo elige
      health: normalizeHealth(src), // DEC-009
      // Fase 5: ajustes de la barra cargada. No participan de ningún cálculo
      // de volumen/calorías/selección de ejercicios, solo de la vista de
      // discos del modo sesión.
      plateUnit: src.plateUnit === 'lb' ? 'lb' : 'kg',
      barWeight: (() => { const w = parseFloat(src.barWeight); return w > 0 ? w : (src.plateUnit === 'lb' ? 45 : 20); })(),
      availablePlates: Array.isArray(src.availablePlates) && src.availablePlates.length
        ? src.availablePlates.map(Number).filter(n => n > 0)
        : (src.plateUnit === 'lb' ? [55, 45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25]),
    };
  }

  function validateProfile(src) {
    const p = normalizeProfile(src);
    const errors = [];
    if (!p.name) errors.push('Pon un nombre al perfil.');
    if (!(p.age >= 14 && p.age <= 90)) errors.push('Edad entre 14 y 90 años.');
    if (!(p.heightCm >= 130 && p.heightCm <= 230)) errors.push('Estatura entre 130 y 230 cm.');
    if (!(p.weightKg >= 35 && p.weightKg <= 250)) errors.push('Peso entre 35 y 250 kg.');
    if (p.bodyFatPct && !(p.bodyFatPct >= 3 && p.bodyFatPct <= 60)) errors.push('% de grasa entre 3 y 60.');
    if (p.targetBf && !(p.targetBf >= 3 && p.targetBf <= 40)) errors.push('% de grasa objetivo entre 3 y 40.');
    return errors;
  }

  function unique(arr) { return arr.filter((v, i) => v && arr.indexOf(v) === i); }

  return { bmrMifflin, bmrKatch, bodyFatNavy, ffmi, computeHealthScreen, buildPlan, normalizeProfile, validateProfile, carryOverInjuryClearances, reconcileInjuryClearances, zonesPendingReauthorization, exportProfile, prepareImportedProfile, localHealthConflicts };
});
