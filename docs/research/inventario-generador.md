# Inventario del generador (base para la spec del núcleo nuevo)

Fecha 2026-11-07, sobre `main` tras el PR #32 (DEC-022). **Solo lectura: ningún código ni dato cambió.** Es la entrada para que Emanuel escriba la spec del núcleo nuevo (DEC-023: clean core, sin retrocompatibilidad de datos durante el año de prueba).

## Qué se leyó y cómo se comprobó
- `ifbb-pro-agent/js/engine.js` completo en los tramos del generador (`buildPlan`, `computeTraining` y todas sus funciones auxiliares), `knowledge.js` (catálogo, `VALIDATOR_RULES`, perfil articular), y de `app.js` y `sessionStore.js` solo lo que toca al plan.
- `DECISIONS.md` (DEC-001 a DEC-023), `docs/specs/validador.md` y `docs/specs/validador-fase3.md` como referencia de nivel de evidencia.
- Los 170 tests de `engine.test.js` (se numeran por su posición en el archivo hoy), los 3 de `regression.test.js`, los 4 E2E y los 4 archivos de `tests/fixtures/`.
- "Sin uso" se comprobó buscando cada nombre en `js/`, `tests/` y `scripts/`; los números salen de ejecutar el generador (barrido de 360 planes: 90 perfiles × 3, 4, 5 y 6 días). Lo que **no** se auditó línea a línea: nutrición y cálculo de metas (se resume abajo) y la interfaz.

## 0. Resumen
1. El generador es una secuencia de **pasos que se corrigen entre sí**: el reparto inicial no mira la capacidad de las sesiones; después el tope de 25 recorta, el piso completa, el mínimo de grupos chicos vuelve a mover series y los avisos informan lo que quedó (sección 3).
2. **108 de 1620 sesiones** del barrido pasan de 25 series sin aceptación, y 467 avisos informan sesiones con más de 11 series fraccionadas de un músculo: salen del reparto, no del tope.
3. Hay **números fijos dentro del código sin entrada en `VALIDATOR_RULES`** (volumen base 18/14/10, factores ×0,85, ×1,25, ×0,5, ×0,6, tope 20, top set 4–6 repeticiones, descansos 150/75 s, cardio, progresión, descarga). Incumplen la regla 3 de CLAUDE.md (sección 4).
4. **Código muerto o sin uso:** 5 reglas `pendiente` que ningún código lee, una constante sin ningún uso, 7 exportaciones que nadie llama, y todo el camino de retrocompatibilidad de la aceptación de sesiones largas (sección 5).
5. De los 170 tests de `engine.test.js`: **120 se conservan tal cual** (comportamiento), **26 se conservan en intención** y se reescriben contra la API nueva, y **24 se descartan** (congelan la salida actual, prueban estructura interna o retrocompatibilidad). Los 3 de `regression.test.js` y los 4 archivos de fixtures se descartan junto con el motor (sección 6); las 30 huellas son el test 95.
6. El día de tirón con press militar y la versión corta de 1 o 0 ejercicios tienen causa en el diseño actual (rotación del catálogo sin noción de función del día; la versión corta vive en la interfaz): ver `docs/research/diagnostico-rutina-corta-y-dia-de-tiron.md`.

## 1. Cadena completa de `buildPlan` (orden de ejecución)

