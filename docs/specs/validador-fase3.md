# Fase 3 · Perfil articular y orden de ejercicios

Nov 5, 2026 · Emanuel Miranda

**Estado:** aprobada por Emanuel el 2026-11-07 con las correcciones de esta versión. **No se implementa hasta que esté mergeado el PASO 1 del mínimo para grupos chicos** (rama `minimo-grupos-chicos`).

Cada ejercicio recibe un perfil de demanda en tres articulaciones (lumbar, hombro, rodilla) y el validador lo usa para ordenar la sesión, limitar la fatiga acumulada y filtrar ejercicios ante lesiones declaradas.

## Problema

El validador cuenta series por músculo, pero no ve la fatiga de los estabilizadores que no son músculo objetivo. La sesión de pierna del 5 nov 2026 tenía 17 series, dentro del tope de 25, y aun así terminó con dolor lumbar en la segunda serie de peso muerto rumano.

- Antes del RDL hubo tres series pesadas de sentadilla, prensa y búlgara: todas cargan los erectores sin contarlos.
- Los back-offs de sentadilla pesaron lo mismo que el top set (100 kg), así que fueron tres series pesadas, no una más descargas.
- El RDL cayó de 8 a 6 repeticiones con la misma carga justo antes del dolor.

La evidencia epidemiológica ubica al hombro y a la rodilla junto a la espalda baja entre las zonas más lesionadas en entrenamiento con pesas, por eso el modelo cubre tres articulaciones y no solo la lumbar.

## Modelo de datos

Una tabla nueva `perfil_articular` en formato largo, igual que la de músculos por ejercicio (DEC-013): una fila por ejercicio y articulación, con el campo `nivel` en alta, media o baja. El formato largo permite sumar codo o muñeca más adelante sin cambiar el esquema.

**Alcance:** todo el catálogo lleva perfil articular. Los 18 ejercicios de la tabla de abajo son la clasificación inicial; el resto del catálogo lo clasifica el investigador con el criterio de modelado de más abajo. **Un ejercicio sin perfil genera una advertencia; nunca pasa en silencio.**

### Criterio de modelado (E4)

Es un criterio de modelado de la app (nivel E4: criterio propio, sin fuente que lo respalde todavía). Define qué significa alta, media y baja en cada articulación:

- **Lumbar.** Alta: bisagra con carga externa, o carga pesada sobre la espalda sin apoyo del tronco. Media: tronco sin apoyo con carga en manos o cadera. Baja: tronco apoyado (respaldo, pecho, banco).
- **Hombro.** Alta: empuje con carga cerca del final del rango (press horizontal o vertical, fondos). Media: tracción o elevaciones con carga. Baja: el hombro no mueve carga.
- **Rodilla.** Alta: flexión profunda con carga (sentadillas, prensa, búlgara). Media: carga con el pie libre (extensión de cuádriceps). Baja: sin carga relevante en la rodilla.

#### Reglas de desempate (E4, decididas por Emanuel el 2026-11-07)

Son parte del criterio de modelado: sin fuente, y revisables cuando B-026 lo ancle. Se aplican en este orden de lectura:

1. **Variantes mezcladas.** Si una entrada del catálogo une variantes con niveles distintos, se clasifica por la **variante más exigente**. Separar las variantes que cambian el nivel lumbar (sentadilla trasera/hack, press de pie/sentado, remo en polea/máquina con apoyo) queda en el backlog (B-031).
2. **Bisagra con carga** incluye la **bisagra sostenida**: torso inclinado más de 45° con carga externa (remo con barra = lumbar alta). La búlgara con énfasis en cadera no llega a eso: lumbar media por mecánica. La **carga axial sin bisagra ni flexión profunda** (elevación de talones de pie, paseo del granjero) = lumbar media.
3. **Lumbar media exige carga relevante.** Los aislamientos ligeros de pie (elevaciones laterales, curl con barra, tríceps en polea, pullover) = lumbar baja.
4. **Hombro por mecanismo.** Alta: multiarticular pesado cerca del final del rango. Media: aislamiento en el final del rango, tracción o elevación. Baja: el hombro no mueve carga. Aperturas, pullover y curl inclinado = media; el press landmine = media por su mecánica (empuja en arco, sin llegar al final del rango). **Nunca se clasifica un ejercicio para conservar su función de sustituto.**
5. **Si dos reglas chocan, gana el nivel más alto.** Solo aplica a **conflictos reales entre reglas**; una regla específica (1 a 4) gana sobre la lectura literal del criterio (face pull = lumbar baja por la regla 3). Hip thrust: lumbar media (carga en la cadera frente a tronco apoyado).

