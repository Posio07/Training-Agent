# Trazabilidad: de los 19 pasos del generador actual al núcleo v2

Fecha 2026-11-07, actualizada el mismo día con las decisiones de Emanuel (secciones 1, 2 y 7). Solo documentación: no se cambió el motor. Cruza cada paso T1 a T19 de `docs/research/inventario-generador.md` (sección 2) con la spec (`docs/specs/nucleo-v2.md`). "Algoritmo 1 a 7" son los siete pasos de "Algoritmo de reparto" de la spec.

**Estados:** **Claro** = la spec dice dónde va; **Parcial** = la spec cubre una parte y falta otra (se dice cuál); **HUECO** = la spec no dice a dónde va ni si se elimina: lo decide Emanuel.

## 1. Tabla de trazabilidad

| # | Paso actual | Va a (núcleo nuevo) | Qué pasa | Por qué | Estado |
| --- | --- | --- | --- | --- | --- |
| T1 | Split: plantillas de 3 a 6 días, con día fijo para los grupos grandes | "Tipos de sesión": cada día del split lleva un tipo (empuje, tirón, pierna con sentadilla, pierna con bisagra, torso, cuerpo completo) | Se transforma: el día deja de ser una lista de músculos y pasa a ser un tipo con patrones obligatorios | La función del día define qué debe cubrir | **Parcial.** La spec fija los tipos y sus patrones, pero **no dice qué tipo lleva cada día en cada split** (3, 4, 5 y 6 días) ni cuántas veces por semana aparece cada tipo |
| T2 | Volumen semanal por grupo (18/14/10, ×0,85, ×1,25, ×0,5, ×0,6, rezagados con tope 20, mínimo 4) | Algoritmo 4 (necesidad semanal por grupo) y 5 ("necesidad no cubierta"); "Registro único de reglas" | Se transforma: deja de ser una meta fija que se recorta y pasa a ser la **necesidad** que el relleno intenta cubrir dentro de la capacidad | "El reparto parte de la capacidad real, no de un volumen ideal" | **Decidido (Emanuel, 2026-11-07).** 18/14/10 se mantienen en el registro como criterio de diseño (E4); 0,85 y 1,25 se aplican una sola vez, sobre la necesidad; sin pesos extra en la cobertura marginal. Se renombran `SCHOENFELD_VOL` y `HELMS_TRAIN` |
| T3 | `weeklyFloors`: piso de 10 series fraccionadas por grupo, o 5 si la división lo reduce | Algoritmo 4 (demandas mínimas: piso de mantenimiento, DEC-017) | Se conserva como demanda del reparto, no como corrección posterior | Es una regla de DEC aceptado (E1 para el 10; E4 convención para el 5) | Claro |
| T4 | `filterLibByInjuries`: exclusiones por zona de lesión y ejercicios sustitutos (press landmine) | Algoritmo 2 (restricciones de seguridad: A7, A6, variantes habilitadas) | Se conserva | La seguridad gana sobre la preferencia | **Parcial.** La spec dice "A7, cuando tenga fuente", pero **A7 hoy no tiene fuente** y las exclusiones vigentes salen de DEC-009 (capa 3) y DEC-011 (7 zonas, sustituto del press ante lesión de hombro, E4). No dice si esas exclusiones siguen mientras A7 no tenga fuente |
| T5 | Reparto por día: 1 o 2 ejercicios por grupo por rotación del catálogo, prensa como segundo de cuádriceps, sin patrones repetidos en el día | Algoritmo 3 (estructura: patrones obligatorios y prioritarios) y 5 (relleno por cobertura marginal) | **Se elimina** la rotación y los dos ejercicios por grupo y día; el relleno decide qué entra y por qué | La rotación es la causa común del día de tirón con press militar y de la rutina corta de un ejercicio | **Parcial.** "Sin patrones repetidos en el día" (DEC-006, aceptado) **no aparece**: la cobertura marginal penaliza lo redundante pero no lo prohíbe. Tampoco se dice qué pasa con la regla de la prensa como segundo ejercicio de cuádriceps |
| T5a | Funcionales con la bandera salud/funcional: búlgara, step-up, paseo del granjero (y cardio de 150 min) | — | — | — | **Decidido.** Se conserva igual y pasa al registro (hoy: en definición, cardio de 150 min por semana, y en pierna búlgara, step-up y paseo del granjero) |
| T5b | A3: sentadilla y bisagra pesadas en días distintos (en el bucle del reparto) | "Tipos de sesión": pierna con sentadilla y pierna con bisagra, separados por 48 h o más; cuerpo completo sin dos de lumbar alta | Se transforma: de parche dentro del reparto a **propiedad del tipo de sesión** | Un tipo por día evita juntar ambas por construcción | **Parcial.** La propiedad está clara, pero el modelo no tiene calendario: la spec no dice cómo se garantizan las 48 h entre los dos días de pierna con "días del split" sin fecha |
| T5c | Remo por defecto con apoyo de pecho y remo con barra opcional (DEC-022) | "Modelo de datos": variantes y casilla "Incluir remo con barra" (aplican A2 y A3); Algoritmo 2 (variantes habilitadas) | Se conserva, ahora como variante habilitada | Misma decisión, expresada con el catálogo de patrón y variante | Claro |
| T6 | Grupos chicos: se reparten después, hasta 2 días, en los días compatibles con menos series (abdomen y pantorrillas prefieren no-pierna; bíceps y tríceps según la categoría del día) | Algoritmo 4 (mínimo de grupos chicos) y 5 (relleno) | Se transforma: dejan de ser un reparto aparte y compiten en el relleno por necesidad por minuto | Evita el efecto en cadena reparto → tope → mínimo | **Parcial.** Se pierde sin decirlo la **compatibilidad por tipo de sesión** (bíceps con tirón o torso, tríceps con empuje o torso, abdomen y pantorrillas fuera del día de pierna) y el **máximo de 2 días por semana**; la cobertura marginal podría ubicarlos en cualquier día |
| T7 | `enforceSessionCap`: tope de 25 series por sesión, recortando solo aislamientos | Algoritmo 1 (capacidad en minutos) y Criterios de aceptación ("ninguna sesión supera su capacidad en minutos sin la aceptación explícita") | **Se elimina** el recorte posterior; el tope pasa de series a minutos y se aplica antes de repartir | Es la fuente de las 108 sesiones sobre 25 | Claro, **DEC-024 (Aceptado)** reemplaza solo esa cláusula de DEC-014; la garantía de series reales de los grupos mayores sigue igual |
| T7a | `resolveAcceptance`: aceptación del usuario ligada a la firma del plan y a un máximo de series | Algoritmo 7 ("aceptar el plan con esas demandas sin cubrir") y Criterios ("sin la aceptación explícita") | Se transforma en parte | El aviso único ofrece aceptar | **Decidido.** Se acepta una sesión concreta de un plan concreto; se guarda en el plan; caduca al regenerar el plan o al cambiar tiempo, días u objetivo (ver la decisión abierta 1 de la sección 7) |
| T8 | Recalcular series semanales tras recortar | — | **Se elimina** | Con un solo paso ya no hay estado intermedio que recalcular | Claro |
| T9 | `completeToFloor`: completa los grupos mayores bajo su piso | Algoritmo 4 | **Se elimina** como paso; pasa a ser demanda | "Ningún paso posterior corrige a uno anterior" | Claro |
| T10 | `ensureGroupMinimum`: mínimo de 5 series fraccionadas para los grupos chicos, con donación de series y protecciones | Algoritmo 4 (demanda) y 7 (aviso si no entra) | **Se elimina** la donación; el reparto cubre la demanda o avisa | Es el paso que más efectos laterales produjo (avisos R1) | Claro (las protecciones de DEC-020 pasan a ser criterios de aceptación: "las garantías de DEC-014, DEC-017 y DEC-020 se cumplen") |
| T11 | Aviso de grupos bajo el mínimo (piso de 10, E1, para todos los grupos) | Algoritmo 7 (aviso único con tres salidas) | Se transforma en el aviso único | Un solo aviso en lugar de varios | **Parcial.** El aviso de hoy cubre **todos** los grupos bajo 10 series fraccionadas, también los que el piso no fuerza (chicos); el aviso único de la spec cubre las "demandas mínimas". No dice si el piso de 10 se sigue informando para los grupos chicos |
| T12 | R1: aviso si una sesión suma más de 11 series fraccionadas de un músculo (E3) | Algoritmo 5 ("ningún músculo supera el umbral de R1") y Criterios | **Cambia de naturaleza:** de aviso a restricción del relleno | Es el aviso que más se movió con las otras reglas | Claro, **DEC-025 (Aceptado)** pasa R1 de aviso a restricción (11 series fraccionadas por músculo y sesión) |
| T13 | A2: aviso si hay más de un ejercicio de lumbar alta en una sesión | "Tipos de sesión" (cuerpo completo: nunca dos de lumbar alta), "Modelo de datos" (remo con barra: aplican A2 y A3) y Criterios | Se transforma: por defecto se evita por construcción; con el remo con barra elegido sigue siendo aviso | Con el remo de apoyo por defecto no salta en ningún plan | Claro |
| T14 | Aviso "sin perfil articular completo" | "Modelo de datos": cada variante tiene su perfil articular | **Propuesta de eliminación:** que la completitud del catálogo sea un test de datos y no un aviso del plan | Hoy el catálogo está completo y un test lo exige | **Parcial.** La spec no dice si el aviso se elimina; es una propuesta de esta tabla, la confirmas tú |
| T15 | `orderByDemand` (A1) | Algoritmo 6 | Se conserva | Es la regla A1 tal cual | Claro |
| T16 | Top set en definición: primer ejercicio elegible del día (lista de 6 patrones), 4–6 repeticiones, RIR 1–2, back-offs al −10 % | Algoritmo 6 y "Tipos de sesión" (el top set va al patrón principal del tipo) | Se transforma: el top set deja de ir "al primer elegible" | Es la causa del press militar con top set en el día de tirón | **Parcial.** La spec dice **dónde** va el top set, pero no dice **cuándo hay** (hoy solo en definición, DEC-002 y DEC-008), qué patrones son elegibles, ni los números (4–6 repeticiones, RIR, −10 %); (la rotación de torso y de cuerpo completo quedó definida el 2026-11-08) |
| T17 | Duración: series × (descanso + 45 s); unilaterales ×2 | Algoritmo 1 (capacidad) y "Registro único de reglas" | Se conserva, y pasa a ser la **capacidad**: tiempo de trabajo más descanso de cada variante | Define cuánto cabe en la sesión | **Parcial.** Falta decir que los **unilaterales cuentan doble** (DEC-007, aceptado) y de dónde salen los descansos y el tiempo de trabajo (investigación pendiente, decisión abierta: descansos fijos o registrados) |
| T18 | Cardio por objetivo y nivel (sesiones y minutos; 150 min con salud/funcional) | — | — | — | **Decidido.** Fuera del núcleo v2: sigue como está, con sus números en el registro. Excepción: el cardio programado en un día se descuenta del tiempo de esa sesión |
| T19 | Textos fijos: intensidad, progresión doble, descarga, poses, lista de fuentes | — | — | — | **Decidido.** Fuera del núcleo v2: sigue como está, con sus números en el registro |

