# DECISIONS.md — Reglas de negocio de IFBB Pro Agent

Cada decisión lleva su nivel de respaldo:
**[Posicionamiento]** sociedad oficial · **[Evidencia]** metaanálisis o revisión · **[Criterio]** juicio práctico, sin estándar específico.

**Estado de cada DEC** (línea justo bajo el título): `Propuesto` (lo creó el agente; no vale como base de otro trabajo hasta que Emanuel lo acepte) · `Aceptado` · `Reemplazado`. Cada DEC dice **quién lo decidió**. El agente solo crea DEC como `Propuesto`; **solo Emanuel** los pasa a `Aceptado`, y solo él cambia o revierte uno aceptado. La línea `Estado: implementada` que cierran algunos DEC es otra cosa: dice si el código ya lo aplica.

Este archivo es la fuente de verdad de la lógica de negocio. Antes de cambiar cualquier cálculo del motor (`ifbb-pro-agent/js/engine.js`), consultarlo.

## DEC-001 · Grupos rezagados
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

- Input opcional nuevo en el perfil: lista de grupos rezagados.
- Volumen de esos grupos = base × ajuste de fase × 1,25.
- Precedencia: rezagado > énfasis de división. Si la división reduce el grupo (×0,5), el rezagado anula esa reducción.
- Tope semanal: 20 series por grupo.
- Respaldo: [Evidencia] Schoenfeld, Ogborn & Krieger 2017. Multiplicador y tope: [Criterio].
- Test: perfil Men's Physique, definición, intermedio, rezagados = cuádriceps, isquios, glúteos → ≈15 series/semana por grupo (14 × 0,85 × 1,25). Sin rezagados → se mantiene ≈6.

**Estado: implementada.**

## DEC-002 · Top set de fuerza en definición
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

- Solo en fase de definición: el primer multiarticular de cada día arranca con 1 serie × 4-6 reps @ RIR 1-2, y luego las series de back-off con −10% de carga en el rango normal.
- Mostrarlo en el plan como una línea separada ("Top set").
- Respaldo: **[Criterio]** (convención de la app). El formato top set/back-off no tiene un estudio que lo respalde directamente; el apoyo es indirecto y parcial: Helms et al. 2015 (no revisada en B-013); Bickel, Cross & Bamman 2011, *Med Sci Sports Exerc* 43(7):1177-87 (ensayo: una dosis reducida preservó la hipertrofia en jóvenes; solo se leyó el resumen); Spiering BA, Mujika I, Sharp MA, Foulis SA, *J Strength Cond Res* 2021;35(5):1449-58 (revisión narrativa, solo resumen: al reducir volumen y frecuencia, mantener la intensidad relativa parece ser la clave para conservar la fuerza); y [Posicionamiento] ACSM 2009. **Límite:** Bickel y Spiering respaldan *mantener la intensidad con menos volumen*; **no** respaldan el formato de una serie pesada seguida de series más livianas ni su uso en una fase de definición. Por eso el nivel es [Criterio] y no [Evidencia]. *Corrección del 2026-10-25 (B-013/B-017, aprobada por Emanuel): antes citaba como "Spiering et al. 2021" un artículo ("Progressive overload…") que no se pudo verificar en ninguna base.*
- Test: en definición aparece el top set; en volumen/mantenimiento no.

**Estado: implementada.** Fuentes agregadas a la pestaña Fuentes: `BICKEL_2011`, `SPIERING_MANT_2021` (antes `SPIERING_2021`, reemplazada en B-013).

## DEC-003 · Tope por sesión
**Estado del DEC:** Aceptado y luego reemplazado por DEC-003 v2 — **Decidido por:** Emanuel

- Parámetro configurable: máximo de series por sesión (default 25).
- Mostrar la duración estimada de cada día: series × (descanso medio + 45 s).
- Si una sesión se pasa del tope, recortar en este orden: grupos pequeños (brazos, pantorrillas) hasta su mínimo → aislamientos. Nunca recortar multiarticulares. Reubicar las series recortadas en otro día que entrene el mismo grupo, si lo hay.
- Respaldo: [Criterio].
- Test: ninguna sesión supera el tope y ningún multiarticular desaparece.

**Estado: REEMPLAZADA por DEC-003 v2** (motivo: el plan recortaba series de grupos chicos cuando un día se pasaba del tope e intentaba pasarlas a otro día; si ese otro día también estaba al límite, las series se perdían sin avisar, y el total semanal mostrado dejaba de coincidir con lo que realmente aparecía en la rutina).

## DEC-003 v2 · Distribución balanceada + aviso de tope
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

- Al GENERAR el plan (no después), los grupos pequeños se asignan a los días compatibles con menos series totales:
  · Abdomen y pantorrillas: cualquier día; prioridad a los días que no son de pierna.
  · Bíceps: días de torso o tirón. Tríceps: días de torso o empuje.
- Los grupos grandes no se mueven de su día.
- Duración estimada visible por día: series × (descanso medio + 45 s); los unilaterales cuentan doble (ver DEC-007).
- Si un día supera 25 series, mostrar un aviso no bloqueante. No recortar ni mover nada automáticamente.
- Respaldo: [Criterio].
- Test: perfil Emanuel → los días de pierna no tienen abdomen ni pantorrillas si existe un día de empuje o tirón con menos series; un día con 26 series muestra el aviso.

**Estado: implementada.**

## DEC-006 · Sin patrones duplicados por sesión
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

- Un mismo ejercicio base (incluidas sus variantes, por ejemplo "búlgara" y "búlgara con énfasis en cadera") aparece como máximo una vez por sesión. Puede repetirse en días distintos.
- Para el segundo ejercicio de cuádriceps, priorizar prensa.
- Respaldo: [Criterio].

**Estado: implementada.** Corrección posterior: la primera versión agrupaba por texto del nombre (regex), lo que en un caso real hizo que la sentadilla trasera desapareciera del Día 2 de un perfil y quedara reemplazada por la búlgara. Ahora cada ejercicio del catálogo (`knowledge.js`) lleva un id de patrón explícito (`pattern`, p. ej. `squat_bilateral` vs `split_squat`); la comparación de duplicados usa ese id, no el nombre. Las dos búlgaras (cuádriceps y glúteos) y la búlgara funcional comparten a propósito el id `split_squat`.

## DEC-007 · Tiempo de unilaterales
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

- En la duración estimada, los ejercicios unilaterales cuentan doble.
- Respaldo: [Criterio].

**Estado: implementada.**

## DEC-004 · Aviso de inconsistencia en % de grasa
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

- Si hay % de grasa ingresado Y circunferencias, calcular también el % por fórmula Navy. Si la diferencia es mayor a 4 puntos, mostrar un aviso no bloqueante con ambos valores.
- Respaldo: [Evidencia] Hodgdon & Beckett 1984 (error ±3-4%). Umbral: [Criterio].
- Test: diferencia de 5 puntos → aviso; diferencia de 2 → sin aviso.

**Estado: implementada.**

## DEC-005 · Objetivo "salud/funcional"
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

- Bandera nueva en el perfil, desactivada por defecto.
- Si está activa: en definición el cardio no se minimiza; piso de 150 min/semana a intensidad moderada.
- Agregar al catálogo de ejercicios de pierna: sentadilla búlgara, step-up con carga y paseo del granjero. Solo se incluyen en el plan si la bandera está activa.
- Respaldo cardio: [Posicionamiento] ACSM 2011 / OMS 2020. Ejercicios: [Criterio].
- Test: bandera activa → cardio ≥150 min/semana; desactivada → sin cambios respecto al comportamiento actual.

**Aclaración (tras un bug real):** con la bandera activa, el ejercicio funcional (búlgara, step-up, paseo del granjero) se SUMA como complemento: va después de los multiarticulares principales del día y nunca reemplaza al patrón bilateral pesado. Se financia quitándole series a un aislamiento del mismo grupo ese día (o, si no hay, al último ejercicio del grupo), sin bajarlo de un piso de 2 series, para no alterar el volumen semanal de DEC-001.
- Test: con la bandera activa, el Día 2 incluye sentadilla trasera o hack Y búlgara, con la búlgara ordenada después.

**Estado: implementada.** La versión original sustituía directamente el primer ejercicio de cuádriceps por el funcional cuando la bandera estaba activa, lo que hacía desaparecer la sentadilla trasera/hack del día. Corregido con la regla de "sumar, no reemplazar" de arriba.

**Segundo bug encontrado en verificación (punto 4):** el reparto de los 3 ejercicios funcionales era un round-robin simple, pero cuádriceps solo entrena 2 veces por semana en todos los splits: con 3 opciones y 2 ocurrencias, "paseo del granjero" (el 3º de la lista) nunca llegaba a salir. Corregido reservando el acarreo para la última vez que el músculo aparece esa semana, y rotando las otras dos opciones (búlgara, step-up) en las ocurrencias anteriores. También se ajustó a qué ejercicio se le quitan series para financiarlo: antes podía tocar el propio ejercicio con top set si no había aislamiento ese día; ahora prioriza un compuesto sin top set (p. ej. prensa) antes que el que lo tiene.

**Corrección por DEC-010:** la regla de financiamiento descrita arriba solo vale para los funcionales que SÍ aportan volumen de hipertrofia al grupo (búlgara con mancuernas y step-up: primario cuádriceps, glúteo secundario). El paseo del granjero no aporta a ningún grupo: si se financiara quitándole series a un aislamiento, el volumen real de cuádriceps bajaría hasta 2 series por semana sin que nada lo reemplace. Por eso el paseo ahora se agrega aparte (2 series, `muscle: null`, etiqueta "Funcional"), sin descontar de ningún ejercicio. Cuenta en `totalSets` y en la duración, no en el volumen del grupo. Efecto visible, solo con la bandera activa: el último día de pierna suma 2 series y, en los 10 perfiles de prueba, entre 6 y 13 minutos de duración, y puede acercarse o cruzar el aviso de 25 series.

## DEC-008 · Elegibilidad del top set
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

- El top set solo se asigna a multiarticulares bilaterales con carga libre o guiada pesada, de esta lista: sentadilla trasera, sentadilla hack, press banca, press militar, peso muerto rumano, remo con barra, dominadas/fondos lastrados.
- Nunca a unilaterales ni a máquinas de press.
- Si el primer ejercicio del día no es elegible, el top set pasa al primer ejercicio elegible del día, y ese ejercicio se ordena primero. Si ninguno es elegible, ese día no lleva top set.
- Respaldo: cargas ≥80% 1RM para fuerza [Posicionamiento] ACSM 2009; elegibilidad: [Criterio].
- Test: ningún top set cae en búlgara ni en press en máquina; el Día 2 abre con top set en sentadilla trasera o hack.
- Implementación: la elegibilidad se decide por el id de patrón del catálogo (ver corrección de DEC-006), no por `type==='compound'` ni por el nombre. Lista cerrada: `squat_bilateral, bench_press, shoulder_press, hinge, row_barbell, vertical_pull`. "Dominadas" se cubre con `vertical_pull`; no hay una entrada separada solo para fondos lastrados, así que ese caso puntual no obtiene top set con el catálogo actual.

**Estado: implementada.**

## PRINCIPIO RECTOR · Adaptación por salud
- La app NO reemplaza ni emula a un médico, fisioterapeuta ni entrenador certificado.
- Solo adapta el plan cuando hay una regla de un posicionamiento oficial o algoritmo validado cargado en este archivo.
- Si una condición declarada no tiene regla cargada, la app NO ajusta nada: muestra "Consultá con un profesional antes de seguir este plan" y registra la condición.
- *Precisión por DEC-011:* "adaptar" aplica al tamizaje y a diabetes (posicionamientos oficiales). Para lesiones no existe un marco validado: la app no adapta la rutina, exige autorización profesional y solo evita ejercicios como precaución E4.

## DEC-009 · Condiciones de salud y lesiones
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel


### Capa 1 · Tamizaje previo (ACSM, Riebe et al. 2015) [Posicionamiento]
Preguntas en el perfil:
- (a) ¿Hacés ejercicio planificado al menos 30 min, 3 días/semana, a intensidad moderada, en los últimos 3 meses?
- (b) ¿Tenés diagnóstico de enfermedad cardiovascular, metabólica (diabetes tipo 1 o 2) o renal?
- (c) ¿Tenés alguno de estos síntomas?: dolor o molestia en el pecho, falta de aire en reposo o con poco esfuerzo, mareo o desmayo, palpitaciones, hinchazón de tobillos, dolor en las piernas al caminar, soplo cardíaco conocido, fatiga inusual.

El plan de la app se considera de intensidad vigorosa a estos efectos. Lógica:
- Síntomas (c) = sí → bloqueo: "Suspendé el ejercicio y consultá a un médico". No se muestra el plan hasta que el usuario marque "Tengo autorización médica".
- (b) = sí y (a) = no → mismo bloqueo suave (autorización médica recomendada antes de empezar).
- (b) = sí y (a) = sí, sin síntomas → aviso no bloqueante: autorización médica recomendada antes de entrenar a intensidad vigorosa (vigente en los últimos 12 meses). No oculta el plan.
- (b) = no y (c) = no → sin aviso.
- Si el usuario cambia cualquiera de las tres respuestas, se reevalúa (la autorización médica marcada se resetea si cambian los síntomas).
- Respaldo: [Posicionamiento] Riebe D et al. Updating ACSM's recommendations for exercise preparticipation health screening. Med Sci Sports Exerc 2015;47(11):2473-9.

### Capa 2 · Diabetes (ADA, Colberg et al. 2016; ACSM, Kanaley et al. 2022) [Posicionamiento]
- Preguntas: tipo de diabetes (ninguna / tipo 1 / tipo 2) y si usa insulina u otros fármacos que bajan la glucosa.
- Si usa insulina o esos fármacos: aviso fijo de riesgo de hipoglucemia, con las precauciones del posicionamiento (controlar glucosa antes y después de entrenar, tener carbohidrato de acción rápida a mano, reconocer los síntomas de hipoglucemia). Sin cifras de dosis ni de glucosa: el aviso enlaza a la fuente, no las reemplaza.
- En fase de definición (`goal === 'cut'`) con diabetes + medicación: aviso adicional de que la pérdida de peso puede requerir ajustar la medicación, con indicación de consultarlo con su médico antes de empezar.
- La app NO modifica el volumen, las calorías ni los ejercicios por diabetes: solo informa.
- Respaldo: [Posicionamiento] Colberg SR et al. Physical activity/exercise and diabetes: a position statement of the American Diabetes Association. Diabetes Care 2016;39(11):2065-79. Kanaley JA et al. Exercise/physical activity in individuals with type 2 diabetes: ACSM position stand. Med Sci Sports Exerc 2022;54(2):353-68.

### Capa 3 · Lesiones: excluir y sustituir
- Input por zona declarada (hombro, codo, muñeca, espalda baja, cadera, rodilla, tobillo): si tiene diagnóstico profesional (sí/no) y si hay dolor actual.
- Sin diagnóstico → aviso: "Te recomendamos una evaluación profesional; mientras tanto, se excluyen los ejercicios que suelen cargar esta zona". La exclusión de ejercicios se aplica igual, con o sin diagnóstico; el diagnóstico solo cambia si se muestra ese aviso.
- Exclusión por zona [Criterio], dentro del mismo grupo muscular para mantener el volumen semanal de DEC-001 (el volumen por grupo se calcula antes de elegir ejercicios; excluir opciones de la lista no cambia cuántas series le tocan a cada grupo, solo cuáles ejercicios las cubren). Mapa cerrado, por id de patrón del catálogo:
  · **Hombro**: excluye `shoulder_press` (press por encima de la cabeza) de hombros, `chest_dip_or_machine` (fondos profundos) de pecho, `close_grip_press` de tríceps. Hombros se queda sin compuesto si no se sustituye, así que se agregó al catálogo "Press landmine o con agarre neutro" (patrón `shoulder_press_safe`), que pasa a ser la opción compuesta de hombro cuando `shoulder_press` está excluido. No es elegible para top set (DEC-008): un sustituto por lesión no debería cargarse por defecto al máximo.
  · **Codo**: excluye `curl_barbell` (curl con barra) de bíceps y `close_grip_press` de tríceps. Quedan `curl_incline` y `triceps_extension` respectivamente.
  · **Muñeca**: excluye `bench_press` (barra, extensión de muñeca bajo carga) de pecho, `row_barbell` de espalda y `curl_barbell` de bíceps. Quedan `incline_press`/`chest_dip_or_machine`, `vertical_pull`/`row_cable` y `curl_incline`.
  · **Espalda baja**: excluye `hinge` (peso muerto rumano) de isquiotibiales, `row_barbell` de espalda y `squat_bilateral` de cuádriceps. Isquiotibiales se queda solo con `leg_curl` (aislamiento): no se inventa un sustituto compuesto porque no hay uno razonable sin carga axial en el catálogo actual.
  · **Cadera**: excluye `squat_bilateral` y `split_squat` de cuádriceps, `split_squat` de glúteos. Quedan `leg_press`/`knee_extension` y `hip_thrust`/`hip_abduction`/`glute_kickback`.
  · **Rodilla**: excluye `squat_bilateral`, `split_squat` y `knee_extension` de cuádriceps (deja `leg_press`, generalmente mejor tolerada con rango controlado).
  · **Tobillo**: excluye `calf_raise_standing` de pantorrillas (deja `calf_raise_seated`) y `split_squat` de cuádriceps/glúteos (apoyo unilateral inestable).
- "Sustituir" significa, por defecto, que el motor elige el siguiente ejercicio no excluido de la misma lista del grupo muscular (ya existe en el catálogo); solo se agregó un ejercicio nuevo al catálogo en el caso de hombro, donde excluir dejaba el grupo sin ningún compuesto.
- Modo sesión: escala de dolor 0-10 en cada serie de ejercicios cuyo GRUPO MUSCULAR figure en el mapa de exclusión de alguna zona declarada por el usuario (tenga o no diagnóstico); no solo el patrón excluido, porque ese nunca llega a aparecer en el plan una vez excluido, y el que sí aparece (el sustituto, u otro ejercicio del mismo grupo) sigue involucrando la zona igual. Dolor ≤5 que no empeora al día siguiente → aceptable, sigue igual. Dolor >5 → se marca el ejercicio (por patrón) para sustituir en la próxima sesión por otro de la misma lista, y se sugiere consultar a un profesional. La marca se limpia recién cuando 2 sesiones DISTINTAS seguidas (no 2 series de la misma sesión) quedan con dolor ≤5.
  Respaldo: **[Evidencia indirecta]** Pain-Monitoring Model, descrito originalmente por Thomeé et al. para dolor patelofemoral (Thomeé R, *Phys Ther* 1997;77(12):1690-703; solo metadatos verificados) y adaptado a la tendinopatía de Aquiles en Silbernagel KG, Thomeé R, Eriksson BI, Karlsson J, *Am J Sports Med* 2007;35(6):897-906 (PMID 17307888; texto completo de pago, **no leído**). El umbral (dolor ≤5/10 durante o justo después de la actividad y de vuelta al nivel previo a la mañana siguiente) se verificó en el texto completo de Sprague et al. 2021 (*Pilot Feasibility Stud*, PMC7905015), una fuente secundaria; el programa de ejercicios de Silbernagel, tal como lo describen Griffin C, Daniels K, Hill C, Franklyn-Miller A, Morin JB (*BMC Musculoskelet Disord* 2021;22:695, protocolo de ensayo, DOI 10.1186/s12891-021-04553-6, PMC8364697), progresa los ejercicios con dolor de 4/10 como máximo durante y en las 24 h posteriores a la sesión, así que el número varía según la publicación. Extensión del modelo (pensado para tendinopatías) a otras zonas, a dolor por serie y a cualquier mecanismo de dolor: [Criterio]. *Corrección del 2026-10-25 (B-013/B-017, aprobada por Emanuel): antes citaba el artículo de* Br J Sports Med *2007;41(4):276-80, que no es el del modelo.* **Nota:** la app mide el dolor solo durante la serie y no registra cómo está a la mañana siguiente, así que la condición "vuelve a su nivel previo" del modelo original no se implementa (ver B-019); "no empeora al día siguiente", arriba, describe la intención y no lo que hoy se mide.
- Un ejercicio marcado por dolor nunca recibe el top set de DEC-002/008 ni progresión de carga sugerida mientras siga marcado; la marca se limpia si dos sesiones seguidas quedan con dolor ≤5.

### Privacidad
- Los datos de salud (tamizaje, diabetes, lesiones, registros de dolor) se guardan solo en el dispositivo (`localStorage`), nunca se incluyen en la exportación JSON del perfil y se pueden borrar con un botón ("Borrar datos de salud") sin afectar el resto del perfil.

