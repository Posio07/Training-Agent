# Fase A0 · Paso 1 — Inventario del estado actual

Versión: 24 de octubre de 2026 · Solo documentación: no describe nada que haya que cambiar, solo lo que hay hoy.

Alcance: todo lo que la app guarda (y dónde), y dónde viven hoy las reglas del validador. Sin propuestas: eso es el Paso 2.

---

## 1. Qué guarda la app hoy

Toda la persistencia es `localStorage` del navegador, en **dos claves**. No hay servidor, ni cuenta, ni sincronización. Los datos no salen del dispositivo salvo por el export manual en JSON.

### 1.1 Clave `ifbb-agent:v1` — estado completo de la app

Escrita por `ifbb-pro-agent/js/app.js` (`load()` / `save()`, líneas 6-23). Un único JSON con todo:

```
{ profiles: [Profile], activeId: string | null }
```

#### `Profile`

| Campo | Tipo / forma | Notas |
| --- | --- | --- |
| `id` | string | `uid()` = `Date.now().toString(36) + random(5)`. **No es UUID**: se genera en el cliente pero sin garantía de unicidad global ni formato estándar. |
| `createdAt` | `'AAAA-MM-DD'` | Solo día, sin hora ni zona (`todayIso()`). |
| `updatedAt` | `'AAAA-MM-DD'` | Igual. Se actualiza a mano en cada escritura. |
| `data` | objeto (ver 1.2) | Resultado de `ENGINE.normalizeProfile`. |
| `log` | `[Measurement]` | Mediciones corporales. Se crea con el perfil (`logEntryFrom`). |
| `workouts` | `[SetRow]` | Series registradas. Se crea **perezosamente** (`profile.workouts = profile.workouts \|\| []`). |
| `sessions` | `[SessionMeta]` | Sesiones completadas. También perezosa. |
| `painFlags` | `{ [pattern]: PainRec }` | Estado de dolor por patrón de ejercicio. Perezosa. |

No hay entidad "usuario": el perfil mezcla a la persona, su antropometría, su configuración de equipamiento y sus datos de salud en un mismo objeto. Dos personas = dos perfiles en el mismo dispositivo.

#### 1.2 `Profile.data` (salida de `normalizeProfile`, engine.js:1033)

- Identidad y antropometría: `name`, `sex` (`'M'|'F'`), `age`, `heightCm`, `weightKg`, `bodyFatPct`, `neckCm`, `waistCm`, `hipCm`. Todos números (0 si no se cargaron).
- Entrenamiento y objetivo: `activity`, `level` (`novice|intermediate|advanced`), `daysPerWeek`, `division`, `goal` (`cut|bulk|maintain`), `targetDate`, `targetBf`, `classicLimitLb`, `laggingMuscles: []`, `healthGoal: bool`.
- Aceptación explícita: `longSessionAcceptedOn` (`'AAAA-MM-DD'` o `''`) — DEC-014.
- Equipamiento: `plateUnit` (`kg|lb`), `barWeight`, `availablePlates: [number]`.
- Salud (`data.health`, DEC-009/011):
  - `screening: { regularExercise, cvMetabolicRenal, symptoms, medicalClearance }` (booleanos).
  - `diabetes: { type: 'none'|'type1'|'type2', medication: bool }`.
  - `injuries: [{ zone, diagnosed, painNow, clearanceDate: 'AAAA-MM-DD'|null, clearanceInvalidated?: true }]`, una fila por zona de las 7 de `INJURY_ZONES`.

#### 1.3 `Measurement` (`Profile.log[]`)

```
{ date: 'AAAA-MM-DD', weightKg, bodyFatPct|null, waistCm|null, neckCm|null, hipCm|null, notes: string }
```

**Sin identificador.** El borrado se hace por identidad de objeto en memoria (`p.log.filter(x => x !== target)`, app.js). Admite varias mediciones con la misma fecha; el orden lo da `date.localeCompare` al leer.

#### 1.4 `SetRow` (`Profile.workouts[]`) — fuente de verdad del historial de entrenamiento

Construida por `SESSION_STORE.workoutRow` (sessionStore.js:71):