| # | Paso | Qué hace | DEC | Nivel de evidencia | Tipo | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | `normalizeProfile` / `validateProfile` | Completa y limpia el perfil (nivel, objetivo, rezagados, aceptación, salud); valida datos | DEC-001, 005, 009, 016 | n/a | estricta (rechaza datos inválidos) | 12, 15, 20, 120 |
| P2 | `computeMetrics` | IMC, % de grasa (medido o Navy), masa magra, TMB (Katch o Mifflin), gasto, FFMI; avisos de menor de 18, IMC bajo, FFMI alto, grasa inconsistente | DEC-004 | fórmulas publicadas; umbral de 4 puntos = criterio de la app (E4) | avisos | 1–3, 8, 17 |
| P3 | `computeTargets` | Grasa objetivo según división, peso objetivo, ritmo semanal, fecha, límite Classic | DEC-004 | fuentes del catálogo; límites de seguridad = criterio de la app | avisos y topes de seguridad | 6, 7, 9 |
| P4 | `computeNutrition` | Calorías, proteína, grasa, carbohidratos, fibra, agua, guía de alimentos | DEC-019 | fuentes del catálogo (Helms, EFSA…) | estricta con reglas de seguridad (déficit máx. 30 %, piso en el gasto en reposo) | 4, 5, 138 |
| P5 | `computeTraining` | **El generador de entrenamiento: sección 2** | DEC-001 a 003, 005 a 008, 011, 014 a 017, 020 a 022 | mezcla E1 a E4 | mezcla | ver sección 2 |
| P6 | `computeHealthScreen` | Tamizaje (síntomas, condición, diabetes) y pausa del plan por lesión | DEC-009, DEC-011 | ACSM (Riebe 2015), ADA/ACSM, E4 para lesiones | estricta (bloquea el plan) y avisos | 35–38, 49–51, 63–66 |
| P7 | ensamblado | Une avisos y fuentes, suplementos y descargo de responsabilidad | DEC-009 | n/a | n/a | 34, 133 |

Nutrición, metas y salud solo se resumen aquí: no se auditaron línea a línea porque la spec del núcleo se pide sobre el generador de entrenamiento.

## 2. Generador de entrenamiento (`computeTraining`), paso por paso
"Estricta" = cambia el plan; "aviso" = solo informa; "orden" = reordena sin cambiar series. Los números de test son los de la sección 6.