**Resumen (actualizado el 2026-11-07 con las decisiones de Emanuel; el resumen anterior de 9 claras, 9 parciales y 5 huecos es histórico):** 23 filas. Los 5 huecos (T2, T5a, T7a, T18, T19) quedaron **decididos**; T7 y T12 tienen su DEC de nivel 3 aceptado el 2026-11-08 (DEC-024 y DEC-025). Quedan **9 pasos parciales** (T1, T4, T5, T5b, T6, T11, T14, T16, T17), con un valor por defecto propuesto cada uno en la sección 7.

## 2. Huecos de la spec: estado actual (todos decididos el 2026-11-07)

En la primera versión de este documento eran 5 huecos; Emanuel los decidió. Se conserva la lista con su resolución:

1. **T2 · Necesidad por grupo.** *Decidido:* 18/14/10 en el registro (E4); 0,85 y 1,25 una sola vez sobre la necesidad. Falta cómo se fija cuánto necesita cada grupo (por nivel, objetivo, división y definición) y con qué números; hoy son 18/14/10, ×0,85, ×1,25 sin fuente.
2. **T5a · Bandera salud/funcional.** *Decidido:* se conserva igual y pasa al registro. Falta decidir si el núcleo la conserva y cómo entra al reparto (DEC-005 aceptado).
3. **T7a · Aceptación del usuario.** *Decidido:* una sesión concreta de un plan concreto, guardada en el plan, caduca al regenerarlo o al cambiar tiempo, días u objetivo. Falta definir qué se acepta, su alcance y su caducidad (hoy: firma del plan y máximo de series, DEC-016).
4. **T18 · Cardio.** *Decidido:* fuera del núcleo; el cardio programado se descuenta del tiempo de la sesión. La spec no dice dónde vive.
5. **T19 · Intensidad, progresión, descarga, poses y fuentes.** *Decidido:* fuera del núcleo, números al registro. La spec no dice dónde viven.

