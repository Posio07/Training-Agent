# Prueba de aceptación del núcleo v2 (paso 3.10, B-039)

Generado por `node scripts/aceptacion-nucleo-v2.js --escribir`. Solo lee: **no corrige nada**. Si un criterio no se cumple, este informe lo dice y la decisión es de Emanuel.

Criterios de `docs/specs/nucleo-v2.md` ("Criterios de aceptación") evaluados sobre el barrido de **360 planes** (90 perfiles de `scripts/simular-reglas-articulares.js` × 3, 4, 5 y 6 días), con el reparto nuevo y el catálogo nuevo, sin cambiar el tiempo por defecto (75 min por sesión). Motor del plan guardado: `core-v2.2`.

**Resultado: 12 cumplen · 0 cumplen con aviso · 2 no cumplen · 1 son un informe.**

| # | Criterio | Resultado |
| --- | --- | --- |
| 1 | Ninguna sesión supera su capacidad en minutos sin la aceptación explícita del usuario | ✅ cumple |
| 2 | Todo día de tirón tiene tirón vertical y horizontal, y su top set es un tirón | ✅ cumple |
| 3 | Ninguna sesión tiene el top set fuera del patrón principal de su tipo | ✅ cumple |
| 4 | La rutina corta cabe en el tiempo fijado, con los patrones obligatorios primero; si no caben todos, el aviso lo dice | ✅ cumple |
| 5 | Ninguna sesión por defecto tiene dos ejercicios de lumbar alta | ✅ cumple |
| 6 | Ningún músculo supera 11 series fraccionadas por sesión (DEC-025), o queda sin cubrir con el aviso único | ✅ cumple |
| 7 | Porcentaje de planes (de los 360) en que R1 deja necesidad semanal sin cubrir, por músculo y por número de días | ℹ️ informe |
| 8 | La aceptación de una sesión se guarda en el plan y caduca al regenerarlo o al cambiar tiempo, días u objetivo del perfil | ✅ cumple |
| 9 | La frecuencia y las garantías de DEC-014, DEC-017 y DEC-020 se cumplen, o el usuario ve el aviso único | ❌ no cumple |
| 10 | Los ejercicios prioritarios aparecen en todos los días de su patrón, salvo restricción de seguridad avisada | ✅ cumple |
| 11 | El patrón principal de cada sesión tiene al menos 4 series de trabajo, o el aviso único dice que no cupo en el tiempo (DEC-029) | ✅ cumple |
| 12 | Todo grupo del perfil tiene por semana un ejercicio directo con 2 series o más, o el aviso único lo dice (DEC-029) | ✅ cumple |
| 13 | Ningún ejercicio pasa de 5 series en una sesión, salvo que su patrón no tenga otra variante que quepa; el volumen total no baja (DEC-031) | ✅ cumple |
| 14 | No queda ningún número fuera del registro ni código muerto | ❌ no cumple |
| 15 | El caso del 5 nov no reproduce el día de sentadilla y peso muerto rumano juntos | ✅ cumple |

## 1. Ninguna sesión supera su capacidad en minutos sin la aceptación explícita del usuario

**✅ cumple.** 0 incumplimientos en 1620 sesiones.

## 2. Todo día de tirón tiene tirón vertical y horizontal, y su top set es un tirón

**✅ cumple.** 0 incumplimientos en 270 días de tirón (90 con top set: solo en definición, DEC-002).

## 3. Ninguna sesión tiene el top set fuera del patrón principal de su tipo

**✅ cumple.** 0 incumplimientos en 540 top sets.

## 4. La rutina corta cabe en el tiempo fijado, con los patrones obligatorios primero; si no caben todos, el aviso lo dice

**✅ cumple.** 0 incumplimientos en 4860 rutinas cortas (20, 30, 45 min por cada sesión), 270 con aviso de patrones que no caben.

## 5. Ninguna sesión por defecto tiene dos ejercicios de lumbar alta

**✅ cumple.** 0 incumplimientos en 360 planes.

## 6. Ningún músculo supera 11 series fraccionadas por sesión (DEC-025), o queda sin cubrir con el aviso único

**✅ cumple.** 0 sesiones por encima de 11.

## 7. Porcentaje de planes (de los 360) en que R1 deja necesidad semanal sin cubrir, por músculo y por número de días

**ℹ️ informe.** 43 de 360 planes (11.9 %) con algún músculo sin cubrir por R1; Emanuel lo revisa.