| # | Paso (función) | Qué hace | DEC | Nivel | Tipo | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Split (`SPLITS`) | Elige la plantilla de 3, 4, 5 o 6 días; **solo los grupos grandes** tienen día fijo (pecho, espalda, hombros, cuádriceps, isquios, glúteos) | 003 v2 | E4 (convención) | estricta | 10, 11 |
| T2 | Volumen semanal por grupo | `base` 18/14/10 series según nivel; ×0,85 en definición; ×1,25 énfasis de la división (`up`); ×0,5 (`down`); ×0,6 grupos chicos; rezagados ×1,25 con tope 20; mínimo 4. **Números fijos en el código** | 001, 014 | fuentes (Schoenfeld, Helms); los factores son criterio de la app | estricta | 10, 11, 13–15 |
| T3 | `weeklyFloors` | Piso por grupo: 10 series fraccionadas (ACSM, E1), o 5 si la división reduce ese grupo y no es rezagado | 016, 017 | E1 (10); E4 convención (×0,5) | estricta (protege recortes) | 114, 123, 126 |
| T4 | `filterLibByInjuries` | Quita del catálogo los patrones excluidos por las zonas de lesión declaradas; agrega ejercicios `injuryOnly` (sustituto del press de hombro) | 009 (capa 3), 011 | E4 (precaución, no adaptación) | estricta | 38, 53, 54, 151, 152 |
| T5 | Reparto por día (bucle principal) | Por grupo y día: series = `max(2, round(semanal / frecuencia))`; con 4 o menos series un ejercicio, con más dos; toma los ejercicios **rotando por el catálogo** (`rotate[grupo]`); el segundo de cuádriceps es la prensa; sin patrones repetidos en el día; reparto parejo entre los ejercicios | 006 | E4 | estricta | 24, 25, 30, 33 |
| T5a | Funcionales (bandera salud/funcional) | Suma búlgara, step-up o paseo del granjero (este último aparte, 2 series, sin volumen) financiándolo con un aislamiento del mismo grupo | 005, 010 | E4 (`functionalNoVolumeExtraSets`, `reviewRequired`) | estricta | 19, 30, 33, 48, 69 |
| T5b | A3 (en el mismo bucle) | El primer día de cuádriceps lleva la sentadilla pesada; ese día el peso muerto rumano se cambia por el curl y la rotación de isquios se "reinicia" para que la bisagra caiga el otro día; cualquier ejercicio que juntaría sentadilla y bisagra se cambia | 022 | E4 | estricta | 162, 164, 165, 167 |
| T5c | Remo por defecto / opcional | La rotación de espalda usa el remo con apoyo de pecho; el remo con barra solo con la casilla del perfil | 022 | E4 | estricta | 166, 167 |
| T6 | Grupos chicos | Abdomen, pantorrillas, bíceps, tríceps se reparten **después** en los días compatibles con **menos series acumuladas** (hasta 2 días; abdomen y pantorrillas prefieren no-pierna) | 003 v2 | E4 | estricta | 21 |
| T7a (corre antes de T7) | `resolveAcceptance` | La aceptación del usuario vale para la firma del plan (días, división, objetivo, rezagados, nivel) y hasta un máximo de series; incluye el formato viejo `longSessionAcceptedOn` | 014, 016 | E4 | estricta | 116–118, 120 |
| T7 | `enforceSessionCap` | Tope de 25 series por sesión: recorta **solo aislamientos** de la sesión más pasada, de 1 en 1 (de 2 en 2 bajo 2 series), grupos chicos primero, sin bajar a los mayores de su piso (fraccionado ni real); no recorta multiarticulares; con aceptación explícita no recorta | 003 v2, 014, 016 | E4 (`sessionSetCap`) | estricta + avisos | 22, 87, 88, 92, 116–118, 129 |
| T8 | Recalcular series semanales | Tras recortar, vuelve a sumar las series reales de los grupos recortados | 014 | n/a | bookkeeping | no se encontró un test propio |
| T9 | `completeToFloor` | Si un grupo **mayor** quedó bajo su piso, agrega series en sesiones con espacio bajo el tope (primero series extra de lo que ya está, si no un ejercicio nuevo de 2 series); no pasa del tope ni de R1 | 017 | E1 (piso) | estricta | 123–132 |
| T10 | `ensureGroupMinimum` | Si un grupo **chico** quedó bajo 5 series fraccionadas, agrega series en una sesión compatible (si no hay espacio, le saca series de aislamiento al grupo con más volumen de **esa misma sesión**, sin bajar a nadie de su piso, sin quitar un multiarticular ni el último ejercicio directo de un grupo); avisa si no cabe | 020 | E4 (`groupMinimumWeeklySets`) | estricta + avisos | 139–153 |
| T11 | Aviso de grupos bajo el mínimo | "Grupos por debajo de 10 series fraccionadas": informa, con opciones (aceptar o cambiar de split) | 016 | E1 | aviso | 114, 115 |
| T12 | `diminishingReturnsWarnings` (R1) | Aviso si una sesión suma más de 11 series fraccionadas de un músculo | 014 | E3 (preprint) | aviso | 91 |
| T13 | A2 | Aviso si una sesión junta más de un ejercicio de lumbar alta | 022 | E4 | aviso | 166, 167 |
| T14 | Perfil articular completo | Aviso si un ejercicio del plan no tiene perfil articular | 021 | E4 | aviso | 154–159, 160 |
| T15 | `orderByDemand` (A1) | Orden de cada sesión: lumbar alta, multiarticulares (hip thrust al final de ellos), aislamientos | 022 | E4 (E2 solo en que el orden no cuesta hipertrofia) | orden | 163 |
| T16 | Top set (definición) | En definición, el primer ejercicio **elegible** del día (lista cerrada de 6 patrones) pasa al frente con top set de 4–6 repeticiones y back-offs al −10 % | 002, 008 | criterio sobre Helms, Bickel y ACSM 2009 | orden + estricta | 16, 31, 32 |
| T17 | Duración | `series × (descanso + 45 s)`, descanso 150 s multiarticular y 75 s aislamiento; unilaterales ×2; el top set cuenta 180 s | 003 v2, 007, 010 | E4 (`setExecutionSeconds`) | estricta (informa minutos) | 26, 27 |
| T18 | Cardio | Sesiones y minutos según objetivo, nivel y bandera salud/funcional | 005 | OMS 2020 / ACSM (E1) y números E4 | estricta | 18, 33 |
| T19 | Textos fijos | Intensidad, progresión (2–5 % y 5–10 %), descarga (cada 4–6 semanas), poses, lista de fuentes | 002 | fuentes del catálogo | texto | 34 |

