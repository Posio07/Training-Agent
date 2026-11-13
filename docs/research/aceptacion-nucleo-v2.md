# Prueba de aceptación del núcleo v2 (paso 3.10, B-039)

Generado por `node scripts/aceptacion-nucleo-v2.js --escribir`. Solo lee: **no corrige nada**. Si un criterio no se cumple, este informe lo dice y la decisión es de Emanuel.

Criterios de `docs/specs/nucleo-v2.md` ("Criterios de aceptación") evaluados sobre el barrido de **360 planes** (90 perfiles de `scripts/perfiles-barrido.js` × 3, 4, 5 y 6 días), con el reparto nuevo y el catálogo nuevo, sin cambiar el tiempo por defecto (75 min por sesión). Motor del plan guardado: `core-v2.6`.

**Resultado: 13 cumplen · 1 cumplen con aviso · 0 no cumplen · 1 son un informe.**

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
| 9 | La frecuencia y las garantías de DEC-014, DEC-017 y DEC-020 se cumplen, o el usuario ve el aviso único | ⚠️ cumple con aviso |
| 10 | Los ejercicios prioritarios aparecen en todos los días de su patrón, salvo restricción de seguridad avisada | ✅ cumple |
| 11 | El patrón principal de cada sesión tiene al menos 4 series de trabajo, o el aviso único dice que no cupo en el tiempo (DEC-029) | ✅ cumple |
| 12 | Todo grupo del perfil tiene por semana un ejercicio directo con 2 series o más, o el aviso único lo dice (DEC-029) | ✅ cumple |
| 13 | Ningún ejercicio pasa de 5 series en una sesión, salvo que no haya otra variante del patrón ni otro ejercicio del músculo que quepa; el volumen total no baja (DEC-031, DEC-037) | ✅ cumple |
| 14 | No queda ningún número fuera del registro ni código muerto | ✅ cumple |
| 15 | El caso del 5 nov no reproduce el día de sentadilla y peso muerto rumano juntos | ✅ cumple |

## 1. Ninguna sesión supera su capacidad en minutos sin la aceptación explícita del usuario

**✅ cumple.** 0 incumplimientos en 1620 sesiones.

## 2. Todo día de tirón tiene tirón vertical y horizontal, y su top set es un tirón

**✅ cumple.** 0 incumplimientos en 270 días de tirón (90 con top set: solo en definición, DEC-002).

## 3. Ninguna sesión tiene el top set fuera del patrón principal de su tipo

**✅ cumple.** 0 incumplimientos en 540 top sets.

## 4. La rutina corta cabe en el tiempo fijado, con los patrones obligatorios primero; si no caben todos, el aviso lo dice

**✅ cumple.** 0 incumplimientos en 4860 rutinas cortas (20, 30, 45 min por cada sesión), 270 con aviso de patrones que no caben. Mide que todo patrón obligatorio del tipo esté o esté avisado: que los obligatorios entren primero es la estructura del reparto (paso 3), que aquí no se puede observar desde la salida.

## 5. Ninguna sesión por defecto tiene dos ejercicios de lumbar alta

**✅ cumple.** 0 incumplimientos en 360 planes.

## 6. Ningún músculo supera 11 series fraccionadas por sesión (DEC-025), o queda sin cubrir con el aviso único

**✅ cumple.** 0 sesiones por encima de 11.

## 7. Porcentaje de planes (de los 360) en que R1 deja necesidad semanal sin cubrir, por músculo y por número de días

**ℹ️ informe.** 36 de 360 planes (10 %) con algún músculo sin cubrir por R1; Emanuel lo revisa.

| Músculo | Total | 3 días | 4 días | 5 días | 6 días |
| --- | --- | --- | --- | --- | --- |
| Pecho | 12 (3.3 %) | 0 de 90 | 12 de 90 | 0 de 90 | 0 de 90 |
| Espalda | 24 (6.7 %) | 0 de 90 | 8 de 90 | 8 de 90 | 8 de 90 |
| Hombros | 12 (3.3 %) | 0 de 90 | 12 de 90 | 0 de 90 | 0 de 90 |
| Cuádriceps | 2 (0.6 %) | 0 de 90 | 0 de 90 | 0 de 90 | 2 de 90 |
| Isquiotibiales | 4 (1.1 %) | 0 de 90 | 0 de 90 | 2 de 90 | 2 de 90 |
| Glúteos | 6 (1.7 %) | 0 de 90 | 0 de 90 | 2 de 90 | 4 de 90 |
| Pantorrillas | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Bíceps | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Tríceps | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |
| Abdomen | 0 (0 %) | 0 de 90 | 0 de 90 | 0 de 90 | 0 de 90 |