Anclar este criterio con datos biomecánicos es una tarea abierta (ver Preguntas abiertas).

Cada articulación se usa para algo distinto, porque el mecanismo de lesión es distinto:

- **Lumbar:** acumulación oculta en estabilizadores. Alimenta orden y tope por sesión (A1, A2, A3).
- **Hombro:** acumulación más posiciones de riesgo. Alimenta orden, tope por sesión y exclusión por lesión (A1, A4, A7).
- **Rodilla:** la carga ya la capta el conteo de cuádriceps. Solo se usa como filtro ante lesión declarada (A7), para no contar dos veces.

Clasificación inicial propuesta. Todas las filas entran como `a_verificar` hasta que el subagente investigador les asigne fuente. La etiqueta `probable` **se extiende a las articulaciones** (decisión de Emanuel, 2026-11-07): una celda pasa a `probable` cuando tiene fuente leída (aunque sea solo el resumen) que respalda su nivel y el nivel no salió de una regla de desempate. `verificado` no se usa: exige medir hipertrofia.

| Ejercicio | Lumbar | Hombro | Rodilla |
| --- | --- | --- | --- |
| Sentadilla trasera | alta | media | alta |
| Peso muerto rumano | alta | baja | baja |
| Remo con barra inclinado | alta | media | baja |
| Hack squat (máquina) | media | baja | alta |
| Sentadilla búlgara con mancuernas | media | baja | alta |
| Hip thrust con barra | media | baja | baja |
| Press militar de pie | media | alta | baja |
| Prensa de piernas | baja | baja | alta |
| Extensión de cuádriceps | baja | baja | media |
| Curl femoral tumbado o sentado | baja | baja | baja |
| Press de banca | baja | alta | baja |
| Press inclinado | baja | alta | baja |
| Press militar sentado con respaldo | baja | alta | baja |
| Fondos en paralelas | baja | alta | baja |
| Remo con apoyo de pecho | baja | media | baja |
| Jalón al pecho | baja | media | baja |
| Dominadas | baja | media | baja |
| Elevaciones laterales | baja | media | baja |

## Reglas

Siete reglas con prefijo A (articular) para no chocar con la numeración de fases anteriores. Solo A1 tiene respaldo de meta-análisis, y únicamente en la parte de que el orden no cuesta hipertrofia; el resto es E4 o queda pendiente de fuente.