Conteo fraccionado transversal (usado por T7, T9, T10 y T12): directa = 1, indirecta = 0,5, ninguna o `a_verificar` = 0, y el músculo del bucket cuenta siempre 1 (DEC-014 y DEC-016). Tests 86, 110.

## 3. Qué pasos corrigen efectos de otros
Cada fila es un parche que existe porque un paso anterior produce algo que el siguiente tiene que arreglar.

| Efecto no deseado | Quién lo produce | Quién lo corrige | Evidencia medida |
| --- | --- | --- | --- |
| Sesiones con más de 25 series | T5 y T6 reparten sin conocer la capacidad de las sesiones | T7 recorta aislamientos | 108 de 1620 sesiones siguen sobre 25 (72 de 360 planes; 78 de 3 días): cuando casi todo es multiarticular, T7 no puede recortar |
| Grupos mayores bajo su piso | T7 (recorta) | T7 mismo (frena el recorte con `fits`) y T9 (completa) | el piso se protege **dos veces**: en el recorte y en el completado |
| Grupos chicos en 0 series | T7 (recorta primero a los chicos) | T10 (mínimo de 5) | sin T10, bíceps/tríceps/abdomen/pantorrillas quedaban en 0 en la mayoría de los perfiles de 3 y 4 días (DEC-020) |
| Mínimo de grupos chicos que desarma a otros | T10 le saca series a un grupo mayor de la sesión | T10 mismo (protecciones) | sin cadena de protecciones (piso real, fraccionado, último ejercicio directo) el donante podía quedar sin ejercicio |
| Más de 11 series fraccionadas de un músculo en una sesión | T5 (el reparto semanal ya las deja) | T7 y T10 las bajan **por casualidad** al recortar o donar; T12 solo avisa | el Paso 2 destapó 19 avisos R1 nuevos en 19 planes: T10 dejó de sacarle series a ese músculo (comprobado con `scripts/verificar-avisos-r1.js`) |
| Sentadilla y peso muerto rumano el mismo día | T5 (rotación del catálogo: ambos son el primer ejercicio de su grupo) | T5b (reemplazo y reinicio de la rotación) y la guarda en T9/T10 | A2 saltaba en el 100 % de los planes antes de A3 |
| Ejercicio de aislamiento recortable el día de sentadilla | T5b (curl en lugar de rumano) | T7 | 21 sesiones nuevas sobre 25 y 16 que dejaron de estarlo; hasta 10 series de curl en una sesión |
| Orden de ejercicios dependiente del orden de pasos | T15 (A1) ordena y T16 vuelve a mover el primer elegible al frente | ninguno: los dos ordenamientos se apilan | en el día de tirón el press militar queda primero con top set (diagnóstico aparte) |
| Series reales distintas de las planeadas | T7, T9 y T10 cambian series | T8 (recálculo parcial: solo de los grupos recortados) | los grupos tocados por T9 y T10 se recalculan en bloques separados |
| Funcional "financiado" por otro ejercicio | T5a | T5a (resta de un aislamiento del mismo grupo) | existe para no tocar el volumen semanal de DEC-001 |

## 4. Números fijos en el código sin entrada en `VALIDATOR_RULES`
La regla 3 de CLAUDE.md pide nivel, fuente y estado para toda regla numérica. Estos valores viven en `engine.js` sin entrada:

| Valor | Dónde | Para qué |
| --- | --- | --- |
| 18 / 14 / 10 | T2 | series semanales base por nivel (avanzado, intermedio, novato) |
| 0,85 | T2 | factor del volumen en definición |
| 1,25 / 0,5 / 0,6 | T2 | énfasis `up`, énfasis `down`, grupos chicos |
| 1,25 con tope 20 y mínimo 4 | T2 | grupos rezagados |
| 4 | T5 | con 4 o menos series por día, un solo ejercicio; con más, dos |
| 2 | T5, T6 | mínimo de series por día y mínimo de series por ejercicio |
| 2 | T6 | máximo de días por semana de un grupo chico |
| 1 o 2 | T7 | paso del recorte (de 1 en 1; de 2 en 2 por debajo de 2 series) |
| 4–6 repeticiones, RIR 1–2, −10 % | T16 | top set y back-offs |
| 180 / 150 / 150 / 75 s | T17 | descansos de top set, back-off, multiarticular y aislamiento |
| 2 | T17 | factor de los unilaterales |
| 2 o 3 sesiones, 25 o 50 min | T18 | cardio |
| 2–5 %, 5–10 %, cada 4–6 semanas | T19 | progresión y descarga (texto) |