**Arreglo posterior (esta regla no se cumplía en el código):** al revisar DEC-011 se vio que `exportJson` serializaba el perfil completo (`JSON.stringify(profile)`), así que el archivo exportado llevaba `data.health` (tamizaje, diabetes, lesiones y, desde DEC-011, la fecha de autorización por zona), `painFlags` y el dolor registrado en cada serie (`workouts[].pain`), a pesar de lo escrito arriba. Se corrigió con funciones puras de `engine.js`, testeadas:
- **Export (`exportProfile`):** copia del perfil sin `data.health`, sin `painFlags` y sin `workouts[].pain`. Se conserva el resto (datos, medidas, historial de fuerza con peso y repeticiones). No muta el perfil local.
- **Import (`prepareImportedProfile`):** ignora y no guarda `health`, los campos planos de salud del formulario y `painFlags`, también en archivos exportados con la versión anterior que sí los traían. Un perfil importado queda siempre sin lesiones declaradas, sin tamizaje y sin diabetes; si el archivo traía datos de salud con contenido, se avisa en pantalla que se ignoraron. `workouts` tampoco se importa (nunca se importó).
- **Advertencia previa (`localHealthConflicts`):** el import nunca pisa un perfil existente (siempre crea uno nuevo), así que no se pueden borrar lesiones locales. Aun así, si ya hay un perfil local con lesiones declaradas que tiene el mismo id de exportación o el mismo nombre, se pregunta antes de importar y se explica que el nuevo quedará sin lesiones y que el existente conserva las suyas. Cancelar no importa nada.
- **Por qué:** los datos de salud son sensibles. Un archivo exportado suele terminar en un chat, un correo o una nube, y no tiene por qué llevar lesiones, diabetes ni fechas de autorización médica de nadie.
- Quien ya tenga archivos exportados con la versión anterior conserva esos datos dentro de ellos: el arreglo evita nuevas filtraciones, pero no puede borrar lo que ya se exportó.

### Disclaimer
Visible en el perfil y en el plan cuando haya cualquier condición declarada (tamizaje con aviso, diabetes o alguna lesión):
> "Estas adaptaciones aplican posicionamientos científicos oficiales y no reemplazan la valoración de un médico, fisioterapeuta o entrenador certificado."

**Reemplazado por DEC-011:** el texto de arriba afirmaba "adaptaciones" y ya no se usa. Para lesiones, la app no adapta la rutina; ver DEC-011 para el texto vigente y el flujo de autorización profesional.

### Tests
- Síntomas (c) = sí → el plan queda oculto hasta marcar la autorización médica.
- Diabetes con insulina → aparece el aviso de hipoglucemia; ningún número del plan (series, calorías, macros) cambia.
- Lesión de hombro (sin diagnóstico) → ningún ejercicio con patrón `shoulder_press` en el plan; el volumen semanal de hombro se mantiene igual (el sustituto cubre las mismas series).
- Sin condiciones declaradas → el plan queda idéntico al que generaba el motor antes de DEC-009.

**Estado: implementada.**

## DEC-010 · Aporte de volumen por ejercicio (base del validador)
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

Contexto: `docs/specs/validador.md` (23-oct-2026). El validador necesita contar series fraccionadas por músculo (primario 1.0, secundario 0.5) y un historial confiable. Hasta ahora el "músculo" de un ejercicio era el grupo donde vive en el catálogo, sin secundarios.

- **Ubicación ≠ aporte.** El bucket (`EXERCISES[grupo]` / `FUNCTIONAL_EXERCISES[grupo]`) define dónde vive un ejercicio: día, rotación, mapa de lesiones. El aporte de volumen sale de una tabla por ejercicio (`EXERCISE_CONTRIBUTION` en `knowledge.js`).
- **Campos del ejercicio en el plan:** `exerciseId`, `bucket` (dónde vive), `muscle` (primario real; `null` si no suma volumen de hipertrofia), `muscleLabel` ("Funcional" cuando `muscle` es null) y `secondary` (lista, peso 0.5). Para todo el catálogo salvo el paseo del granjero `muscle` coincide con `bucket`, así que ningún plan sin `healthGoal` cambia.
- **`exerciseId` único por entrada del catálogo, estable e inmutable** (`grupo.slug`, p. ej. `glutes.bulgarian_hip`). `pattern` no sirve de id: `split_squat` aparece 3 veces con primarios distintos y `lateral_raise` 2 veces en el mismo bucket. El nombre es solo de pantalla.
- **Historial:** cada serie de `profile.workouts` guarda `exerciseId` desde ahora. Las series viejas solo tienen `exercise` (nombre): se mapean por nombre con `EXERCISE_ID_BY_NAME`, posible porque los nombres del catálogo son únicos (hay un test que lo exige).
- **Tabla de aporte (todo E4: criterio de la app, sin fuente, hasta validarla).** Solo los 10 grupos existentes como primario/secundario. Correcciones aprobadas sobre la propuesta inicial: sin `abs` en sentadilla, sin `back` en peso muerto rumano, sin `chest` en press militar ni en press landmine, sin isquios en patada de glúteo. Hip thrust → isquios queda marcado `status: 'a_verificar'`. Paseo del granjero: sin aporte en ningún grupo (ni siquiera abs).
- **Configuración central** (`VALIDATOR_RULES` en `knowledge.js`, sin JSON externo): cada regla con `value`, `level` (E1-E4), `source`, `reviewedAt` y `verifiedAgainstPrimarySource` (false en todas: solo se consultaron resúmenes; el spec exige verificar contra la fuente primaria antes de fijar cada valor). `sessionSetCap` (25, el aviso de DEC-003 v2) entra como E4, sin fuente y con `reviewRequired: true`. `setExecutionSeconds` (45) es un supuesto fijo, a calibrar con tiempos reales del modo sesión. El motor ya lee de ahí el tope de 25, los 45 s y las series del paseo del granjero (`functionalNoVolumeExtraSets`: 2, E4, sin fuente, `reviewRequired: true`, mismo formato que `sessionSetCap`; se lee en el momento de generar el plan); los valores de R1-R3 están cargados pero todavía no los consume ninguna regla (fases siguientes).
- **DEC-005:** ver "Corrección por DEC-010" en esa decisión (el paseo del granjero se agrega sin descontar series).
- Tests: tabla completa y sin filas huérfanas; correcciones aprobadas; ids y nombres únicos; reglas bien formadas; identidad contra una línea base capturada con el motor anterior (10 perfiles sin `healthGoal` ni lesiones). El test compara TODO el plan y solo admite las diferencias de una lista blanca explícita de rutas (`exerciseId`, `bucket`, `secondary` por ejercicio y, desde DEC-011, `health.injuryBlockReason` y `health.injuryClearance`): cualquier clave nueva, quitada o cambiada que no esté listada lo hace fallar, y una ruta listada que ya no difiera también (para que la lista no quede vieja); paseo del granjero sin descuento y con volumen semanal intacto.

**Estado: implementada (Fase 1).** Todavía no hay validación ni recortes: esta decisión solo prepara los datos.

**Nota (DEC-012):** la tabla de aporte ya no es un literal en `knowledge.js`: ahora se carga desde `data/exercise-muscles.csv` y suma un nivel de evidencia por fila. Los valores no cambiaron.

## DEC-011 · Lesiones: autorización profesional por zona, precauciones E4 y aviso por dolor
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

Contexto: `docs/specs/validador.md`, R5: "Lesiones musculoesqueléticas: no hay un framework validado para adaptar la rutina desde una app. Se advierte, se deriva a un profesional y solo se genera la rutina tras confirmación explícita de que un profesional autorizó el entrenamiento. Nunca: generar como si la condición no existiera, ni fingir una adaptación." Esta decisión reencuadra la Capa 3 de DEC-009 (que hablaba de "adaptar") sin cambiar el mapa de exclusiones.

### Flujo con cualquier zona declarada
1. **Advertencia:** el plan queda en pausa ("Plan en pausa", mismo patrón que la Capa 1 de DEC-009). El texto dice que la app no puede adaptar una rutina a una lesión porque no existe un marco validado.
2. **Derivación:** se indica consultar a un médico o fisioterapeuta.
3. **Confirmación explícita, una vez por zona:** "¿Un profesional te autorizó a entrenar con esta lesión?". Cada confirmación se guarda con fecha (`health.injuries[].clearanceDate`, formato `AAAA-MM-DD`).
- Aplica a cualquier zona, tenga o no diagnóstico profesional y marque o no dolor actual.
- Se vuelve a pedir si se **agrega** una zona (solo la nueva) o si una zona se quita y se vuelve a agregar. Editar el diagnóstico o el dolor actual de una zona que sigue declarada ya NO es neutro: ver "Ajuste posterior: re-autorización cuando una zona empeora" más abajo. La fecha se conserva entre ediciones del perfil (`carryOverInjuryClearances`, porque el formulario reconstruye las lesiones desde campos planos).
- Con síntomas (Capa 1) y lesión a la vez, la pantalla muestra las dos causas de pausa.
- Los perfiles que ya tenían una lesión declarada desde DEC-009 no tienen `clearanceDate`: se les pide la confirmación una vez, sin migración.
- El motor calcula el plan igual esté pausado o no (`buildPlan` es puro); es la interfaz la que decide no mostrarlo. Las sesiones solo se inician desde la vista del plan.

### Precauciones E4
- **Exclusiones por zona** (mapa de DEC-009, sin cambios): se aplican después de la autorización y son una **precaución heurística E4** (criterio de la app, sin fuente). Un aviso `{ evidence: 'E4' }` por zona lo dice en el plan, con la etiqueta visible "E4 · heurística".
- **Sustituto `shoulder_press_safe`:** también E4. El ejercicio del plan lleva `injurySubstitute: { zone, evidence: 'E4' }` y se muestra con la etiqueta. Un reemplazo por dolor (Capa B) NO hereda esa marca del ejercicio original: solo la lleva si el reemplazo es, a su vez, un ejercicio `injuryOnly`.
- **Texto de la interfaz:** ninguno puede decir que la rutina está adaptada a la lesión. Texto vigente del plan con condiciones: *"Estos avisos aplican posicionamientos científicos oficiales cuando existen y no reemplazan la valoración de un médico, fisioterapeuta o entrenador certificado."* + (con lesiones) *"Para lesiones la app no adapta la rutina: solo evita algunos ejercicios de la zona como precaución (E4) una vez que un profesional te autorizó a entrenar."* Reescritos también el texto de ayuda de Salud y el de lesiones del formulario.

### Dolor en Modo sesión (Capa B de DEC-009), aviso E4
- Se conserva la regla de DEC-009: dolor por encima del umbral marca el patrón para sustituir; se desmarca con 2 sesiones DISTINTAS seguidas sin pasarse. La lógica pasó a funciones puras de `engine.js` (`applyPainReading`, `painProfessionalAdvice`), testeadas, sin cambiar su comportamiento.
- **Aviso nuevo:** si un patrón tuvo dolor por encima del umbral en **2 o más sesiones distintas dentro de las últimas 4 semanas** (no necesariamente seguidas), el Modo sesión recomienda consultar a un profesional antes de seguir cargando ese movimiento. Etiqueta E4. Se evalúa sobre el patrón original del plan, haya sido sustituido o no, e independientemente de si la marca de sustitución sigue activa.
- Dos series con dolor de la misma sesión cuentan una vez. "Últimas 4 semanas" = 28 días hacia atrás, inclusive (a los 29 días la sesión deja de contar). El registro por patrón guarda `painSessions: [{ sessionId, date }]` y poda lo que sale de la ventana.
- Valores en `VALIDATOR_RULES`, todos E4: `painFlagThreshold` (5, con la fuente de Silbernagel 2007 ya citada en DEC-009), `painAdviceMinSessions` (2), `painAdviceWindowDays` (28).

### Tests
- Lesión declarada sin confirmar → plan pausado, con advertencia y derivación; con diagnóstico o sin él.
- Confirmación por zona con fecha: con una de dos zonas confirmadas, solo falta la otra; con todas, el plan se muestra.
- La fecha se conserva al editar; se vuelve a pedir al agregar una zona o al quitarla y volver a agregarla.
- Ningún texto del motor ni del código de la interfaz afirma adaptación a la lesión (detector probado contra los textos viejos); las precauciones llevan `evidence: 'E4'`.
- Aviso por dolor: 2 sesiones distintas dentro de 28 días (no seguidas); una sesión o dos series de la misma sesión no alcanzan; dolor igual al umbral no cuenta; el día 28 cuenta y el 29 no; sin mutar el registro anterior.
- Sin lesiones declaradas el plan no cambia y nunca se pausa (identidad contra la línea base).
- E2E en navegador: pausa → confirmación → fecha guardada → etiqueta E4 → al agregar una zona solo se pide la nueva; aviso de dolor y reemplazo sin heredar la etiqueta de precaución.

### Ajuste posterior: re-autorización cuando una zona empeora
La versión original de esta decisión conservaba la autorización de una zona aunque se editara su dolor o su diagnóstico. Eso dejaba entrenando con una autorización dada para otra situación clínica. Ahora, al guardar el perfil (`reconcileInjuryClearances`, función pura de `engine.js`):
- **Sube el dolor de la zona** (de "sin dolor" a "con dolor actualmente") → se invalida la autorización de esa zona.
- **Cambia el diagnóstico** (de "sin diagnóstico" a "con diagnóstico profesional", o al revés) → se invalida.
- **Baja el dolor, o no cambia nada** → no se pide nada; la fecha se conserva.
- La invalidación es **por zona**: las demás conservan su fecha. Una zona invalidada vuelve a pasar por el mismo flujo de advertencia, derivación y confirmación fechada.
- La comparación es contra lo guardado inmediatamente antes de editar, no contra el momento de la autorización: si el dolor baja y después vuelve a subir, esa segunda edición es una subida y vuelve a pedir la confirmación (criterio conservador).
- Hoy el dolor de una zona es una casilla (con dolor / sin dolor), así que "subir" es pasar de sin dolor a con dolor. Si más adelante se agrega una escala por zona, la regla "sube → invalida, baja → no" se mantiene y solo cambia la comparación.
- **Explicación en la pausa:** cuando una zona vuelve a pedirse por haber empeorado (y no cuando es su primera autorización), la pantalla de pausa agrega arriba del texto de siempre la línea *"Se pide de nuevo porque registraste dolor o cambiaste el diagnóstico en [zona]"*, con solo las zonas afectadas. La primera pausa y la de una zona nueva quedan sin esa línea. Para saber la diferencia, `reconcileInjuryClearances` marca la zona con `clearanceInvalidated: true` solo cuando pierde una autorización que ya tenía; la marca sobrevive a más ediciones mientras la zona siga sin confirmar (incluso si el dolor vuelve a bajar o empeora otra vez) y se borra al confirmar. La clave solo existe cuando vale `true`, así que no cambia nada para quien no empeoró. `zonesPendingReauthorization` (función pura) devuelve esas zonas. La marca es parte de `health`: no entra en `plan.health` ni sale en el export.
- `carryOverInjuryClearances` (conservar fechas) se mantiene como estaba; `reconcileInjuryClearances` la compone y además invalida las zonas que empeoraron.
- Tests: subida de dolor pausa; bajada o igual no pausa; cambio de diagnóstico en ambos sentidos pausa; invalidación solo de la zona afectada; funciones sin mutar entradas; e2e del flujo en navegador. Prueba de mutación: revirtiendo la invalidación fallan 3 tests unitarios y el e2e.

**Estado: implementada (Fase 1b y ajuste posterior).**

## DEC-012 · Tabla de músculos por ejercicio en un CSV versionado, con nivel de evidencia
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

Contexto: `docs/specs/validador.md` pide contar series fraccionadas (primario 1,0, secundario 0,5) y que el conteo "se verifique contra el catálogo completo con las etiquetas corregidas". Para eso la tabla de DEC-010 necesita fuente por fila y un lugar donde se pueda revisar y corregir sin tocar código. Esta fase solo crea la capa de datos: **no cambia cómo se cuenta el volumen** (eso es la Fase 2) y la salida del plan es idéntica.

### Decisión
- **La tabla vive en `data/exercise-muscles.csv`**, versionado en git. Columnas: `exerciseId, muscle, role, evidence_level, source, notes, review_date`. Reemplaza al literal de DEC-010 en `knowledge.js`. 61 filas: 34 `primary` y 27 `secondary`.
- **`role` solo vale `primary` o `secondary`. No se cargan antagonistas ni estabilizadores.** El criterio sigue el de Pelland et al. 2026 (sección 2.5): primario = el músculo "probablemente generador primario de fuerza"; secundario = "probablemente entrenado de forma significativa pero no generador primario (sinergista)". Solo los 10 grupos de la app.
- **Jerarquía de evidencia por fila:**
  - `verificado`: un estudio que midió hipertrofia de ese músculo con ese ejercicio o uno equivalente (la nota aclara "equivalente").
  - `probable`: solo EMG o una clasificación publicada (Tabla 1 de Pelland et al. 2026). Esto último amplía la definición de "EMG o manual de referencia": la Tabla 1 es la decisión de los autores sobre qué ejercicio cuenta como directo o indirecto, no una medición. Cambiarlo a `a_verificar` es editar la columna.
  - `a_verificar`: sin fuente leída. Es preferible a una cita de la que no se está seguro: **no se inventan citas**. Una fila `a_verificar` puede llevar una fuente de contexto o en contra, y la nota lo dice.
  - Solo `verificado` y `probable` exigen `source` (autor, año, título y revista de lo que se leyó). Los resúmenes se leyeron por PubMed; el texto completo solo se abrió en Pelland 2026 y en el preprint de Remmert.
- **Distinto de E1-E4.** `evidence_level` es por fila. La etiqueta `evidence: 'E4'` de `EXERCISE_CONTRIBUTION` sigue igual: la tabla como regla de la app sigue siendo E4 (criterio de la app) hasta validarla. `evidenceLevel` y las filas (fuente, nota, fecha) viajan con los datos, pero **ningún cálculo los consume todavía** (un test lo vigila sobre `engine.js` y sobre las claves del plan).
- **Paseo del granjero:** sin filas, igual que hoy (sin primary y sin secundarios, DEC-010). Está declarado en `NO_MUSCLE_CONTRIBUTION` de `knowledge.js`; los tests exigen que ese sea el único ejercicio sin filas y que nadie más lo esté.
- **Resultado de la carga inicial:** 18 `verificado` (13 primary y 5 secondary), 26 `probable` (14 y 12) y 17 `a_verificar` (7 y 10). Fuentes y hallazgos en `docs/research/fuentes-musculos-ejercicio.md`.

### Hallazgos que cuestionan datos actuales (no se cambió ningún valor en esta fase)
- `glutes.hip_thrust` → isquios: `a_verificar`. Plotkin 2023 midió el área de isquios con hip thrust y no encontró crecimiento apreciable (EMG de Contreras 2015 sí muestra más bíceps femoral que la sentadilla). Candidata a revisar en la Fase 2.
- `glutes.bulgarian_hip` → cuádriceps (0,5): Pelland 2026 clasifica la búlgara como serie directa para el cuádriceps (1,0).
- `back.pullover_cable`: Di Fonza 2026 (revisión de EMG) reporta que el pullover parece activar más el pectoral que el dorsal; el primario `back` queda sin respaldo.
- Sentadilla y prensa → glúteo (0,5): Kubo 2019 midió glúteo mayor +6,7 % con sentadilla completa y Kinoshita 2026, +15,4 % con prensa. El 0,5 podría subestimar ese aporte.
- Sin respaldo en el dataset de Pelland: no midió glúteo, dorsal, deltoides lateral/posterior, pantorrillas ni abdomen.

### Cómo llega a la app
- GitHub Pages solo publica `ifbb-pro-agent/` y el modo sin conexión necesita todo precargado, así que la app **no lee el CSV**. `scripts/build-exercise-muscles.js` lo valida y genera `ifbb-pro-agent/js/exerciseMuscles.js`, que se **sube al repositorio**. `index.html` lo carga antes de `knowledge.js` y `sw.js` lo precarga (versión de caché en v4).
- El parser acepta coma y punto y coma (Excel en español guarda con punto y coma), BOM, CRLF y comillas, y rechaza con un mensaje por fila: `role`, `evidence_level` o `muscle` inválidos, `verificado` o `probable` sin `source`, fecha que no sea `AAAA-MM-DD`, pares repetidos y más de un `primary` por ejercicio. `data/README.md` explica cómo abrirlo y guardarlo desde Excel.
- Un test falla si el módulo no coincide con el CSV. Consecuencia: editar el CSV en GitHub sin regenerar el módulo frena el despliegue (la puerta de Pages corre `engine.test.js`). Alternativa no adoptada: un paso de build en el workflow, que implica modificar el CI/CD.

### Por qué no una base de datos externa
- **Sin conexión:** la app es una PWA y tiene que funcionar sin red; una base externa agregaría un pedido de red y un estado de error en el generador.
- **DEC-009:** los datos del usuario no salen del dispositivo. Hoy la app no hace ningún pedido a un servicio propio ni maneja credenciales; una base externa lo cambiaría, con cuenta, claves y superficie de ataque.
- **Tamaño:** 35 ejercicios y 61 filas (el CSV pesa ~28 KB y el módulo generado ~34 KB). Cabe en el repositorio, cada cambio se revisa en un PR con su historial y se edita con Excel.

### Tests (`engine.test.js`)
Cada `exerciseId` del CSV existe en el catálogo y viceversa (salvo el paseo); exactamente un `primary` por ejercicio; valores válidos de `role`, `evidence_level`, `muscle` y fecha; `source` en `verificado` y `probable`; citas con autor y año; el parser lee igual coma y punto y coma (con BOM y CRLF) y respeta comillas, delimitadores y saltos de línea dentro de un campo; rechaza datos inválidos; el módulo generado coincide con el CSV; el catálogo toma `muscle`, `secondary` y nivel del CSV en su orden; conteo de niveles; ningún cálculo consume el nivel; y la salida de los 30 planes (10 perfiles × sin extras, con `healthGoal` y con `healthGoal` más lesiones) es idéntica a la de `main` antes de la fase (huellas en `tests/fixtures/plan-hashes.json`, regenerables con `scripts/snapshot-plan-hashes.js` solo si un cambio de salida es intencional). Prueba de mutación: cambiar a mano un `primary` en el CSV hace fallar 2 tests si no se regenera el módulo y 6 si se regenera.