```
{ setKey, sessionId, date, dayIndex, dayName,
  exercise, exerciseId, muscle, setType, setNumber,
  weight, reps, pain|null, short, savedAt, editedAt? }
```

- `setKey` = `` `${sessionId}:${exIndex}:${setIdx}` ``: id estable **dentro de una sesión**, pero derivado de **posiciones de arreglo** del plan de esa sesión.
- `exercise` es el **nombre en texto** y `exerciseId` el id del catálogo. Los gráficos de fuerza y el selector agrupan por `exercise` (nombre), no por `exerciseId`.
- Las filas anteriores a DEC-015 **no tienen `setKey`**: se identifican con un id sintético `legacy:sessionId|exercise|setType|setNumber|savedAt` (`rowId()`), y no se migraron.
- `date` es día (`'AAAA-MM-DD'`); `savedAt` y `editedAt` son epoch en ms. Conviven dos formatos de tiempo.
- El borrado es **físico**: `splice` del arreglo.

#### 1.5 `SessionMeta` (`Profile.sessions[]`)

```
{ sessionId, status: 'completada', date, dayIndex, dayName, short,
  startedAt(ms), finishedAt(ms), setsDone, setsTotal, editedAt? }
```

`setsDone` es un **dato derivado almacenado**: se calcula al completar y se decrementa a mano al borrar una fila del historial (`deleteRow`). Puede desalinearse de `workouts`.

#### 1.6 `PainRec` (`Profile.painFlags[pattern]`)

```
{ flagged: bool, cleanStreak: number, lastSessionId, painSessions: [{ sessionId, date }] }
```

Indexado por **`pattern`**, no por `exerciseId`. `pattern` no es único por ejercicio en el catálogo (`split_squat` aparece en más de una entrada), así que dos ejercicios distintos pueden compartir estado de dolor. `painSessions` se poda a la ventana de 28 días en cada lectura (`applyPainReading`).

### 1.7 Clave `ifbb-agent:session:v1` — sesión en curso

Escrita por `ifbb-pro-agent/js/sessionStore.js` (DEC-015). **Una sola sesión activa por dispositivo**, en una clave global (lleva `profileId` dentro, pero no está anidada en el perfil).

```
{ version: 1, status: 'en_curso', sessionId, profileId, dayIndex, dayName, short,
  startedAt(ms), updatedAt(ms), exIndex, finished,
  exercises: [ExerciseSnapshot],
  values: [[{ weight, reps, done, pain, doneAt, editedAt? }]],  // mismo shape que exercises
  recordShown: [], deletedKeys: [setKey], rest: { total, startedAt, endAt } | null }
```

- `exercises` es un **snapshot** del plan del día (para que reanudar no dependa de regenerar el plan): `name, exerciseId, bucket, muscle, muscleLabel, type, pattern, unilateral, durationMin, sets[{setType,setNumber,repsLabel,restLabel}], substitutedFrom, painScale, injurySubstitute, painAdvice`.
- `values` espeja la forma de `exercises` por posición; `isValid()` exige que las longitudes coincidan.
- `deletedKeys` guarda la **intención de borrar** antes de tocar el historial, para que un corte no resucite una serie.
- `rest` guarda `endAt` (timestamp de fin), no un contador.
- Cada serie registrada se escribe **dos veces**: en `values` y como `SetRow` en `profile.workouts`. `reconcile()` repara los cortes entre ambas escrituras, en los dos sentidos, usando `editedAt`/`savedAt` como criterio de "gana el más reciente".
- Dos pestañas abiertas: gana la última escritura (límite documentado en DEC-015).

### 1.8 Lo que NO se guarda

- Estado de interfaz (`ui`: pestaña, ejercicio seleccionado, edición en curso): solo en memoria.
- **Plan, dieta, métricas y objetivos**: se recalculan en cada render con `ENGINE.buildPlan(p.data, hoy)`. Nada del plan se persiste. La pestaña Dieta existe y está activa, pero es 100 % calculada: **no hay registro de comidas, ni de adherencia, ni de nada nutricional del usuario**.
- Duración real por serie (que R4 pide para calibrarse): se guarda `savedAt`/`doneAt` por serie, pero no un campo de duración.
- Historial de volumen semanal por músculo (que R3 pide): no se agrega ni se guarda en ninguna parte.