Valores que **sí** tienen entrada en `VALIDATOR_RULES`: 11 (R1), 1, 0,5 y 0 (conteo), 10 (piso), 0,5 (mantenimiento), 5 (mínimo de grupo chico, derivado), 25 (tope), 45 s (ejecución por serie), 2 (funcional sin volumen), 5/2/28 (dolor), y las reglas A1, A2 y A3.

## 5. Código muerto o sin uso (comprobado con búsquedas en `js/`, `tests/` y `scripts/`)

**Reglas configuradas que ningún código lee** (`status: 'pendiente'`): `minWeeklyFrequencyMajorGroups`, `maxWeeklyVolumeIncreasePct`, `maxAcuteChronicRatio`, `historyWindowWeeks`, `minHistoryWeeksForRamp`. Son las reglas R3 (rampa de progresión) y la frecuencia mínima de R2. Un test (121) comprueba que siguen sin lector.

**Sin ninguna referencia fuera de su definición:** `DEFAULT_BAR_WEIGHT` en `knowledge.js` (la interfaz no la usa), `VERSION` e `isValid` exportados de `sessionStore.js` (`isValid` solo se usa dentro del módulo).

**Exportaciones de `engine.js` que nadie llama (ni la app ni los tests; se usan dentro de `engine.js`, solo sobra exportarlas):** `classicLimit`, `computeMetrics`, `computeTargets`, `computeNutrition`, `computeTraining`, `planSignature`, `LB_PER_KG`. **Exportadas solo para los tests** (detalles internos): `bodyFatNavy`, `ffmi`, `fractionalByMuscle`, `enforceSessionCap`, `completeToFloor`, `ensureGroupMinimum`, `diminishingReturnsWarnings`, `carryOverInjuryClearances`, `SPLITS`, y de `knowledge.js` `JOINT_LEVELS`, `NO_MUSCLE_CONTRIBUTION`, `EXERCISE_ID_BY_NAME`.

**Retrocompatibilidad que DEC-023 deja sin razón de ser:**
- Aceptación de sesiones más largas en el formato anterior (**tocaría cláusulas de DEC-016, DEC-015 y DEC-018, que DEC-023 debe reemplazar de forma explícita**): el campo `longSessionAcceptedOn`, la rama `legacy` de `resolveAcceptance`, `migrateLongSessionAcceptance` (llamada al cargar en `app.js` y al importar), la bandera `legacy` en `sessionLimit.acceptance`. Tests que usan `longSessionAcceptedOn` o `migrateLongSessionAcceptance` (posición en `engine.test.js`): 22, 46, 87–91, 111, 114, 115, 119 y 132, más `regression.test.js` y `e2e-aceptacion.js`; incluye tests clasificados A que habrá que reescribir con el formato nuevo de aceptación.
- Series registradas antes de DEC-015 sin `setKey`: el identificador `legacy:` en `sessionStore.js` y el camino de edición y borrado de esas filas (test 106).
- Importar archivos exportados antes (sin `workouts` ni `sessions`): test 137.
- Datos de `DEC-010`: línea base `plan-identity-baseline.json` y el detector de diferencias que la lee (tests 45 y 46).

**Datos y columnas sin uso:** la columna `ambiguo` de `data/perfil-articular.csv` (hoy ninguna celda en `si`) y su validación; la rama `injuryOnly` solo la usa el press landmine.