**Estado: implementada (capa de datos).** El nivel de evidencia todavía no se usa en ningún cálculo.

**Nota (DEC-013):** el CSV pasó a formato largo (`relacion` y `evidencia` en vez de `role` y `evidence_level`) y el bucket tiene su propio CSV.

## DEC-013 · Datos v2: relación ejercicio-músculo en formato largo, bucket separado y reglas de evidencia
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

Contexto: `docs/specs/validador.md` (Requisitos de datos). La Fase 2 necesita contar series directas e indirectas por músculo, y la tabla de DEC-012 (un `primary` por ejercicio y `secondary` a 0,5) no puede decir que un ejercicio tiene dos directas, ni que un par no tiene relación. Esta decisión migra solo los **datos**: **la salida del plan es idéntica a la de `main`** y ningún cálculo lee todavía la relación ni la evidencia.

### Formato
- **`data/exercise-muscles.csv`**: una fila por par ejercicio-músculo. Columnas: `exerciseId, muscle, relacion, evidencia, fuente, notes, review_date`. `relacion` = `directa | indirecta | ninguna`; `evidencia` = `verificado | verificado (1 estudio) | probable | a_verificar`. Equivalencia con v1: `primary` → `directa`, `secondary` → `indirecta`. Un par sin fila no se evaluó y cuenta como ninguna. Un ejercicio puede tener varias directas (ya no "exactamente un primary"); los tests exigen al menos una, salvo el paseo del granjero (sin filas).
- **`data/exercise-buckets.csv`**: `exerciseId, bucket`, un bucket **único** por ejercicio, separado de las relaciones. Un test exige que coincida con el grupo del catálogo donde vive cada ejercicio. Ejemplo: la búlgara de glúteo tiene bucket `glutes` y es directa de `quads`.
- **Sin pesos en los datos.** No hay columna de peso y el parser rechaza columnas desconocidas. El peso de cada categoría (directa 1, indirecta 0,5, ninguna 0) será una convención global de la Fase 2.
- El módulo generado `ifbb-pro-agent/js/exerciseMuscles.js` ahora trae `rows` y `buckets`; `sw.js` sube la caché a v5. Parser, Excel con punto y coma, BOM y CRLF siguen igual (`data/README.md`).

### Reglas de datos
1. **La evidencia solo mueve una relación entre categorías.** Prohibido usar pesos a medida por ejercicio.
2. **Una medición directa de hipertrofia (resonancia o ultrasonido) prevalece sobre EMG o biomecánica.**
3. **Un solo estudio puede mover la relación un paso** (ninguna ↔ indirecta ↔ directa) y la fila se marca `verificado (1 estudio)`.
- Las filas `verificado` de DEC-012 no se re-etiquetaron en bloque: solo se usa `verificado (1 estudio)` donde esta fase movió o confirmó una relación con un único estudio.

### Cambios aplicados
| Par | Antes (v1) | Ahora (v2) | Base |
| --- | --- | --- | --- |
| hip thrust → isquios | secundario, a_verificar | **ninguna**, verificado (1 estudio) | Plotkin 2023 (resonancia, n=18): sin crecimiento apreciable de isquios. Prevalece sobre el EMG de Contreras 2015 (regla 2). Un paso |
| sentadilla → glúteo | secundario, verificado | **indirecta**, verificado | Kubo 2019 (+6,7 %) y Plotkin 2023. Sin cambio de categoría |
| prensa → glúteo | secundario, verificado | **indirecta**, verificado (1 estudio) | Kinoshita 2026 (+15,4 %). Sin cambio de categoría. Ver nota abajo |
| búlgara de glúteo → cuádriceps | secundario, a_verificar | **directa**, probable (bucket glúteo) | Pelland 2026, Tabla 1: la sentadilla dividida (búlgara incluida) es directa para el cuádriceps. Es una clasificación publicada, no una medición. Un paso |
| pullover en polea | dorsal directo, a_verificar | **sin cambios**; nota `PENDIENTE:` | Se confirma qué variante estudió Di Fonza 2026 antes de tocar nada (solo se leyó el resumen) |

Nota sobre la prensa: con la regla 3, un único estudio con +15,4 % de glúteo mayor permitiría subir la relación un paso, a directa. Se mantiene indirecta por decisión del dueño del modelo; la fila lo deja escrito para reabrirlo si aparece una segunda medición. La sentadilla tiene dos mediciones y también queda indirecta (directa significa generador primario de fuerza, criterio de Pelland 2026, y la hipertrofia medida no lo establece).

### La salida del plan no cambia, y cómo se demuestra
Dos de los cambios (hip thrust → isquios y búlgara → cuádriceps) alterarían `muscle`/`secondary` del plan si se leyeran de los datos nuevos. Hasta la Fase 2, el plan sigue leyendo una **vista v1 congelada** (`PLAN_MUSCLE_VIEW_V1` en `knowledge.js`, 35 entradas copiadas del CSV de DEC-012, de uso transitorio). La Fase 2 la reemplaza por el conteo fraccionado y la borra.
- **Test de diferencias:** la vista v1 y los datos v2 difieren únicamente en que el hip thrust pierde a isquios (la búlgara sigue apareciendo como secundaria de cuádriceps en la vista v1 y como directa en v2, que no se lee).
- **Huellas:** 30 planes (10 perfiles × base, `healthGoal`, `healthGoal` + lesiones) con la misma huella que `main`, comparados además en vivo contra el motor de `main` (30 de 30 iguales, 0 distintos).
- Test que vigila que `engine.js` no lea relación, evidencia ni la vista v1, y que el plan no exponga esas claves.

### Pendiente
- Pullover en polea: confirmar la variante de Di Fonza 2026 con el texto completo.
- Prensa → glúteo: revisar la promoción a directa si hay una segunda medición.
- Fase 2: conteo fraccionado y validador (ver DEC siguiente).

### Tests (`engine.test.js`)
Los de DEC-012 adaptados al formato nuevo, más: al menos una directa por ejercicio; bucket único y coincidente con el catálogo (también con punto y coma); sin columna de peso; los cambios aprobados fila por fila (cada uno un paso, `verificado (1 estudio)` solo en hip thrust → isquios y prensa → glúteo); diferencias entre la vista v1 y los datos v2; módulo igual a los dos CSV.

**Estado: implementada (capa de datos v2).** Ningún cálculo usa todavía la relación ni la evidencia.

## DEC-014 · Fase 2 del validador: conteo fraccionado, regla E4 (tope por sesión) y aviso de rendimiento decreciente (R1)
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

Contexto: `docs/specs/validador.md` (R1, R2, R4) y DEC-013 (datos v2). Esta fase es la primera que **cambia la salida del plan**, a propósito, y que hace que el motor use los datos de relación.

### Conteo fraccionado (Pelland et al., Sports Med 2026)
- Una serie suma a cada músculo según la categoría de su relación: **directa = 1, indirecta = 0,5, ninguna = 0, `a_verificar` = 0**. Los pesos son una convención global en `VALIDATOR_RULES` (`directSetWeight`, `secondaryMuscleWeight`, `noRelationWeight`), nunca un valor por ejercicio; un test comprueba que solo existen los pesos 1 y 0,5.
- El 0,5 está etiquetado como **convención del modelo de mejor ajuste** (Pelland lo declara como supuesto y heurística). La nota de la regla menciona que un análisis exploratorio de Remmert et al. sugiere ~0,32.
- El plan expone `setWeights` por ejercicio y `fractionalSets` por sesión. `muscle` y `secondary` salen ahora de los datos v2 (primario = el bucket si es directa en él, si no la primera directa; secundarios = el resto de las relaciones que no son ninguna). Se retiró la vista v1 transitoria de DEC-013.
- Consecuencia que conviene tener presente: como `a_verificar` cuenta 0, ejercicios como el press inclinado con mancuernas no suman nada al pectoral en el conteo (aunque sus series existen y se programan). **Corregido en DEC-016:** el músculo del bucket cuenta siempre como directo. Cuanto más se verifiquen las filas, más exacto el conteo.

### R1 · aviso de rendimiento decreciente (E3), no un tope
- **Método confirmado antes de activarlo** (`docs/research/fraccionado-pelland-remmert.md`, texto completo de Remmert et al., sección 2.5): usa el mismo criterio directa/indirecta que Pelland, y su "fraccionado" es directa 1 + indirecta 0,5 por músculo medido. Es comparable con el 0,5, así que se activó.
- A más de **~11 series fraccionadas por músculo por sesión**, el plan muestra un aviso (`rule: 'R1'`, `evidence: 'E3'`) que dice que no es un límite, que el umbral lo fijaron los autores de forma arbitraria, que es un preprint sin revisión por pares, y el conteo usado. **No recorta ninguna serie.** Un test lo verifica (en 11 justos no avisa). Limitación documentada: los estudios medían sobre todo un solo músculo, así que extrapolar a cuerpo completo es cauteloso.

### Regla E4 · tope de 25 series por sesión
- **Valor aprobado:** 25 series por sesión, nivel **E4, convención de la app**, sin fuente externa. `validador.md` no tenía un valor y no se encontró ninguna fuente que defina un máximo de series ni de minutos por sesión; el valor es el `sessionSetCap` de DEC-003 v2, que deja de ser un aviso sin recorte. R4 sigue sin fijar un tope de minutos: la duración es derivada.
- **Cuándo y cómo recorta:** al generar el plan (antes del top set y de la duración), solo **aislamientos**, primero los de grupos chicos (abdomen, pantorrillas, bíceps, tríceps), y siempre sobre la sesión más pasada del tope. **Nunca recorta multiarticulares.**
- **R2 prevalece sobre E4:** un grupo mayor (pecho, espalda, hombros, cuádriceps, isquios, glúteos) no baja del piso semanal de 10 series, ni en fraccionadas ni en series reales (si ya estaba por debajo, no baja más). Si el tope no se alcanza sin romper eso, la sesión queda por encima y un aviso lo dice.
- **Aceptación explícita:** `profile.longSessionAcceptedOn` (fecha `AAAA-MM-DD`). **Reemplazada en DEC-016** por una aceptación acotada a la firma del plan y a un máximo de series. Con ella no se recorta nada y el plan lo registra. En la interfaz, un botón "Aceptar sesiones más largas (sin recortes)" guarda la fecha y otro la revierte.
- **Transparencia:** cada sesión recortada genera un aviso E4 con las series quitadas por ejercicio y la etiqueta "E4 · heurística"; el volumen semanal mostrado (`weeklySets`) pasa a ser el real de las sesiones. Si un grupo queda sin series directas en la semana, un aviso adicional lo nombra.
- `plan.training.sessionLimit` = `{ cap, level, basis, accepted, trimmed, overCap }`.

### Efecto en los 10 perfiles de referencia (series por sesión: sin tope → con tope)
| Perfil | Sin tope | Con tope | Por encima | Duración máx. (min) |
| --- | --- | --- | --- | --- |
| oscar_cut_classic_5d | 25/20/23/22/19 | igual | — | 72 → 72 |
| novice_bulk_physique_4d | 32/9/30/6 | 25/9/24/6 | — | 84 → 70 |
| wellness_maintain_5d | 21/27/15/15/27 | 21/25/15/15/25 | — | 96 → 92 |
| general_cut_3d | 35/32/33 | 25/24/26 | 26 | 104 → 88 |
| bb_bulk_advanced_6d | 25/27/30/25/26/29 | 25/25/26/25/25/25 | 26 | 106 → 98 |
| bikini_cut_lagging_4d | 28/19/27/17 | 25/19/25/17 | — | 73 → 70 |
| emanuel_legs_cut_4d | 32/24/32/21 | 24/24/24/21 | — | 87 → 87 |
| figure_maintain_novice_3d | 30/31/30 | 24/25/25 | — | 95 → 85 |
| physique_cut_adv_lag_5d | 33/12/29/28/12 | 25/12/24/25/12 | — | 98 → 82 |
| physique_w_bulk_6d | igual | igual | — | 85 → 85 |

Costos que la regla trae (se avisan en el plan): en los splits de 3 y 4 días los grupos chicos pueden quedar con muy pocas series o con ninguna directa; dos perfiles quedan 1 serie por encima del tope porque el piso de R2 impide recortar más; y 25 series no garantizan menos de 90 minutos (las piernas con unilaterales y multiarticulares llegan a ~98 min).

### Casos de aceptación (`engine.test.js`)
- **Full body, 3 días/semana, lesión de hombro:** sin tope daba 35/32/33 series y más de 90 min; con la zona autorizada (DEC-011) queda en 25/24/25, sin press militar, con avisos E4, sin multiarticulares recortados y con el piso de R2 intacto. Sin autorización el plan sigue en pausa.
- **Búlgara de glúteo:** bucket glúteo, suma 1 por serie a glúteo y 1 a cuádriceps; en las sesiones del plan el cuádriceps cuenta esas series.
- **Hip thrust:** con isquios = ninguna, ningún perfil de la prueba que incluye hip thrust termina con más series de isquios que el plan sin tope ni sesiones por encima de E4 sin explicación; el hip thrust no lleva peso a isquios.
- Además: conteo 1 / 0,5 / 0 / a_verificar 0; R1 aviso sin recorte y sin la palabra "máximo"; `enforceSessionCap` (grupos chicos primero, multiarticulares intactos, piso, aceptación); valores E4 en configuración.
- Pruebas de mutación: desactivar el recorte hace fallar 4 tests; devolverle los isquios al hip thrust hace fallar 7.
- La línea base de la DEC-010 y la regresión de DECISIONS.md siguen vigentes **con la aceptación explícita** (sin recorte): solo difieren las rutas listadas (`sessionLimit`, `setWeights`, `fractionalSets`, avisos con `evidence`/`rule`). Las huellas de los 30 planes (`plan-hashes.json`) se regeneraron porque la salida cambió a propósito.

**Estado: implementada (Fase 2).** Fuera de alcance: antagonistas, superseries y base de datos externa.

## DEC-015 · Integridad del registro de sesión: sesión persistente, edición de series y cronómetro por timestamp
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

Contexto: diagnóstico del modo sesión (Fase 4/5) antes del rediseño visual. Problemas encontrados: la sesión en curso vivía solo en memoria (`sm`); un cierre o apagón perdía en qué ejercicio ibas, los valores tecleados y la hora de inicio; las series hechas quedaban en `profile.workouts` sin marca de sesión terminada; repetir el día creaba otro `sessionId` y permitía series duplicadas; no se podía editar ni borrar una serie; el cronómetro era un `setInterval` que restaba 1 por tick (se desfasa con la pantalla bloqueada), no se persistía y el Wake Lock no se volvía a pedir al volver a la pestaña.

**Alcance por paso.** Paso 1 (sesión persistente y reanudable): implementado abajo. Pasos 2 (editar y borrar series) y 3 (cronómetro, Wake Lock y tono): pendientes, se documentan aquí al implementarlos.

### Paso 1 · Sesión persistente y reanudable
- **Capa de estado reutilizable:** `ifbb-pro-agent/js/sessionStore.js` (módulo sin DOM, probado en Node; la interfaz actual solo la llama). El rediseño visual reutiliza este módulo y no necesita tocar el estado.
- **Dónde vive:** la sesión en curso se guarda en su propia clave de `localStorage` (`ifbb-agent:session:v1`), con `status: 'en_curso'`, `startedAt`, `updatedAt`, el ejercicio actual, un snapshot de los ejercicios (la reanudación no depende de regenerar el plan) y por cada serie `weight`, `reps`, `pain`, `done` y `doneAt` (timestamp). Se guarda al empezar, al teclear peso, repeticiones o dolor, al cambiar de ejercicio y al registrar cada serie.
- **Series sin duplicados:** cada serie tiene una clave estable `setKey = sessionId:ejercicio:serie` y se escribe en `profile.workouts` con *upsert* (de ahí lee Progreso, igual que antes). Registrar o reconciliar dos veces la misma serie reemplaza la fila; una serie ya hecha no se vuelve a registrar. Las filas anteriores a este cambio no tienen `setKey` y no se tocan ni se migran.
- **Dos escrituras, un corte posible:** primero se escribe la fila del historial y luego la sesión. Al reanudar, `reconcile` repara cualquiera de los dos cortes (fila sin reflejo en la sesión, o serie hecha en la sesión sin fila) y es idempotente.
- **Al abrir la app:** si hay una sesión `en_curso`, aparece "Reanudar" o "Descartar" con el día y las series hechas. Reanudar restaura la pantalla, los valores tecleados y el ejercicio; vuelve a pedir el Wake Lock. Descartar pide confirmación y **borra la sesión y las series que ya había registrado** (solo las de esa sesión). Intentar empezar otra sesión con una en curso muestra el mismo aviso: hay una sola sesión activa.
- **Cerrar con ✕** ya no termina la sesión: queda `en_curso` y se puede reanudar.
- **Terminar:** la sesión pasa a `completada` una sola vez (`profile.sessions`: id, día, fechas, series hechas y totales), se borra la clave activa y no se vuelve a ofrecer. Completar dos veces no duplica la entrada ni cambia la hora de fin.
- **Datos ilegibles:** un registro corrupto, de otra versión o inconsistente no se toma por sesión; no se borra en silencio y la app avisa ("no se pudo leer una sesión guardada"). Si el almacenamiento falla al escribir, se muestra un aviso.
- **Privacidad (DEC-009):** la sesión activa, que puede incluir dolor por serie, se queda en el dispositivo. No entra en el export (la exportación sigue sin dolor).
- **Límites conocidos:** una sesión sin ninguna serie hecha también se ofrece para reanudar (se descarta con un toque). Si dos pestañas abren la app a la vez, gana la última escritura. La duración mostrada en el resumen cuenta desde el inicio original, incluidas las pausas largas.
- **Service worker:** precarga `sessionStore.js`; caché v7.
- **Tests:** unitarios en `engine.test.js` (la puerta del despliegue): cerrar a mitad y reanudar con los mismos datos y sin duplicar; la misma serie dos veces; reparación en ambos sentidos y filas viejas intactas; descartar sin tocar otras sesiones; registros ilegibles o inválidos; completar sin series. E2E en navegador: registrar una serie, recargar (simula cerrar la app), ver el aviso, reanudar, terminar una sola vez, no reofrecer, y descartar. Pruebas de mutación: duplicar filas o apagar la reparación hacen fallar tests.

### Paso 2 · Editar y borrar series
- **UI mínima, compartida:** un solo editor (peso, repeticiones, Guardar / Borrar serie / Cancelar) que usan el modo sesión y el historial; el rediseño visual lo reemplaza sin tocar la lógica (`sessionStore.js`).
  - **En la sesión en curso:** en una serie ya registrada, el botón "Editar" (donde antes había un check deshabilitado) abre el editor.
  - **En el historial:** Progreso tiene una sección "Sesiones registradas" con las últimas 30 sesiones desplegables; tocar una serie abre el mismo editor. Incluye las sesiones completadas y los registros anteriores a DEC-015 (que se muestran como "sin estado" y se identifican por sus datos, sin migrarlos). La sesión en curso no se lista ahí: se edita en su pantalla. **Reemplazado por DEC-023 desde el corte al núcleo nuevo, solo en la parte de los registros anteriores a DEC-015 (sin `setKey`)** (no antes: hasta entonces sigue vigente; su código se elimina en el PR del corte).
- **Validación:** peso de 0 a 1000 (vacío = 0, peso corporal) y repeticiones enteras de 1 a 999; si no cumple, un aviso y no cambia nada. Editar no toca el dolor registrado ni los avisos de DEC-009/011.
- **Borrar** pide confirmación. En la sesión en curso la serie queda sin registrar y se puede volver a registrar (una sola fila); en el historial, la sesión completada baja su contador de series hechas. Una sesión sin series sigue listada con "Sin series".
- **Sin resucitar nada ante un corte** (la sesión y el historial son dos escrituras, y en el historial el estado entero es una sola):
  - Editar: primero se cambia y se guarda la sesión, después la fila. `reconcile` resuelve un desacuerdo a favor de la edición más reciente (`editedAt`).
  - Borrar: primero se guarda en la sesión la intención de borrar (`deletedKeys`), después se quita la fila; si se corta entre las dos, al reanudar la serie borrada no vuelve. Volver a registrar esa serie limpia la marca.
- Las filas editadas llevan `editedAt` y se muestran como "(editada)". Progreso y la gráfica de fuerza leen las mismas filas, así que ven la corrección.
- **Tests:** unitarios (editar sesión e historial; valores inválidos; borrar con corte simulado y re-registro; corte a mitad de una edición en los dos sentidos; historial con registros viejos y contador) y E2E (editar una serie con rechazo de repeticiones 0, recargar y reanudar con la edición guardada, borrar y volver a registrar, editar y borrar en el historial). Prueba de mutación: sin la marca de borrado, la serie borrada reaparece y falla un test.
- **Arreglo asociado:** las transiciones de pestaña (View Transitions) rechazaban su promesa al abortarse (recarga, pestaña oculta) y lanzaban un error de consola intermitente; ahora se ignoran. El E2E repetido quedó estable. Además el aviso "Descartar" usa el mismo modal que el resto de la app en vez de `confirm()`.