| Músculo | Total | 3 días | 4 días | 5 días | 6 días |
| --- | --- | --- | --- | --- | --- |
| Pecho | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Espalda | 16 (4.4 %) | 0 de 90 | 0 de 90 | 8 de 90 | 8 de 90 |
| Hombros | 4 (1.1 %) | 0 de 90 | 4 de 90 | 0 de 90 | 0 de 90 |
| Cuádriceps | 10 (2.8 %) | 0 de 90 | 2 de 90 | 4 de 90 | 4 de 90 |
| Isquiotibiales | 12 (3.3 %) | 0 de 90 | 4 de 90 | 4 de 90 | 4 de 90 |
| Glúteos | 29 (8.1 %) | 3 de 90 | 12 de 90 | 10 de 90 | 4 de 90 |
| Pantorrillas | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Bíceps | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Tríceps | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Abdomen | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |

## 8. La aceptación de una sesión se guarda en el plan y caduca al regenerarlo o al cambiar tiempo, días u objetivo del perfil

**✅ cumple.** 0 incumplimientos en 60 planes (uno de cada seis del barrido).

## 9. La frecuencia y las garantías de DEC-014, DEC-017 y DEC-020 se cumplen, o el usuario ve el aviso único

**❌ no cumple.** Pisos (DEC-014/017/020: 10 series fraccionadas por semana para los grupos mayores, 5 con énfasis reducido, 5 los chicos) y series reales: 0 sin aviso. Frecuencia mínima de 2 sesiones por semana en los grupos mayores: 84 caso(s) por debajo (la regla está `pendiente` en el registro: ninguna lógica la lee).

- 3 días · M/physique_m/novice/cut · Isquiotibiales: 1 sesión(es) por semana
- 3 días · M/physique_m/novice/bulk · Isquiotibiales: 1 sesión(es) por semana
- 3 días · M/physique_m/novice/maintain · Isquiotibiales: 1 sesión(es) por semana
- 3 días · M/physique_m/intermediate/bulk · Isquiotibiales: 1 sesión(es) por semana
- 3 días · M/physique_m/intermediate/maintain · Isquiotibiales: 1 sesión(es) por semana

## 10. Los ejercicios prioritarios aparecen en todos los días de su patrón, salvo restricción de seguridad avisada

**✅ cumple.** 0 incumplimientos en 90 planes (uno de cada cuatro) con 3 prioritarios (quads.squat_back, chest.bench_press_barbell, back.lat_pulldown), 383 días de su patrón.

## 11. El patrón principal de cada sesión tiene al menos 4 series de trabajo, o el aviso único dice que no cupo en el tiempo (DEC-029)

**✅ cumple.** 0 incumplimientos en 1620 sesiones (0 con menos de 4 series y aviso).

## 12. Todo grupo del perfil tiene por semana un ejercicio directo con 2 series o más, o el aviso único lo dice (DEC-029)

**✅ cumple.** 0 incumplimientos en 3600 grupo-planes (0 con aviso).

## 13. Ningún ejercicio pasa de 5 series en una sesión, salvo que su patrón no tenga otra variante que quepa; el volumen total no baja (DEC-031)

**✅ cumple.** 0 incumplimientos en 9605 ejercicios (893 con más de 5 series, todos avisados si la lista de incumplimientos está vacía); volumen: 34849 series con el tope, 34849 sin él.

## 14. No queda ningún número fuera del registro ni código muerto

**❌ no cumple.** 73 número(s) distintos escritos en el código de core-v2 fuera del registro (sin contar 0, 1, 2 y 100), 13 función(es) exportada(s) que no usa nadie y 22 que solo usan los tests. Es una lectura automática: son candidatos, no veredictos.