## 3. Pasos parciales: qué faltaba decidir (los valores por defecto propuestos están en la sección 7)
- **T1:** qué tipo lleva cada día en cada split.
- **T5b:** cómo se garantizan las 48 h entre los dos días de pierna sin calendario.
- **T4:** si las exclusiones por zona de DEC-009 y DEC-011 siguen mientras A7 no tenga fuente.
- **T5:** la regla "sin patrones repetidos en el día" (DEC-006) y la de la prensa como segundo ejercicio de cuádriceps.
- **T6:** la compatibilidad de los grupos chicos con el tipo de sesión y el máximo de 2 días por semana.
- **T11:** si el piso de 10 sigue informándose para los grupos chicos.
- **T14:** confirmar que el aviso de perfil articular se elimina y pasa a test de datos.
- **T16:** cuándo hay top set, qué patrones son elegibles, los números del top set y qué es "la rotación semanal" de torso y cuerpo completo.
- **T17:** el doble tiempo de los unilaterales y el origen de los descansos.

## 4. Cambios que tocan DEC aceptados (nivel 3)
La spec los implica sin nombrarlos; cada uno necesitará un DEC que reemplace la cláusula correspondiente.
- **T7:** el tope de **25 series** por sesión (DEC-014, E4) pasa a un tope en **minutos**.
- **T12:** **R1 deja de ser un aviso** (DEC-014) y pasa a restricción del relleno.
- **T5 / T6:** el reparto de DEC-003 v2 (grupos chicos en los días con menos series) y DEC-006 (sin patrones repetidos) cambian de forma y hay que decir cuáles de sus cláusulas se mantienen.