| Regla | Qué hace | Nivel | Comportamiento |
| --- | --- | --- | --- |
| A1 · Orden por demanda | **Implementada como restricción del generador (DEC-022).** Ordena la sesión: demanda lumbar alta primero, luego multiarticulares (el hip thrust al final de ellos), al final aislados | E2 para el costo cero en hipertrofia; E4 para el motivo de seguridad | Orden por defecto al generar; advertencia si el usuario ubica un ejercicio de lumbar alta después de dos o más de lumbar media o alta. **Nota de simulación (DEC-021):** midió planes sin A1 ni A3 aplicados (el orden era el del generador), por eso saltaba en el 94 % |
| A2 · Tope lumbar | Máximo un ejercicio de demanda lumbar alta por sesión | E4 | Advertencia; el usuario decide. **Nota de simulación (DEC-021):** midió planes sin A1 ni A3 aplicados; A2 saltaba en el 100 % de los 360 planes porque el generador junta sentadilla y peso muerto rumano en el mismo día. Se vuelve a medir con A1 y A3 implementados (DEC-022) |
| A3 · Separación semanal | **Implementada como restricción del generador (DEC-022).** Con dos o más días de pierna, sentadilla pesada y bisagra pesada (lumbar alta) van en días distintos; solo se separa la bisagra pesada, no el trabajo de isquiotibiales: el día de sentadilla los isquios se cubren con curl femoral (sentado de preferencia, E4, Maeo et al. 2021) y la frecuencia semanal de isquios no baja. La separación es por sesión; las 48 h dependen de qué días de la semana elija el usuario | E4 | Distribución por defecto al generar; advertencia si se rompe |
| A4 · Tope de hombro | Máximo dos ejercicios de demanda alta de hombro por sesión | E4 | **Ya no es una advertencia general: solo se activa si A6 registró dolor de hombro.** La versión anterior saltaba en el 71 % de los 360 planes y no tenía fuente |
| A5 · Back-off válido | Un back-off pesa 90% o menos del top set de esa sesión | Definición, no evidencia | En modo sesión: aviso al registrar; si pesa igual o más, se guarda como serie de trabajo y no como back-off |
| A6 · Bandera de dolor | Registro opcional de dolor por serie: zona (lumbar, hombro, rodilla) y escala 0–10. Umbral: 5 de 10, el mismo `painFlagThreshold` que ya usa la app (ver la fuente debajo de la tabla) | E4 | Si la sesión cierra con dolor sobre el umbral en una zona, la siguiente sesión que la use propone cambiar ejercicios de demanda alta por baja y pide confirmación |
| A7 · Exclusión por lesión | Con lesión declarada (DEC-010), excluye ejercicios de demanda alta en esa articulación y las posiciones de riesgo marcadas | Pendiente de fuente certificada | Hasta tener fuente: solo advertencia, sin exclusión automática |