### Paso 3 · Cronómetro de descanso, pantalla encendida y tono
- **Timestamp de fin:** el descanso se guarda como `endAt = ahora + duración` dentro de la sesión en curso (`rest: { total, startedAt, endAt }`). Lo que falta se recalcula siempre como `endAt − ahora` (entero hacia arriba, nunca negativo, acotado a la duración total por si el reloj se atrasa), en cada tick de 250 ms y en `visibilitychange`. Ya no se resta 1 por tick, así que los ticks perdidos con la pantalla bloqueada no desfasan nada.
- **Persistencia:** `rest` viaja con la sesión (se guarda al iniciarlo, al sumar 30 s y al terminar o saltar). Al reanudar tras un cierre, si todavía falta tiempo el cronómetro sigue con lo que falta según el reloj real; si ya venció, se limpia sin sonar. Un `rest` ilegible se descarta sin invalidar la sesión. Terminar la sesión lo borra.
- **Pantalla encendida (Wake Lock):** se pide al empezar o reanudar y se vuelve a pedir en `visibilitychange`, porque el navegador lo libera solo al ocultar la app. **Respaldo:** si el navegador no lo soporta (o lo deniega), la sesión muestra un aviso ("Tu navegador no puede mantener la pantalla encendida… el cronómetro sigue siendo exacto") en lugar de un truco de video oculto. Es una decisión de alcance: el cronómetro no depende de la pantalla, así que el respaldo no tiene que mantenerla encendida.
- **Tono al llegar a cero:** tres pitidos cortos con Web Audio (880, 880 y 1175 Hz) más la misma vibración de antes (`[200, 100, 200]`). El `AudioContext` se crea y se reanuda dentro del gesto que inicia el descanso (tocar "Hecha"), porque los navegadores no dejan sonar audio sin un gesto previo. Si el descanso venció con la app oculta o cerrada, al volver solo se cierra el cronómetro: no suena tarde.
- **Limitación documentada:** con la pantalla bloqueada, el aviso al llegar a cero **no está garantizado** en una app web: el navegador pausa los timers y suele suspender el audio y la vibración de una página oculta, y una PWA no puede programar una alarma del sistema. Lo que sí se garantiza es el tiempo correcto al desbloquear. El overlay del cronómetro lo dice en una línea. Para un aviso con la pantalla bloqueada haría falta una notificación push o una app nativa, fuera de alcance.
- **Tests:** unitarios del cronómetro (descanso de 90 s sin ningún tick: 30 s a los 60 s, redondeo hacia arriba, 0 al vencer o mucho después; +30 s y sobrevivir a un cierre; `rest` inválido; reloj atrasado) y E2E en navegador con el reloj desplazado 60 s y un evento `visibilitychange` (equivale a desbloquear tras 60 s: el tiempo mostrado baja 60 s) y el descanso persistido que reaparece al reanudar; comprobación manual del aviso cuando falta Wake Lock. No se puede probar con automatización que el tono suene ni que la pantalla se mantenga encendida.
- `sw.js`: caché v8.

**Estado: Pasos 1, 2 y 3 implementados.**

## DEC-016 · Tres correcciones del validador: bucket directo, aceptación del tope acotada y aviso de grupos bajo el mínimo
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

Contexto: revisión de DEC-014 contra lo acordado. Tres desvíos o huecos, corregidos juntos porque se miden sobre los mismos perfiles de referencia. Estado de las reglas de `VALIDATOR_RULES` incluido.

### 1. El músculo del bucket cuenta siempre como directo
- **Bug:** el 0 por evidencia `a_verificar` (DEC-014) se aplicaba a **todas** las relaciones, incluida la del músculo para el que se programa el ejercicio. El press inclinado con mancuernas, programado en pecho, no sumaba nada al pecho.
- **Regla:** el músculo del **bucket** de cada ejercicio cuenta **siempre como directo (peso 1)**, sea cual sea su evidencia. El 0 por `a_verificar` aplica **solo a las demás relaciones**. Excepción: los ejercicios sin aporte de hipertrofia (`NO_MUSCLE_CONTRIBUTION`, el paseo del granjero) siguen en 0.
- **La evidencia de la fila no cambia:** sigue siendo `a_verificar` en el CSV y en el plan; solo deja de descontarse la serie del músculo para el que se programó. Es una convención de conteo, no una verificación.
- **Alcance real:** 7 ejercicios tenían el bucket `a_verificar` y son los únicos que cambian: press inclinado, fondos o press en máquina, pullover en polea, face pull, press landmine, vacuum y step-up. Las otras 8 relaciones `a_verificar` (fuera del bucket) siguen contando 0. Los datos son coherentes: todo bucket es una fila `directa` en el CSV.
- **Efecto:** cambia solo el conteo fraccionado y los avisos que dependen de él (R1, grupos bajo el mínimo). **No cambia ninguna serie ni ninguna sesión:** el tope E4 recorta exactamente lo mismo que antes.

### 2. Aceptación del tope E4, acotada
- **Antes:** `longSessionAcceptedOn` era una fecha única por perfil que apagaba todo recorte, para siempre y para cualquier plan.
- **Ahora:** `data.longSessionAcceptance = { on, signature, maxSets }`.
  - **Firma del plan:** `dias=…;division=…;objetivo=…;rezagados=…(ordenados);nivel=…`.
  - **Máximo aceptado:** la sesión más larga del plan **sin recortar** en el momento de aceptar (es lo que el usuario vio).
- **Se invalida** si cambia cualquier parte de la firma, o si alguna sesión generada supera `maxSets`. En ese caso el tope E4 vuelve a recortar, el plan avisa por qué ya no aplica (qué parte de la firma cambió, o cuántas series llegaría a tener contra las aceptadas) y la pestaña Entreno vuelve a ofrecer aceptar. Con el máximo exacto sigue válida.
- **No vence por fecha.** Las fechas de aceptación siguen guardándose (`on`), como pide el spec.
- **Lo que no invalida:** cambios fuera de la firma (peso, edad, medidas, etc.) mientras ninguna sesión pase del máximo.
- **Editar el perfil conserva la aceptación** (antes el formulario la borraba sin avisar): decide la firma.
- **Migración de `longSessionAcceptedOn`:** al arrancar la app, cada perfil con la fecha vieja y sin aceptación nueva se migra **una vez**, tomando la firma y el máximo **del plan vigente al migrar** (que con la aceptación vieja sale sin recortes). Queda `longSessionAcceptedOn: ''`. Antes de migrar, el motor interpreta el formato viejo contra el plan vigente (mismo resultado). El import de un archivo con el formato viejo también migra. Migrar no cambia el plan que ve el usuario. **Reemplazado por DEC-023 desde el corte al núcleo nuevo** (no antes: hasta entonces esta cláusula sigue vigente; su código se elimina en el PR del corte).
- **`sessionLimit` suma:** `proposed { signature, maxSets }` (lo que se guardaría al aceptar), `acceptance`, `acceptanceInvalidated { reason: 'firma'|'maximo', on, previous }` y `belowMinimum`.

### 3. Aviso de grupos bajo el mínimo
- **El piso de 10 series semanales se sigue forzando solo en los grupos mayores** (pecho, espalda, hombros, cuádriceps, isquios, glúteos), sin cambios en `enforceSessionCap`.
- **Aviso nuevo (`rule: 'R2'`, `evidence: 'E1'`, `kind: 'bajo_minimo'`):** uno por plan, visible en el Resumen y en la pestaña Entreno, que lista **cualquier grupo, mayor o chico,** por debajo de 10 series **fraccionadas** semanales. Si el tope E4 le quitó series a un grupo, lo dice ("el tope E4 quitó 5").
- **Opciones:** "cambiar de split" (siempre) y "aceptar sesiones más largas" **solo si algún grupo bajo el mínimo perdió series por el tope y no hay aceptación vigente**. Decisión de modelado: si el déficit no viene del tope, aceptar no lo arregla y el botón sería engañoso.
- **Configuración del piso:** `minWeeklySetsPerMuscle` queda documentado como **objetivo de hipertrofia del ACSM 2026 (~10 series por grupo a la semana), usado como piso protector por decisión de modelado** (no es un mínimo normativo), con la fuente apuntando a la infografía oficial del ACSM (`https://acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf`) y marcada **"verificado contra material oficial del ACSM (infografía)"**. `verifiedAgainstPrimarySource` **sigue en `false`** hasta leer el artículo completo de la postura en MSSE 2026. Ninguna regla está verificada contra su fuente primaria.

### Estado de cada regla en `VALIDATOR_RULES`
Cada regla lleva `status: 'implementada' | 'pendiente'`. **Pendientes** (configuradas, ningún código las lee): `minWeeklyFrequencyMajorGroups` (R2, frecuencia) y las cuatro de R3 (`maxWeeklyVolumeIncreasePct`, `maxAcuteChronicRatio`, `historyWindowWeeks`, `minHistoryWeeksForRamp`), que además necesitan el historial semanal de volumen por músculo, hoy sin agregar. Un test comprueba que el estado coincide con el uso real: una regla `implementada` tiene que leerla el motor, y una `pendiente` no puede leerla (al implementarla hay que cambiar el estado).

### Resultado en los 10 perfiles de referencia de DEC-014 (sin aceptación)
Pecho y espalda: series fraccionadas semanales, antes → después. "Sesiones" = series por sesión (idénticas antes y después). "Bajo 10" = grupos bajo 10 series fraccionadas después de DEC-016.

| Perfil | Sesiones | Sobre 25 | Pecho | Espalda | Bajo 10 |
| --- | --- | --- | --- | --- | --- |
| oscar_cut_classic_5d | 25/20/23/22/19 | — | 6 → 12 | 12 → 15 | calves 7, abs 7 |
| novice_bulk_physique_4d | 25/9/24/6 | — | 5 → 10 | 10 → 13 | quads 7, hamstrings 5, glutes 7.5, calves 4, biceps 9, abs 0 |
| wellness_maintain_5d | 21/25/15/15/25 | — | 4 → 7 | 11 → 14 | chest 7, calves 8, biceps 9.5, triceps 8.5, abs 8 |
| general_cut_3d | 25/24/26 | 26 | 4 → 12 | 12 → 12 | calves 2, biceps 8, abs 0 |
| bb_bulk_advanced_6d | 25/25/26/25/25/25 | 26 | 9 → 18 | 18 → 23 | calves 9 |
| bikini_cut_lagging_4d | 25/19/25/17 | — | 3 → 6 | 9 → 12 | chest 6, calves 5, biceps 8.5, triceps 9, abs 4 |
| emanuel_legs_cut_4d | 24/24/24/21 | — | 6 → 12 | 9 → 12 | calves 2, biceps 8.5, abs 0 |
| figure_maintain_novice_3d | 24/25/25 | — | 3 → 9 | 12 → 12 | chest 9, calves 2, biceps 8, abs 0 |
| physique_cut_adv_lag_5d | 25/12/24/25/12 | — | 7 → 15 | 15 → 19 | hamstrings 8, calves 7, abs 6 |
| physique_w_bulk_6d | 20/22/23/20/20/23 | — | 7 → 14 | 14 → 18 | calves 8, abs 8 |

Splits genéricos de 3 a 5 días (hombre de 30 años, intermedio, división general):

| Split | Sesiones | Sobre 25 | Pecho | Espalda | Bajo 10 |
| --- | --- | --- | --- | --- | --- |
| 3d · cut | 25/24/26 | 26 | 4 → 12 | 12 → 12 | calves 2, biceps 8, abs 0 |
| 3d · bulk | 29/24/25 | 29 | 9 → 14 | 12 → 14 | calves 0, biceps 6, abs 0 |
| 4d · cut | 24/18/24/18 | — | 6 → 12 | 9 → 12 | calves 2, biceps 8.5, abs 0 |
| 4d · bulk | 25/21/25/21 | — | 7 → 14 | 11 → 14 | calves 0, biceps 7.5, abs 0 |
| 5d · cut | 23/18/21/20/18 | — | 6 → 12 | 9 → 12 | calves 7, abs 7 |
| 5d · bulk | 25/21/24/23/21 | — | 7 → 14 | 11 → 14 | calves 8, abs 8 |

Lectura: el pecho sube en todos los casos y la espalda nunca baja. Quedan bajo 10 los grupos chicos (en 3 y 4 días el tope los recorta sin piso; en 5 y 6 días ya salen cortos de la programación) y, en cinco perfiles, un grupo mayor por la programación misma de la división (pecho en `wellness_maintain_5d`, `bikini_cut_lagging_4d` y `figure_maintain_novice_3d`; cuádriceps, isquios y glúteos en `novice_bulk_physique_4d`; isquios en `physique_cut_adv_lag_5d`): eso no lo causa el tope y el aviso nuevo lo hace visible.

### Pruebas
- `engine.test.js`: bucket directo en todos los ejercicios del catálogo, con el paseo del granjero en 0 y las 8 relaciones `a_verificar` fuera del bucket en 0; **el pecho contando el press inclinado** en planes reales; pecho y espalda de los splits de 3, 4 y 5 días; **perfiles de referencia antes y después** (`tests/fixtures/dec016-referencia.json`); aviso de grupos bajo el mínimo (con y sin aceptación); aceptación válida, **invalidada por cambio de plan** (días, división, objetivo, rezagados y nivel, cada uno por separado), invalidada por superar el máximo, límite exacto, aceptar de nuevo; migración (idempotente, sin mutar, import); validación del campo; estado de cada regla contra el uso real en el código.
- `tests/e2e-aceptacion.js` (navegador): migración al arrancar, aceptación vigente, edición de perfil que cambia los días, aviso y nuevo botón de aceptar, aceptar de nuevo con la firma de 4 días, revertir.
- Pruebas de mutación: quitar la regla del bucket falla 8 tests; ignorar la firma, 2; ignorar el máximo, 1; quitar el aviso, 3; marcar implementada una regla pendiente, 1.
- Las huellas de los 30 planes (`plan-hashes.json`) se regeneraron porque la salida cambió a propósito; `sw.js` pasa a la caché v9.

### Fuera de alcance
Implementar R3 y la frecuencia mínima de R2 (siguen pendientes), verificar las filas `a_verificar` restantes, y forzar el piso en los grupos chicos.

**Estado: implementada.**

## DEC-017 · Completar hasta el piso semanal dentro del tope E4, con piso de mantenimiento para grupos de énfasis reducido
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel

Contexto: DEC-014 usa el piso de 10 series fraccionadas semanales solo para **frenar recortes** (el tope E4 no puede bajar un grupo mayor de ahí) y DEC-016 agregó un aviso para los grupos bajo el mínimo. Faltaba la otra mitad: **llegar** al piso cuando hay espacio. Y el piso de 10 no puede ser igual para un grupo que la división redujo a propósito.

### Regla de completado
Si un grupo mayor (pecho, espalda, hombros, cuádriceps, isquios, glúteos) queda bajo su piso semanal y hay sesiones con espacio bajo el tope E4 (25), se agregan series de ese grupo en esas sesiones hasta llegar al piso o hasta llenar el espacio. Corre **después** del recorte E4 (`completeToFloor` en `engine.js`).
- **Nunca pasa de 25 por esta regla.** Una sesión solo crece si queda dentro del tope. Las sesiones que ya pasaban de 25 (por el piso de R2, o por una aceptación) no se tocan. Un barrido de 648 planes (divisiones × días × objetivos × niveles × rezagados) lo comprueba.
- **Prioridad:** primero el grupo con **mayor déficit** (piso − fraccionadas); dentro del grupo, la sesión con **más espacio**. Se agrega de a una serie y se recalcula, así el reparto se equilibra entre sesiones.
- **Compatibilidad por día:** solo en sesiones donde el split ya entrena ese grupo (`SPLITS[*].days[*].muscles`).
- **Series extra antes que ejercicios nuevos:** primero se suman series a ejercicios que ya están en esa sesión y que cuentan 1 (directa) para el grupo, empezando por el que tenga menos series. Solo si **ninguna** sesión lo permite, entra un ejercicio nuevo (2 series, como el piso del generador), del catálogo ya **filtrado por lesiones** (`filterLibByInjuries`, DEC-009 / DEC-011) y sin repetir patrón en el día (DEC-006).
- **Sin crear avisos R1:** no lleva a ningún músculo por encima de 11 series fraccionadas en una sesión (umbral de R1, ya configurado).
- **Si el déficit no cabe dentro del tope**, el grupo queda como estaba y sigue el aviso de DEC-016.
- **Transparencia:** un aviso informativo por grupo (`rule: 'R2'`, `kind: 'completado_piso'`) dice cuántas series se agregaron, en qué sesión y ejercicio; `sessionLimit.filled` lo expone y `weeklySets` refleja las series reales. No toca grupos chicos ni quita series.
- **Sesiones recortadas por E4:** el recorte se hace de a 1 o 2 series, así que una sesión recortada puede quedar con 1 de espacio y ese espacio se puede usar. El aviso del recorte describe el recorte y el de completado lo que se agregó después.
- **Con aceptación vigente** (sin recortes) la regla también completa, solo en las sesiones bajo 25.