### 1.9 Export / Import

- **Export: solo JSON**, un archivo por **perfil activo** (`ifbb-agent-<nombre>.json`), `ENGINE.exportProfile` (engine.js:1002).
  - **Quita** por privacidad (DEC-009): `painFlags`, `data.health` completo (tamizaje, diabetes, lesiones, fechas de autorización) y `workouts[].pain`.
  - **Incluye**: `id`, `createdAt`, `updatedAt`, `data` (sin salud), `log`, `workouts` (sin dolor), `sessions`.
- **Import**: `prepareImportedProfile` (engine.js:1014). Siempre crea un perfil **nuevo** con `id` nuevo; nunca pisa uno existente. Conserva `createdAt`, `data` (sin salud) y `log`. **Descarta `workouts` y `sessions`**.
  - Asimetría a registrar: el export lleva el historial de series y el import lo tira. Un ciclo export→import **pierde todo el entrenamiento registrado**.
- **No hay export en CSV** en ninguna parte de la app. Tampoco hay "exportar todo" (varios perfiles) ni "borrar todo lo de una persona" más allá de borrar un perfil (`confirm()` + borrado físico del objeto) o el botón "Borrar todos los datos de salud".

### 1.10 CSV del repositorio (datos de referencia, no datos de usuario)

| Archivo | Forma | Rol |
| --- | --- | --- |
| `data/exercise-muscles.csv` | 61 filas · `exerciseId, muscle, relacion, evidencia, fuente, notes, review_date` | Fuente de verdad de qué músculos trabaja cada ejercicio (DEC-013, formato largo: una fila por par). |
| `data/exercise-buckets.csv` | 35 filas · `exerciseId, bucket` | Dónde se programa cada ejercicio (1:1 por ejercicio). |
| `ifbb-pro-agent/js/exerciseMuscles.js` | **Generado** · `{ source, buckets{}, rows[] }` | Lo que la app carga realmente: el CSV no se lee en runtime (Pages solo publica `ifbb-pro-agent/` y el modo sin conexión necesita todo precargado). Se regenera con `scripts/build-exercise-muscles.js`; un test de `engine.test.js` falla si no coincide, y ese test es la puerta del despliegue. |
| `ifbb-pro-agent/tests/fixtures/plan-hashes.json`, `plan-identity-baseline.json` | Snapshots | Baselines de regresión del plan. |

El **catálogo de ejercicios en sí** (`EXERCISES`, `FUNCTIONAL_EXERCISES`, ids, nombres, `pattern`, rangos de reps) vive **en código**, en `knowledge.js`, sin versión ni fecha de vigencia. Renombrar un ejercicio rompe el historial que lo referencia por nombre; `EXERCISE_ID_BY_NAME` existe justamente para remapear filas viejas.

---

## 2. Dónde viven hoy las reglas del validador

### 2.1 Valores de las reglas: centralizados, pero en código

Todos los valores numéricos están en **un solo objeto literal de JavaScript**: `VALIDATOR_RULES` en `ifbb-pro-agent/js/knowledge.js:507`. Cada regla lleva `{ value, level, source{label,url}, reviewedAt, verifiedAgainstPrimarySource: false }` más notas.

| Regla | Clave | Valor | Nivel | ¿Se usa en código? |
| --- | --- | --- | --- | --- |
| R1 · aviso de rendimiento decreciente | `maxFractionalSetsPerMuscleSession` | 11 | E3 | Sí (`diminishingReturnsWarnings`) |
| Conteo fraccionado · directa | `directSetWeight` | 1 | E4 | Sí (derivación de `setWeights`) |
| Conteo fraccionado · indirecta | `secondaryMuscleWeight` | 0,5 | E4 | Sí |
| Conteo fraccionado · ninguna / a_verificar | `noRelationWeight` | 0 | E4 | Sí |
| R2 · piso semanal | `minWeeklySetsPerMuscle` | 10 | E1 | Sí (`enforceSessionCap`) |
| R2 · frecuencia mínima | `minWeeklyFrequencyMajorGroups` | 2 | E1 | **No referenciada** |
| R3 · rampa de volumen | `maxWeeklyVolumeIncreasePct` | 20 | E4 | **No referenciada** |
| R3 · ratio agudo/crónico | `maxAcuteChronicRatio` | 1,3 | E4 | **No referenciada** |
| R3 · ventana de historial | `historyWindowWeeks` | 4 | E4 | **No referenciada** |
| R3 · mínimo de historial | `minHistoryWeeksForRamp` | 2 | E4 | **No referenciada** |
| R4 · tiempo por serie | `setExecutionSeconds` | 45 | E4 | Sí (duración derivada) |
| DEC-009/011 · umbral de dolor | `painFlagThreshold` | 5 | E4 | Sí (`applyPainReading`) |
| DEC-011 · sesiones con dolor | `painAdviceMinSessions` | 2 | E4 | Sí |
| DEC-011 · ventana de dolor | `painAdviceWindowDays` | 28 | E4 | Sí |
| DEC-005/010 · series funcionales sin volumen | `functionalNoVolumeExtraSets` | 2 | E4 | Sí |
| E4 · tope de series por sesión | `sessionSetCap` | 25 | E4 | Sí (`enforceSessionCap`) |