**Herramientas que dependen del motor actual y dejarían de servir con el núcleo nuevo:** `scripts/snapshot-plan-hashes.js`, `scripts/simular-reglas-articulares.js`, `scripts/verificar-avisos-r1.js`, `scripts/diagnostico-sesiones-sobre-25.js` (leen `sessionLimit.trimmed`, `E.SPLITS` y avisos por su texto).

## 6. Tests: cuáles se conservan y cuáles se descartan
Criterio: **A** = comportamiento observable (se conserva tal cual); **B** = intención válida que hoy se prueba llamando funciones internas o contra una línea base (se conserva la intención y se reescribe contra la API nueva); **C** = congela la salida actual, prueba estructura interna o retrocompatibilidad (se descarta con el motor actual). Los números son la posición en `engine.test.js`.

**Resultado: 170 tests = 120 A + 26 B + 24 C.** Además: `regression.test.js` (3 tests que fijan series semanales y nutrición de 3 perfiles contra una línea base vieja, todos C) y los fixtures `plan-hashes.json`, `plan-identity-baseline.json`, `dec016-referencia.json`, `dec017-referencia.json` (todos C).

### A · se conservan (120)
- **Fórmulas y plan de nutrición (1–9, 12, 138)** — 11 tests
- **Entrenamiento: volumen, rezagados, top set, cardio, duración, patrones (10, 11, 13–22, 24–27, 30–34, 48, 69)** — 23 tests
- **Salud, lesiones, dolor y privacidad (35–38, 49–51, 53–66, 70, 71, 134–136)** — 26 tests
- **Datos de ejercicio-músculo y perfil articular (43, 44, 73–74, 76–82, 84, 154–159, 161)** — 19 tests
- **Registro de sesión, DEC-015 (96–105, 107–109)** — 13 tests (no son del generador, pero sí del núcleo de la app)
- **Tope, piso y mínimo (87, 88, 93, 110, 114–118, 123, 126, 129, 132, 133, 139–144, 151, 152)** — 22 tests
- **Fase 3 (164–167) y exportación del historial (169, 170)** — 6 tests

Los A de entrenamiento y de tope, piso y mínimo prueban **invariantes** (ningún grupo bajo su mínimo, ninguna sesión sobre el tope sin aceptación, sin patrones repetidos, etc.) sobre barridos de perfiles: son los que la spec nueva debe seguir cumpliendo o decidir cambiar de forma explícita. Si la spec cambia una regla (por ejemplo el tope por duración, B-038), el test se reemplaza junto con su DEC.