- por archivo: aviso.js 4 · catalogo.js 8 · dolor.js 3 · pantallas/comun.js 1 · pantallas/perfil.js 2 · pantallas/progreso.js 10 · pantallas/sesion.js 35 · reparto.js 6 · sesion.js 4
- número 999 en ifbb-pro-agent/js/core-v2/aviso.js:17  const DIAS_MAX = REPARTO.normalizarPerfil({ daysPerWeek: 999 }).dias;
- número 10 en ifbb-pro-agent/js/core-v2/aviso.js:19  const n1 = x => String(Math.round(x * 10) / 10).replace('', '');
- número 60 en ifbb-pro-agent/js/core-v2/aviso.js:24  return Math.ceil(valor('') * (valor('') + valor('')) / 60);
- número 9 en ifbb-pro-agent/js/core-v2/aviso.js:40  const alTope = entrenan.filter(([, f]) => f >= tope - 1e-9);
- número 6 en ifbb-pro-agent/js/core-v2/catalogo.js:66  v('', '', '', M, [6, 10]),
- número 10 en ifbb-pro-agent/js/core-v2/catalogo.js:66  v('', '', '', M, [6, 10]),
- número 8 en ifbb-pro-agent/js/core-v2/catalogo.js:67  v('', '', '', M, [8, 12]),
- número 12 en ifbb-pro-agent/js/core-v2/catalogo.js:67  v('', '', '', M, [8, 12]),
- número 15 en ifbb-pro-agent/js/core-v2/catalogo.js:70  v('', '', '', A, [10, 15], ''),
- número 5 en ifbb-pro-agent/js/core-v2/catalogo.js:127  v('', '', '', A, [5, 8], null, { soloDivisiones: '' }),
- número 20 en ifbb-pro-agent/js/core-v2/catalogo.js:132  v('', '', '', M, [20, 40], null, { habilitaPor: '', sinAporte: true }),
- número 40 en ifbb-pro-agent/js/core-v2/catalogo.js:132  v('', '', '', M, [20, 40], null, { habilitaPor: '', sinAporte: true }),
- número 3 en ifbb-pro-agent/js/core-v2/dolor.js:21  const ORDEN_NIVEL = { ninguna: 0, baja: 1, media: 2, alta: 3 };
- número 9 en ifbb-pro-agent/js/core-v2/dolor.js:28  const valida = !(pesoTopSet > 0) \|\| !(pesoBackoff > 0) \|\| pesoBackoff <= maximo + 1e-9;
- número 86400000 en ifbb-pro-agent/js/core-v2/dolor.js:50  const dias = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000);
- número 10 en ifbb-pro-agent/js/core-v2/pantallas/comun.js:9  const n1 = v => (Math.round(v * 10) / 10).toLocaleString('');
- número 4 en ifbb-pro-agent/js/core-v2/pantallas/perfil.js:49  const PERFIL_NUEVO = { sex: '', activity: '', level: '', daysPerWeek: 4, goal: '', division: '' };
- número 6 en ifbb-pro-agent/js/core-v2/pantallas/perfil.js:197  for (let i = 0; i < 6; i++) {
- número 30 en ifbb-pro-agent/js/core-v2/pantallas/progreso.js:14  const LIMITE_HISTORIAL = 30;
- número 340 en ifbb-pro-agent/js/core-v2/pantallas/progreso.js:41  const W = 340, H = 160, L = 36, R = 8, T = 10, B = 24;
- número 160 en ifbb-pro-agent/js/core-v2/pantallas/progreso.js:41  const W = 340, H = 160, L = 36, R = 8, T = 10, B = 24;
- número 36 en ifbb-pro-agent/js/core-v2/pantallas/progreso.js:41  const W = 340, H = 160, L = 36, R = 8, T = 10, B = 24;
- número 8 en ifbb-pro-agent/js/core-v2/pantallas/progreso.js:41  const W = 340, H = 160, L = 36, R = 8, T = 10, B = 24;
- número 10 en ifbb-pro-agent/js/core-v2/pantallas/progreso.js:41  const W = 340, H = 160, L = 36, R = 8, T = 10, B = 24;
- número 24 en ifbb-pro-agent/js/core-v2/pantallas/progreso.js:41  const W = 340, H = 160, L = 36, R = 8, T = 10, B = 24;
- número 7 en ifbb-pro-agent/js/core-v2/pantallas/progreso.js:44  const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 7 * 86400000);
- número 86400000 en ifbb-pro-agent/js/core-v2/pantallas/progreso.js:44  const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 7 * 86400000);
- número 2.5 en ifbb-pro-agent/js/core-v2/pantallas/progreso.js:45  const yMin = Math.min(...ys) - 2.5, yMax = Math.max(...ys) + 2.5;
- número 90 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:23  const n = m ? parseFloat(m[1].replace('', '')) : 90;
- número 60 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:24  return Math.round(/min/.test(label \|\| '') ? n * 60 : n);
- número 6 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:37  sorted.forEach(p => { while (remaining >= p - 1e-6) { used.push(p); remaining -= p; } });
- número 64 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:46  const heightFor = w => Math.min(64, 24 + w * (unit === '' ? 0.55 : 1.2));
- número 24 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:46  const heightFor = w => Math.min(64, 24 + w * (unit === '' ? 0.55 : 1.2));
- número 0.55 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:46  const heightFor = w => Math.min(64, 24 + w * (unit === '' ? 0.55 : 1.2));
- número 1.2 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:46  const heightFor = w => Math.min(64, 24 + w * (unit === '' ? 0.55 : 1.2));
- número 35 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:47  const widthFor = w => (unit === '' ? w >= 35 : w >= 10) ? 11 : 7;
- número 10 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:47  const widthFor = w => (unit === '' ? w >= 35 : w >= 10) ? 11 : 7;
- número 11 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:47  const widthFor = w => (unit === '' ? w >= 35 : w >= 10) ? 11 : 7;
- número 7 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:47  const widthFor = w => (unit === '' ? w >= 35 : w >= 10) ? 11 : 7;
- número 96 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:48  let x = 96, i = 0;
- número 1.5 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:53  x += wd + 1.5; i++;
- número 45 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:95  const bar = profile.data.barWeight \|\| (unit === '' ? 45 : 20);
- número 20 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:95  const bar = profile.data.barWeight \|\| (unit === '' ? 45 : 20);
- número 0.01 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:98  const exact = Math.abs(res.diff) < 0.01;
- número 4 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:182  <div class="">Registraste dolor por encima del umbral en ${esc(ZONAS_ETIQUETA[ex.painAdvice.zona])} en ${ex.pa
- número 60000 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:196  const minutos = Math.max(1, Math.round((ahora - sm.startedAt) / 60000));
- número 52 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:237  const RADIO = 52, CIRC = 2 * Math.PI * RADIO;
- número 0.02 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:242  const t0 = audio.currentTime + 0.02;
- número 0.28 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:243  [0, 0.28, 0.56].forEach((dt, i) => { const osc = audio.createOscillator(), g = audio.createGain(); osc.type = 
- número 0.56 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:243  [0, 0.28, 0.56].forEach((dt, i) => { const osc = audio.createOscillator(), g = audio.createGain(); osc.type = 
- número 1175 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:243  [0, 0.28, 0.56].forEach((dt, i) => { const osc = audio.createOscillator(), g = audio.createGain(); osc.type = 
- número 880 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:243  [0, 0.28, 0.56].forEach((dt, i) => { const osc = audio.createOscillator(), g = audio.createGain(); osc.type = 
- número 0.0001 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:243  [0, 0.28, 0.56].forEach((dt, i) => { const osc = audio.createOscillator(), g = audio.createGain(); osc.type = 
- número 0.35 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:243  [0, 0.28, 0.56].forEach((dt, i) => { const osc = audio.createOscillator(), g = audio.createGain(); osc.type = 
- número 0.2 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:243  [0, 0.28, 0.56].forEach((dt, i) => { const osc = audio.createOscillator(), g = audio.createGain(); osc.type = 
- número 0.22 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:243  [0, 0.28, 0.56].forEach((dt, i) => { const osc = audio.createOscillator(), g = audio.createGain(); osc.type = 
- número 30 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:258  $('').onclick = () => { SS.extendRest(sm, 30); persistir(); tic(); };
- número 250 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:261  if (sm && sm.rest) timer = setInterval(tic, 250);
- número 200 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:273  if (!tarde) { tono(); if (nav.vibrate) nav.vibrate([200, 100, 200]); const w = $(''); if (w) { w.classList.add
- número 500 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:273  if (!tarde) { tono(); if (nav.vibrate) nav.vibrate([200, 100, 200]); const w = $(''); if (w) { w.classList.add
- número 70 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:329  if (nav.vibrate) nav.vibrate([90, 70, 90]);
- número 300 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:334  setTimeout(() => { banner.classList.remove(''); setTimeout(() => banner.remove(), 300); }, 2000);
- número 2000 en ifbb-pro-agent/js/core-v2/pantallas/sesion.js:334  setTimeout(() => { banner.classList.remove(''); setTimeout(() => banner.remove(), 300); }, 2000);
- número 9 en ifbb-pro-agent/js/core-v2/reparto.js:18  const EPS = 1e-9;
- número 4 en ifbb-pro-agent/js/core-v2/reparto.js:55  const dias = clamp(Math.round(parseFloat(s.daysPerWeek)) \|\| 4, 3, 6);
- número 3 en ifbb-pro-agent/js/core-v2/reparto.js:55  const dias = clamp(Math.round(parseFloat(s.daysPerWeek)) \|\| 4, 3, 6);
- número 6 en ifbb-pro-agent/js/core-v2/reparto.js:55  const dias = clamp(Math.round(parseFloat(s.daysPerWeek)) \|\| 4, 3, 6);
- número 60 en ifbb-pro-agent/js/core-v2/reparto.js:142  return { indice: i, nombre, clave, spec, capacidadSeg: perfil.minutosPorDia[i] * 60, seg: 0, frac: {}, ejercic
- número 4000 en ifbb-pro-agent/js/core-v2/reparto.js:306  for (let guarda = 0; guarda < 4000; guarda++) {
- número 60 en ifbb-pro-agent/js/core-v2/sesion.js:18  const fmtSeg = s => (s % 60 === 0 ?                 : (s > 120 ?                                          
- número 120 en ifbb-pro-agent/js/core-v2/sesion.js:18  const fmtSeg = s => (s % 60 === 0 ?                 : (s > 120 ?                                          
- número 30 en ifbb-pro-agent/js/core-v2/sesion.js:115  const epley = (w, r) => w * (1 + r / 30);
- número 10 en ifbb-pro-agent/js/core-v2/sesion.js:121  if (!s.mejor \|\| e > s.mejor.e1rm) s.mejor = { weight: w.weight, reps: w.reps, e1rm: Math.round(e * 10) / 10 };
- sin uso: ifbb-pro-agent/js/core-v2/almacen.js: `medicionInicial`
- sin uso: ifbb-pro-agent/js/core-v2/aviso.js: `ETIQUETAS`
- sin uso: ifbb-pro-agent/js/core-v2/aviso.js: `limitadaPorTiempo`
- sin uso: ifbb-pro-agent/js/core-v2/pantallas/entreno.js: `htmlSesion`
- sin uso: ifbb-pro-agent/js/core-v2/pantallas/entreno.js: `htmlEjercicio`
- sin uso: ifbb-pro-agent/js/core-v2/pantallas/entreno.js: `htmlAviso`
- sin uso: ifbb-pro-agent/js/core-v2/pantallas/perfil.js: `prioritariasPosibles`
- sin uso: ifbb-pro-agent/js/core-v2/pantallas/progreso.js: `graficoFuerza`
- sin uso: ifbb-pro-agent/js/core-v2/plan.js: `CAMPOS_ACEPTACION`
- sin uso: ifbb-pro-agent/js/core-v2/plan.js: `perfilParaReparto`
- sin uso: ifbb-pro-agent/js/core-v2/plan.js: `firmaDelPerfil`
- sin uso: ifbb-pro-agent/js/core-v2/plan.js: `camposCambiados`
- sin uso: ifbb-pro-agent/js/core-v2/registro.js: `reglasActivas`
- solo tests: ifbb-pro-agent/js/core-v2/almacen.js: `estadoVacio`
- solo tests: ifbb-pro-agent/js/core-v2/aviso.js: `bloqueMinimoMin`
- solo tests: ifbb-pro-agent/js/core-v2/catalogo.js: `PATRONES`
- solo tests: ifbb-pro-agent/js/core-v2/dolor.js: `clasificarBackoff`
- solo tests: ifbb-pro-agent/js/core-v2/dolor.js: `aplicarLectura`
- solo tests: ifbb-pro-agent/js/core-v2/dolor.js: `zonasMarcadas`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/entreno.js: `avisosDelPlan`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/progreso.js: `variantesRegistradas`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/progreso.js: `puntosDeFuerza`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/progreso.js: `htmlFuerza`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/progreso.js: `htmlHistorial`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/sesion.js: `htmlVariantes`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/sesion.js: `prepararSesion`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/sesion.js: `tipoDeSerie`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/sesion.js: `htmlSerie`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/sesion.js: `htmlEjercicioSesion`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/sesion.js: `htmlResumen`
- solo tests: ifbb-pro-agent/js/core-v2/plan.js: `CAMPOS`
- solo tests: ifbb-pro-agent/js/core-v2/registro.js: `REGLAS`
- solo tests: ifbb-pro-agent/js/core-v2/reparto.js: `GRUPOS_CHICOS`
- solo tests: ifbb-pro-agent/js/core-v2/sesion.js: `ultimaVariante`
- solo tests: ifbb-pro-agent/js/core-v2/textos.js: `IDS`

## 15. El caso del 5 nov no reproduce el día de sentadilla y peso muerto rumano juntos

**✅ cumple.** 0 incumplimientos en 1620 sesiones del barrido y el perfil de Emanuel (pierna, definición, 4 días).

