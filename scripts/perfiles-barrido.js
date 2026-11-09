#!/usr/bin/env node
/* Los 90 perfiles del barrido de referencia (3 niveles × 3 objetivos × 5 divisiones × con y sin rezagados).
 * Combinados con 3, 4, 5 y 6 días dan los 360 planes sobre los que corre la prueba de aceptación del núcleo
 * (`scripts/aceptacion-nucleo-v2.js`). Son los mismos perfiles que usó la simulación de la Fase 3 (DEC-021),
 * así que las cifras de los informes anteriores siguen siendo comparables. Solo son datos: no generan nada. */
'use strict';

const base = { name: 'T', sex: 'M', age: 30, heightCm: 178, weightKg: 85, bodyFatPct: 15, activity: 'moderate' };
const profiles = [];
for (const level of ['novice', 'intermediate', 'advanced']) for (const goal of ['cut', 'bulk', 'maintain'])
  for (const [sex, division] of [['M', 'general_m'], ['M', 'classic_m'], ['M', 'physique_m'], ['F', 'bikini_w'], ['F', 'wellness_w']])
    for (const lag of [[], ['quads', 'hamstrings', 'glutes']]) profiles.push({ ...base, sex, division, level, goal, laggingMuscles: lag });

module.exports = { profiles };

if (require.main === module) console.log(`${profiles.length} perfiles de referencia`);