### Piso de mantenimiento para grupos "down"
- **Qué:** un grupo con énfasis reducido por la división (`EMPHASIS_MAP[división].down`, DEC-001, ×0,5) que **no** es rezagado (un rezagado anula el énfasis, DEC-001) usa un **piso de mantenimiento** = piso × `maintenanceFloorFactor` (0,5) = **5 series fraccionadas semanales**. Los demás grupos usan el piso completo, **10**. `sessionLimit.floors` expone el piso de cada grupo.
- **Dónde se aplica:** el **mismo piso** rige el **freno de recortes** (`enforceSessionCap`: el tope E4 puede recortar un grupo "down" hasta su piso de 5, no solo hasta lo que ya tenía) y el **completado** (`completeToFloor`). También fija el umbral del **aviso** de grupos bajo el mínimo (DEC-016), para no avisar de 10 en un grupo reducido a propósito; el aviso nombra el piso ("Pecho 4 (piso de mantenimiento 5)").
- **Justificación:** el piso de 10 del ACSM es un **objetivo de hipertrofia**. En un grupo que la división redujo a propósito el objetivo es **mantener**, y la literatura sobre dosis mínima indica que se puede conservar lo ya ganado con volúmenes bastante menores si se mantiene la intensidad. Referencia verificada: Spiering BA et al., *Maintaining Physical Performance: The Minimal Dose of Exercise Needed to Preserve Endurance and Strength Over Time*, J Strength Cond Res 2021;35(5):1449-1458, [PMID 33629972](https://pubmed.ncbi.nlm.nih.gov/33629972/). Es una **revisión narrativa**, no un metaanálisis. Según su resumen, fuerza y tamaño muscular (al menos en jóvenes) se mantuvieron hasta 32 semanas con tan poco como 1 sesión semanal y 1 serie por ejercicio, y la intensidad parece ser la variable clave.
- **El 0,5 es una convención alineada con DEC-001, no una cifra del estudio.** Spiering no dice "50 % del piso". Se etiqueta nivel **E4** y `convention: true` en `VALIDATOR_RULES`. Límites del respaldo: es evidencia de **mantener lo ya ganado a corto plazo**, no de un volumen óptimo para una división que reduce un grupo de forma permanente; y solo se consultó el resumen (la página de PubMed no se pudo leer completa), así que `verifiedAgainstPrimarySource` sigue en `false`.
- **Ojo con la fuente `SPIERING_2021` de `knowledge.js`:** es una entrada distinta de la referencia de mantenimiento y **no se pudo verificar** (auditoría del 2026-10-25: su URL de PubMed lleva a un artículo ajeno y no se encontró en PubMed el título citado; ver `docs/BACKLOG.md` B-013). La referencia de mantenimiento no se agregó a `SOURCES` (la pestaña Fuentes afirma que solo cita revisiones sistemáticas, metaanálisis y posicionamientos): vive en la regla.

### Resultado en los 10 perfiles de referencia de DEC-014 (sin aceptación)
Antes = `main` con DEC-016. Minutos = duración derivada por sesión; **⚠ = más de 90 minutos**. Los valores por grupo son series fraccionadas semanales.

| Perfil | Series por sesión | Minutos por sesión | Series agregadas | Mayores que cambian | Grupos "down" (series) | Mayores bajo su piso |
| --- | --- | --- | --- | --- | --- | --- |
| oscar_cut_classic_5d | 25/20/23/22/19 (igual) | 72/72/55/53/70 (igual) | 0 | — | — | — |
| novice_bulk_physique_4d | 25/9/24/6 (igual) | 70/29/59/24 (igual) | 0 | — | cuádriceps (7), isquios (5), glúteos (7.5) | — |
| wellness_maintain_5d | 21/25/15/15/25 (igual) | 58/**92⚠**/36/35/**92⚠** (igual) | 0 | — | pecho (7), hombros (11) | — |
| general_cut_3d | 25/24/26 (igual) | 76/80/88 (igual) | 0 | — | — | — |
| bb_bulk_advanced_6d | 25/25/26/25/25/25 (igual) | 69/65/**98⚠**/64/58/**96⚠** (igual) | 0 | — | — | — |
| bikini_cut_lagging_4d | 25/19/25/17 (igual) | 67/70/60/49 (igual) | 0 | — | pecho (6), cuádriceps (10) | — |
| emanuel_legs_cut_4d | 24/24/24/21 (igual) | 67/87/61/75 (igual) | 0 | — | — | — |
| figure_maintain_novice_3d | 24/25/25 → 25/25/25 | 72/81/85 → 75/81/85 | 1 | pecho 9 → 10, hombros 17.5 → 18 | — | — |
| physique_cut_adv_lag_5d | 25/12/24/25/12 (igual) | 82/40/57/61/47 (igual) | 0 | — | cuádriceps (12), isquios (8), glúteos (12) | — |
| physique_w_bulk_6d | 20/22/23/20/20/23 (igual) | 58/55/81/49/46/85 (igual) | 0 | — | — | — |

Lectura:
- **Solo `figure_maintain_novice_3d` se completa** (pecho 9 → 10, +1 serie en la sesión que el recorte dejó en 24; 72 → 75 min): `figure_w` no reduce ningún grupo, así que rige el piso de 10. Con el piso de mantenimiento ya no se completan `novice_bulk_physique_4d`, `wellness_maintain_5d` ni `physique_cut_adv_lag_5d`, que con el piso de 10 sumaban 8, 3 y 2 series.
- **`wellness_maintain_5d`:** el pecho **es "down"** en `wellness_w` (también hombros, bíceps y tríceps). Queda en **7**, sobre su piso de 5: no se completa y no avisa.
- **`bikini_cut_lagging_4d`:** el pecho **es "down"** en `bikini_w` (también cuádriceps, bíceps y tríceps; los rezagados son glúteos e isquios y no lo cancelan). Queda en **6**, sobre su piso de 5: ya no hay déficit ni aviso. El problema de falta de espacio (sus dos torsos están en 25) sigue ahí, pero ya no importa para el pecho.
- **`novice_bulk_physique_4d`:** cuádriceps 7, isquios 5 y glúteos 7,5 están sobre su piso de 5; las sesiones de 9 y 6 series quedan como estaban.
- **`physique_cut_adv_lag_5d`:** el rezago es de hombros, no de piernas, así que cuádriceps, isquios y glúteos siguen "down" con piso 5; isquios en 8 queda sobre el piso.
- **Sesiones de más de 90 minutos:** `wellness_maintain_5d` (92 y 92) y `bb_bulk_advanced_6d` (98 y 96). **Ya existían antes de esta regla** y no cambian: la regla no creó ninguna sesión de más de 90 minutos ni alargó ninguna de ellas. Es el costo conocido de DEC-014 (25 series no garantizan menos de 90 minutos).
- Los otros perfiles no tenían grupos mayores bajo su piso y no cambian.

### Pruebas
- `engine.test.js`: los 10 perfiles antes y después con duración por sesión (`tests/fixtures/dec017-referencia.json`) y la comprobación de que ninguna sesión pasa de 25 por la regla y de que no aparece ninguna sesión nueva de más de 90 minutos; pisos por división (physique_m, bikini_w, wellness_w, una división sin "down", y el rezagado que anula el "down"); el factor y su etiqueta de convención; `novice_bulk_physique_4d`, `wellness_maintain_5d` y `bikini_cut_lagging_4d` con el piso de mantenimiento (y el contraste con piso 10, que sí completaría las piernas); un grupo "down" bajo 5 que sí avisa; el mismo piso en el freno de recortes y en el completado (unidad); `figure_maintain_novice_3d`; barrido de 648 planes contra el tope y contra R1; unitarias de prioridad, compatibilidad por día, series extra antes que ejercicio nuevo y lesión de rodilla.
- Pruebas de mutación: el freno de recortes sin piso de mantenimiento falla 1 test; el completado sin él, 8; el aviso sin él, 4; que el rezagado no anule el "down", 1; factor 1, 9. De la regla de completado: permitir pasar del tope falla 4; sin prioridad por déficit, 3; por espacio, 6; sin compatibilidad por día, 5; sin filtro de lesiones, 1; ejercicio nuevo antes que series extra, 10; regla apagada, 9 (medidas antes del ajuste).
- `regression.test.js` queda **idéntico al de `main`**: los volúmenes semanales originales de `bulk` y `maintain` se conservan. Se actualizaron a propósito las huellas de los 30 planes; `sw.js` pasa a la caché v10.

### Fuera de alcance
Intercambiar series entre grupos (quitar de un grupo chico para completar un mayor): no se implementó. Completar grupos chicos, y un límite de duración (la regla topa por series).

**Estado: implementada.**

## DEC-018 · El import restaura el entrenamiento registrado (workouts y sessions)
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-10-25). Lo creó el agente como Propuesto; Emanuel lo aceptó en el chat.

Contexto: B-001. El export (`ENGINE.exportProfile`) lleva `workouts` y `sessions` (sin el dolor por serie, DEC-009), pero `prepareImportedProfile` solo devolvía `createdAt`, `updatedAt`, `data`, `log` y `droppedHealth`, y `importJson` creaba el perfil sin ellos. Un ciclo export → import perdía todo el entrenamiento registrado.

### Cambio
- `prepareImportedProfile(item, today, newProfileId)` ahora también devuelve `workouts` y `sessions`, y `importJson` los guarda en el perfil nuevo. El aviso final dice cuántas series se restauraron.
- **Privacidad (DEC-009) sin cambios:** el export no cambia (sigue sin `health`, `painFlags` ni `workouts[].pain`). Al importar se **quita siempre** el `pain` de cada serie, aunque el archivo lo traiga (versiones anteriores lo exportaban), y se avisa como "datos de salud ignorados". `painFlags` y `health` siguen sin importarse.
- **`profileId`:** el import siempre crea un perfil nuevo con id nuevo (nunca pisa uno existente). Si una fila trae `profileId`, se remapea al id del perfil nuevo. Hoy ninguna fila guardada lo trae: solo la sesión en curso (`sessionStore.js`), que no se exporta. El remapeo es una protección para archivos de otras versiones o armados a mano.
- Se descartan las filas mal formadas (sin `sessionId`). Las filas anteriores a DEC-015 (sin `setKey`) vuelven tal cual, sin migrar. **Reemplazado por DEC-023 desde el corte al núcleo nuevo** (no antes: hasta entonces esta cláusula sigue vigente; su código se elimina en el PR del corte).

### Lo que no cambia
La política del export; que el import crea un perfil nuevo; que la sesión en curso nunca viaja (DEC-015); que `painFlags` y la salud nunca se importan. Consecuencias a tener presentes: el historial de dolor por serie **no** sobrevive a un export → import (es por diseño de DEC-009), e importar dos veces el mismo archivo crea dos perfiles con las mismas series (comportamiento previo del import).

### Pruebas
- `engine.test.js`: ida y vuelta export → import (series, sesiones y mediciones idénticas, ediciones conservadas, filas viejas sin migrar); el archivo exportado no lleva dolor, salud ni `painFlags` y lo importado tampoco; un archivo con dolor por serie lo descarta y avisa; remapeo de `profileId`; filas mal formadas; archivos viejos sin `workouts`/`sessions`; el export del perfil importado es idéntico al original. Se corrigió el test de DEC-009 que daba por buena la pérdida de `workouts` ("no se guardan workouts"): lo que la privacidad exige es que no entre el dolor.
- `tests/e2e-import.js` (navegador): exporta un perfil con entrenamiento, dolor y lesiones, lo importa y comprueba el perfil nuevo (series, sesión, sin dolor ni salud), que el original no se toca y que Progreso muestra la sesión.
- Mutaciones: volver a descartar `workouts`/`sessions` falla 5 tests; conservar el dolor, 2; no remapear `profileId`, 1; no descartar filas mal formadas, 1; no adjuntar las series en `app.js`, el E2E.
- No cambia el plan generado (sin tabla de perfiles de referencia); `sw.js` pasa a la caché v11.

**Estado: implementada.**

## DEC-019 · La tarjeta de agua muestra agua total (bebidas + alimentos), no litros de bebida
**Estado del DEC:** Propuesto — **Decidido por:** pendiente (Emanuel). Lo creó el agente; no vale como base de otro trabajo hasta que Emanuel lo acepte.

Contexto: B-020, prioridad pedida por Emanuel. La pestaña Dieta mostraba "≥ 2,5 L agua (hombres) / 2,0 L (mujeres) + lo perdido por sudor" con las cifras de EFSA. Esas cifras son agua **total**, así que quien las lee como litros de bebida se pasa de lo que EFSA propone.

### Qué dice EFSA (leído en texto completo, copia institucional DTU Orbit; no se leyó la sección 4 ni las 2.3 a 2.7.1)
EFSA Panel on Dietetic Products, Nutrition and Allergies (NDA), *Scientific Opinion on Dietary Reference Values for water*, EFSA Journal 2010;8(3):1459, DOI 10.2903/j.efsa.2010.1459.
- **Es agua total:** "reference values for total water intake include water from drinking water, beverages of all kind, and from food moisture" (resumen). Ingesta adecuada: 2,0 L/día mujeres (P95 3,1 L) y 2,5 L/día hombres (P95 4,0 L).
- **Alimentos:** "It is normally assumed that the contribution of food to total dietary water intake is 20 to 30%, while 70 to 80% are provided by beverages. This relationship is not fixed" (sección 6.1).
- **No hay una ingesta adecuada separada para bebidas.** EFSA calcula los 2,0 y 2,5 L partiendo de volúmenes de orina de 1,6 y 2,0 L cubiertos "by beverages" y dividiendo por 0,8 (sección 6.6).
- **Condiciones:** solo clima moderado y actividad moderada (PAL 1,6). Para pérdidas extremas por calor o ejercicio dice que "have to be replaced with appropriate amounts", **sin cifra** (resumen).
- **Es una ingesta adecuada, no un mínimo**, basada en un objetivo de osmolaridad urinaria de ~500 mosm/L como margen de seguridad; no define un límite superior.
- **El "más lo perdido por sudor" era una glosa de la app**, no una afirmación de EFSA.

### Cambio (opción A, la que mejor respalda lo que EFSA dice)
- **La cifra no cambia** (2,5 L hombres, 2,0 L mujeres). Cambia cómo se presenta: rótulo "agua total (bebidas + alimentos)", subtítulo "ingesta adecuada (EFSA); 20-30 % suele venir de la comida · más si sudas mucho". Se quitan el "≥" y el "+ lo perdido por sudor".
- Comentario del motor y texto de la fuente `EFSA_WATER` (agua total, P95, condiciones, 20-30 %, sin ajuste numérico por sudor) corregidos.
- **Nivel de evidencia:** la ingesta adecuada de agua total es E1 (opinión científica de una agencia regulatoria, poblacional). "Más si sudas mucho" es una convención de la app (E4) y **no lleva cifra**. No se agregó nada a `VALIDATOR_RULES`: el agua no es una regla del validador.

### Opción B (NO implementada, decide Emanuel)
Mostrar además una estimación de lo que se bebe: 70-80 % del total, es decir ≈ 2,0 L (hombres) y 1,6 L (mujeres) con el 80 % que usa EFSA en su cálculo (1,75-2,0 y 1,4-1,6 L con el rango 20-30 % de alimentos). Riesgos: parecería una recomendación de EFSA cuando EFSA no la formula, y la parte de alimentos "no es fija" (una dieta con mucha fruta y verdura aporta más). Si se hace, debe rotularse "estimación orientativa".

### Lo que no cambia
El plan generado y las huellas de los 30 planes (es solo texto); la cifra de agua. En la tarjeta de la mujer sigue viéndose "2 L" (formato numérico previo).

### Pruebas
- `engine.test.js`: la cifra sigue siendo 2,5 / 2,0 L; la fuente dice agua TOTAL, humedad de alimentos, 20-30 %, PAL 1,6 y P95, no afirma una ingesta solo de bebidas y ya no contiene "más las pérdidas por sudor"; el comentario del motor lo aclara.
- `tests/e2e-agua.js` (navegador, 3 corridas sin fallos): la tarjeta de hombre y de mujer dice "agua total (bebidas + alimentos)", avisa del 20-30 % de alimentos y de que se necesita más si se suda mucho, y no usa "≥" ni "+ lo perdido por sudor".
- Mutaciones: volver a la tarjeta anterior hace fallar 5 comprobaciones del E2E; volver al texto anterior de la fuente, 1 test; cambiar la cifra, 3 tests. `sw.js` pasa a la caché v12.

**Estado: implementada. Aceptado por Emanuel el 2026-11-07.**

## DEC-020 · Mínimo semanal por grupo dentro del tope E4 (grupos chicos)
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-07). Lo creó el agente como Propuesto; aceptado por Emanuel en el chat el 2026-11-07, después de ver el efecto de la restricción del último ejercicio directo (bíceps con 0 series directas a los 3 días: de 65 a 50 de 90 perfiles). Las decisiones de diseño de abajo también las tomó Emanuel.

Contexto: con el tope E4 (DEC-014) y el piso de los grupos mayores, los grupos chicos (abdomen, pantorrillas, bíceps, tríceps) quedaban en 0 series directas en la mayoría de los perfiles de 3 y 4 días. DEC-016 solo los avisa y DEC-017 dejó fuera forzar un mínimo en ellos ("Fuera de alcance"). Esta decisión lo hace.

### Decisiones de Emanuel (2026-11-07)
1. **Valor (1-A):** el mínimo es el piso de mantenimiento de DEC-017, **5 series fraccionadas por semana**. No se inventa otro número: la regla `groupMinimumWeeklySets` se **deriva** de `minWeeklySetsPerMuscle × maintenanceFloorFactor`.
2. **Unidad (2-A):** series fraccionadas, **contando el aporte indirecto de los compuestos** (directa 1, indirecta 0,5; DEC-014). Consecuencia: el bíceps puede cumplir con 0 series directas si los remos le aportan. Ver "Costos".
3. **Lesiones (3-A):** un grupo no recibe mínimo solo si, tras las exclusiones por las zonas declaradas, **no le queda ningún ejercicio posible**. Si le quedan ejercicios, el mínimo aplica con ellos (DEC-011).
4. **Pecho y filas `a_verificar` (4-A):** se da por resuelto con DEC-016 (el músculo del bucket cuenta siempre directo); lo que queda de verificación sigue en B-003.
5. **Garantía de series reales de los grupos mayores (DEC-014): se conserva (decisión tomada, 2026-11-07).** El mínimo no puede bajar a un grupo mayor de su piso en series reales aunque sume de más en fraccionadas. **Límite conocido:** a los 3 días, 57 de 90 perfiles de prueba (63 %) necesitan la aceptación explícita de una sesión más larga para cumplir el mínimo; relajar la garantía lo bajaría a unos 37 de 90 (~41 %) a costa de dejar a un grupo mayor con menos series reales (por ejemplo, hombros con 7). Reabrir esa decisión es de Emanuel.
6. **Nunca se quita el último ejercicio directo de un grupo (2026-11-07):** al sacar series de aislamientos para cumplir mínimos, un grupo puede ceder series, pero el ejercicio queda si es su último ejercicio directo de la semana (con 2 series, que es el piso de un ejercicio). Efecto medido: el bíceps con 0 series directas a los 3 días vuelve de 65 a 50 de 90 perfiles (los 50 ya existían en `main`: los causa el recorte del tope E4, no esta regla). Costo: un perfil más necesita aceptación a los 3 días (56 → 57).

### Regla
- **Nivel y respaldo:** E4, convención de la app (`convention: true`, `reviewRequired`). Respaldo **parcial**: Spiering et al. 2021 (revisión narrativa, PMID 33629972; solo se leyó el resumen), que respalda el concepto de mantener con poco volumen si se conserva la intensidad, no la cifra. El objetivo de 10 series del ACSM (DEC-016) sigue como aviso.
- **Quién:** los grupos chicos. Los mayores llegan a su piso con `completeToFloor` (DEC-017), que corre antes.
- **Cómo (`ensureGroupMinimum` en `engine.js`, después del recorte E4 y del completado de DEC-017):** para cada grupo chico bajo 5, el de mayor déficit primero:
  1. se agregan series en una sesión **compatible con el grupo** (la misma tabla de compatibilidad por día de DEC-003 v2) que tenga espacio bajo el techo: primero series extra de un ejercicio directo que ya está en la sesión; si no, un ejercicio nuevo de 2 series del catálogo ya filtrado por lesiones;
  2. si ninguna sesión tiene espacio, **las series se sacan de aislamientos de la misma sesión**, empezando por el **grupo con más volumen fraccionado acumulado** (contando el indirecto). **Nunca de un multiarticular;**
  3. **Nunca se baja a un grupo de su propio mínimo o piso, ni se le quita su último ejercicio directo de la semana:** los mayores conservan su piso (10, o 5 si son "down", DEC-017) en series fraccionadas **y** en series reales (la garantía de DEC-014), un grupo mayor no desaparece de una sesión (frecuencia semanal, R2) y un grupo chico no baja de 5 ni de lo que ya ganó en esta misma pasada (así no hay ciclos). Una donación nunca deja a un grupo sin avance neto;
  4. si tampoco se puede, el grupo queda como está y se avisa.
- **Techo:** sin aceptación, el tope de 25. **Con la aceptación explícita vigente (DEC-016), el máximo que el usuario aceptó** (nunca más). La sesión solo puede pasarse del tope con esa aceptación; el máximo propuesto para aceptar sigue siendo la sesión más larga sin recortar, y un barrido comprueba que aceptarlo cumple el mínimo en todos los casos que no cabían.
- **R1:** no lleva a ningún músculo por encima de 11 fraccionadas por sesión.
- **Avisos** (todos con `evidence: 'E4'`): `minimo_grupo` (qué se agregó y de dónde salió), `minimo_no_cabe` (el mínimo no cabe dentro del tope; ofrece aceptar sesiones más largas y cambiar de split; con aceptación vigente solo cambiar de split) y `minimo_sin_ejercicios` (el grupo sin ejercicios posibles por lesión). La interfaz suma la tarjeta "Mínimo semanal por grupo" con el botón de aceptar. `plan.training.sessionLimit.minimum` = `{ value, level, limit, groups, filled }`.
- **Endurecimiento asociado:** si las exclusiones por lesión dejan a un grupo sin ejercicios, el generador ya no falla: ese grupo queda sin series (`weeklySets` = 0).

### Resultado en los 10 perfiles de referencia (sin aceptación; antes = `main` `bfef2ae`)
Series y minutos por sesión; los grupos chicos en series fraccionadas semanales (abdomen · pantorrillas · bíceps · tríceps). "Igual" = el plan no cambia.

| Perfil | Series por sesión | Minutos por sesión | Grupos chicos (antes → después) |
| --- | --- | --- | --- |
| oscar_cut_classic_5d | 25/20/23/22/19, igual | 72/72/55/53/70, igual | 7 · 7 · 13 · 14,5, igual |
| novice_bulk_physique_4d | 25/9/24/6 → 25/11/24/11 | 70/29/59/24 → 70/33/59/34 | 0 · 4 · 9 · 11 → 5 · 6 · 9 · 11 |
| wellness_maintain_5d | 21/25/15/15/25, igual | 58/92/36/35/92, igual | 8 · 8 · 9,5 · 8,5, igual |
| general_cut_3d | 25/24/26 → 25/25/26 | 76/80/88 → 76/82/88 | 0 · 2 · 8 · 11,5 → **2 · 2** · 8 · 11,5 |
| bb_bulk_advanced_6d | 25/25/26/25/25/25, igual | 69/65/98/64/58/96, igual | 11 · 9 · 19 · 21, igual |
| bikini_cut_lagging_4d | 25/19/25/17 → 25/19/25/19 | 67/70/60/49 → 67/70/60/53 | 4 · 5 · 8,5 · 9 → 6 · 5 · 8,5 · 9 |
| emanuel_legs_cut_4d | 24/24/24/21 → 25/25/25/25 | 67/87/61/75 → 69/89/63/83 | 0 · 2 · 8,5 · 12 → 6 · 5 · 8,5 · 12 |
| figure_maintain_novice_3d | 25/25/25, igual | 75/81/85 → 75/81/83 | 0 · 2 · 8 · 12 → **4 · 2** · 8 · 10 |
| physique_cut_adv_lag_5d | 25/12/24/25/12, igual | 82/40/57/61/47, igual | 6 · 7 · 10,5 · 18, igual |
| physique_w_bulk_6d | 20/22/23/20/20/23, igual | 58/55/81/49/46/85, igual | 8 · 8 · 15 · 16,5, igual |

Los dos perfiles de 3 días (**en negrita**) no llegan al mínimo dentro de 25: quedan más cerca (de 0 a 2 o 4, y pantorrillas en 2) y el plan avisa. En estos 10 perfiles las sesiones de más de 90 minutos son las mismas que antes (wellness_maintain_5d 92 y 92; bb_bulk_advanced_6d 98 y 96). En el barrido de 90 perfiles hay un caso nuevo: avanzado, en déficit, `bikini_w`, 4 días y sin rezagados, cuyo "Día 2 · Pierna A" pasa de 89 a 91 minutos (24 a 25 series). DEC-017 limita las series (25), no los minutos, así que no lo viola, pero conviene saberlo (B-010).

Barrido de 90 perfiles (3 niveles × 3 objetivos × 5 divisiones × con y sin rezagados) por split:

| Split | Abdomen bajo 5 | Pantorrillas bajo 5 | Perfiles que necesitan aceptación | Con la aceptación |
| --- | --- | --- | --- | --- |
| 3 días | 83 → 51 | 76 → 57 | **57 de 90 (63 %)** | cumplen los 57; ninguna sesión pasa del máximo aceptado |
| 4 días | 70 → 0 | 62 → 0 | 0 | — |
| 5 días | 14 → 0 | 8 → 0 | 0 | — |
| 6 días | 0 → 0 | 0 → 0 | 0 | — |

Grupos en 0 series reales: abdomen y pantorrillas, de 69 y 57 perfiles de 3 días a 16 y 28 (y a 0 en 4, 5 y 6 días). Los que quedan en 0 a los 3 días son planes de énfasis en piernas, de nivel avanzado, hechos casi solo de multiarticulares, con sesiones ya de 30 a 40 series: no hay de dónde sacar sin tocar un multiarticular.

### Costos y alternativas (para decidir)
- **A los 3 días, 57 de 90 perfiles piden la aceptación explícita (63 %).** Mi estimación previa era de ~15 de 90: era demasiado optimista. La causa es la garantía de series reales de los grupos mayores (DEC-014) y la de frecuencia; **Emanuel decidió conservarla (decisión 5).** Sin proteger las series reales de los mayores serían unos 37 de 90, pero un grupo mayor podría quedar con menos de 10 series reales aunque sume 10 fraccionadas (por ejemplo, hombros con 7).
- **Causa de fondo:** el tope de 25 series cuenta igual una serie de pantorrilla que una de sentadilla, y por eso genera tantas aceptaciones. Evaluar un tope por duración estimada está en el backlog como propuesto (B-028).
- **El bíceps puede quedar sin series directas** y cumplir el mínimo con lo que le aportan los remos: 50 de 90 perfiles de 3 días y 34 de 90 de 4 días, **igual que en `main`**. Con la restricción de no quitar el último ejercicio directo (decisión 6) la regla no agrega casos (antes de la restricción eran 65 a los 3 días); esos 50 y 34 vienen del recorte del tope E4 (DEC-014) y de contar el indirecto (2-A). Exigir al menos un ejercicio directo queda fuera de alcance.
- **Quien ya aceptó sesiones más largas verá cambiar su plan al actualizar:** con la aceptación vigente el mínimo también sube las series de los grupos chicos que estén bajo 5, hasta el máximo que aceptó (nunca más). En el barrido, ninguna sesión pasó de lo que ya tenía ni alargó su duración con aceptación. La app no avisa de este cambio en la actualización (B-029).
- **Límites conocidos de la cobertura:** el techo con aceptación vigente (`max(25, máximo aceptado)`), el filtro de compatibilidad por día y el límite de R1 dentro de `ensureGroupMinimum` no cambian ningún plan del barrido de 720 (90 perfiles × 4 splits × con y sin aceptación), así que ningún test los distingue: son protecciones. Aparte, 13 sesiones con aceptación vigente ya superaban el máximo aceptado antes de este PR (viene de `main`, no lo causa esta regla).
- **Las sesiones pueden quedar con otra composición:** el mínimo mueve series de aislamiento (a veces enteras, un ejercicio de 2 series) hacia abdomen y pantorrillas.
- El mínimo no es una cifra del estudio; se etiqueta convención.

### Pruebas
- Unitarias y de barrido en `engine.test.js`: la regla es derivada y está implementada; **4 días** con los 90 perfiles (ningún grupo bajo 5 ni en 0, sin aceptación, dentro del tope, sin bajar a los mayores de su piso ni de lo que tenían sin tope); 5 y 6 días; **3 días**: o cabe o hay aviso exacto del grupo, con aceptación siempre se cumple y no se pasa de lo aceptado; **caso de aceptación** (full body, 3 días, lesión de hombro autorizada) sigue dentro de E4 y sin press de hombro; **caso donde el mínimo no cabe** (advanced / bulk / wellness_w de 3 días, casi todo multiarticulares) que dispara la aceptación y la resuelve; planes que ya cumplían (5 perfiles de referencia) sin cambios; donante = el grupo con más volumen acumulado; nadie baja de su propio mínimo (sin donantes la sesión no cambia, y con techo mayor sí cabe sin sacar nada); DEC-011 (grupo sin ejercicios posibles, y exclusión por tobillo respetada); avisos con E4 y sin R1 nuevos.
- E2E en navegador: la tarjeta "Mínimo semanal por grupo" aparece a los 3 días sin aceptación, ofrece aceptar y desaparece al aceptar.
- Pruebas de mutación (las del autor, sobre el motor; sin la restricción del último ejercicio directo fallan 2 tests nuevos): apagar la regla hace fallar 14 tests; techo infinito, 16; donar sin proteger el mínimo del donante, 6; elegir al donante con menos volumen, 3 (2 son las referencias, 1 es la regla); ignorar la exclusión por lesión, 1. El revisor, con mutaciones propias en una copia, midió 16 (regla apagada), 12 (techo infinito), 12 (permitir donar multiarticulares), 6 (sin proteger las series reales de los mayores) y 10 (mínimo de 4 en vez de 5). Quitar la garantía de frecuencia no hacía fallar nada; se agregó un test ("un grupo mayor no desaparece de una sesión").
- **Referencias actualizadas a propósito** (la salida del plan cambió): `plan-hashes.json` (30 planes) y `despues_dec020` en `dec016-referencia.json` y `dec017-referencia.json`; los tests de DEC-016 (pecho y espalda de los splits genéricos, texto del aviso) y de DEC-017 (series y minutos por perfil, tres perfiles de ejemplo) leen los valores vigentes, y el test de "la regla no quita series" pasó a "no pasa del tope". Se conservan los valores históricos (`despues`) de DEC-017. `sw.js` pasa a la caché v13.

### Fuera de alcance
Los pesos o niveles de las relaciones; relajar la garantía de series reales de los grupos mayores (alternativa de arriba); un mínimo directo (exigir al menos un ejercicio directo); tocar el tope de 25.

**Estado: implementada.**

## DEC-021 · Fase 3, Paso 1: tabla `perfil_articular` de todo el catálogo
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-07). Lo creó el agente como Propuesto; aceptado por Emanuel en el chat el 2026-11-07, después de resolver los 21 ejercicios ambiguos con cinco reglas de desempate (abajo) y de fijar los motivos de las aperturas y del step-up.

Contexto: `docs/specs/validador-fase3.md` (aprobada por Emanuel el 2026-11-07; Paso 1 desbloqueado al mergear DEC-020). Este paso **solo crea la capa de datos**, igual que DEC-013 hizo con los músculos: el plan que ve el usuario **no cambia** y ninguna regla articular (A1 a A7) se implementa todavía.

### Qué se agregó
- **`data/perfil-articular.csv`** (formato largo, una fila por ejercicio y articulación): 35 ejercicios del catálogo × lumbar, hombro y rodilla = **105 filas**. Columnas: `exerciseId, articulacion, nivel, evidencia, origen, ambiguo, fuente, notes, review_date`.
  - `nivel`: `alta`, `media` o `baja`.
  - `evidencia`: `a_verificar` (decisión de la spec: las filas sin fuente quedan así) o `probable` (5 celdas con fuente leída en resumen, tras extender la etiqueta a las articulaciones, decisión de Emanuel del 2026-11-07; ver abajo). Otras 5 celdas llevan una fuente candidata y siguen `a_verificar`. `verificado` no es alcanzable (exige medir hipertrofia) y el parser lo rechaza.
  - `origen`: `spec_inicial` (55 celdas, de la tabla de 18 ejercicios de la spec, transcrita tal cual) o `criterio_e4` (50 celdas, aplicando el criterio de modelado de la spec, E4).
  - `ambiguo`: `si` marcó 27 celdas de 21 ejercicios que el criterio no resolvía; Emanuel las resolvió con cinco reglas de desempate (abajo) y hoy ninguna celda queda en `si` (la columna se conserva para casos futuros).
- **`scripts/build-perfil-articular.js`** valida el CSV contra el catálogo (`data/exercise-buckets.csv`) y genera **`ifbb-pro-agent/js/perfilArticular.js`** (se sube al repositorio; mismo mecanismo que DEC-012/013). Rechaza: articulación o nivel inválidos, `verificado`, `probable` sin fuente, origen inválido, ambiguo sin nota, filas repetidas, ejercicios que no existen y **cualquier ejercicio del catálogo al que le falte una articulación** ("todo el catálogo lleva perfil").
- **`knowledge.js`** expone `JOINTS`, `JOINT_LEVELS`, `JOINT_PROFILE` y `missingJointProfile(id)`. `index.html` y `sw.js` cargan el módulo nuevo (caché v14; v15 tras las decisiones de desempate).
- **Aviso por ejercicio sin perfil:** si un ejercicio del plan no tiene alguna articulación, el plan lo avisa (`kind: 'sin_perfil_articular'`, E4, un solo aviso por plan). Hoy no se dispara porque el catálogo está completo; un test lo exige y otro simula el hueco.
- No hay ninguna regla numérica nueva ni peso por ejercicio: los niveles son ordinales (alta, media, baja).

### Cómo se clasificó
1. Los 18 ejercicios de la tabla inicial de la spec se transcriben tal cual a los ejercicios del catálogo que les corresponden (un test lee la tabla de la spec y lo comprueba).
2. El resto del catálogo se clasificó con el criterio de modelado E4 de la spec (lumbar: bisagra con carga o carga pesada sobre la espalda sin apoyo = alta, tronco sin apoyo con carga en manos o cadera = media, tronco apoyado = baja; hombro: empuje con carga cerca del final del rango = alta, tracción o elevaciones con carga = media, el hombro no mueve carga = baja; rodilla: flexión profunda con carga = alta, carga con el pie libre = media, sin carga relevante = baja).
3. Los empates y casos no cubiertos se resolvieron con las cinco reglas de desempate de Emanuel (más abajo). Resultado: lumbar alta en 4 ejercicios (sentadilla trasera, peso muerto rumano, remo con barra, búlgara con énfasis en cadera); hombro alta en 5; rodilla alta en 6.

### Ejercicios ambiguos: resueltos por Emanuel (2026-11-07)
Los 21 ejercicios ambiguos (27 celdas) se resolvieron con reglas de desempate, que pasaron a la sección de criterio de la spec (`docs/specs/validador-fase3.md`, E4). El CSV ya no tiene celdas `ambiguo: si`; cada celda resuelta lleva en `notes` la regla aplicada. Las reglas: (1) variantes mezcladas: la más exigente; (2) bisagra con carga incluye la **bisagra sostenida** (torso inclinado más de 45° con carga externa), y la carga axial sin bisagra ni flexión profunda es lumbar media; (3) lumbar media exige carga relevante, los aislamientos ligeros de pie son lumbar baja; (4) hombro por mecanismo, y nunca se clasifica un ejercicio para conservar su función de sustituto; (5) si dos reglas chocan, gana el nivel más alto, **solo en conflictos reales entre reglas**: una regla específica (1 a 4) gana sobre la lectura literal del criterio.

Celdas que **cambiaron** respecto del valor provisional (8): `chest.fly_cable_pecdeck` lumbar media→baja (motivo: tronco apoyado); `back.pullover_cable` lumbar media→baja; `biceps.curl_barbell` lumbar media→baja; `triceps.pushdown_cable` lumbar media→baja; `biceps.curl_incline` hombro baja→media; `glutes.kickback_cable` lumbar media→baja y rodilla media→baja; `abs.crunch_or_wheel` hombro baja→media. Además, `shoulders.rear_delt_facepull` lumbar quedó en **baja** (la regla 3 gana sobre la lectura literal) y `glutes.bulgarian_hip` lumbar en **media** (no llega a bisagra sostenida), como indica la tabla de la spec. El resto de las 27 celdas conserva su valor.

**Celdas decididas por la regla 5, revisadas tras acotarla a conflictos reales:** `glutes.hip_thrust` lumbar sigue en media (conflicto real entre carga en la cadera y tronco apoyado); `functional.step_up` rodilla sigue en alta, pero su motivo es la regla 1 (variante más exigente: cajón alto), no la regla 5; `glutes.bulgarian_hip` lumbar pasó de alta a media (por mecánica, regla 2); `shoulders.rear_delt_facepull` lumbar pasó de media a baja (regla 3).

Quedan en el backlog: separar las variantes que cambian el nivel lumbar (B-031), la prensa de piernas (lumbar baja hasta leer el texto completo, B-032) y cómo clasificar ejercicios con peso corporal y palanca larga (rueda abdominal, B-033).

### Casos que Emanuel debe revisar: donde lo decidido y lo escrito en este DEC no coinciden del todo
1. **`chest.fly_cable_pecdeck` lumbar = baja.** La variante más exigente (aperturas en polea de pie) es un aislamiento ligero, así que la regla 3 también da baja: no hay tensión con la regla 1 (aclaración de Emanuel).
2. **`abs.crunch_or_wheel` lumbar y hombro = media.** La regla 1 manda a la rueda abdominal; no tiene carga externa y se la trató como la elevación de piernas colgado. Queda en media y abierta como B-033.
3. **`shoulders.press_landmine_neutral` hombro = media.** El motivo anterior de este DEC se apoyaba en su función de sustituto del press ante lesión de hombro (DEC-011); esa razón queda **descartada** por la regla 4. Hoy es media solo por su mecánica. Consecuencia para A7: queda disponible como sustituto porque no es alta, pero no por ser sustituto.
4. **Regla "primera variante nombrada o lectura literal".** El texto anterior de este DEC usaba esa regla de desempate. Queda **reemplazada** por las cinco reglas.
5. **Fuente y nivel.** `squat_back_or_hack` lumbar y `row_barbell` lumbar tienen una fuente candidata, pero su nivel viene de una regla de desempate: quedan `a_verificar` y no pasan a `probable`.

### `probable` en las articulaciones (decisión de Emanuel, 2026-11-07)
Se extiende la etiqueta. Pasan a **`probable`** las celdas con fuente leída (resumen) que respalda su nivel y que no salieron de un desempate: `chest.bench_press_barbell` hombro, `back.vertical_pull` hombro, `quads.squat_back_or_hack` rodilla, `quads.leg_extension` rodilla y `hamstrings.rdl` lumbar (5 celdas). Siguen `a_verificar` las otras 5 celdas con fuente: `press_overhead` hombro (confirmación indirecta), `quads.leg_press` rodilla (la fuente advierte que la etiqueta pierde la diferencia con la sentadilla), `functional.bulgarian_db` rodilla (la fuente sugiere media), y las dos de arriba cuyo nivel salió de un desempate. `verificado` sigue sin usarse.

### Simulación de A1, A2 y A4 (sin aplicarlas)
`node scripts/simular-reglas-articulares.js`, tabla vigente, barrido de 360 planes (90 perfiles × 3, 4, 5 y 6 días), con el orden actual del generador. **La simulación midió planes sin A1 ni A3 aplicados.**

| Regla | Planes en que se dispara | Sesiones |
| --- | --- | --- |
| A1 (lumbar alta después de dos o más de lumbar media o alta) | 90 de 360 (25,0 %) | 7,6 % |
| A2 (más de un ejercicio de lumbar alta por sesión) | 360 de 360 (100 %) | 24,3 % |
| A4 (más de dos ejercicios de hombro alta por sesión) | 256 de 360 (71,1 %) | 17,5 % |

(Con la búlgara en lumbar alta, antes de la decisión de Emanuel, A1 saltaba en el 94 % de los planes.)

- **A2** saltaba en el 100 % porque el generador junta sentadilla y peso muerto rumano en el mismo día de pierna. Se vuelve a medir con A1 y A3 implementados (DEC-022).
- **A4** deja de ser una advertencia general: solo se activa si A6 registró dolor de hombro. La versión anterior saltaba en el 71 % de los planes y no tenía fuente. No se implementa en este paso.
- **A1** y **A3** se implementan como restricciones del generador en el Paso 2 (DEC-022, rama aparte).

### Pruebas
- Unitarias en `engine.test.js`: catálogo completo (35 × 3) con niveles válidos; el parser rechaza datos inválidos y exige perfil completo; módulo igual al CSV; la tabla de la spec se transcribe tal cual (un test lee la spec) y las variantes unidas se clasifican por la más exigente; `probable` solo con fuente y exactamente en las 5 celdas decididas; ninguna celda queda ambigua y las 27 resueltas llevan su regla en la nota; las celdas que cambiaron valen lo decidido; la spec contiene las reglas de desempate; el plan no cambia y un ejercicio sin perfil avisa.
- **Prueba de que el plan no cambia:** 30 planes de referencia y 360 planes del barrido (90 perfiles × 4 splits), comparados en vivo contra el motor de `main`: **0 distintos**. Las huellas (`plan-hashes.json`) no cambian.
- Simulación de A1, A2 y A4: ver arriba (`scripts/simular-reglas-articulares.js`); no cambia el plan.
- Mutaciones: aceptar `verificado` falla 1 test; quitar el aviso de ejercicio sin perfil, 1; quitar una fila del CSV, 4 (el módulo desactualizado también); cambiar un nivel de la spec, 1.
- E2E (`e2e.js`, `e2e-aceptacion.js`) pasan.

### Fuera de alcance
Las reglas A1 a A7 (A1 y A3 se implementan en el Paso 2, DEC-022; A4 solo con dolor de hombro de A6; A2 se vuelve a medir con A1 y A3), el orden de ejercicios del generador, el dolor por serie (A6) y mostrar el perfil en la interfaz. Anclar el criterio con datos biomecánicos es B-026 (PR aparte).

**Estado: implementada (capa de datos). Aceptado por Emanuel el 2026-11-07.**


## DEC-022 · Fase 3, Paso 2: A1 (orden por demanda) y A3 (sentadilla y bisagra pesadas en días distintos) en el generador
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-07). Lo creó el agente como Propuesto; aceptado por Emanuel en el chat el 2026-11-07, después de ver el efecto de A1 y A3 en los 360 planes, la verificación de los avisos R1 y las sesiones sobre 25 series, y de decidir que el curl no lleva tope. Depende de DEC-021 (tabla `perfil_articular`, Aceptado el 2026-11-07), cuya rama se mergea antes.

Contexto: `docs/specs/validador-fase3.md`, reglas A1, A2 y A3 (E4 en el motivo de seguridad; A1 tiene respaldo E2 solo en que el orden no cuesta hipertrofia, Nunes et al. 2021, resumen). Emanuel pidió implementar A1 y A3 como **restricciones del generador** (no como advertencias sobre un plan ya hecho). **Cambia el plan generado.**

### Qué cambia
- **A3 · separar la bisagra pesada de la sentadilla pesada.** Sentadilla pesada = patrón `squat_bilateral` con lumbar alta; bisagra pesada = patrón `hinge` con lumbar alta (peso muerto rumano) y, si el usuario lo elige, el remo con barra (bisagra sostenida, lumbar alta). El día de la sentadilla (el primer día con cuádriceps) los isquios se cubren con **flexión de rodilla** (curl femoral, lumbar baja) y la bisagra pasa al **siguiente día de isquios**. Solo se separa la bisagra pesada: el trabajo de isquiotibiales no se mueve. El relleno posterior (`completeToFloor`, `ensureGroupMinimum`) no puede volver a juntarlas. Si la rotación del catálogo no ofrece alternativa, no se cambia nada.
- **A1 · orden por demanda dentro de cada sesión.** Primero lo de lumbar alta, luego los multiarticulares, al final los aislamientos. **El hip thrust va al final de los multiarticulares** (confirmado por Emanuel). El orden es estable: dentro de cada grupo se conserva el del generador. El top set de definición cae en el primer ejercicio elegible, que ahora es el de lumbar alta.
- **Remo por defecto con apoyo de pecho (lumbar baja): criterio de demanda lumbar (E4), no de hipertrofia.** (Ver la sección del investigador más abajo: no hay estudios directos de más hipertrofia con el remo con barra.) Entrada nueva del catálogo `back.row_chest_supported` ("Remo con apoyo de pecho (máquina o banco inclinado)"), que ocupa en la rotación el lugar del remo con barra. El **remo con barra** (`back.row_barbell`) solo aparece si el usuario lo elige: campo de perfil `barbellRow` (casilla "Incluir remo con barra"; falso por defecto). Con la casilla activa la rotación es la de antes. Con el remo con barra elegido **aplican A2 y A3**: A3 lo cambia por otro remo si caería con la sentadilla, y A2 avisa si cae con el peso muerto rumano. Datos de la entrada nueva: lumbar baja, hombro media y rodilla baja (fila "Remo con apoyo de pecho" de la tabla de la spec, `spec_inicial`); espalda directa `a_verificar` (el músculo del bucket cuenta siempre directo, DEC-016), bíceps indirecta `probable` (la Tabla 1 de Pelland et al. 2026 cuenta los remos en máquina como indirectos para los flexores del codo; es una clasificación, no una medición), hombro indirecta `a_verificar`. Sin imagen.
- **A2 · aviso.** Nueva regla `maxLumbarHighPerSession` (1, E4, advertencia): el plan avisa (`kind: 'tope_lumbar'`) si una sesión junta más de un ejercicio de lumbar alta. Con el remo por defecto no salta en ninguno de los 360 planes.
- **El curl del día de sentadilla no lleva tope por ejercicio** (decisión de Emanuel): el umbral de R1 es por músculo y sesión, y el máximo de series de curl en una sesión es 10, bajo 11. No hay tope ni traspaso de series: esta decisión no describe ningún comportamiento de topes o traspasos. Separar el curl sentado y tumbado queda en B-035 como propuesta de variedad. Historia: se probó un tope por músculo y sesión con el umbral de R1 y un traspaso del excedente al curl del día de bisagra; el tope cambiaba 4 planes de 3 días por efectos laterales del mínimo de grupos chicos y dejaba una sesión en 27 series donde sin tope tenía 24; se quitó junto con el traspaso. (Cifras de esa versión anterior: no reproducibles, el código ya no existe.)
- **Curl femoral con indicación (`cue`, E4):** preferir el sentado; se muestra bajo el ejercicio.
- **`VALIDATOR_RULES`:** `sessionOrderByDemand` (A1), `hingeSquatSeparation` (A3) y `maxLumbarHighPerSession` (A2), todas E4, implementadas, con fuente; un test comprueba que el motor las lee. `sw.js` pasa a la caché v17.

### Fuente del curl sentado frente al tumbado (investigador)
Maeo S et al. 2021, *Med Sci Sports Exerc* 53(4):825-837, doi 10.1249/MSS.0000000000002523 (PMID 33009197). El investigador leyó el resumen de PubMed y el texto completo de PMC **a través de un resumidor** (no el texto literal; las cifras no se compararon contra las tablas originales). Estudio intra-sujeto, 20 adultos jóvenes sanos sin entrenamiento de fuerza, curl al 70 % de 1RM, 5 series de 10, dos veces por semana, 12 semanas, resonancia: isquios totales **+14,1 % con curl sentado y +9,3 % con tumbado**; bíceps femoral cabeza larga, semitendinoso y semimembranoso crecieron más con el sentado (significativo); la cabeza corta (no cruza la cadera) no mostró diferencia significativa. **Nivel propuesto para la regla "preferir el curl sentado": E4** (un solo estudio, sin replicación encontrada; Maeo 2023, PMID 35819335, es sobre tríceps). Confianza media. Por eso es una indicación y el texto dice "en un estudio de 12 semanas".
Nota del repo: `data/exercise-muscles.csv` marca esa relación como `verificado` con la fuente de Maeo 2021, pero `docs/research/fuentes-musculos-ejercicio.md` la registra como "Resumen". Se sugiere revisar si corresponde `verificado (1 estudio)`. No se tocó.

### ¿Hay evidencia de que el remo con barra dé más hipertrofia de espalda que el remo con apoyo de pecho? (investigador)
**No hay estudios directos.** Búsqueda solo en PubMed, sin texto completo de ninguna fuente (resúmenes): dos meta-análisis de pesos libres contra máquinas (Haugen et al. 2023, PMID 37582807, 5 estudios de hipertrofia; Heidel et al. 2022, PMID 34609100) no encuentran diferencia de tamaño muscular, y no se confirmó qué músculos midieron; Schwanbeck et al. 2020 (PMID 32358310; DOI no verificado) midió bíceps y cuádriceps, no espalda. Lo único que favorece al remo con barra es mayor activación del erector espinal y el multífido en EMG (Fenwick et al. 2009, PMID 19197209; Saeterbakken et al. 2015, PMID 26134664): es demanda lumbar, no crecimiento de espalda. Ninguno compara dorsal, trapecio o romboides entre remo con apoyo y sin apoyo. La ausencia de estudios no prueba que no haya diferencia: confianza media para "no hay estudios directos" y baja a media para "sin ventaja demostrada". **Elegir el remo con apoyo como predeterminado es un criterio E4 de demanda lumbar; la app no afirma que dé igual o más hipertrofia.** Nada de lo anterior mueve una relación ejercicio-músculo.

### Antes y después (10 perfiles de referencia, sin aceptación)
Las series por sesión no cambian salvo en un perfil; cambian los minutos porque un curl (aislamiento, descanso corto) reemplaza a un peso muerto rumano (multiarticular, descanso largo) el día de sentadilla. El remo con apoyo de pecho no cambia series ni minutos.

| Perfil | Series por sesión (antes → después) | Minutos por sesión (antes → después) |
| --- | --- | --- |
| oscar_cut_classic_5d | 25/20/23/22/19 (igual) | 72/72/55/53/70 → 72/68/55/53/70 |
| novice_bulk_physique_4d | 25/11/24/11 (igual) | 70/33/59/34 → 70/30/59/36 |
| wellness_maintain_5d | 21/25/15/15/25 (igual) | 58/92/36/35/92 → 58/86/36/35/92 |
| general_cut_3d | 25/25/26 (igual) | 76/82/88 → 72/82/88 |
| bb_bulk_advanced_6d | 25/25/26/25/25/25 → 25/25/25/25/25/25 | 69/65/98/64/58/96 → 69/65/89/64/58/96 |
| bikini_cut_lagging_4d | 25/19/25/19 (igual) | 67/70/60/53 → 67/65/60/53 |
| emanuel_legs_cut_4d | 25/25/25/25 (igual) | 69/89/63/83 → 69/84/63/83 |
| figure_maintain_novice_3d | 25/25/25 (igual) | 75/81/83 → 71/81/83 |
| physique_cut_adv_lag_5d | 25/12/24/25/12 (igual) | 82/40/57/61/47 → 82/35/57/61/53 |
| physique_w_bulk_6d | 20/22/23/20/20/23 (igual) | 58/55/81/49/46/85 → 58/55/76/49/46/85 |

En `bb_bulk_advanced_6d` la sesión de pierna A bajó de 26 a 25 series: antes el peso muerto rumano (multiarticular) no se podía recortar y la sesión quedaba sobre el tope; ahora el curl sí, y el tope lo recorta en una serie.

### Barrido de 360 planes (90 perfiles × 3, 4, 5 y 6 días), plan por defecto
- **Planes que cambian: 360 de 360** (A1 reordena todas las sesiones; A3 cambia el día de la bisagra; el remo con apoyo reemplaza al de barra).
- **A3 se cumple en los 360**, también con la bandera salud/funcional, con lesiones, con la espalda rezagada y con el remo con barra elegido.
- **Frecuencia semanal de isquios: no baja en ninguno de los 360** (días con ejercicios de isquios: 180 por cada cantidad de días, 720 en total antes y después). **Glúteos:** no baja; sube en 2 planes de 3 días.
- **Series semanales de isquios:** de 4377 a 4250 (−2,9 %); bajan en 53 planes (por 1 a 4 series): el curl (aislamiento) sí puede recortarse por el tope de 25 y la bisagra no. Por cantidad de días: 3 días 883→872, 4 días 1116→1036, 5 días 1187→1161, 6 días 1191→1181. **Glúteos** suben de 4665 a 4720 y no bajan en ningún plan.
- **Máximo de series de curl en una sesión: 10** (122 de los 360 planes tienen 7 o más el día de sentadilla). Qué cuenta cada cifra: el **10** es el valor final, después de todos los recortes del tope de 25 series y del mínimo. El **12** que se mencionó antes era el reparto inicial del curl en 16 planes, ANTES de esos recortes; en esos planes el tope de 25 lo baja a 10 o menos. Solo el valor final es lo que ve el usuario.
- **Series por sesión distintas:** 101 de 1620 sesiones. **Minutos por sesión distintos:** 436 sesiones (de −15 a +6 min).

### Avisos de rendimiento decreciente (R1) y de tope: qué cambió y por qué
Corrección: la cifra anterior de este DEC ("34 planes más, 12 menos") mezclaba los avisos R1 con los avisos del tope E4 (recortes de series), que comparten el campo sin `kind`. Separados, medidos en el barrido de 360 planes frente a la rama de DEC-021:
- **R1:** 448 → 467 avisos. **Aparecen 19 avisos nuevos en 19 planes (glúteos 11, hombros 8) y ninguno desaparece.** Los avisos R1 son informativos (no recortan nada).
- **Aviso de recorte del tope E4:** más en 17 planes y menos en 14 (976 → 979 avisos). Aviso informativo de mínimo de grupo: 266 → 253 (menos en 12 planes). Completado de piso: 86 → 82 (menos en 4 planes).
- **Causa de los 19 avisos R1 nuevos (verificada en los 19 con `node scripts/verificar-avisos-r1.js`, que compara el motor de `main` con el actual y mide el estado justo antes del paso del mínimo de grupos chicos, DEC-020):** en los 19, la sesión ya superaba el umbral de 11 para ese músculo antes de ese paso en el motor anterior y ese paso le sacó series de aislamiento a ese músculo en esa sesión (para dárselas a un grupo chico, pantorrillas o abdomen), dejándolo en 11 o menos; en el motor actual la sesión supera el umbral antes del paso y el paso le saca **nada (13 planes) o menos que antes (6 planes, hombros: 14 → 12 en vez de 14 → 11)**, así que queda sobre 11. La causa de fondo: el reparto semanal ya dejaba esas sesiones con más de 11 series de ese músculo (B-037); antes un efecto lateral del mínimo lo tapaba y ahora no, porque el curl del día de sentadilla (aislamiento) cambia qué sesión usa el mínimo.

### Sesiones sobre 25 series sin aceptación
`node scripts/simular-reglas-articulares.js`: **108 sesiones (en 72 planes) pasan de 25 series sin aceptación del usuario; en `main` (antes del Paso 2) eran 105 (en 80 planes). No es 0 y no puede serlo con las reglas vigentes**: son sesiones de multiarticulares que el tope E4 no recorta por diseño (DEC-014: no se recorta ningún multiarticular; el plan avisa y ofrece aceptar), sobre todo de 3 días (78 de las 108). Cambios atribuibles a este PR: A3 deja 19 sesiones nuevas sobre 25 (todas con el peso muerto rumano, que ahora cae en la sesión de bisagra con otros multiarticulares) y saca 16 (15 eran sesiones que juntaban sentadilla y rumano): neto +3 (el desglose +19/−16 se midió con un script aparte, no incluido en el repo); la sesión más larga baja de 40 a 37 series. Este PR no mueve series entre sesiones, así que nada rompe el tope de 25 por esa vía. Aceptar sesiones más largas sigue siendo del usuario.

### A2 vuelto a medir (A1 y A3 aplicados, remo por defecto con apoyo)
`node scripts/simular-reglas-articulares.js` (plan por defecto) y `--barra` (remo con barra elegido):

| Cantidad de días | A2 por defecto | A2 con remo con barra elegido |
| --- | --- | --- |
| 3 días | 0 de 90 (0 %) | 90 de 90 (100 %): el remo cae con el peso muerto rumano en Cuerpo completo B |
| 4 días | 0 de 90 (0 %) | 0 de 90 |
| 5 días | 0 de 90 (0 %) | 0 de 90 |
| 6 días | 0 de 90 (0 %) | 0 de 90 |
| **Total** | **0 de 360 (0 %)** | **90 de 360 (25 %)** |

Antes de estos cambios saltaba en el 100 % de los planes (sin A1 ni A3) y, con A1 y A3 pero con el remo con barra por defecto, en el 25 % (todos de 3 días). A1 salta en 0. A4 (71,1 % como advertencia general) no se implementó: por decisión de Emanuel solo se activará si A6 registró dolor de hombro.

### Pruebas
- `engine.test.js` (171 tests): A3 en los 360 planes y con bandera salud/lesiones; la frecuencia de isquios y glúteos no baja contra la salida con las reglas apagadas; A1 en cada sesión; el hip thrust al final de los multiarticulares; el remo por defecto con apoyo (sin remo con barra ni A2 en los 360); con el remo con barra elegido entra, A3 lo separa de la sentadilla (también con la espalda rezagada) y el aviso A2 sale exactamente cuando hay más de un ejercicio de lumbar alta; el curl del día de sentadilla no lleva tope (máximo 10 < 11 y ningún aviso R1 de isquios en los 360 planes); el relleno no junta sentadilla y bisagra; las reglas están en `VALIDATOR_RULES`.
- Referencias actualizadas a propósito: `plan-hashes.json` y `despues_dec022` en `dec017-referencia.json`; la línea base de DEC-010 se compara con A1 y A3 apagadas y `barbellRow: true`; los planes de DEC-020 con A1 y A3 apagadas.
- Mutaciones: A3 apagada 7 tests; sin reinicio de la rotación 3; sin guarda en el relleno 1; A1 apagada 3; hip thrust sin ir al final 2 a 4; sin elegir el remo 8; sin el reemplazo de A3 en el día 1; el remo con barra sin contar como bisagra 1; sin aviso A2 1.
- E2E (`e2e.js`, `e2e-aceptacion.js`) pasan.

### Fuera de alcance
A4 (solo con dolor de hombro de A6, que no existe todavía), A5, A6 y A7; el reparto semanal que deja sesiones con más de 11 series de un músculo (B-037); la variedad de curl sentado y tumbado (B-035); el split de 3 días (no se tocó).

**Estado: implementada. Aceptado por Emanuel el 2026-11-07.**

## DEC-023 · Año de prueba: sin retrocompatibilidad de datos, exportación antes de cada reset y código muerto fuera en el mismo PR
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-07). **Nivel 3** (arquitectura y alcance: lo decide solo Emanuel). Lo creó el agente como Propuesto por pedido de Emanuel; aceptado por Emanuel en el chat el 2026-11-07.

Contexto: la app la usan 2 personas y se prueba durante un año antes de una posible versión pública. Emanuel cambió de estrategia: se reconstruye el núcleo del generador con filosofía "clean core" (no se parchea el motor actual). Hoy el motor y el almacenamiento arrastran compatibilidad con formatos anteriores (por ejemplo `migrateLongSessionAcceptance`, el campo legado `longSessionAcceptedOn` y las filas de series anteriores a DEC-015 sin `setKey`) y parches que corrigen efectos de otros pasos. Esa compatibilidad no sirve a nadie mientras los datos del año de prueba se puedan borrar. Hoy esos caminos siguen en uso (se llaman al cargar y al importar).

### Decisión
1. **Durante el año de prueba, la retrocompatibilidad de datos no es requisito.** El formato del almacenamiento y del plan puede cambiar sin migración. El año de prueba dura hasta que Emanuel lo cierre por escrito (DEC o `docs/VISION.md`).
2. **Antes de cada reset de datos** (borrar el almacenamiento local, cambiar el formato de forma incompatible), **se exporta el historial completo** (perfiles, medidas, sesiones y series) y se archiva fuera de la app con `node scripts/exportar-historial.js`. El reset no se hace sin esa exportación. La exportación respeta DEC-009: no incluye datos de salud ni dolor por serie. **Reemplazado por DEC-030 (Aceptado el 2026-11-08):** el reset del corte es completo y sin exportación; `scripts/exportar-historial.js` se eliminó.
3. **El código que una decisión deja muerto se elimina en el mismo PR** que la implementa: migraciones, campos legados, caminos que ya nadie recorre, datos y tests que solo ejercitaban ese código. Un test de comportamiento se conserva; un test que solo fija un detalle interno del código eliminado se elimina con él. Quien revisa el PR comprueba que no queda nada muerto.

### Qué no cambia
- **DEC-009 (privacidad)**: los datos de salud y el dolor por serie siguen sin salir del dispositivo ni entrar a ningún export, tampoco al archivo de esta decisión.
- **Los DEC aceptados no se editan ni se revierten por esta decisión**, pero **tres cláusulas de DEC aceptados quedan reemplazadas por DEC-023 desde el corte al núcleo nuevo, no antes** (decisión de Emanuel, 2026-11-07): DEC-016 (migrar `longSessionAcceptedOn` al formato acotado), DEC-015 (mostrar y editar las filas anteriores sin `setKey`) y DEC-018 (importar archivos exportados antes sin migrar). Hasta el corte siguen vigentes y el motor actual no se toca; en el PR del corte se elimina su código junto con el código muerto del inventario. Cada una lleva en su DEC la nota "reemplazado por DEC-023 desde el corte"; su estado no se edita.
- El registro de entrenamiento sigue funcionando sin conexión; el server no es una dependencia.
- Las reglas de evidencia (E1 a E4, fuente y estado) y las pruebas de mutación siguen igual.

### Alternativas
- **A. Mantener la retrocompatibilidad (estado actual).** Costo: cada cambio de formato exige una migración y un test que la cubra; el código legado se acumula (ya hay migraciones y campos legados que solo existen para datos viejos). Beneficio: ningún dato se pierde sin pedirlo.
- **B. Recomendada: sin retrocompatibilidad durante el año de prueba, con exportación obligatoria antes de cada reset.** Costo: un reset obliga a perder el estado vivo de la app (el historial queda archivado fuera, no se reimporta salvo que se escriba un importador a propósito). Beneficio: el núcleo nuevo no carga con formatos viejos y el historial no se pierde.
- **C. Sin retrocompatibilidad y sin exportación.** Descartada: el historial de entrenamiento es el único dato que no se puede regenerar.

### Consecuencias
- `CLAUDE.md` y la checklist del revisor (`.claude/agents/revisor.md`) reflejan estas reglas (en este mismo PR; en vigor desde que Emanuel aceptó la decisión).
- Herramienta: `scripts/exportar-historial.js` (JSON y CSV; entradas: el volcado del almacenamiento de la app o la exportación de un perfil). Probada con datos sintéticos; no se ejecutó contra el almacenamiento real de nadie.
- No se elimina ningún código en este PR: la limpieza llega con la spec del núcleo nuevo (inventario en `docs/research/inventario-generador.md`).

**Estado: Aceptado por Emanuel el 2026-11-07.**

## DEC-024 · El tope de sesión pasa de 25 series a minutos disponibles
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-08). **Nivel 3** (cambia una cláusula de un DEC aceptado). Lo creó el agente como Propuesto por pedido de Emanuel (2026-11-07); aceptado por Emanuel en el chat el 2026-11-08, después de revisar el PR #37. **Efecto desde el corte al núcleo nuevo** (`docs/specs/nucleo-v2.md`), no antes: hasta entonces el motor actual no se toca.

Contexto: DEC-014 fijó un tope de 25 series por sesión (E4, convención de la app, sin fuente externa). Ese tope cuenta igual una serie de pantorrilla que una de sentadilla y solo puede recortar aislamientos. En el barrido de 360 planes (`docs/research/diagnostico-sesiones-sobre-25.md`) 108 de 1620 sesiones lo superan sin aceptación (72 planes; 29 llegan a 30 series o más; 80 pasan de 90 min; máximo 37 series y 118 min), porque el reparto semanal no mira la capacidad de las sesiones y el tope corrige después.

### Decisión (propuesta)
1. **La capacidad de una sesión son los minutos disponibles**: el valor general del perfil, o el del día si el usuario lo cambió, **menos el cardio programado ese día**.
2. **La duración de una serie** es el tiempo de trabajo más el descanso de su variante, con los valores fijos del registro de reglas (los unilaterales cuentan ambos lados). Piso de descanso de 60 a 90 s respaldado (E2 con salvedad); los valores por tipo de ejercicio son criterio de diseño (E4); usar el descanso real registrado queda para después. Ver `docs/research/nucleo-v2-evidencia.md`, punto A.
3. **Ninguna sesión supera su capacidad en minutos sin la aceptación explícita del usuario** (aceptación por sesión de un plan concreto; guardada en el plan; caduca al regenerarlo o al cambiar tiempo, días u objetivo).
4. **Aceptación por sesión, dentro de esta decisión.** Se acepta **una sesión concreta de un plan concreto**; la aceptación se guarda **en el plan** (no en el perfil) y caduca al regenerarlo o al cambiar el tiempo, los días o el objetivo. **Reemplaza la cláusula de aceptación acotada de DEC-016** (aceptación ligada a la firma del plan —días, división, objetivo, rezagados y nivel— y a un máximo de series). Requiere el **plan guardado** de la spec (se guarda al generarlo y solo se regenera con el botón "Regenerar" o al cambiar tiempo, días, objetivo, nivel, división, rezagados, ejercicios prioritarios, lesiones declaradas o la casilla del remo con barra; una versión nueva del motor no regenera el plan: la app avisa y el usuario decide).
5. **Se reemplaza la cláusula del tope de 25 series de DEC-014** (y la regla `sessionSetCap` del registro). **No cambia la garantía de series reales de los grupos mayores** de DEC-014 ni el piso de DEC-017 ni el mínimo de DEC-020: siguen como demandas del reparto.

### Qué no cambia
DEC-009 (privacidad), el conteo fraccionado, R1 (lo trata DEC-025) y el resto de DEC-014.

### Alternativas
- **A. Mantener el tope de 25 series.** Costo: el tope sigue corrigiendo después de repartir (108 sesiones sobre el tope hoy) y pesa igual toda serie.
- **B. Recomendada: minutos disponibles.** Costo: el usuario tiene que declarar su tiempo (campo nuevo en el perfil); la duración depende de descansos que no tienen respaldo más allá del piso de 60 a 90 s (E4).
- **C. Ambos topes.** Costo: dos reglas que se corrigen entre sí.

### Evidencia
Convención de la app (E4): el tope por tiempo es una decisión de diseño, no un hallazgo. Fuente del piso de descanso: Singer et al. 2024 (*Front Sports Act Living* 6:1429789, PMID 39205815) y otras, leídas en resumen.

### Qué toca de otros DEC aceptados
Dos cláusulas, ambas **desde el corte al núcleo nuevo**: el tope de 25 series de DEC-014 y la aceptación acotada de DEC-016 (decisión de Emanuel del 2026-11-07: la aceptación va dentro de esta decisión).

**Estado: Aceptado por Emanuel el 2026-11-08.**

## DEC-025 · R1 pasa de aviso a restricción del reparto
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-08). **Nivel 3** (cambia una cláusula de un DEC aceptado). Lo creó el agente como Propuesto por pedido de Emanuel (2026-11-07); aceptado por Emanuel en el chat el 2026-11-08, después de revisar el PR #37. **Efecto desde el corte al núcleo nuevo**, no antes.

Contexto: DEC-014 definió R1 como un **aviso** de rendimiento decreciente (E3: preprint de Remmert et al., punto sin mejora detectable de ~11 series fraccionadas por músculo y sesión) y dice expresamente que no es un tope. El motor actual reparte sin respetarlo y solo avisa: 467 avisos R1 en 165 de 360 planes (981 series fraccionadas por encima del umbral en total; promedio 5,9 por plan afectado; máximo 7 sobre el umbral en una sesión; músculos: glúteos 236, cuádriceps 136, hombros 67, espalda 24, tríceps 4; medido con el motor actual, no con el núcleo nuevo).

### Decisión (propuesta)
1. **R1 pasa a restricción del reparto:** ningún músculo supera **11 series fraccionadas por sesión** (directa 1, indirecta 0,5).
2. **Si la necesidad semanal de un músculo no cabe sin superar ese límite, queda sin cubrir** y lo explica el aviso único del reparto (la misma pantalla de DEC-024).
3. Se reemplaza solo la cláusula de DEC-014 que define R1 como "aviso, no un tope". El nivel de evidencia del umbral sigue siendo E3.
4. **Precedencia (decidida por Emanuel, 2026-11-07).** Cuando el límite de R1 choca con una demanda mínima (el piso de DEC-017 o la garantía de series reales de los grupos mayores de DEC-014), **ganan las demandas mínimas**, porque R1 como restricción ya es más estricta que su fuente. Si las demandas mínimas no caben en la capacidad, el aviso único lo explica.
5. **Métrica de seguimiento:** el porcentaje de planes (del barrido de 360) en que R1 deja necesidad semanal sin cubrir se reporta en la primera simulación del núcleo nuevo (criterio de aceptación de la spec).

### Riesgo de evidencia (a tener presente)
Los propios autores del preprint dicen que 11 **no es un límite superior** ("not upper limits") y que el punto se fijó de forma arbitraria; los datos casi no llegan a volúmenes altos y la mayoría de los estudios entrenaban un solo músculo (`docs/research/fraccionado-pelland-remmert.md`). Convertirlo en restricción dura es **más firme que la fuente**: lo asume Emanuel como decisión de diseño.

### Alternativas
- **A. Dejar R1 como aviso (estado actual).** Costo: 467 avisos informativos y sesiones con más de 11 series de un músculo.
- **B. Recomendada por Emanuel: restricción.** Costo: algunos músculos (sobre todo glúteos y cuádriceps en los splits de pocos días) pueden quedar con menos series que su necesidad, explicado en el aviso.
- **C. Restricción solo cuando hay días disponibles para repartir en otra sesión.** Costo: dos comportamientos distintos según el split.

### Qué no cambia
El conteo fraccionado (E2 con salvedad; el valor 0,5 es criterio de diseño) y el resto de DEC-014.

**Estado: Aceptado por Emanuel el 2026-11-08.**

## DEC-026 · Once reglas del núcleo v2 sin DEC de origen se ratifican como criterio de diseño (E4)
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-08). Lo creó el agente como Propuesto por pedido de Emanuel (2026-11-08); aceptado por Emanuel en el chat el 2026-11-08, después de revisar el PR #38. **No cambia el comportamiento del motor actual ni el plan generado.**

Contexto: al armar el registro único de reglas del núcleo v2 (`ifbb-pro-agent/js/core-v2/registro.js`, PR #38), once números que hoy viven escritos dentro de `engine.js` no tienen ningún DEC que los respalde ni fuente en `VALIDATOR_RULES`. La regla 3 de `CLAUDE.md` pide nivel, fuente y estado para todo número, y la spec del núcleo v2 dice que un número sin fuente se justifica como E4 o se elimina.

### Decisión (propuesta)
Se ratifican como **criterio de diseño de la app (E4), sin fuente externa**, con el valor actual y en el registro del núcleo v2:

| # | Regla (id en el registro) | Valor | Dónde está hoy | Para qué |
| --- | --- | --- | --- | --- |
| 1 | `NECESIDAD_SEMANAL_POR_NIVEL` | 18 / 14 / 10 series por semana (avanzado, intermedio, novato) | `engine.js`, volumen base | Necesidad semanal por grupo antes de los modificadores |
| 2 | `FACTOR_NECESIDAD_GRUPO_CHICO` | ×0,6 | `engine.js` | Reduce la necesidad de los grupos chicos |
| 3 | `NECESIDAD_MINIMA_SERIES` | 4 series por semana | `engine.js`, `Math.max(4, …)` | Mínimo de la necesidad de todos los grupos. **Ver "Mínimo de 4" abajo: se elimina en el paso 2** |
| 4 | `MAX_DIAS_GRUPO_CHICO` | 2 días por semana | `engine.js` | Máximo de días en que aparece un grupo chico |
| 5 | `SERIES_MIN_POR_EJERCICIO` | 2 series | `engine.js` | Mínimo de series por ejercicio en el reparto |
| 6 | `CARDIO_DEFINICION_SESIONES_AVANZADO` | 3 sesiones por semana | `engine.js` | Cardio de definición, nivel avanzado |
| 7 | `CARDIO_DEFINICION_SESIONES` | 2 sesiones por semana | `engine.js` | Cardio de definición, otros niveles |
| 8 | `CARDIO_DEFINICION_MINUTOS` | 25 min por sesión | `engine.js` | Cardio de definición |
| 9 | `CARDIO_MANTENIMIENTO_SESIONES` | 2 sesiones por semana | `engine.js` | Cardio de mantenimiento y volumen (50 min por semana en total, sin cita de la OMS) |
| 10 | `CARDIO_MANTENIMIENTO_MINUTOS` | 25 min por sesión | `engine.js` | Cardio de mantenimiento y volumen |
| 11 | `CARDIO_INTENSIDAD_PORCENTAJE_FCMAX` | 60–70 % de la frecuencia cardíaca máxima | `engine.js` | Intensidad del cardio |

Cada una lleva en el registro el nivel E4, la fuente "criterio de diseño" (la 1 con el texto "rango general consistente con la literatura; valores puntuales sin respaldo, criterio de diseño E4") y el DEC de origen DEC-026.

### Mínimo de 4 (análisis del 2026-11-08)
Se preguntó si el mínimo de 4 actúa en algún caso que no cubran el piso de DEC-017 ni el mínimo de DEC-020. Se quitó el mínimo en una copia del motor actual y se corrió el barrido de 360 planes (90 perfiles × 3, 4, 5 y 6 días). Resultado: cambia 48 planes, todos de principiantes de bikini y wellness (24 y 24, 12 por cada cantidad de días). En 46 cambian bíceps y tríceps (en 39 solo esos dos): con el mínimo tienen una serie más que sin él, y su mínimo de DEC-020 se cumple igual. Sin el mínimo de 4, ningún grupo queda sin aviso bajo el piso de DEC-017 ni bajo el mínimo de DEC-020. En un plan el resultado es mejor sin él (pecho deja de quedar bajo el mínimo, de 4 a 5 series), y en 5 planes de hombros y en 5 de isquios es el mínimo el que provoca la pérdida de series por el tope de sesión (sin él tienen 13 en vez de 10 u 11). **Conclusión: es redundante como protección**; Emanuel decidió eliminarlo en el paso 2 al aceptar este DEC. Límite: el análisis usa el motor actual y los 90 perfiles del barrido.

### Alternativas
- **A. Ratificar los once (recomendada, con el 3 marcado para eliminar en el paso 2).** Costo: queda registrada una convención sin respaldo; es la que ya usa el motor.
- **B. Eliminar los once y redefinirlos al construir el reparto.** Costo: cambia el plan generado antes de tener el reparto nuevo y obliga a decidir cada número desde cero.

### Qué no cambia
Los números que ya tienen DEC o fuente (R1, conteo fraccionado, piso de 10, mínimo de grupo chico, A1 a A3, bandera salud/funcional) y el comportamiento del motor actual.

**Estado: Aceptado por Emanuel el 2026-11-08.**

## DEC-027 · El indicador "Hoy" pasa a "Siguiente" y sigue el orden del split, no la fecha
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-08). Lo creó el agente como Propuesto por pedido de Emanuel (2026-11-08); aceptado por Emanuel en el chat el 2026-11-08, después de revisar el PR #39. **No cambia el plan generado**: solo la interfaz del Entreno.

Contexto: la pestaña Entreno marcaba como "hoy" el día del split que correspondía al día de la semana (lunes = Día 1, y así hasta el último día del split). Eso supone un calendario fijo: si el usuario se salta un día o entrena en otro orden, la marca queda mal. La spec del núcleo v2 va en la misma línea: su modelo no tiene calendario y garantiza el orden de las sesiones, no el reloj (`docs/research/trazabilidad-nucleo-v2.md`, T5b).

### Decisión (propuesta)
1. La etiqueta pasa de "hoy" a **"Siguiente"**.
2. Marca el día que **sigue a la última sesión registrada** del perfil, en el orden del split. Después del último día vuelve al Día 1.
3. Una sesión **registrada aunque esté incompleta cuenta como hecha** (basta una serie guardada, o su entrada en el historial de sesiones).
4. **Sin sesiones registradas** marca el Día 1.
5. El usuario **puede elegir otro día a mano** (empezar cualquier día). El "Siguiente" se calcula siempre desde el **último día registrado**, no desde el que se esperaba.
6. Es **por perfil**: cada perfil usa sus propias sesiones.
7. Si **cambia el split**, vuelve al Día 1. Se detecta porque el nombre del día guardado ("Día 3 · Empuje") ya no coincide con el del plan actual; los nombres de día son distintos en cada split (3, 4, 5 y 6 días), y un test lo comprueba.
8. El día marcado es también el que aparece desplegado al abrir el Entreno.

### Alternativas
- **A. Dejar "hoy" por el día de la semana (estado actual).** Costo: la marca se desfasa en cuanto el usuario se salta o cambia un día.
- **B. Recomendada: "Siguiente" por orden.** Costo: no guarda ningún dato nuevo, pero si el nombre de un día de un split cambia en el futuro, el indicador vuelve al Día 1 una vez.
- **C. Guardar el split en cada sesión registrada.** Costo: cambia el modelo de datos del historial; no hace falta para este comportamiento.

### Qué no cambia
El plan generado, el registro de sesiones (DEC-015) y los datos guardados.

**Estado: Aceptado por Emanuel el 2026-11-08.**

## DEC-028 · El top set va al patrón principal del tipo de sesión, no al primer ejercicio elegible
**Estado del DEC:** Propuesto — **Decidido por:** pendiente (Emanuel). **Nivel 3** (cambia una cláusula de un DEC aceptado). Lo creó el agente (2026-11-08) porque la spec del núcleo v2 y la decisión T16 de Emanuel ya lo definen y todavía no tiene su DEC. No vale como base de otro trabajo hasta que Emanuel lo acepte. **Efecto desde el corte al núcleo nuevo**, no antes.

Contexto: DEC-008 dice que el top set pasa al primer ejercicio elegible del día (lista cerrada de seis patrones del catálogo viejo, que en el catálogo nuevo son las variantes elegibles del punto 2). Esa regla es la causa del press militar con top set en el día de tirón (`docs/research/diagnostico-rutina-corta-y-dia-de-tiron.md`). La spec del núcleo v2 (algoritmo, paso 6; trazabilidad T16, resuelta el 2026-11-08) lo reemplaza.

### Decisión (propuesta)
1. El top set va al **patrón principal del tipo de sesión**: empuje horizontal en empuje, tirón vertical en tirón, sentadilla en pierna con sentadilla, bisagra en pierna con bisagra; en torso alterna (empuje horizontal el primero de la semana, tirón vertical el segundo); en cuerpo completo ×3 rota sentadilla, empuje horizontal y bisagra.
2. **Se conserva la elegibilidad de DEC-008**: la variante del top set tiene que estar en la lista cerrada (sentadilla trasera y hack, press banca, press militar, peso muerto rumano, remo con barra y pendlay, dominadas y jalón). Si un ejercicio prioritario del usuario ocupa el patrón principal y no es elegible, conserva su lugar y esa sesión queda sin top set.
3. Sigue existiendo solo en definición (DEC-002). Sus números van al registro (E4).

### Alternativas
- **A. Dejar DEC-008 como está.** Costo: sigue el press militar con top set en el día de tirón.
- **B. Recomendada: patrón principal del tipo.** Costo: una sesión puede quedar sin top set si el patrón principal no tiene variante elegible disponible (lesión o prioritario).

### Qué no cambia
La lista cerrada de variantes elegibles, el top set solo en definición, los números del top set (4–6 repeticiones, RIR 1–2, back-offs al −10 %).

**Estado: Propuesto.**

## DEC-029 · Estructura del reparto: volumen propio del patrón principal y un ejercicio directo por grupo y semana
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-08). Lo creó el agente como Propuesto por pedido de Emanuel (2026-11-08), a partir de la vista previa del paso 2; aceptado por Emanuel con un comentario en el PR #42 (https://github.com/Posio07/Training-Agent/pull/42#issuecomment-6723771883: "aceptado dec-029 - Emanuel"). **Efecto desde el corte al núcleo nuevo**, no antes.

Contexto: la vista previa del paso 2 (`docs/research/vista-previa-reparto.md`) mostró dos efectos del puntaje "necesidad por minuto": el patrón principal de la sesión (el del top set) quedaba con 2 series en 79 % de las sesiones, y bíceps y tríceps podían quedar solo con series indirectas. DEC-020 (punto 6) ya protegía el último ejercicio directo de un grupo en el motor actual; la trazabilidad no lo había detectado y el reparto nuevo no lo conservaba.

### Decisión (propuesta)
1. **Patrón principal:** recibe su volumen en el paso 3 del reparto (estructura), antes del relleno: **al menos 4 series de trabajo** (el top set más sus back-offs; en sesiones sin top set, 4 series de trabajo). Si no cabe en el tiempo de la sesión, baja de a una serie hasta el mínimo de cualquier ejercicio y el aviso único lo dice. Criterio de diseño E4, en el registro (`SERIES_MIN_PATRON_PRINCIPAL`).
2. **Ejercicio directo:** todo grupo del perfil lleva por semana **al menos un ejercicio directo de ese grupo con 2 series o más**. Se ubica en el paso 3, antes del relleno, en la sesión compatible con más tiempo libre, y gana sobre R1 como cualquier demanda mínima. Si no hay lugar (tiempo, seguridad o variantes disponibles), el aviso único lo dice. Es el equivalente en `core-v2` de la regla de DEC-020 (punto 6, "nunca se quita el último ejercicio directo de un grupo"). Criterio de diseño E4, en el registro (`EJERCICIO_DIRECTO_SEMANAL_MIN_SERIES`).

### Alternativas
- **A. Dejar el puntaje "necesidad por minuto" tal cual.** Costo: el patrón principal casi sin volumen y grupos chicos sin ejercicio propio.
- **B. Recomendada (la que pidió Emanuel): las dos reglas de estructura.** Costo: sesiones algo más largas (el principal con 4 series) y menos libertad del relleno.
- **C. Tope de series por ejercicio.** Costo: Emanuel decidió el 2026-11-07 que no hay tope por ejercicio.

### Qué no cambia
R1 sigue siendo restricción (DEC-025), el top set va al patrón principal (DEC-028), el conteo fraccionado y los pisos de DEC-014, DEC-017 y DEC-020.

**Estado: Aceptado por Emanuel el 2026-11-08.**

## DEC-030 · El reset del corte es completo y sin exportación del historial
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-08). **Nivel 3** (cambia una cláusula de un DEC aceptado). Lo creó el agente como Propuesto por pedido de Emanuel (2026-11-08); aceptado por Emanuel con un comentario en el PR #44 (https://github.com/Posio07/Training-Agent/pull/44#issuecomment-6723923228: "acepto DEC-030 y DEC-031 - Emanuel").

Contexto: DEC-023 (punto 2) exige exportar el historial completo con `scripts/exportar-historial.js` antes de cada reset de datos, y la spec del núcleo v2 (B-039) incluía un paso de exportación validado contra los conteos de la app. Emanuel lleva su propio registro de entrenamiento fuera de la app, así que la exportación no le sirve y el script se vuelve código muerto.

### Decisión (propuesta)
1. **Se reemplaza el punto 2 de DEC-023:** ya no se exige exportar el historial antes de un reset. **El reset del corte al núcleo nuevo es completo, sin exportación**, y los perfiles se recrean después del corte.
2. **Se elimina `scripts/exportar-historial.js` y sus tests** (código muerto, DEC-023 punto 3). Se quita el paso de exportación validada de B-039 y de la spec del núcleo v2, y se actualizan `CLAUDE.md` y la checklist del revisor.
3. **Qué sigue igual:** DEC-023 puntos 1 (sin retrocompatibilidad de datos durante el año de prueba) y 3 (el código muerto sale en el mismo PR). El botón "Exportar JSON" de cada perfil en la app es otra función y no cambia. **DEC-009 (privacidad) no cambia:** la salud y el dolor por serie siguen sin salir del dispositivo.

### Alternativas
- **A. Mantener la exportación obligatoria (DEC-023 tal cual).** Costo: una herramienta y un paso de validación que Emanuel no usa.
- **B. Recomendada (la que pidió Emanuel): reset completo sin exportación.** Revierte de forma explícita la Alternativa C que DEC-023 había descartado ("el historial es el único dato que no se puede regenerar"): el argumento deja de valer porque Emanuel lleva su propio registro fuera de la app (afirmación de Emanuel, que el repo no puede verificar). Costo: el historial que vive solo en la app se pierde en el corte; Emanuel acepta ese riesgo. Quien use la app más adelante (versión pública) tendría que decidir otra vez.
- **C. Exportación opcional.** Costo: mantener el script y sus tests sin que nadie los use.

### Qué no cambia
DEC-009, el resto de DEC-023 y el registro de entrenamiento sin conexión. La nota "reemplazado por DEC-030" se agregó al punto 2 de DEC-023 al aceptarse este DEC (pedido de Emanuel).

**Estado: Aceptado por Emanuel el 2026-11-08.**

## DEC-031 · Tope de 5 series por ejercicio y sesión; el excedente pasa a otra variante del mismo patrón
**Estado del DEC:** Aceptado — **Decidido por:** Emanuel (2026-11-08). **Nivel 3** (cambia una cláusula de un DEC aceptado). Lo creó el agente como Propuesto por pedido de Emanuel (2026-11-08); aceptado por Emanuel con un comentario en el PR #44 (https://github.com/Posio07/Training-Agent/pull/44#issuecomment-6723923228: "acepto DEC-030 y DEC-031 - Emanuel"); Emanuel dijo haberlo repetido en este PR (#46), donde no hay comentario visible todavía. **Efecto desde el corte al núcleo nuevo**, no antes.

Contexto: la vista previa del reparto nuevo (`docs/research/vista-previa-reparto.md`, sección "Series por ejercicio aislado") mostró que sin tope por ejercicio un aislamiento puede sumar hasta 11 series en una sesión: 1075 de 1620 sesiones tenían algún aislado con 6 series o más. Emanuel había decidido el 2026-11-07 que no había tope por ejercicio; decidió el 2026-11-08, con esa distribución a la vista, ponerlo.

### Decisión (propuesta)
1. **Máximo de 5 series por ejercicio y sesión** (E4, criterio de diseño, en el registro: `MAX_SERIES_POR_EJERCICIO`).
2. **El excedente pasa a otra variante del mismo patrón** si existe y cabe en la sesión (tiempo, R1, A2 y A3). Si no existe, **se queda en el mismo ejercicio**: el volumen no se recorta. Ningún ejercicio nuevo queda con menos de 2 series, así que el traspaso mínimo es de 2.
3. **Se reemplaza la cláusula de DEC-006** ("un mismo ejercicio base, incluidas sus variantes, aparece como máximo una vez por sesión") únicamente para este traspaso: una sesión puede llevar dos variantes del mismo patrón cuando una pasa el tope.
4. El top set sigue en la variante del patrón principal; el excedente nunca lleva top set.

### Alternativas
- **A. Sin tope (estado actual del reparto nuevo).** Costo: ejercicios con 7 a 11 series y sesiones monótonas.
- **B. Recomendada (la que pidió Emanuel): tope de 5 con traspaso a otra variante.** Costo: dos variantes del mismo patrón en una sesión (cambia una cláusula de DEC-006) y, donde el patrón solo tiene una variante, el tope no se cumple.
- **C. Tope duro que recorta el volumen.** Descartada: baja la cobertura de la necesidad semanal.

### Qué no cambia
La necesidad semanal, R1, los pisos y el volumen total: el traspaso mueve series entre variantes, no las quita.

**Estado: Aceptado por Emanuel el 2026-11-08.**