Dos consecuencias de hecho, no de opinión:

1. El criterio de aceptación del spec *"los valores de las reglas viven en configuración, no en código"* está **cumplido a medias**: están centralizados y anotados con nivel, fuente y fecha de revisión, pero el "archivo de configuración" es un módulo JS que se despliega con la app. No hay tabla, no hay versión, no hay historial de cambios de valor, y cambiar un umbral exige un despliegue.
2. **R3 completa (la rampa de progresión) y la frecuencia mínima de R2 están configuradas pero no implementadas.** Falta el dato que necesitan: el historial de volumen semanal por músculo de las últimas 4 semanas, que hoy no se agrega en ninguna parte (ver 1.8).

### 2.2 Reglas que viven en datos

Solo una: **la relación ejercicio↔músculo** (DEC-012/013), en `data/exercise-muscles.csv` + `data/exercise-buckets.csv`, versionada en el repositorio, con `relacion`, `evidencia`, `fuente`, `notes` y `review_date` por fila. El peso de cada serie **no** es un dato de la fila: `knowledge.js:541-551` lo deriva de la categoría (`relacion`) cruzada con `evidencia` (una fila `a_verificar` pesa 0), usando los valores globales de `VALIDATOR_RULES`. Está explícitamente prohibido un peso a medida por ejercicio.

### 2.3 Reglas que viven en lógica (código, sin configuración)

- **Conteo fraccionado**: `fractionalByMuscle` y `sumFractional` (engine.js:434-448).
- **E4 · tope por sesión**: `enforceSessionCap` (engine.js:467) — a quién recortar (solo aislamientos, primero grupos chicos), el orden, y la prevalencia de R2 sobre E4, todo en código. La lista de grupos chicos (`SMALL_MUSCLES_LIST`), sus compatibilidades (`SMALL_COMPAT`) y `MAJOR_GROUPS` son constantes en código.
- **R1 · aviso**: `diminishingReturnsWarnings` (engine.js:450).
- **R4 · duración derivada**: dentro de `computeTraining`, con `SET_EXEC_SEC` tomado de la regla y el doble conteo de unilaterales (DEC-007) en código.
- **R5 · tamizaje**: `computeHealthScreen` (engine.js:777) implementa el algoritmo ACSM; el bloqueo del plan y el flujo de autorización por zona están en `app.js` + `reconcileInjuryClearances`/`zonesPendingReauthorization` (engine.js:903-943).
- **Precauciones E4 por lesión**: `INJURY_EXCLUSIONS` (knowledge.js:441), un mapa zona → músculo → patrones a evitar. Código, sin nivel de evidencia por fila ni fecha de revisión.
- **DEC-011 · dolor**: `applyPainReading` y `painProfessionalAdvice` (engine.js:956-979). La máquina de estados (marcar por encima del umbral, desmarcar con 2 sesiones limpias distintas, avisar con 2 sesiones con dolor en 28 días) está en código; sus tres números, en `VALIDATOR_RULES`; su estado, en `profile.painFlags`; sus lecturas, en `workouts[].pain` y `values[].pain`.
- Otras constantes de generación sin configuración ni evidencia declarada: `SPLITS`, `EMPHASIS_MAP`, `TOPSET_ELIGIBLE_PATTERNS`, `BARBELL_PATTERNS`, `DIVISIONS`, `CLASSIC_WEIGHT_TABLE`, `SUPPLEMENTS`, `SOURCES`.