## 8. La aceptación de una sesión se guarda en el plan y caduca al regenerarlo o al cambiar tiempo, días u objetivo del perfil

**✅ cumple.** 0 incumplimientos en 60 planes (uno de cada seis del barrido).

## 9. La frecuencia y las garantías de DEC-014, DEC-017 y DEC-020 se cumplen, o el usuario ve el aviso único

**⚠️ cumple con aviso.** Pisos (DEC-014/017/020: 10 series fraccionadas por semana para los grupos mayores, 5 con énfasis reducido, 5 los chicos) y series reales: 0 sin aviso. Frecuencia mínima de 2 sesiones por semana en los grupos mayores: 74 caso(s) por debajo con aviso en el aviso único (DEC-036, aviso y no restricción) y 0 sin aviso.

## 10. Los ejercicios prioritarios aparecen en todos los días de su patrón, salvo restricción de seguridad avisada

**✅ cumple.** 0 incumplimientos en 90 planes (uno de cada cuatro) con 3 prioritarios (quads.squat_back, chest.bench_press_barbell, back.lat_pulldown), 383 días de su patrón.

## 11. El patrón principal de cada sesión tiene al menos 4 series de trabajo, o el aviso único dice que no cupo en el tiempo (DEC-029)

**✅ cumple.** 0 incumplimientos en 1620 sesiones (0 con menos de 4 series y aviso).

## 12. Todo grupo del perfil tiene por semana un ejercicio directo con 2 series o más, o el aviso único lo dice (DEC-029)

**✅ cumple.** 0 incumplimientos en 3600 grupo-planes (0 con aviso).

## 13. Ningún ejercicio pasa de 5 series en una sesión, salvo que no haya otra variante del patrón ni otro ejercicio del músculo que quepa; el volumen total no baja (DEC-031, DEC-037)

**✅ cumple.** 0 incumplimientos en 10651 ejercicios (230 con más de 5 series, todos avisados si la lista de incumplimientos está vacía); volumen: 34055 series con el tope, 34055 sin él. Salvedad: que un ejercicio avisado de verdad no tenga otra variante del patrón que quepa lo declara el reparto ("avisos.topeExcedido"); esta prueba no lo recalcula.

## 14. No queda ningún número fuera del registro ni código muerto

**✅ cumple.** 0 número(s) de entrenamiento fuera del registro (no cuentan 0, 1, 2, 100, las conversiones de unidad, las tolerancias ni la interfaz); 0 exportación(es) que nadie usa y 29 que solo usan los tests: 0 declaradas para borrar en el corte (B-057), 29 que prueban comportamiento real y se conservan, 0 sin declarar. Es una lectura automática: son candidatos, no veredictos.

- por archivo: 
- solo tests: ifbb-pro-agent/js/core-v2/almacen.js: `CLAVE`
- solo tests: ifbb-pro-agent/js/core-v2/aviso.js: `bloqueMinimoMin`
- solo tests: ifbb-pro-agent/js/core-v2/catalogo.js: `variantesDePatron`
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
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/sesion.js: `platesForWeight`
- solo tests: ifbb-pro-agent/js/core-v2/pantallas/sesion.js: `parseRestSeconds`
- solo tests: ifbb-pro-agent/js/core-v2/plan.js: `CAMPOS`
- solo tests: ifbb-pro-agent/js/core-v2/registro.js: `REGLAS`
- solo tests: ifbb-pro-agent/js/core-v2/reparto.js: `SPLITS`
- solo tests: ifbb-pro-agent/js/core-v2/reparto.js: `TIPOS`
- solo tests: ifbb-pro-agent/js/core-v2/reparto.js: `MUSCULOS`
- solo tests: ifbb-pro-agent/js/core-v2/reparto.js: `GRUPOS_MAYORES`
- solo tests: ifbb-pro-agent/js/core-v2/reparto.js: `GRUPOS_CHICOS`
- solo tests: ifbb-pro-agent/js/core-v2/reparto.js: `pesosDe`
- solo tests: ifbb-pro-agent/js/core-v2/reparto.js: `compararDecision`
- solo tests: ifbb-pro-agent/js/core-v2/sesion.js: `ultimaVariante`

## 15. El caso del 5 nov no reproduce el día de sentadilla y peso muerto rumano juntos

**✅ cumple.** 0 incumplimientos en 1620 sesiones del barrido y el perfil de Emanuel (pierna, definición, 4 días).

