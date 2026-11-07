/* Motor de cálculo. Funciones puras: entrada = datos del perfil, salida = plan.
 * Cada número que se muestra al usuario lleva la clave de la fuente
 * (KNOWLEDGE.SOURCES) que lo respalda. Las reglas de seguridad propias de la
 * app se marcan como "guardrail" y se explican como tales en la interfaz.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./knowledge.js'));
  else root.ENGINE = factory(root.KNOWLEDGE);
})(typeof self !== 'undefined' ? self : this, function (K) {
  'use strict';

  const KCAL_PER_KG_FAT = 7700; // aproximación clásica (Wishnofsky 1958) usada en HELMS_NUT e IRAKI
  const LB_PER_KG = 2.20462;
  const CM_PER_IN = 2.54;

  // DEC-010: valores de reglas centralizados en knowledge.js (VALIDATOR_RULES).
  const SET_EXEC_SEC = K.VALIDATOR_RULES.setExecutionSeconds.value;
  const FUNCTIONAL_LABEL = 'Funcional';

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

  /* ---------- Entrenamiento ---------- */

  // DEC-003 v2: solo los grupos GRANDES tienen día fijo acá. Los chicos
  // (abdomen, pantorrillas, bíceps, tríceps) se asignan al generar el plan,
  // según qué día de cada categoría tenga menos series (ver computeTraining).
  // category: 'full' (cuerpo completo), 'torso', 'legs', 'push', 'pull'.
  const SPLITS = {
    3: { name: 'Cuerpo completo ×3', days: [
      { name: 'Día 1 · Full body A', muscles: ['quads', 'chest', 'back', 'shoulders', 'hamstrings'], category: 'full' },
      { name: 'Día 2 · Full body B', muscles: ['hamstrings', 'glutes', 'back', 'chest'], category: 'full' },
      { name: 'Día 3 · Full body C', muscles: ['quads', 'shoulders', 'back', 'chest', 'glutes'], category: 'full' },
    ] },
    4: { name: 'Torso / Pierna ×2', days: [
      { name: 'Día 1 · Torso A', muscles: ['chest', 'back', 'shoulders'], category: 'torso' },
      { name: 'Día 2 · Pierna A', muscles: ['quads', 'hamstrings', 'glutes'], category: 'legs' },
      { name: 'Día 3 · Torso B', muscles: ['back', 'chest', 'shoulders'], category: 'torso' },
      { name: 'Día 4 · Pierna B', muscles: ['hamstrings', 'glutes', 'quads'], category: 'legs' },
    ] },
    5: { name: 'Torso / Pierna / Empuje / Tirón / Pierna', days: [
      { name: 'Día 1 · Torso', muscles: ['chest', 'back', 'shoulders'], category: 'torso' },
      { name: 'Día 2 · Pierna', muscles: ['quads', 'hamstrings', 'glutes'], category: 'legs' },
      { name: 'Día 3 · Empuje', muscles: ['chest', 'shoulders'], category: 'push' },
      { name: 'Día 4 · Tirón', muscles: ['back', 'shoulders'], category: 'pull' },
      { name: 'Día 5 · Pierna', muscles: ['glutes', 'hamstrings', 'quads'], category: 'legs' },
    ] },
    6: { name: 'Empuje / Tirón / Pierna ×2', days: [
      { name: 'Día 1 · Empuje A', muscles: ['chest', 'shoulders'], category: 'push' },
      { name: 'Día 2 · Tirón A', muscles: ['back', 'shoulders'], category: 'pull' },
      { name: 'Día 3 · Pierna A', muscles: ['quads', 'hamstrings', 'glutes'], category: 'legs' },
      { name: 'Día 4 · Empuje B', muscles: ['shoulders', 'chest'], category: 'push' },
      { name: 'Día 5 · Tirón B', muscles: ['back', 'shoulders'], category: 'pull' },
      { name: 'Día 6 · Pierna B', muscles: ['glutes', 'hamstrings', 'quads'], category: 'legs' },
    ] },
  };
  const SMALL_MUSCLES_LIST = ['abs', 'calves', 'biceps', 'triceps'];
  // Compatibilidad de cada grupo chico con la categoría del día (DEC-003 v2).
  const SMALL_COMPAT = {
    abs: () => true,
    calves: () => true,
    biceps: cat => ['torso', 'pull', 'full'].includes(cat),
    triceps: cat => ['torso', 'push', 'full'].includes(cat),
  };

  // DEC-009 · Capa 3: filtra el catálogo de un grupo muscular según las
  // zonas de lesión declaradas (K.INJURY_EXCLUSIONS, documentado en
  // DECISIONS.md). Sin lesiones declaradas, devuelve el catálogo tal cual
  // (mismo comportamiento que antes de DEC-009). Un ejercicio marcado
  // `injuryOnly: 'zona'` solo entra en el catálogo cuando esa zona está
  // declarada (es el caso del sustituto de press de hombro).
  function filterLibByInjuries(lib, muscle, zones) {
    zones = zones || [];
    // Sin excluir nada, igual hay que sacar los ejercicios `injuryOnly`:
    // solo deben aparecer cuando esa zona está declarada.
    const excluded = new Set();
    zones.forEach(z => {
      const map = K.INJURY_EXCLUSIONS && K.INJURY_EXCLUSIONS[z];
      if (map && map[muscle]) map[muscle].forEach(pat => excluded.add(pat));
    });
    return lib.filter(ex => {
      if (excluded.has(ex.pattern)) return false;
      if (ex.injuryOnly && zones.indexOf(ex.injuryOnly) === -1) return false;
      return true;
    });
  }

  // DEC-008: multiarticulares bilaterales con carga libre o guiada pesada
  // (ACSM 2009, cargas ≥80% 1RM para fuerza). Lista cerrada a propósito:
  // sentadilla trasera/hack, press banca, press militar, peso muerto
  // rumano, remo con barra, dominadas. Nunca unilaterales ni máquinas de
  // press (por eso "chest_dip_or_machine" y "leg_press" no están).
  const TOPSET_ELIGIBLE_PATTERNS = new Set([
    'squat_bilateral', 'bench_press', 'shoulder_press', 'hinge', 'row_barbell', 'vertical_pull',
  ]);

  // DEC-010: campos de identidad y aporte de un ejercicio del catálogo.
  // `bucket` = dónde vive (día, rotación, lesiones); `muscle` = primario real
  // según la tabla de aporte (null si no suma volumen de hipertrofia).
  function exerciseFields(ex, bucket) {
    const c = K.EXERCISE_CONTRIBUTION[ex.id];
    return {
      exerciseId: ex.id, bucket, muscle: c.primary,
      muscleLabel: c.primary ? K.MUSCLE_LABELS[c.primary] : FUNCTIONAL_LABEL,
      secondary: c.secondary.slice(),
      setWeights: Object.assign({}, c.setWeights), // DEC-014: aporte de UNA serie por músculo (fraccionado)
    };
  }
  function makeEntry(ex, bucket, sets) {
    const entry = Object.assign(exerciseFields(ex, bucket), {
      name: ex.name, type: ex.type, pattern: ex.pattern || ex.name, unilateral: !!ex.unilateral, sets,
      reps: `${ex.reps[0]}-${ex.reps[1]}`, rir: ex.type === 'compound' ? '2-3' : '1-2', rest: ex.type === 'compound' ? '2-3 min' : '60-90 s',
    });
    // DEC-011: un ejercicio que solo entra por una lesión declarada es una
    // precaución heurística (E4), no una adaptación validada.
    if (ex.injuryOnly) entry.injurySubstitute = { zone: ex.injuryOnly, evidence: 'E4' };
    // DEC-022: indicación breve del catálogo (p. ej. preferir el curl femoral sentado, E4).
    if (ex.cue) entry.cue = { text: ex.cue, evidence: 'E4' };
    return entry;
  }

  // DEC-006 (corregido): la "familia" de un ejercicio es su id de patrón
  // explícito del catálogo (knowledge.js), no el texto de su nombre. Antes
  // se agrupaba por palabras del nombre y eso mezclaba por error ejercicios
  // distintos que compartían una palabra (p. ej. "fondos" aparecía tanto en
  // un ejercicio de pecho como en uno de tríceps).
  function basePattern(ex) {
    return ex && ex.pattern ? ex.pattern : (ex && ex.name); // sin id: el propio nombre es su patrón
  }
  // Si el candidato ya se usó ese día, busca en la misma lista la siguiente
  // opción que no choque. Si todas chocan, se permite el duplicado (no hay
  // alternativa real para ese músculo ese día).
  function resolvePick(candidate, lib, usedPatterns) {
    if (!usedPatterns.has(basePattern(candidate))) return candidate;
    const startIdx = lib.indexOf(candidate);
    for (let step = 1; step <= lib.length; step++) {
      const alt = lib[(startIdx + step) % lib.length];
      if (!usedPatterns.has(basePattern(alt))) return alt;
    }
    return candidate;
  }
  // Resuelve colisiones dentro de un mismo conjunto de picks para un día,
  // en orden, y deja el set de patrones usados actualizado.
  function dedupPicks(picks, lib, dayExercises) {
    const used = new Set(dayExercises.map(e => e.pattern || e.name));
    return picks.map(ex => {
      const resolved = resolvePick(ex, lib, used);
      used.add(basePattern(resolved));
      return resolved;
    });
  }

  /* ---------- DEC-022 · Fase 3, Paso 2: A3 (sentadilla pesada y bisagra pesada en días distintos) y A1 (orden) ---------- */

  // Sentadilla pesada = patrón squat_bilateral con demanda lumbar alta; bisagra pesada = patrón hinge con demanda lumbar alta
  // (perfil articular, DEC-021). La búlgara, la prensa y el hip thrust no cuentan: son lumbar media o baja.
  function heavyKind(id, pattern) {
    const prof = K.JOINT_PROFILE[id];
    if (!prof || !prof.lumbar || prof.lumbar.nivel !== 'alta') return null;
    // El remo con barra (bisagra sostenida, regla 2 del criterio) cuenta como bisagra pesada; solo aparece si el usuario lo elige.
    return pattern === 'squat_bilateral' ? 'squat' : (pattern === 'hinge' || pattern === 'row_barbell') ? 'hinge' : null;
  }
  // DEC-022: el remo con barra es opcional; sin esa elección el remo del plan es el de apoyo de pecho (misma posición de la rotación).
  function applyRowChoice(lib, barbellRow) { return lib.filter(e => (barbellRow ? !e.defaultOnly : !e.optIn)); }
  // A3: ¿agregar `cand` (entrada del plan o del catálogo) a `dayExercises` juntaría la sentadilla y la bisagra pesadas?
  function violatesA3(dayExercises, cand) {
    if (!K.VALIDATOR_RULES.hingeSquatSeparation.value) return false;
    const kind = heavyKind(cand.exerciseId || cand.id, cand.pattern);
    if (!kind) return false;
    const other = kind === 'squat' ? 'hinge' : 'squat';
    return dayExercises.some(e => heavyKind(e.exerciseId, e.pattern) === other);
  }
  // A1: orden de cada sesión por demanda. Primero lo de lumbar alta (con la espalda descansada), luego los
  // multiarticulares y al final los aislamientos; el hip thrust (lumbar media) va al final de los multiarticulares.
  // Estable: dentro de cada grupo se conserva el orden del generador. Solo reordena; no cambia series ni ejercicios.
  function orderByDemand(sessions) {
    if (!K.VALIDATOR_RULES.sessionOrderByDemand.value) return;
    const group = e => {
      const prof = K.JOINT_PROFILE[e.exerciseId];
      if (prof && prof.lumbar && prof.lumbar.nivel === 'alta') return 0;
      if (e.type === 'isolation') return 3;
      return e.pattern === 'hip_thrust' ? 2 : 1;
    };
    sessions.forEach(s => {
      s.exercises = s.exercises.map((e, i) => ({ e, i, g: group(e) })).sort((a, b) => a.g - b.g || a.i - b.i).map(x => x.e);
    });
  }

  const EMPHASIS_MAP = {
    bodybuilding_m: { up: ['back', 'quads'], down: [] },
    classic_m: { up: ['shoulders', 'back', 'quads'], down: [] },
    physique_m: { up: ['shoulders', 'back', 'abs'], down: ['quads', 'hamstrings', 'glutes'] },
    physique_w: { up: ['shoulders', 'back', 'quads'], down: [] },
    figure_w: { up: ['shoulders', 'back', 'glutes'], down: [] },
    bikini_w: { up: ['glutes', 'hamstrings', 'shoulders'], down: ['quads', 'chest', 'biceps', 'triceps'] },
    wellness_w: { up: ['glutes', 'quads', 'hamstrings'], down: ['chest', 'shoulders', 'biceps', 'triceps'] },
    general_m: { up: [], down: [] },
    general_w: { up: [], down: [] },
  };

  /* ---------- DEC-014: conteo fraccionado, regla E4 y aviso de rendimiento decreciente ---------- */

  // Series fraccionadas por músculo de una lista de ejercicios (Pelland et al. 2026):
  // sets × peso de la serie (directa 1, indirecta 0,5; ninguna y a_verificar 0).
  function fractionalByMuscle(exercises) {
    const out = {};
    exercises.forEach(e => {
      Object.keys(e.setWeights || {}).forEach(mu => { out[mu] = (out[mu] || 0) + e.sets * e.setWeights[mu]; });
    });
    Object.keys(out).forEach(mu => { out[mu] = Math.round(out[mu] * 100) / 100; });
    return out;
  }
  const sumFractional = sessions => sessions.reduce((acc, s) => {
    const f = fractionalByMuscle(s.exercises);
    Object.keys(f).forEach(mu => { acc[mu] = (acc[mu] || 0) + f[mu]; });
    return acc;
  }, {});

  // R1 (DEC-014): aviso de rendimiento decreciente por músculo por sesión. E3, preprint
  // sin revisión por pares (Remmert et al.). NO es un tope: no recorta nada.
  function diminishingReturnsWarnings(sessions) {
    const r1 = K.VALIDATOR_RULES.maxFractionalSetsPerMuscleSession.value;
    const out = [];
    sessions.forEach(s => {
      const f = s.fractionalSets || fractionalByMuscle(s.exercises);
      Object.keys(f).filter(mu => f[mu] > r1).forEach(mu => {
        out.push({ level: 'info', evidence: 'E3', rule: 'R1', session: s.name, muscle: mu, fractionalSets: f[mu], text: `${s.name}: ${K.MUSCLE_LABELS[mu]} suma ${f[mu]} series fraccionadas, por encima de ~${r1}. Aviso de rendimiento decreciente, no un límite: por encima de ese punto no se detectó mejora adicional (Remmert et al., preprint sin revisión por pares, E3). Conteo: directa = 1 e indirecta = 0,5 (convención de Pelland et al. 2026; un análisis exploratorio sugiere ~0,32). Si tu frecuencia lo permite, reparte esas series en otro día.` });
      });
    });
    return out;
  }

  // DEC-017 (ajuste) · piso semanal por grupo. Un grupo con énfasis reducido por la división (DEC-001, ×0,5) y que
  // no es rezagado (un rezagado anula el énfasis) usa el piso de mantenimiento = piso × maintenanceFloorFactor
  // (5); los demás usan el piso completo (10).
  function weeklyFloors(emph, lagging) {
    const full = K.VALIDATOR_RULES.minWeeklySetsPerMuscle.value;
    const factor = K.VALIDATOR_RULES.maintenanceFloorFactor.value;
    const floors = {};
    Object.keys(K.MUSCLE_LABELS).forEach(mu => { floors[mu] = (emph.down || []).includes(mu) && !lagging.has(mu) ? full * factor : full; });
    return floors;
  }

  // DEC-016 · aceptación del tope E4, acotada. La aceptación queda ligada a la firma del plan
  // (días, división, objetivo, rezagados y nivel) y al máximo de series por sesión que el usuario
  // vio y aceptó. Si cambia la firma, o alguna sesión generada supera ese máximo, deja de valer y
  // se vuelve a pedir. No vence por fecha.
  const SIGNATURE_LABELS = { dias: 'los días por semana', division: 'la división', objetivo: 'el objetivo', rezagados: 'los grupos rezagados', nivel: 'el nivel' };
  function planSignature(p) {
    const days = clamp(Math.round(p.daysPerWeek) || 4, 3, 6);
    const lag = unique(p.laggingMuscles || []).slice().sort().join(',');
    return `dias=${days};division=${p.division};objetivo=${p.goal};rezagados=${lag};nivel=${p.level}`;
  }
  const signatureParts = sig => String(sig || '').split(';').reduce((o, kv) => { const i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); return o; }, {});
  const changedSignatureParts = (a, b) => { const x = signatureParts(a), y = signatureParts(b); return Object.keys(SIGNATURE_LABELS).filter(k => x[k] !== y[k]).map(k => SIGNATURE_LABELS[k]); };
  const maxSessionSets = sessions => sessions.reduce((m, s) => Math.max(m, s.exercises.reduce((a, e) => a + e.sets, 0)), 0);

  // Decide si la aceptación guardada sigue valiendo para el plan que se acaba de generar (sin recortar).
  // Devuelve null si no hay aceptación. `longSessionAcceptedOn` suelto es el formato anterior, aún sin
  // migrar: se toma como válido contra el plan vigente (firma y máximo de este mismo plan).
  function resolveAcceptance(p, signature, maxSets) {
    const a = p.longSessionAcceptance;
    if (a) {
      if (a.signature !== signature) return { valid: false, reason: 'firma', previous: a };
      if (maxSets > a.maxSets) return { valid: false, reason: 'maximo', previous: a };
      return { valid: true, on: a.on, signature: a.signature, maxSets: a.maxSets };
    }
    if (p.longSessionAcceptedOn) return { valid: true, legacy: true, on: p.longSessionAcceptedOn, signature, maxSets };
    return null;
  }

  // Migración: pasa `longSessionAcceptedOn` (solo fecha) al formato acotado. La firma y el máximo se
  // toman del plan vigente al momento de migrar (que, con la aceptación vieja, sale sin recortes).
  // Devuelve los mismos datos si no hay nada que migrar. No muta el argumento.
  function migrateLongSessionAcceptance(data, today) {
    if (!data || data.longSessionAcceptance || !/^\d{4}-\d{2}-\d{2}$/.test(data.longSessionAcceptedOn || '')) return data;
    const plan = buildPlan(data, today);
    const proposed = plan.training.sessionLimit.proposed;
    return Object.assign({}, data, {
      longSessionAcceptedOn: '',
      longSessionAcceptance: { on: data.longSessionAcceptedOn, signature: proposed.signature, maxSets: proposed.maxSets },
    });
  }

  // Regla E4 (DEC-014): tope de series por sesión. Se aplica al GENERAR, antes del
  // top set y de la duración. Solo recorta aislamientos (nunca multiarticulares),
  // primero los de grupos chicos, y nunca baja un grupo mayor por debajo del piso
  // semanal de R2 (E1, en series fraccionadas y en series reales): si no se puede, la sesión queda por encima y
  // se avisa. Con `accepted` (aceptación explícita del usuario) no se recorta nada.
  function enforceSessionCap(sessions, accepted, floors) {
    const cap = K.VALIDATOR_RULES.sessionSetCap.value;
    const floorWeekly = K.VALIDATOR_RULES.minWeeklySetsPerMuscle.value;
    const info = { cap, level: 'E4', basis: 'Convención de la app (DEC-003 v2 / DEC-014), sin fuente externa', accepted: accepted || null, trimmed: [], overCap: [], acceptance: null, acceptanceInvalidated: null, proposed: null };
    const weekly = sumFractional(sessions);
    const floor = {};
    const floorOf = mu => (floors && floors[mu] != null ? floors[mu] : floorWeekly);
    K.MAJOR_GROUPS.forEach(mu => { floor[mu] = Math.min(floorOf(mu), weekly[mu] || 0); });
    // El piso también protege las series reales del grupo (no solo las fraccionadas): una relación
    // a_verificar cuenta 0 en el conteo, pero sus series existen y no se descartan por eso.
    const plain = {};
    sessions.forEach(s => s.exercises.forEach(e => { plain[e.bucket] = (plain[e.bucket] || 0) + e.sets; }));
    const plainFloor = {};
    K.MAJOR_GROUPS.forEach(mu => { plainFloor[mu] = Math.min(floorOf(mu), plain[mu] || 0); });
    const tier = e => (SMALL_MUSCLES_LIST.includes(e.bucket) ? 0 : 1);
    if (!accepted) {
      const before = sessions.map(s => s.totalSets);
      const cuts = sessions.map(() => new Map());
      const total = s => s.exercises.reduce((a, e) => a + e.sets, 0);
      const stuck = new Set();
      for (;;) {
        // Siempre se recorta la sesión más pasada: así el margen del piso semanal se gasta donde más hace falta.
        const idx = sessions.map((s, i) => i).filter(i => !stuck.has(i) && total(sessions[i]) > cap)
          .sort((a, b) => (total(sessions[b]) - cap) - (total(sessions[a]) - cap) || a - b)[0];
        if (idx === undefined) break;
        const s = sessions[idx];
        const fits = e => !(e.bucket in plainFloor && plain[e.bucket] - (e.sets > 2 ? 1 : 2) < plainFloor[e.bucket]) && Object.keys(e.setWeights).every(mu => !(mu in floor) || weekly[mu] - e.setWeights[mu] * (e.sets > 2 ? 1 : 2) >= floor[mu] - 1e-9);
        const pool = s.exercises.filter(e => e.type === 'isolation' && e.sets > 0 && fits(e))
          .sort((a, b) => (tier(a) - tier(b)) || (b.sets - a.sets));
        if (!pool.length) { stuck.add(idx); continue; }
        const e = pool[0];
        const step = e.sets > 2 ? 1 : 2; // por debajo de 2 series el ejercicio se quita entero
        e.sets -= step;
        plain[e.bucket] -= step;
        Object.keys(e.setWeights).forEach(mu => { weekly[mu] = (weekly[mu] || 0) - e.setWeights[mu] * step; });
        cuts[idx].set(e.exerciseId, (cuts[idx].get(e.exerciseId) || 0) + step);
      }
      sessions.forEach((s, i) => {
        s.exercises = s.exercises.filter(e => e.sets > 0);
        s.totalSets = total(s);
        if (s.totalSets !== before[i]) {
          info.trimmed.push({ session: s.name, from: before[i], to: s.totalSets, cuts: [...cuts[i]].map(([exerciseId, sets]) => ({ exerciseId, sets })) });
        }
      });
    }
    sessions.forEach(s => { if (s.totalSets > cap) info.overCap.push({ session: s.name, sets: s.totalSets }); });
    return info;
  }

  // DEC-017 · completar hasta el piso DENTRO del tope. La otra mitad del piso semanal: si un grupo mayor
  // queda bajo 10 series fraccionadas semanales y hay sesiones con espacio bajo el tope E4, se agregan series
  // de ese grupo en esas sesiones hasta llegar al piso o hasta llenar el espacio. Nunca pasa de `cap`.
  //  - Prioridad: el grupo con mayor déficit primero y, dentro del grupo, la sesión con más espacio.
  //  - Solo en sesiones donde el split ya entrena ese grupo (compatibilidad por día). Una sesión que el tope E4
  //    recortó puede quedar con espacio (el recorte se hace de a 1 o 2 series): ese espacio se puede usar.
  //  - Primero series extra de ejercicios que ya están en el plan y que suman 1 (directa) al grupo; la que
  //    tenga menos series, para repartir. Solo si ninguna sesión lo permite, un ejercicio nuevo (2 series),
  //    elegido del catálogo ya filtrado por lesiones (DEC-009 / DEC-011) y sin repetir patrón en el día (DEC-006).
  //  - No lleva a ningún músculo por encima del umbral de R1 en una sesión (11 fraccionadas): sería crear el aviso.
  //  - Si el déficit no cabe, el grupo queda como estaba y sigue el aviso de grupos bajo el mínimo.
  function completeToFloor(sessions, splitDays, injuryZones, cap, floors, barbellRow) {
    const fullFloor = K.VALIDATOR_RULES.minWeeklySetsPerMuscle.value;
    const floorOf = mu => (floors && floors[mu] != null ? floors[mu] : fullFloor);
    const r1 = K.VALIDATOR_RULES.maxFractionalSetsPerMuscleSession.value;
    const direct = K.VALIDATOR_RULES.directSetWeight.value;
    const EPS = 1e-9;
    const total = s => s.exercises.reduce((a, e) => a + e.sets, 0);
    const room = i => cap - total(sessions[i]);
    const weekly = sumFractional(sessions);
    const sessFrac = sessions.map(s => fractionalByMuscle(s.exercises));
    const fitsR1 = (i, w, n) => Object.keys(w).every(mu => (sessFrac[i][mu] || 0) + w[mu] * n <= r1 + EPS);
    const log = [];
    const apply = (i, e, n, isNew) => {
      Object.keys(e.setWeights).forEach(mu => { weekly[mu] = (weekly[mu] || 0) + e.setWeights[mu] * n; sessFrac[i][mu] = (sessFrac[i][mu] || 0) + e.setWeights[mu] * n; });
      log.push({ sessionIndex: i, session: sessions[i].name, exerciseId: e.exerciseId, bucket: e.bucket, sets: n, isNew });
    };
    const exhausted = new Set();
    for (;;) {
      const mu = K.MAJOR_GROUPS.filter(m => !exhausted.has(m) && (weekly[m] || 0) < floorOf(m) - EPS)
        .sort((a, b) => ((weekly[a] || 0) - floorOf(a)) - ((weekly[b] || 0) - floorOf(b)))[0]; // mayor déficit (piso − fraccionadas) primero (estable: orden de MAJOR_GROUPS)
      if (!mu) break;
      const cand = splitDays.map((d, i) => i).filter(i => splitDays[i].muscles.includes(mu) && room(i) > 0)
        .sort((a, b) => room(b) - room(a) || a - b); // más espacio primero
      let done = false;
      for (const i of cand) { // 1) series extra de ejercicios que ya están en el plan
        const opts = sessions[i].exercises.filter(e => (e.setWeights[mu] || 0) >= direct && fitsR1(i, e.setWeights, 1)).sort((a, b) => a.sets - b.sets);
        if (!opts.length) continue;
        opts[0].sets += 1; apply(i, opts[0], 1, false); done = true; break;
      }
      if (!done) for (const i of cand) { // 2) ejercicio nuevo, solo si no hay otra forma
        if (room(i) < 2) continue;
        const used = new Set(sessions[i].exercises.map(e => e.pattern || e.name));
        const ex = applyRowChoice(filterLibByInjuries(K.EXERCISES[mu], mu, injuryZones), barbellRow)
          .filter(x => !used.has(basePattern(x)) && !violatesA3(sessions[i].exercises, x))
          .find(x => { const w = K.EXERCISE_CONTRIBUTION[x.id].setWeights; return (w[mu] || 0) >= direct && fitsR1(i, w, 2); });
        if (!ex) continue;
        const entry = makeEntry(ex, mu, 2);
        sessions[i].exercises.push(entry); apply(i, entry, 2, true); done = true; break;
      }
      if (!done) exhausted.add(mu);
    }
    sessions.forEach(s => { s.totalSets = total(s); });
    return log;
  }

  // DEC-020 · mínimo semanal por grupo, dentro del tope E4.
  // El mínimo es el de VALIDATOR_RULES.groupMinimumWeeklySets (5 series fraccionadas por semana, contando el
  // indirecto de los compuestos). Los grupos mayores ya llegan a su piso con completeToFloor (DEC-017); esto
  // cubre a los grupos chicos, que el tope E4 recorta primero. Para cada grupo chico bajo el mínimo (el de mayor
  // déficit primero):
  //  1) se agregan series en una sesión COMPATIBLE con el grupo (SMALL_COMPAT) que tenga espacio bajo `limit`
  //     (primero series extra de un ejercicio directo que ya está en la sesión; si no, un ejercicio nuevo de 2
  //     series del catálogo ya filtrado por lesiones);
  //  2) si ninguna sesión tiene espacio, las series se sacan de aislamientos de la MISMA sesión, empezando por
  //     el grupo con más volumen fraccionado acumulado, sin bajar a ningún grupo de su propio mínimo o piso
  //     (nunca se descubre un grupo para cubrir a otro), nunca de un multiarticular y nunca el último
  //     ejercicio directo de un grupo (puede ceder series, pero el ejercicio queda);
  //  3) si tampoco se puede, el grupo queda como está y se informa (la sesión solo puede pasarse del tope con
  //     la aceptación explícita del usuario: `limit` ya la incluye).
  // DEC-011: un grupo sin ningún ejercicio posible tras las exclusiones por lesión no recibe mínimo.
  // No lleva a ningún músculo por encima del umbral de R1 en una sesión (11 fraccionadas).
  function ensureGroupMinimum(sessions, splitDays, injuryZones, limit, floors, barbellRow) {
    const MIN = K.VALIDATOR_RULES.groupMinimumWeeklySets.value;
    const direct = K.VALIDATOR_RULES.directSetWeight.value;
    const r1 = K.VALIDATOR_RULES.maxFractionalSetsPerMuscleSession.value;
    const EPS = 1e-9;
    const total = s => s.exercises.reduce((a, e) => a + e.sets, 0);
    const room = i => limit - total(sessions[i]);
    const weekly = sumFractional(sessions);
    const sessFrac = sessions.map(s => fractionalByMuscle(s.exercises));
    const fitsR1 = (i, w, n) => Object.keys(w).every(mu => (sessFrac[i][mu] || 0) + w[mu] * n <= r1 + EPS);
    const compat = (mu, i) => SMALL_COMPAT[mu](splitDays[i].category);
    // Lo mínimo que cada grupo debe conservar: su piso (mayores) o este mínimo (chicos); si ya estaba más
    // abajo, no se le quita nada más.
    const protect = {};
    Object.keys(K.MUSCLE_LABELS).forEach(mu => { protect[mu] = Math.min(K.MAJOR_GROUPS.includes(mu) ? (floors && floors[mu] != null ? floors[mu] : MIN) : MIN, weekly[mu] || 0); });
    // Los grupos mayores también conservan sus series REALES por encima de su piso (garantía de DEC-014: el tope
    // E4 no los baja de ahí ni en fraccionadas ni en reales); cubrir a un grupo chico no la rompe.
    const plain = {};
    sessions.forEach(s => s.exercises.forEach(e => { plain[e.bucket] = (plain[e.bucket] || 0) + e.sets; }));
    const plainProtect = {};
    K.MAJOR_GROUPS.forEach(mu => { plainProtect[mu] = Math.min(floors && floors[mu] != null ? floors[mu] : MIN, plain[mu] || 0); });
    const before = {};
    SMALL_MUSCLES_LIST.forEach(mu => { before[mu] = Math.round((weekly[mu] || 0) * 100) / 100; });
    const excluded = new Set(SMALL_MUSCLES_LIST.filter(mu => filterLibByInjuries(K.EXERCISES[mu], mu, injuryZones).length === 0));
    const apply = (i, e, n, isNew, donated) => {
      Object.keys(e.setWeights).forEach(mu => { weekly[mu] = (weekly[mu] || 0) + e.setWeights[mu] * n; sessFrac[i][mu] = (sessFrac[i][mu] || 0) + e.setWeights[mu] * n; });
      log.push({ sessionIndex: i, session: sessions[i].name, exerciseId: e.exerciseId, bucket: e.bucket, sets: n, isNew, donated });
    };
    const log = [];
    // Plan de donación dentro de la sesión i: k series de aislamientos, grupo con más volumen acumulado primero.
    const planDonation = (i, mu, k) => {
      const tent = Object.assign({}, weekly), taken = new Map(), steps = [], tentPlain = {};
      let got = 0;
      while (got < k) {
        const rem = e => e.sets - (taken.get(e) || 0);
        const ok = e => {
          const step = rem(e) > 2 ? 1 : rem(e);
          if (!Object.keys(e.setWeights).every(m => !(m in protect) || tent[m] - e.setWeights[m] * step >= protect[m] - EPS)) return false;
          // Un grupo mayor no baja de su piso en series reales y no desaparece de una sesión (frecuencia semanal, R2).
          if (K.MAJOR_GROUPS.includes(e.bucket)) {
            if (plain[e.bucket] - (tentPlain[e.bucket] || 0) - step < plainProtect[e.bucket]) return false;
            const left = sessions[i].exercises.filter(x => x.bucket === e.bucket).reduce((a, x) => a + x.sets - (taken.get(x) || 0), 0);
            if (left - step < 1) return false;
          }
          // Nunca se quita el último ejercicio directo de un grupo en la semana: puede ceder series, pero el ejercicio queda.
          if (step >= rem(e) && (e.setWeights[e.bucket] || 0) >= direct) {
            const otherDirect = sessions.some(s => s.exercises.some(x => x !== e && x.bucket === e.bucket && (x.setWeights[x.bucket] || 0) >= direct && x.sets - (taken.get(x) || 0) > 0));
            if (!otherDirect) return false;
          }
          return true;
        };
        const cand = sessions[i].exercises.filter(e => e.type === 'isolation' && e.bucket !== mu && !(e.setWeights[mu] > 0) && Object.keys(e.setWeights).length && rem(e) > 0 && ok(e))
          .sort((a, b) => ((tent[b.bucket] || 0) - (tent[a.bucket] || 0)) || (rem(b) - rem(a)));
        if (!cand.length) return null;
        const e = cand[0], step = rem(e) > 2 ? 1 : rem(e);
        taken.set(e, (taken.get(e) || 0) + step);
        tentPlain[e.bucket] = (tentPlain[e.bucket] || 0) + step;
        Object.keys(e.setWeights).forEach(m => { tent[m] = (tent[m] || 0) - e.setWeights[m] * step; });
        steps.push({ e, step }); got += step;
      }
      return steps;
    };
    const place = (i, mu, allowDonation) => {
      const free = Math.max(0, room(i));
      const used = new Set(sessions[i].exercises.map(e => e.pattern || e.name));
      const attempts = [];
      const existing = sessions[i].exercises.filter(e => e.bucket === mu && (e.setWeights[mu] || 0) >= direct && fitsR1(i, e.setWeights, 1)).sort((a, b) => a.sets - b.sets)[0];
      if (existing) attempts.push({ n: 1, e: existing, isNew: false });
      const ex = applyRowChoice(filterLibByInjuries(K.EXERCISES[mu], mu, injuryZones), barbellRow)
        .filter(x => !used.has(basePattern(x)) && !violatesA3(sessions[i].exercises, x))
        .find(x => { const w = K.EXERCISE_CONTRIBUTION[x.id].setWeights; return (w[mu] || 0) >= direct && fitsR1(i, w, 2); });
      if (ex) attempts.push({ n: 2, ex, isNew: true });
      for (const a of attempts) {
        const need = Math.max(0, a.n - free);
        if (need > 0 && !allowDonation) continue;
        const steps = need > 0 ? planDonation(i, mu, need) : [];
        if (!steps) continue;
        const donated = steps.map(x => ({ exerciseId: x.e.exerciseId, bucket: x.e.bucket, sets: x.step }));
        steps.forEach(({ e, step }) => {
          e.sets -= step;
          plain[e.bucket] -= step;
          Object.keys(e.setWeights).forEach(m => { weekly[m] = (weekly[m] || 0) - e.setWeights[m] * step; sessFrac[i][m] = (sessFrac[i][m] || 0) - e.setWeights[m] * step; });
        });
        sessions[i].exercises = sessions[i].exercises.filter(e => e.sets > 0);
        let target = a.e;
        if (a.isNew) { target = makeEntry(a.ex, mu, 2); sessions[i].exercises.push(target); } else target.sets += 1;
        apply(i, target, a.n, a.isNew, donated);
        return true;
      }
      return false;
    };
    const stuck = new Set();
    let guard = 0;
    for (;;) {
      const mu = SMALL_MUSCLES_LIST.filter(m => !excluded.has(m) && !stuck.has(m) && (weekly[m] || 0) < MIN - EPS)
        .sort((a, b) => ((weekly[a] || 0) - MIN) - ((weekly[b] || 0) - MIN))[0]; // mayor déficit primero (estable)
      if (!mu) break;
      const cand = sessions.map((s, i) => i).filter(i => compat(mu, i)).sort((a, b) => room(b) - room(a) || a - b);
      const w0 = weekly[mu] || 0;
      const done = cand.some(i => place(i, mu, false)) || cand.some(i => place(i, mu, true));
      if (!done || (weekly[mu] || 0) <= w0 + EPS) stuck.add(mu); // sin avance neto, el grupo queda como está (evita ciclos)
      else protect[mu] = Math.max(protect[mu], weekly[mu]); // lo ya ganado no se le quita a este grupo para cubrir a otro
      if (++guard > 200) break;
    }
    sessions.forEach(s => { s.totalSets = total(s); });
    const groups = SMALL_MUSCLES_LIST.map(mu => {
      const after = Math.round((weekly[mu] || 0) * 100) / 100;
      return { muscle: mu, before: before[mu], after, minimum: MIN, met: after >= MIN - EPS, excludedByInjury: excluded.has(mu) };
    });
    return { minimum: MIN, limit, log, groups };
  }

  function computeTraining(p, t) {
    const days = clamp(Math.round(p.daysPerWeek) || 4, 3, 6);
    const split = SPLITS[days];
    const base = p.level === 'advanced' ? 18 : p.level === 'intermediate' ? 14 : 10; // SCHOENFELD_VOL, HELMS_TRAIN
    const cutFactor = p.goal === 'cut' ? 0.85 : 1; // HELMS_TRAIN: en déficit se prioriza intensidad y se modera el volumen
    const emph = EMPHASIS_MAP[p.division] || { up: [], down: [] };
    const small = ['biceps', 'triceps', 'calves', 'abs'];
    const lagging = new Set(p.laggingMuscles || []); // DEC-001
    const injuryZones = (p.health && p.health.injuries || []).map(i => i.zone); // DEC-009
    const floors = weeklyFloors(emph, lagging); // DEC-017 (ajuste): piso completo o de mantenimiento por grupo

    const weeklySets = {};
    const laggingApplied = {};
    Object.keys(K.EXERCISES).forEach(mu => {
      if (lagging.has(mu)) {
        // DEC-001: un grupo rezagado anula el énfasis de división (incluida
        // una posible reducción ×0,5) y el recorte de músculo pequeño.
        // Tope semanal 20 series/grupo (criterio de la app).
        const s = base * cutFactor * 1.25;
        weeklySets[mu] = Math.min(20, Math.max(4, Math.round(s)));
        laggingApplied[mu] = true;
      } else {
        let s = base * cutFactor;
        if (small.includes(mu)) s *= 0.6;
        if (emph.up.includes(mu)) s *= 1.25;
        if (emph.down.includes(mu)) s *= 0.5;
        weeklySets[mu] = Math.max(4, Math.round(s));
      }
    });

    const freq = {};
    split.days.forEach(d => d.muscles.forEach(mu => { freq[mu] = (freq[mu] || 0) + 1; }));

    // DEC-022 · A3: la sentadilla pesada cae en el primer día con cuádriceps (rotación del catálogo). Ese día los isquios se
    // cubren con flexión de rodilla (curl femoral, lumbar baja) y la bisagra pesada pasa al siguiente día de isquios.
    const barbellRow = !!p.barbellRow; // DEC-022
    const quadsLib = filterLibByInjuries(K.EXERCISES.quads, 'quads', injuryZones);
    const squatDay = K.VALIDATOR_RULES.hingeSquatSeparation.value && quadsLib.length && heavyKind(quadsLib[0].id, quadsLib[0].pattern) === 'squat'
      ? split.days.findIndex(d => d.muscles.includes('quads')) : -1;
    let hamExcess = 0; // DEC-022: series de curl del día de sentadilla que pasan al curl del día de bisagra
    const remaining = Object.assign({}, weeklySets);
    const rotate = {};
    const rotateExtra = {}; // DEC-005
    const sessions = split.days.map((d, dayIdx) => {
      const exercises = [];
      d.muscles.forEach(mu => {
        // DEC-005: con la bandera "salud/funcional" activa, pierna suma
        // sentadilla búlgara, step-up con carga y paseo del granjero a su
        // rotación de ejercicios. Desactivada (por defecto), el catálogo es
        // el mismo de siempre.
        const extra = p.healthGoal ? filterLibByInjuries(K.FUNCTIONAL_EXERCISES[mu] || [], mu, injuryZones) : [];
        const lib = applyRowChoice(filterLibByInjuries(K.EXERCISES[mu], mu, injuryZones), barbellRow); // DEC-009 / DEC-022
        if (!lib.length) { weeklySets[mu] = 0; return; } // DEC-011/DEC-020: sin ejercicios posibles tras las exclusiones por lesión
        const perSession = Math.max(2, Math.round(weeklySets[mu] / freq[mu]));
        const sets = Math.min(perSession, Math.max(0, remaining[mu]));
        remaining[mu] -= sets;
        if (sets <= 0) return;
        const idx = rotate[mu] = (rotate[mu] || 0);
        let picks = sets <= 4 ? [lib[idx % lib.length]] : [lib[idx % lib.length], lib[(idx + 1) % lib.length]];
        rotate[mu] = idx + picks.length;
        if (mu === 'quads' && picks.length === 2) {
          // DEC-006: el segundo ejercicio de cuádriceps prioriza prensa.
          const prensa = lib.find(e => e.name === 'Prensa de piernas');
          if (prensa) { picks = picks.slice(); picks[1] = prensa; }
        }
        // DEC-006: ningún patrón (variantes incluidas) se repite en el día.
        picks = dedupPicks(picks, lib, exercises);
        // DEC-022 · A3: un ejercicio que juntaría la sentadilla y la bisagra pesadas (p. ej. el remo con barra elegido, junto a la sentadilla) se cambia por otro de la rotación.
        let reset = false;
        picks = picks.map(ex => {
          if (!violatesA3(exercises, ex)) return ex;
          const alt = lib.find(x => !picks.includes(x) && !violatesA3(exercises, x) && !exercises.some(e => (e.pattern || e.name) === basePattern(x)));
          if (alt && heavyKind(ex.id, ex.pattern) === 'hinge') reset = true; // la bisagra que se cambia vuelve a la rotación
          return alt || ex;
        });
        if (reset) rotate[mu] = idx;
        if (mu === 'hamstrings' && dayIdx === squatDay) {
          const kept = picks.filter(ex => heavyKind(ex.id, ex.pattern) !== 'hinge');
          if (kept.length < picks.length) {
            const alt = lib.find(ex => heavyKind(ex.id, ex.pattern) !== 'hinge');
            if (kept.length || alt) {
              picks = kept.length ? kept : [alt];
              rotate[mu] = idx; // el próximo día de isquios vuelve a empezar por la bisagra
            }
          }
        }
        const per = Math.floor(sets / picks.length);
        let rest = sets - per * picks.length;
        const dayEntries = picks.map(ex => {
          const n = per + (rest-- > 0 ? 1 : 0);
          return makeEntry(ex, mu, n);
        });
        // DEC-022 · tope por ejercicio con el umbral de R1 (sin número nuevo): un ejercicio no pasa de las series que caben, junto con lo que
        // ya hay en el día, bajo el umbral de rendimiento decreciente de su músculo. Hoy solo puede pasar con el curl del día de sentadilla,
        // que recibe todas las series de isquios; el excedente pasa al curl del día de bisagra (la frecuencia de isquios no baja).
        if (mu === 'hamstrings' && squatDay >= 0) {
          const r1 = K.VALIDATOR_RULES.maxFractionalSetsPerMuscleSession.value;
          const room = e => {
            const other = (fractionalByMuscle(exercises.concat(dayEntries.filter(x => x !== e))).hamstrings) || 0;
            return Math.max(1, Math.floor((r1 - other + 1e-9) / (e.setWeights.hamstrings || 1)));
          };
          if (dayIdx === squatDay) {
            dayEntries.filter(e => e.type === 'isolation').forEach(e => { const cap = room(e); if (e.sets > cap) { hamExcess += e.sets - cap; e.sets = cap; } });
          } else if (hamExcess > 0) {
            let curl = dayEntries.find(e => e.type === 'isolation');
            if (!curl) { const alt = lib.find(x => x.type === 'isolation' && !exercises.some(e => (e.pattern || e.name) === basePattern(x))); if (alt) { curl = makeEntry(alt, mu, 0); dayEntries.push(curl); } }
            if (curl) { const add = Math.min(hamExcess, Math.max(0, room(curl) - curl.sets)); curl.sets += add; hamExcess -= add; }
            for (let k = dayEntries.length - 1; k >= 0; k--) if (dayEntries[k].sets <= 0) dayEntries.splice(k, 1);
          }
        }
        dayEntries.forEach(e => exercises.push(e));
        // DEC-005 (aclarado): con la bandera activa, el ejercicio funcional
        // se SUMA después de los principales; nunca reemplaza el patrón
        // bilateral pesado del día. Si el funcional aporta volumen al grupo
        // (step-up, búlgara con mancuernas), se financia quitándole series a
        // un aislamiento del mismo grupo ese día (o, si no hay, al último
        // ejercicio puesto), sin bajarlo de un piso de 2 series, para no
        // tocar el volumen semanal de DEC-001.
        // DEC-010: si NO aporta volumen (paseo del granjero, primary null),
        // el descuento sacaría volumen real de hipertrofia sin reemplazarlo:
        // se agrega aparte, sin descontar de nadie. Cuenta en totalSets y en
        // la duración, no en el volumen del grupo.
        if (extra.length) {
          const ridx = rotateExtra[mu] = (rotateExtra[mu] || 0);
          rotateExtra[mu] = ridx + 1;
          // Si el músculo entrena pocas veces por semana (lo habitual: 2),
          // un reparto round-robin simple nunca llega a recorrer toda la
          // lista de extras (con 3 opciones y 2 ocurrencias, la 3ª nunca
          // sale). Se reserva el acarreo (paseo del granjero) para la
          // ÚLTIMA vez que el músculo aparece esa semana, y el resto de
          // ocurrencias rota entre las otras opciones.
          const carry = extra.find(e => e.pattern === 'loaded_carry');
          const others = extra.filter(e => e.pattern !== 'loaded_carry');
          const isLastOccurrence = ridx === (freq[mu] || 1) - 1;
          const bonus = (carry && isLastOccurrence) ? carry : (others.length ? others[ridx % others.length] : extra[ridx % extra.length]);
          const bonusPattern = bonus.pattern || bonus.name;
          const alreadyThere = exercises.some(e => (e.pattern || e.name) === bonusPattern);
          if (K.EXERCISE_CONTRIBUTION[bonus.id].primary === null) {
            // Series desde la configuración (VALIDATOR_RULES.functionalNoVolumeExtraSets).
            if (!alreadyThere) exercises.push(makeEntry(bonus, mu, K.VALIDATOR_RULES.functionalNoVolumeExtraSets.value));
          } else {
            // Donante: el pick de este músculo ese día con más series de sobra
            // (prioriza aislamientos). Se prueba con 2 series y, si no entra,
            // con 1, antes de rendirse por falta de espacio.
            const isolationPicks = dayEntries.filter(e => e.type === 'isolation');
            const nonEligibleCompounds = dayEntries.filter(e => e.type === 'compound' && !TOPSET_ELIGIBLE_PATTERNS.has(e.pattern));
            const pool = isolationPicks.length ? isolationPicks : (nonEligibleCompounds.length ? nonEligibleCompounds : dayEntries);
            const donor = pool.slice().sort((a, b) => b.sets - a.sets)[0];
            let bonusSets = 0;
            if (!alreadyThere && donor) {
              if (donor.sets - 2 >= 2) bonusSets = 2;
              else if (donor.sets - 1 >= 2) bonusSets = 1;
            }
            if (bonusSets > 0) {
              donor.sets -= bonusSets;
              exercises.push(makeEntry(bonus, mu, bonusSets));
            }
            // si no hay de dónde financiarlo ese día sin romper el piso, no se agrega esta vez
          }
        }
      });
      return { name: d.name, exercises, totalSets: exercises.reduce((a, e) => a + e.sets, 0) };
    });

    // DEC-003 v2: los grupos chicos (abdomen, pantorrillas, bíceps, tríceps)
    // se reparten entre los días COMPATIBLES con menos series acumuladas
    // hasta ahora. Los grupos grandes no se tocan: ya quedaron fijos arriba.
    const trainingWarnings = [];
    SMALL_MUSCLES_LIST.forEach(mu => {
      const eligible = split.days.map((d, i) => ({ i, cat: d.category })).filter(x => SMALL_COMPAT[mu](x.cat));
      if (!eligible.length) return;
      const preferNonLeg = mu === 'abs' || mu === 'calves';
      eligible.sort((a, b) => {
        const prefA = preferNonLeg && a.cat === 'legs' ? 1 : 0;
        const prefB = preferNonLeg && b.cat === 'legs' ? 1 : 0;
        if (prefA !== prefB) return prefA - prefB;
        return sessions[a.i].totalSets - sessions[b.i].totalSets;
      });
      const freqMu = Math.min(2, eligible.length);
      freq[mu] = freqMu;
      const chosen = eligible.slice(0, freqMu).map(x => x.i);
      const lib = filterLibByInjuries(K.EXERCISES[mu], mu, injuryZones); // DEC-009
      if (!lib.length) { weeklySets[mu] = 0; return; } // DEC-011/DEC-020: sin ejercicios posibles tras las exclusiones por lesión
      const perSession = Math.max(2, Math.round(weeklySets[mu] / freqMu));
      let remainingMu = weeklySets[mu];
      chosen.forEach((dayIdx, k) => {
        const isLast = k === chosen.length - 1;
        const sets = isLast ? Math.max(0, remainingMu) : Math.min(perSession, remainingMu);
        remainingMu -= sets;
        if (sets <= 0) return;
        const idx = rotate[mu] = (rotate[mu] || 0);
        let picks = sets <= 4 ? [lib[idx % lib.length]] : [lib[idx % lib.length], lib[(idx + 1) % lib.length]];
        rotate[mu] = idx + picks.length;
        const s = sessions[dayIdx];
        picks = dedupPicks(picks, lib, s.exercises); // DEC-006
        const per = Math.floor(sets / picks.length);
        let rest = sets - per * picks.length;
        picks.forEach(ex => {
          const n = per + (rest-- > 0 ? 1 : 0);
          s.exercises.push(makeEntry(ex, mu, n));
          s.totalSets += n;
        });
      });
    });

    // DEC-014 · Regla E4: tope de series por sesión (25, convención de la app).
    // Reemplaza al aviso sin recorte de DEC-003 v2: ahora se recortan aislamientos
    // al generar, salvo que el usuario acepte una sesión más larga.
    const signature = planSignature(p);
    const untrimmedMax = maxSessionSets(sessions);
    const acceptance = resolveAcceptance(p, signature, untrimmedMax);
    const accepted = acceptance && acceptance.valid ? acceptance.on : null;
    const sessionLimit = enforceSessionCap(sessions, accepted, floors);
    sessionLimit.floors = floors;
    // Lo que se guardaría si el usuario acepta ahora: la firma de este plan y su máximo sin recortar.
    sessionLimit.proposed = { signature, maxSets: untrimmedMax };
    if (acceptance && acceptance.valid) sessionLimit.acceptance = { on: acceptance.on, signature: acceptance.signature, maxSets: acceptance.maxSets, legacy: !!acceptance.legacy };
    if (acceptance && !acceptance.valid) {
      sessionLimit.acceptanceInvalidated = { reason: acceptance.reason, on: acceptance.previous.on, previous: { signature: acceptance.previous.signature, maxSets: acceptance.previous.maxSets } };
      const why = acceptance.reason === 'firma'
        ? `cambió ${changedSignatureParts(acceptance.previous.signature, signature).join(', ') || 'el plan'}`
        : `una sesión llegaría a ${untrimmedMax} series y aceptaste hasta ${acceptance.previous.maxSets}`;
      trainingWarnings.push({ level: 'warn', evidence: 'E4', rule: 'E4', text: `Tu aceptación de sesiones más largas del ${acceptance.previous.on} ya no aplica: ${why}. Vuelve a aceptar para quitar los recortes (E4 · convención de la app).` });
    }
    const trimmedMuscles = new Set();
    sessionLimit.trimmed.forEach(t => t.cuts.forEach(c => trimmedMuscles.add(K.EXERCISE_INDEX[c.exerciseId].bucket)));
    trimmedMuscles.forEach(mu => {
      weeklySets[mu] = sessions.reduce((a, s) => a + s.exercises.filter(e => e.bucket === mu).reduce((b, e) => b + e.sets, 0), 0);
    });
    sessionLimit.trimmed.forEach(t => {
      const names = t.cuts.map(c => `${K.EXERCISE_INDEX[c.exerciseId].entry.name} (−${c.sets})`).join(', ');
      trainingWarnings.push({ level: 'warn', evidence: 'E4', rule: 'E4', text: `${t.session}: se recortaron ${t.from - t.to} series de aislamiento (${t.from} → ${t.to}) para respetar el tope de ${sessionLimit.cap} series por sesión: ${names}. Regla E4 · convención de la app, sin fuente externa; no se recorta ningún multiarticular ni se baja un grupo mayor del piso semanal de ${K.VALIDATOR_RULES.minWeeklySetsPerMuscle.value} series fraccionadas (ACSM, E1). Puedes aceptar una sesión más larga.` });
    });
    const wiped = [...trimmedMuscles].filter(mu => weeklySets[mu] === 0);
    if (wiped.length) {
      trainingWarnings.push({ level: 'warn', evidence: 'E4', rule: 'E4', text: `Con el tope de ${sessionLimit.cap} series por sesión y el piso semanal de los grupos mayores, esta semana quedan sin series directas: ${wiped.map(mu => K.MUSCLE_LABELS[mu]).join(', ')}. Si los quieres incluidos, acepta una sesión más larga.` });
    }
    sessionLimit.overCap.forEach(o => {
      trainingWarnings.push({ level: 'warn', evidence: 'E4', rule: 'E4', text: sessionLimit.accepted
        ? `${o.session}: ${o.sets} series, por encima de las ${sessionLimit.cap} por sesión. Aceptaste una sesión más larga el ${sessionLimit.accepted}.`
        : `${o.session}: ${o.sets} series, por encima de las ${sessionLimit.cap} por sesión (E4 · convención de la app). No se recortó más para no quitar multiarticulares ni bajar un grupo mayor del piso semanal.` });
    });

    // DEC-017 · completar hasta el piso dentro del tope (ver completeToFloor).
    const fillLog = completeToFloor(sessions, split.days, injuryZones, sessionLimit.cap, floors, barbellRow);
    sessionLimit.filled = [];
    if (fillLog.length) {
      new Set(fillLog.map(x => x.bucket)).forEach(mu => {
        weeklySets[mu] = sessions.reduce((a, s) => a + s.exercises.filter(e => e.bucket === mu).reduce((b, e) => b + e.sets, 0), 0);
      });
      const byGroup = {};
      fillLog.forEach(x => { (byGroup[x.bucket] = byGroup[x.bucket] || []).push(x); });
      Object.keys(byGroup).forEach(mu => {
        const merged = {};
        byGroup[mu].forEach(x => { const k = `${x.sessionIndex}|${x.exerciseId}`; merged[k] = merged[k] || { session: x.session, exerciseId: x.exerciseId, sets: 0, isNew: x.isNew }; merged[k].sets += x.sets; });
        const items = Object.values(merged);
        const sets = items.reduce((a, x) => a + x.sets, 0);
        sessionLimit.filled.push({ muscle: mu, sets, items });
        const detail = items.map(x => `${x.session}: ${K.EXERCISE_INDEX[x.exerciseId].entry.name} +${x.sets}${x.isNew ? ' (ejercicio nuevo)' : ''}`).join('; ');
        trainingWarnings.push({ level: 'info', evidence: 'E1', rule: 'R2', kind: 'completado_piso', muscle: mu, items,
          text: `${K.MUSCLE_LABELS[mu]} quedaba bajo el piso semanal de ${floors[mu]} series fraccionadas (${floors[mu] < K.VALIDATOR_RULES.minWeeklySetsPerMuscle.value ? 'piso de mantenimiento: énfasis reducido por la división' : 'objetivo de hipertrofia del ACSM 2026, usado como piso protector'}): se ${sets === 1 ? 'agregó 1 serie' : `agregaron ${sets} series`} dentro del tope de ${sessionLimit.cap} por sesión. ${detail}.` });
      });
    }

    // DEC-020 · mínimo semanal por grupo dentro del tope E4 (ver ensureGroupMinimum). Con una
    // aceptación vigente el techo es el máximo que el usuario aceptó; sin ella, el tope.
    const minLimit = accepted && acceptance ? Math.max(sessionLimit.cap, acceptance.maxSets) : sessionLimit.cap;
    const minResult = ensureGroupMinimum(sessions, split.days, injuryZones, minLimit, floors, barbellRow);
    sessionLimit.minimum = { value: minResult.minimum, level: 'E4', limit: minResult.limit, groups: minResult.groups, filled: [] };
    if (minResult.log.length) {
      new Set(minResult.log.map(x => x.bucket).concat(...minResult.log.map(x => x.donated.map(d => d.bucket)))).forEach(mu => {
        weeklySets[mu] = sessions.reduce((a, s) => a + s.exercises.filter(e => e.bucket === mu).reduce((b, e) => b + e.sets, 0), 0);
      });
      const byGroup = {};
      minResult.log.forEach(x => { (byGroup[x.bucket] = byGroup[x.bucket] || []).push(x); });
      Object.keys(byGroup).forEach(mu => {
        const sets = byGroup[mu].reduce((a, x) => a + x.sets, 0);
        const donors = {};
        byGroup[mu].forEach(x => x.donated.forEach(d => { donors[d.bucket] = (donors[d.bucket] || 0) + d.sets; }));
        sessionLimit.minimum.filled.push({ muscle: mu, sets, donors, items: byGroup[mu].map(x => ({ session: x.session, exerciseId: x.exerciseId, sets: x.sets, isNew: x.isNew })) });
        const detail = byGroup[mu].map(x => `${x.session}: ${K.EXERCISE_INDEX[x.exerciseId].entry.name} +${x.sets}${x.isNew ? ' (ejercicio nuevo)' : ''}`).join('; ');
        const from = Object.keys(donors).length ? ` Se sacaron ${Object.keys(donors).map(d => `${donors[d]} de ${K.MUSCLE_LABELS[d]}`).join(' y ')} (empezando por el grupo con más volumen fraccionado acumulado; ningún grupo baja de su propio mínimo o piso).` : '';
        trainingWarnings.push({ level: 'info', evidence: 'E4', rule: 'E4', kind: 'minimo_grupo', muscle: mu,
          text: `${K.MUSCLE_LABELS[mu]} quedaba bajo el mínimo semanal de ${minResult.minimum} series fraccionadas (mínimo de la app, E4 · convención): se ${sets === 1 ? 'agregó 1 serie' : `agregaron ${sets} series`} dentro del tope de ${sessionLimit.cap} por sesión. ${detail}.${from}` });
      });
    }
    const unmet = minResult.groups.filter(g => !g.met && !g.excludedByInjury);
    if (unmet.length) {
      const list = unmet.map(g => `${K.MUSCLE_LABELS[g.muscle]} ${g.after}`).join(', ');
      const canAcceptMin = !accepted;
      trainingWarnings.push({ level: 'warn', evidence: 'E4', rule: 'E4', kind: 'minimo_no_cabe', muscles: unmet, options: canAcceptMin ? ['aceptar_sesiones_largas', 'cambiar_split'] : ['cambiar_split'],
        text: accepted
          ? `Ni con tu aceptación (hasta ${minLimit} series por sesión) cabe el mínimo semanal de ${minResult.minimum} series fraccionadas en: ${list}. Puedes cambiar de split (más días por semana). (Mínimo: E4 · convención de la app.)`
          : `El mínimo semanal de ${minResult.minimum} series fraccionadas no cabe dentro del tope de ${sessionLimit.cap} series por sesión en: ${list}. Para cumplirlo una sesión tendría que pasarse del tope: puedes aceptar sesiones más largas, o cambiar de split (más días por semana). (Mínimo: E4 · convención de la app.)` });
    }
    const noLib = minResult.groups.filter(g => g.excludedByInjury);
    if (noLib.length) {
      trainingWarnings.push({ level: 'info', evidence: 'E4', rule: 'E4', kind: 'minimo_sin_ejercicios', muscles: noLib.map(g => g.muscle),
        text: `Sin mínimo semanal para ${noLib.map(g => K.MUSCLE_LABELS[g.muscle]).join(', ')}: tras las exclusiones por la lesión declarada no queda ningún ejercicio posible (precaución E4, DEC-011).` });
    }

    // DEC-016 · aviso de grupos bajo el mínimo. El piso de 10 series fraccionadas semanales se FUERZA solo
    // en los grupos mayores (enforceSessionCap); este aviso cubre a todos, mayores y chicos. Si el tope E4
    // les quitó series, se dice cuántas, porque en ese caso aceptar sesiones más largas lo resuelve.
    sessions.forEach(s => { s.fractionalSets = fractionalByMuscle(s.exercises); });
    const floorSets = K.VALIDATOR_RULES.minWeeklySetsPerMuscle.value;
    const weeklyFrac = sumFractional(sessions);
    const capLoss = {};
    sessionLimit.trimmed.forEach(t => t.cuts.forEach(c => {
      const w = K.EXERCISE_CONTRIBUTION[c.exerciseId].setWeights;
      Object.keys(w).forEach(mu => { capLoss[mu] = (capLoss[mu] || 0) + w[mu] * c.sets; });
    }));
    const belowMin = Object.keys(K.MUSCLE_LABELS).map(mu => ({ muscle: mu, fractionalSets: Math.round((weeklyFrac[mu] || 0) * 100) / 100, floor: floors[mu], trimmedByCap: Math.round((capLoss[mu] || 0) * 100) / 100 }))
      .filter(x => x.fractionalSets < x.floor);
    sessionLimit.belowMinimum = belowMin;
    if (belowMin.length) {
      const list = belowMin.map(x => `${K.MUSCLE_LABELS[x.muscle]} ${x.fractionalSets}${x.floor < floorSets ? ` (piso de mantenimiento ${x.floor})` : ''}${x.trimmedByCap > 0 ? ` (el tope E4 quitó ${x.trimmedByCap})` : ''}`).join(', ');
      const canAccept = !accepted && belowMin.some(x => x.trimmedByCap > 0);
      trainingWarnings.push({ level: 'warn', evidence: 'E1', rule: 'R2', kind: 'bajo_minimo', muscles: belowMin, options: canAccept ? ['aceptar_sesiones_largas', 'cambiar_split'] : ['cambiar_split'],
        text: `Grupos por debajo de ${floorSets} series fraccionadas por semana: ${list}. ${floorSets} es el objetivo de hipertrofia del ACSM 2026, que la app usa como piso protector${belowMin.some(x => x.floor < floorSets) ? '; en los grupos con énfasis reducido por la división el piso es el de mantenimiento' : ''}. ${canAccept ? 'Puedes aceptar sesiones más largas (sin recortes) o cambiar de split (más días por semana).' : 'Puedes cambiar de split (más días por semana).'}` });
    }

    // DEC-014 · R1: aviso de rendimiento decreciente (E3, preprint). NO es un tope:
    // no recorta nada. Mismo conteo fraccionado que Pelland et al. 2026.
    diminishingReturnsWarnings(sessions).forEach(w => trainingWarnings.push(w));

    // DEC-022 · A2: más de un ejercicio de lumbar alta en una sesión se avisa (el usuario decide). Con el remo por defecto (apoyo de
    // pecho) y A3 no debería pasar; sí puede pasar si el usuario elige el remo con barra y cae con el peso muerto rumano.
    const a2Max = K.VALIDATOR_RULES.maxLumbarHighPerSession.value;
    const a2 = sessions.map(s => ({ s, ex: s.exercises.filter(e => K.JOINT_PROFILE[e.exerciseId] && K.JOINT_PROFILE[e.exerciseId].lumbar.nivel === 'alta') })).filter(x => x.ex.length > a2Max);
    if (a2.length) {
      trainingWarnings.push({ level: 'warn', evidence: 'E4', rule: 'A2', kind: 'tope_lumbar', sessions: a2.map(x => ({ session: x.s.name, exercises: x.ex.map(e => e.name) })),
        text: `Más de ${a2Max} ejercicio de demanda lumbar alta en la misma sesión: ${a2.map(x => `${x.s.name} (${x.ex.map(e => e.name).join(' + ')})`).join('; ')}. Puedes quitar el remo con barra en tu perfil o repartir esos ejercicios en otro día. (Criterio de modelado E4.)` });
    }

    // DEC-021 (Fase 3, Paso 1) · un ejercicio sin perfil articular completo se avisa, nunca pasa en silencio. Hoy todo
    // el catálogo lo tiene (un test lo exige); el aviso cubre un ejercicio nuevo al que se le olvide.
    const noProfile = [];
    sessions.forEach(s => s.exercises.forEach(e => { const miss = K.missingJointProfile(e.exerciseId); if (miss.length && !noProfile.some(x => x.exerciseId === e.exerciseId)) noProfile.push({ exerciseId: e.exerciseId, name: e.name, missing: miss }); }));
    if (noProfile.length) {
      trainingWarnings.push({ level: 'warn', evidence: 'E4', rule: 'A', kind: 'sin_perfil_articular', exercises: noProfile,
        text: `Sin perfil articular completo: ${noProfile.map(x => `${x.name} (${x.missing.join(', ')})`).join('; ')}. Las reglas articulares (Fase 3) no pueden evaluar estos ejercicios. (Criterio de modelado E4.)` });
    }

    // DEC-022 · A1: orden por demanda (antes del top set, para que el primer ejercicio elegible sea el más exigente).
    orderByDemand(sessions);

    // DEC-002 / DEC-008: en definición, el primer ejercicio ELEGIBLE del día
    // lleva un top set pesado (no suma series nuevas: la primera de sus
    // series pasa a ser el top set y el resto queda como back-off al -10%
    // de carga). Formato top set/back-off: [Criterio], construido sobre
    // [Evidencia] Helms et al. 2015, Bickel, Cross & Bamman 2011, Spiering
    // et al. 2021 y [Posicionamiento] ACSM 2009. Elegible = multiarticular
    // bilateral con carga libre o guiada pesada (ACSM 2009, ≥80% 1RM);
    // nunca unilaterales ni máquinas de press. Si el primero del día no es
    // elegible, el elegible se busca
    // más adelante y pasa a ordenarse primero. Si ninguno es elegible, ese
    // día no lleva top set.
    if (p.goal === 'cut') {
      sessions.forEach(s => {
        let idx = s.exercises.findIndex(e => TOPSET_ELIGIBLE_PATTERNS.has(e.pattern));
        if (idx === -1) return;
        if (idx > 0) {
          const [chosen] = s.exercises.splice(idx, 1);
          s.exercises.unshift(chosen);
          idx = 0;
        }
        const ex = s.exercises[idx];
        s.exercises[idx] = Object.assign({}, ex, {
          topSet: { reps: '4-6', rir: '1-2' },
          backoffSets: Math.max(0, ex.sets - 1),
          backoffPct: -10,
        });
      });
    }

    // DEC-003 v2 / DEC-007: duración estimada por día = series × (descanso
    // medio + 45 s de transición/ejecución), redondeada a minutos (criterio
    // de la app). Los ejercicios unilaterales cuentan doble (se hace cada
    // lado por separado, así que ocupan el doble de tiempo real).
    sessions.forEach(s => {
      let seconds = 0;
      s.exercises.forEach(e => {
        const unilateralFactor = e.unilateral ? 2 : 1;
        if (e.topSet) {
          seconds += unilateralFactor * (1 * (180 + SET_EXEC_SEC));
          seconds += unilateralFactor * ((e.backoffSets || 0) * (150 + SET_EXEC_SEC));
        } else {
          const rest = e.type === 'compound' ? 150 : 75;
          seconds += unilateralFactor * (e.sets * (rest + SET_EXEC_SEC));
        }
      });
      s.durationMin = Math.round(seconds / 60);
    });

    // DEC-005: con la bandera activa, en definición el cardio deja de
    // minimizarse y respeta un piso de 150 min/semana a intensidad moderada
    // (OMS 2020 / ACSM 2011), aunque eso implique más interferencia con la
    // fuerza de la que recomienda Helms et al. 2015 para solo rendimiento.
    const cardio = p.goal === 'cut'
      ? (p.healthGoal
        ? { sessions: 3, minutes: 50, type: 'Cardio moderado (caminata, bici, elíptica) al 60-70 % FC máx.', rule: 'Objetivo "salud/funcional" activo: el cardio no se recorta por estar en definición; se mantiene el piso de 150 min/semana recomendado para la salud cardiovascular, aunque interfiera algo más con la ganancia de fuerza.' }
        : { sessions: p.level === 'advanced' ? 3 : 2, minutes: 25, type: 'LISS (caminata inclinada, bici, elíptica) al 60-70 % FC máx.; opcional 1 sesión HIIT de 10-15 min', rule: 'La mínima cantidad necesaria para mantener el ritmo de pérdida; añade 10 min/sesión solo si el peso se estanca 2 semanas. Sepáralo del entrenamiento de fuerza o hazlo después.' })
      : { sessions: 2, minutes: 25, type: 'Cardio moderado por salud cardiovascular', rule: 'Sin objetivo de gasto: mantiene la capacidad aeróbica y la salud (150 min/semana moderado como referencia general). No interfiere con la hipertrofia a este volumen.' };

    return {
      splitName: split.name, daysPerWeek: days, weeklySets, laggingApplied, sessions, sessionLimit,
      intensity: 'La mayoría de series en 6-12 repeticiones al 70-80 % del 1RM, terminando a 1-3 repeticiones del fallo (RIR). Aislamientos hasta 15 repeticiones.',
      progression: 'Doble progresión: cuando completes el rango alto de repeticiones en todas las series con buena técnica, sube la carga 2-5 % (tren superior) o 5-10 % (tren inferior) y vuelve al rango bajo.',
      deload: 'Cada 4-6 semanas, o cuando el rendimiento caiga 2 sesiones seguidas, reduce el volumen a la mitad durante una semana manteniendo la carga.',
      cardio,
      posing: p.division.startsWith('general') ? null : 'Practica las poses obligatorias de tu división 2-3 veces/semana durante 10-15 min; en las últimas 8 semanas a diario. Es parte del juicio y también gasto energético.',
      sources: ['HELMS_TRAIN', 'SCHOENFELD_VOL', 'SCHOENFELD_FREQ', 'ACSM_RT', 'ACSM_CARDIO', 'WHO_PA', 'BICKEL_2011', 'SPIERING_MANT_2021'],
      warnings: trainingWarnings,
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
    // ejercicios (filterLibByInjuries, ya aplicada en computeTraining) es solo
    // una precaución heurística E4, nunca una adaptación a la lesión.
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
    const training = computeTraining(p, targets);
    const health = computeHealthScreen(p); // DEC-009: no cambia metrics/targets/nutrition; training ya filtró ejercicios por lesión arriba.
    const supplements = K.SUPPLEMENTS.filter(s => p.goal !== 'bulk' || s.source !== 'HELMS_NUT');
    const warnings = [].concat(metrics.warnings, targets.warnings, nutrition.warnings, training.warnings, health.warnings);
    const sourcesUsed = unique([metrics.bmrMethod, 'NAVY', 'KOURI', 'ACE_BF', 'ASHWELL', 'ROSSOW', 'IFBB_RULES'].concat(nutrition.sources, training.sources, supplements.map(s => s.source), health.sources));
    return {
      generatedAt: today, input: p, metrics, targets, nutrition, training, health, supplements, warnings, sourcesUsed,
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

  /* ---------- DEC-009 / DEC-011: dolor en Modo sesión ---------- */

  const daysBetweenIso = (fromIso, toIso) => Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86400000);
  const recentPainSessions = (rec, today) => ((rec && rec.painSessions) || []).filter(s => {
    const age = daysBetweenIso(s.date, today);
    return age >= 0 && age <= K.VALIDATOR_RULES.painAdviceWindowDays.value;
  });

  // Registra una lectura de dolor sobre el registro de un patrón y devuelve el
  // registro nuevo (no muta el anterior). Conserva la regla de DEC-009 (dolor
  // por encima del umbral marca; se desmarca con 2 sesiones DISTINTAS
  // seguidas sin pasarse) y suma el historial de sesiones con dolor para el
  // aviso de DEC-011.
  function applyPainReading(rec, pain, sessionId, today) {
    const prev = rec || {};
    const next = { flagged: !!prev.flagged, cleanStreak: prev.cleanStreak || 0, lastSessionId: prev.lastSessionId || null, painSessions: (prev.painSessions || []).slice() };
    const newSession = next.lastSessionId !== sessionId;
    if (pain > K.VALIDATOR_RULES.painFlagThreshold.value) {
      next.flagged = true; next.cleanStreak = 0;
      if (!next.painSessions.some(s => s.sessionId === sessionId)) next.painSessions.push({ sessionId, date: today });
    } else if (next.flagged && newSession) {
      next.cleanStreak += 1;
      if (next.cleanStreak >= 2) { next.flagged = false; next.cleanStreak = 0; }
    }
    next.lastSessionId = sessionId;
    next.painSessions = recentPainSessions(next, today);
    return next;
  }

  // DEC-011 (E4): ¿recomendar consultar a un profesional? Sí si el patrón
  // tuvo dolor por encima del umbral en 2 o más sesiones DISTINTAS dentro de
  // las últimas 4 semanas, no necesariamente seguidas. Independiente de si la
  // marca de sustitución sigue activa.
  function painProfessionalAdvice(rec, today) {
    const sessions = recentPainSessions(rec, today).length;
    return { advise: sessions >= K.VALIDATOR_RULES.painAdviceMinSessions.value, sessions, evidence: 'E4' };
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
  // dolor registrado en cada serie (`workouts[].pain`). No muta el original.
  function exportProfile(profile) {
    const out = {};
    Object.keys(profile).forEach(k => { if (k !== 'painFlags') out[k] = profile[k]; });
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
    const remap = row => { const c = Object.assign({}, row); if ('profileId' in c && newProfileId) c.profileId = newProfileId; return c; };
    let droppedPain = false;
    const workouts = (Array.isArray(item.workouts) ? item.workouts : []).filter(isRow).map(w => {
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
      data: migrateLongSessionAcceptance(normalizeProfile(stripHealthFields(item.data)), today),
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

  function normalizeAcceptance(a) {
    if (!a || typeof a !== 'object') return null;
    const maxSets = Math.round(Number(a.maxSets));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.on || '') || typeof a.signature !== 'string' || !a.signature || !(maxSets > 0)) return null;
    return { on: a.on, signature: a.signature, maxSets };
  }

  function normalizeProfile(src) {
    const n = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
    const sex = src.sex === 'F' ? 'F' : 'M';
    let division = src.division;
    if (!K.DIVISIONS[division] || K.DIVISIONS[division].sex !== sex) division = sex === 'M' ? 'general_m' : 'general_w';
    const validMuscles = Object.keys(K.EXERCISES);
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
      // DEC-014: aceptación explícita de sesiones más largas que el tope E4 (fecha AAAA-MM-DD).
      longSessionAcceptedOn: /^\d{4}-\d{2}-\d{2}$/.test(src.longSessionAcceptedOn || '') ? src.longSessionAcceptedOn : '',
      // DEC-016: la misma aceptación, acotada a la firma del plan y a un máximo de series. Reemplaza al campo anterior.
      longSessionAcceptance: normalizeAcceptance(src.longSessionAcceptance),
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

  return { bmrMifflin, bmrKatch, bodyFatNavy, ffmi, classicLimit, computeMetrics, computeTargets, computeNutrition, computeTraining, fractionalByMuscle, ensureGroupMinimum, enforceSessionCap, completeToFloor, diminishingReturnsWarnings, computeHealthScreen, buildPlan, planSignature, migrateLongSessionAcceptance, normalizeProfile, validateProfile, exerciseFields, carryOverInjuryClearances, reconcileInjuryClearances, zonesPendingReauthorization, applyPainReading, painProfessionalAdvice, exportProfile, prepareImportedProfile, localHealthConflicts, SPLITS, LB_PER_KG };
});