### B · conservar la intención, reescribir (26)
| # | Test | Qué intención conservar |
| --- | --- | --- |
| 40 | DEC-010: cada entrada del catálogo tiene id único y una fila en la tabla de aporte (y no sobran filas) | tabla de aporte: integridad (formato interno K.EXERCISE_CONTRIBUTION) |
| 41 | DEC-010: la tabla usa solo los 10 grupos, el secundario no repite al primario y toda fila es E4 | idem |
| 42 | DEC-010: correcciones aprobadas de la tabla de aporte | idem |
| 47 | DEC-010: bucket dice dónde vive y muscle es el primario real; coinciden salvo ejercicios sin aporte | bucket y músculo primario |
| 52 | DEC-011: la autorización se conserva entre ediciones solo en las zonas que siguen declaradas | carryOver (función interna) de autorizaciones |
| 67 | DEC-011: reconcileInjuryClearances no muta sus entradas, tolera no tener estado previo y respeta carryOve | reconcile (función interna) |
| 72 | DEC-011: la marca de re-autorización no altera el plan (solo la pantalla la usa) y no sale en el export | huellas |
| 75 | DEC-013: el bucket es un campo único por ejercicio, separado de las relaciones, y coincide con el catálog | bucket único |
| 83 | DEC-013: el catálogo trae las relaciones v2 (relacion y evidencia) y el bucket de los CSV | catálogo v2 |
| 85 | DEC-014: muscle y secondary del plan salen de los datos v2 (bucket si es directa, resto de relaciones que | exerciseFields (función interna) |
| 86 | DEC-014: el conteo fraccionado usa directa = 1, indirecta = 0,5 y ninguna / a_verificar = 0 (convención g | conteo fraccionado (función interna fractionalByMuscle) |
| 89 | DEC-014 · acceptance búlgara: la búlgara de glúteo se programa en glúteo y suma 1 a glúteo y 1 a cuádrice | conteo de la búlgara (fractionalByMuscle) |
| 90 | DEC-014 · acceptance hip thrust: pasar a "ninguna" no hace que el generador agregue isquios por encima de | conteo del hip thrust |
| 91 | DEC-014: R1 es un aviso de rendimiento decreciente (E3, Remmert et al., preprint), no un tope: no recorta | R1 (diminishingReturnsWarnings) |
| 92 | DEC-014: enforceSessionCap — recorta aislamientos de grupos chicos primero, nunca multiarticulares, y res | enforceSessionCap (unidad) |
| 106 | DEC-015: editar y borrar en el historial (sesiones completadas y registros viejos sin setKey) | conservar editar y borrar de sesiones completadas; la parte de filas sin `setKey` es retrocompatibilidad y se descarta |
| 111 | DEC-016 (1): el pecho cuenta el press inclinado en un plan real | conteo en un plan real con línea base |
| 120 | DEC-016 (2): normalizeProfile valida la aceptación acotada | normalizeProfile de la aceptación |
| 121 | DEC-016: cada regla de VALIDATOR_RULES lleva un estado, y R3 y la frecuencia mínima de R2 están pendiente | estados de VALIDATOR_RULES contra el código fuente |
| 146 | DEC-020: las series salen del grupo con más volumen fraccionado acumulado, contando el indirecto, y nadie | ensureGroupMinimum (unidad): donante por volumen |
| 147 | DEC-020: nunca se le quita a un grupo por debajo de su propio mínimo para cubrir el de otro: si nadie pue | ensureGroupMinimum (unidad): nadie baja de su mínimo |
| 148 | DEC-020: un grupo mayor no desaparece de una sesión para cubrir a otro (frecuencia semanal, R2) | ensureGroupMinimum (unidad): un grupo mayor no desaparece de una sesión |
| 149 | DEC-020: al sacar series para cumplir mínimos, nunca se quita el último ejercicio directo de un grupo (pu | ensureGroupMinimum (unidad): nunca el último ejercicio directo |
| 153 | DEC-020: los avisos del mínimo llevan nivel E4 y la regla; las series agregadas quedan dentro del tope y  | avisos del mínimo con línea base |
| 162 | DEC-022 · A3: en los 360 planes del barrido la sentadilla pesada y la bisagra pesada nunca comparten sesi | A3 (compara contra el motor con las reglas apagadas) |
| 163 | DEC-022 · A1: en cada sesión va primero lo de lumbar alta, luego los multiarticulares (el hip thrust al f | A1 (lee el perfil articular directo) |

### C · descartar (24)
| # | Test | Motivo |
| --- | --- | --- |
| 23 | DEC-003 v2: no cambia nada cuando ningún día se pasa de 25 (regresión de avisos) | regresión de avisos del motor viejo |
| 28 | DEC-006 (corregido): el Día 2 de Emanuel incluye sentadilla trasera o hack, no solo búlgara | plan concreto de Emanuel (ejemplo congelado) |
| 29 | DEC-006 (corregido): el patrón viene del catálogo, no del texto del nombre | detalle interno: de dónde sale el patrón |
| 39 | DEC-009: sin condiciones de salud declaradas, el plan queda idéntico al que generaba el motor antes de DE | idéntico al motor anterior a DEC-009 (retrocompatibilidad) |
| 45 | el detector de diferencias del test de identidad ve claves agregadas, quitadas, cambiadas, null vs ausent | prueba del detector de diferencias del test de identidad |
| 46 | DEC-010: perfiles sin healthGoal ni lesiones generan el mismo plan que antes; solo pueden diferir las rut | identidad con la línea base vieja (congela salida) |
| 68 | DEC-010: las series del paseo del granjero viven en VALIDATOR_RULES con el mismo formato que SESSION_SET_ | forma de la entrada en VALIDATOR_RULES |
| 94 | DEC-012/014: el motor no lee relacion ni evidencia crudas: usa solo los pesos de la convención global (se | estructura interna del motor (no lee relación cruda) |
| 95 | DEC-014: huellas de los 30 planes (línea base de la Fase 2; la salida cambió a propósito por el tope E4 y | huellas de los 30 planes (congela salida) |
| 112 | DEC-016 (1): pecho y espalda semanales en los splits de 3, 4 y 5 días (antes → después) | cifras de referencia DEC-016 (congela salida) |
| 113 | DEC-016: con el bucket directo, pecho y espalda de los perfiles de referencia no bajan respecto de antes  | cifras de referencia DEC-016 (congela salida) |
| 119 | DEC-016 (2): migra longSessionAcceptedOn: firma y máximo salen del plan vigente al migrar | migración de longSessionAcceptedOn (retrocompatibilidad) |
| 122 | DEC-017: perfiles de referencia de DEC-014 antes y después (sin aceptación), con duración por sesión | cifras de referencia DEC-017 (congela salida) |
| 124 | DEC-017: novice_bulk_physique_4d (physique_m): las piernas están reducidas a propósito y quedan sobre su  | completeToFloor + línea base |
| 125 | DEC-017: wellness_maintain_5d y bikini_cut_lagging_4d tienen el pecho "down" y con el piso de mantenimien | cifras de referencia DEC-017 |
| 127 | DEC-017: el piso de mantenimiento se aplica igual al freno de recortes y al completado (unidad) | unidad de funciones internas |
| 128 | DEC-017: figure_maintain_novice_3d (figure_w, sin "down") completa el pecho con el piso completo | cifras de referencia DEC-017 |
| 130 | DEC-017 (unidad): prioriza el mayor déficit y la sesión con más espacio, y solo en días que entrenan el g | unidad completeToFloor |
| 131 | DEC-017 (unidad): primero series extra de ejercicios del plan; ejercicio nuevo solo si no hay otra forma; | unidad completeToFloor |
| 137 | B-001: archivos exportados antes (sin workouts ni sessions) o con otros tipos siguen importando | importar archivos viejos (retrocompatibilidad) |
| 145 | DEC-020: los planes que ya cumplen el mínimo no cambian (oscar 5d, bb 6d, physique_w 6d, wellness 5d, phy | cifras de referencia DEC-017 (congela salida) |
| 150 | DEC-020: bíceps sin series directas a los 3 días baja de 65 a 50 de 90 perfiles con la restricción (los 5 | cifra del motor actual (65 → 50 de 90 perfiles) |
| 160 | DEC-021: el perfil no se expone en el plan, solo lo leen A1 y A3 (DEC-022), y un ejercicio sin perfil adv | cuenta apariciones en el código fuente del motor |
| 168 | DEC-022 · el curl del día de sentadilla no lleva tope: en los 360 planes el máximo es 10, bajo el umbral  | cifra del motor actual (máximo de curl 10) |

## 7. Hallazgos que la spec nueva debe decidir
1. **La función del día no existe en el modelo.** Los días se llaman "Empuje" o "Tirón", pero el reparto elige ejercicios rotando por el catálogo de cada grupo sin saber si el día es de empuje o de tirón (T5). Por eso un día de tirón puede abrir con press militar.
2. **Los topes no son del reparto.** El tope de 25, el piso, el mínimo y R1 corrigen después de repartir (sección 3). Es la causa común de B-038.
3. **Dos ordenamientos apilados** (A1 y top set): el segundo puede deshacer el primero.
4. **La versión corta no es del generador**: se calcula en la interfaz como "los primeros 2 multiarticulares" (diagnóstico aparte).
5. **Números sin respaldo declarado** (sección 4): la spec debe asignarles nivel, fuente y estado, o dejarlos como convención explícita.
6. **Reglas pendientes** (R3 y frecuencia mínima): decidir si entran al núcleo o se eliminan de la configuración.
7. **Rotación como mecanismo de selección**: es lo que hace que unos días tengan más multiarticulares que otros (días con 1 multiarticular: 168 de 1620 sesiones sin lesiones; con lesión, hasta 0).