### 2.4 Aceptaciones explícitas del usuario (el spec las exige fechadas)

| Aceptación | Dónde se guarda | Formato |
| --- | --- | --- |
| Sesión más larga que el tope E4 (DEC-014) | `profile.data.longSessionAcceptedOn` | `'AAAA-MM-DD'`, un solo valor global al perfil (no por sesión ni por día) |
| Autorización profesional por zona de lesión (DEC-011) | `profile.data.health.injuries[].clearanceDate` | `'AAAA-MM-DD'`, una por zona; `clearanceInvalidated` marca las que la perdieron por empeoramiento |
| Autorización médica del tamizaje (R5) | `profile.data.health.screening.medicalClearance` | **booleano, sin fecha** |
| Salto de volumen de R3 | — | No existe: R3 no está implementada |

---

## 3. Hechos del estado actual que condicionan el modelo de datos

Listados como observaciones, sin proponer solución (eso es el Paso 2):

1. **No hay entidad usuario.** El perfil es persona + antropometría + configuración + salud, y la "cuenta" es el dispositivo.
2. **Identificadores.** `uid()` (base36 de reloj + 5 chars aleatorios) para perfiles y sesiones; no es UUID y no garantiza unicidad entre dispositivos. `setKey` depende de posiciones de arreglo del plan. Las mediciones (`log[]`) no tienen id. Las filas pre-DEC-015 tienen un id sintético derivado de sus datos.
3. **Tiempo en dos formatos.** Día (`'AAAA-MM-DD'`: `createdAt`, `updatedAt`, `date`, `clearanceDate`, `longSessionAcceptedOn`) y epoch en ms (`savedAt`, `doneAt`, `editedAt`, `startedAt`, `finishedAt`, `updatedAt` de la sesión). Sin zona horaria en ningún caso.
4. **Sin borrado lógico.** Todo borrado es físico (`splice`, `filter`, `removeItem`). No hay `deleted_at` en ninguna parte, y sin eso no hay forma de propagar un borrado a otro dispositivo.
5. **`updated_at` desigual.** Existe a nivel perfil (y por fila solo como `editedAt` cuando hubo edición); no existe en mediciones ni en la mayoría de los registros.
6. **Derivados: casi todo bien, dos excepciones.** El plan completo (métricas, objetivos, dieta, entreno, suplementos) se recalcula siempre y no se guarda. Se guardan como derivados `SessionMeta.setsDone` y los agregados que `knowledge.js` deriva al cargar (`EXERCISE_CONTRIBUTION`, `setWeights`) — estos últimos recalculables en cada arranque.
7. **El historial referencia ejercicios por nombre de texto** además del id, y los gráficos agrupan por nombre. El catálogo no está versionado.
8. **`painFlags` se indexa por `pattern`**, que no es único por ejercicio.
9. **Salud: asimetría de privacidad.** Nunca se exporta y no se puede mover de dispositivo; se borra todo junto o nada.
10. **No existe "exportar todo" ni "borrar todo" de una persona.** El export es por perfil activo, sin salud, y el ciclo export→import pierde `workouts` y `sessions`.
11. **Dieta: módulo activo pero sin datos.** Solo cálculo; nada que persistir hoy.
12. **Una sola sesión activa por dispositivo**, en clave global; dos pestañas = última escritura gana.
13. **Límites del almacenamiento.** `localStorage` es sincrónico, ~5 MB, y todo el estado es **un único JSON** que se reserializa completo en cada `save()`. Un fallo de escritura se muestra como aviso.
14. **Faltan dos datos que el spec ya exige:** historial de volumen semanal por músculo (R3) y duración real por serie (calibración de R4).

---

## 4. Fuentes de este inventario

`ifbb-pro-agent/js/app.js`, `js/sessionStore.js`, `js/engine.js`, `js/knowledge.js`, `js/exerciseMuscles.js`, `data/*.csv`, `data/README.md`, `docs/specs/validador.md`, `DECISIONS.md` (DEC-001 a DEC-015).