## 5. Fuera del alcance de la spec
El inventario lista además P1 a P4 y P6 (perfil, métricas, metas, nutrición y tamizaje de salud). La spec del núcleo v2 no los toca; se dejan sin cambios. Lo mismo vale para el registro de sesiones (DEC-015) salvo el selector de variante y la rutina corta como modo de capacidad.

## 6. Observaciones de lectura de la primera versión de la spec (históricas)
La primera observación (R1 en series y no en series fraccionadas) ya se corrigió en la spec; las otras dos siguen vigentes.
- "Ningún músculo supera el umbral de R1 (11 series por sesión)" y el criterio de aceptación equivalente mezclan series y **series fraccionadas**: R1 es de 11 fraccionadas (directa 1, indirecta 0,5).
- "Cuerpo completo: un patrón de pierna, un empuje y un tirón" deja sin decir cómo se cubre sentadilla y bisagra a lo largo de la semana en el split de 3 días (A3 pide días distintos).
- La rutina corta "de 3 a 4 ejercicios" y "los patrones obligatorios del tipo" pueden no coincidir: el tipo cuerpo completo ya exige 3 patrones y el de pierna 2.

## 7. Valores por defecto y decisiones de diseño (resueltas el 2026-11-07)

**Aprobados por Emanuel** (valores por defecto): T1 (tipo de día por split), T4 (exclusiones por lesión siguen vigentes), T5b (48 h: se garantiza el orden, sin campo de calendario), T6 (compatibilidad de grupos chicos y máximo de 2 días), T11 (piso de 10 informado para todos los grupos), T17 (unilaterales cuentan ambos lados) y los modificadores ×0,5, ×0,6, tope de 20 y mínimo de 4 (pasan tal cual al registro como criterio de diseño). Ya están en la spec.

**Decisiones de Emanuel sobre las seis cuestiones escaladas:**
1. **Plan guardado: sí.** Se regenera con el botón "Regenerar" y al cambiar tiempo, días, objetivo, nivel, división, rezagados, ejercicios prioritarios, lesiones declaradas o la casilla del remo con barra. Una versión nueva del motor no regenera el plan sola: la app avisa y el usuario decide.
2. **Tres días:** sentadilla el día 1, bisagra el día 3 y pierna sin lumbar alta el día 2.
3. **La aceptación por sesión y la cláusula de DEC-016 que reemplaza van dentro de DEC-024.**
4. **Top set en el torso:** alternancia empuje horizontal / tirón vertical, registrada como E4.
5. **Eliminaciones aprobadas:** el aviso de perfil articular del plan (T14) y la regla de la prensa como segundo ejercicio de cuádriceps (T5).
6. **R1 contra demandas mínimas:** ganan las demandas mínimas (DEC-025, punto 4).

**Renombres:** `NECESIDAD_SEMANAL_POR_NIVEL` (18/14/10), `FACTOR_NECESIDAD_DEFINICION` (0,85) y `FACTOR_NECESIDAD_ENFASIS` (1,25), con el campo de fuente "rango general consistente con la literatura; valores puntuales sin respaldo, criterio de diseño E4". Los identificadores `SCHOENFELD_VOL` y `HELMS_TRAIN` dejan de usarse como etiqueta de esos números.

**T16 fuera del torso (decidido por Emanuel el 2026-11-08):** el top set existe solo en definición (DEC-002 y DEC-008); sus números (4–6 repeticiones, RIR 1–2, −10 %) van al registro como E4. En cuerpo completo ×3 rota: sentadilla el día 1, empuje horizontal el día 2 y bisagra el día 3. Ya no queda nada por confirmar.