**Fuente del umbral de A6 (5/10).** Es el valor de `painFlagThreshold` en `VALIDATOR_RULES` (DEC-009 y DEC-011): E4, con `reviewRequired`. Viene del modelo de monitoreo del dolor que Silbernagel et al. aplican a la tendinopatía de Aquiles (Silbernagel KG, Thomeé R, Eriksson BI, Karlsson J. *Am J Sports Med* 2007;35(6):897-906, [PMID 17307888](https://pubmed.ncbi.nlm.nih.gov/17307888/)): dolor de 5/10 o menos durante o justo después de la actividad y de vuelta al nivel previo a la mañana siguiente. El texto completo de ese artículo es de pago y no se leyó: el 5/10 se verificó en una fuente secundaria (Sprague et al. 2021, *Pilot Feasibility Stud*, PMC7905015), y otra publicación del mismo programa usa 4/10 como máximo. La app lo extiende de tendinopatías a otras zonas y a dolor por serie por criterio propio, y no implementa la condición de la mañana siguiente (usa dos sesiones sin pasarse del umbral, DEC-011).

A5 y A6 viven en `js/sessionStore.js`, no en el generador, porque dependen de lo que se registra durante la sesión. A6 cubre la métrica de recuperación que estaba pendiente.

## Caso de prueba: sesión del 5 nov 2026

La sesión real del Día 2 tiene que disparar tres advertencias; la versión reordenada tiene que pasar limpia con el mismo volumen.

| Versión | Secuencia | Resultado esperado |
| --- | --- | --- |
| Original | Sentadilla (top 100×6, back-offs 80×8, 100×7, 100×6) → prensa → búlgara → RDL → curl femoral → hip thrust | A2: sentadilla y RDL son ambos lumbar alta. A1: RDL después de dos ejercicios de lumbar media o alta (sentadilla y búlgara); se dispara igual, porque A1 pide dos o más. A5: back-offs de 100 kg iguales al top set |
| Reordenada | Día 2: sentadilla (back-offs al 80–90%) → prensa → búlgara → extensión → curl femoral. Día 5: RDL primero → hip thrust → curl femoral | Sin advertencias |

Esta sesión también sirve para probar A6: ya tiene dolor lumbar registrado, así que el próximo día de pierna debería proponer sustituir sentadilla y RDL.

## Criterios de aceptación

La fase está cerrada cuando se cumple todo esto:

- [ ] Tabla `perfil_articular` en formato largo con todo el catálogo clasificado (los 18 ejercicios iniciales más el resto, según el criterio de modelado); las filas sin fuente quedan marcadas `a_verificar`
- [ ] Un ejercicio sin perfil articular genera una advertencia; nunca pasa en silencio
- [ ] La sesión original del 5 nov dispara A1, A2 y A5
- [ ] La versión reordenada pasa sin advertencias
- [ ] El generador aplica A1 y A3 por defecto en planes nuevos
- [ ] A6 registra dolor por serie en `js/sessionStore.js` y modifica la propuesta de la sesión siguiente
- [ ] Cada advertencia muestra el nivel de evidencia de su regla
- [ ] Decisión registrada como DEC nueva

**Preguntas abiertas**

- Fuente para las listas de exclusión de A7: tarea para el subagente investigador. Sin fuente, A7 no excluye.
- Clasificación inicial: el subagente investigador valida o corrige cada fila antes del merge, y clasifica con el criterio de modelado el resto del catálogo.
- **Tarea abierta:** que el investigador busque datos biomecánicos de carga sobre la columna y el hombro para anclar el criterio de modelado (hoy es E4, sin fuente).
- **A1, A2 y A4 tras la simulación (DEC-021 y DEC-022):** sin aplicar las reglas, en el barrido de 360 planes A1 saltaba en el 94 %, A2 en el 100 % y A4 en el 71 %. Con A1 y A3 implementados (DEC-022), A1 salta en 0 y A2 en 90 planes (25 %, todos de 3 días, por el remo con barra junto a la sentadilla o al peso muerto rumano en los días de cuerpo completo). A4 solo se activará con dolor de hombro registrado por A6 (`node scripts/simular-reglas-articulares.js`).
- Codo y muñeca quedan fuera de esta versión; se reconsideran tras tres meses de registros de dolor.

## Fuentes

| Fuente | Qué respalda | Nivel |
| --- | --- | --- |
| [Nunes et al. (2021), Eur J Sport Sci](https://pubmed.ncbi.nlm.nih.gov/32077380/) | La fuerza mejora más en los ejercicios hechos al inicio; la hipertrofia es similar en cualquier orden (A1) | E2 |
| [Keogh y Winwood (2017), *The Epidemiology of Injuries Across the Weight-Training Sports*, Sports Med 47(3):479-501, doi:10.1007/s40279-016-0575-0](https://pubmed.ncbi.nlm.nih.gov/27328853/) | Hombro, espalda baja, rodilla, codo y muñeca como zonas más lesionadas en deportes de pesas; mayoría de estudios retrospectivos | E2, con calidad baja |
| [Tung MJ, Lantz GA, Lopes AD, Berglund L. (2024), *Injuries in weightlifting and powerlifting: an updated systematic review*, BMJ Open Sport Exerc Med 10(4):e001884, doi:10.1136/bmjsem-2023-001884](https://pubmed.ncbi.nlm.nih.gov/39650568/) | En powerlifting, las zonas más lesionadas son espalda baja y pelvis, hombro y codo | E2, con calidad baja |

Ninguna de estas fuentes prueba que estas reglas prevengan lesiones: dicen dónde ocurren, no cómo evitarlas. Por eso A2, A3, A4 y A6 son E4.
